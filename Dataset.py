import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from Config import *

class TaobaoDataset(Dataset):
    """
    对齐 HSTU 的 data_process 思路：
    - 每个用户按时间排序
    - 最后一个 item 作为测试正样本
    - 其余用于训练
    - 所有序列左 padding 到 max_len
    """
    def __init__(
        self,
        config,
        file_path="",
        nrows=None,
        max_len=154,
        pad_id=0,
        num_test_neg=100,
        seed=42,
    ):
        self.config = config
        self.max_len = max_len
        self.pad_id = pad_id
        self.num_test_neg = num_test_neg
        self.rng = np.random.default_rng(seed)

        # 优化：直接读取 Parquet 以提升速度
        if file_path.endswith(".parquet"):
            df = pd.read_parquet(file_path)
            if nrows:
                df = df.iloc[:nrows]
        else:
            df = pd.read_csv(
                file_path,
                nrows=nrows,
                names=["User_ID", "Item_ID", "Category_ID", "Behavior_Type", "Timestamp"],
            )

        # 优化：int32 减少内存消耗
        df["User_ID"] = df["User_ID"].astype(np.int32)
        df["Item_ID"] = df["Item_ID"].astype(np.int32)
        df["Timestamp"] = df["Timestamp"].astype(np.int32)

        # 映射字典：pv=1, fav=2, cart=3, buy=4, padding=0
        type_map = {'pv': 1, 'fav': 2, 'cart': 3, 'buy': 4}        
        if 'Behavior_Type' in df.columns:
            df['Behavior_Type'] = df['Behavior_Type'].map(lambda x: type_map.get(x, 1)).astype(np.int32)
        else:
            df['Behavior_Type'] = 1 # 默认 PV
        
        df = df[["User_ID", "Item_ID", "Timestamp", "Behavior_Type"]].sort_values(["User_ID", "Timestamp"])

        # user -> items & timestamps
        # 优化：一次性聚合提升groupby效率
        user_group = df.groupby("User_ID", sort=False).agg(list)        
        self.all_items = np.array(sorted(df["Item_ID"].unique()), dtype=np.int32)

        self.samples = []
        group_dict = user_group.to_dict('index')
        
        for user_id, content in group_dict.items():
            items = content["Item_ID"]
            ts = np.array(content["Timestamp"], dtype=np.int32)
            types = content["Behavior_Type"] # 获取类型序列

            if len(items) < 3:
                continue

            train_items = items[:-1]
            test_pos = items[-1]

            train_seq_raw = train_items[:-1]
            train_type_raw = types[:-2]       # 训练对应的类型
            train_time_seq_raw = ts[:-2]
            train_pos_raw = train_items[1:]
            
            test_seq_raw = train_items
            test_type_raw = types[:-1]        # 测试对应的类型
            test_time_seq_raw = ts[:-1]

            sample = {
                "user_id": int(user_id),
                "train_seq": self._left_pad(train_seq_raw, self.max_len, self.pad_id),
                "train_time_seq": self._left_pad(train_time_seq_raw, self.max_len, self.pad_id),
                "train_pos_seq": self._left_pad(train_pos_raw, self.max_len, self.pad_id),
                "test_seq": self._left_pad(test_seq_raw, self.max_len, self.pad_id),
                "test_time_seq": self._left_pad(test_time_seq_raw, self.max_len, self.pad_id),
                "test_candidates": self._build_test_candidates(test_pos, set(items)),            
            }

            if self.config.use_behavior_module:
                sample["train_type_seq"] = self._left_pad(train_type_raw, self.max_len, 0)
                sample["test_type_seq"] = self._left_pad(test_type_raw, self.max_len, 0)

            self.samples.append(sample)

    @staticmethod
    def _left_pad(seq, max_len, pad_id=0):
        seq = list(seq)
        if len(seq) >= max_len:
            return np.array(seq[-max_len:], dtype=np.int64)
        out = np.full(max_len, pad_id, dtype=np.int64)
        if len(seq) == 0:
            return out
        out[-len(seq):] = np.array(seq, dtype=np.int64)
        return out

    def _build_test_candidates(self, test_pos, user_item_set):
        # [正样本 + 随机负样本]，负样本不在该用户历史中
        negs = []
        while len(negs) < self.num_test_neg:
            x = int(self.rng.choice(self.all_items))
            if x not in user_item_set and x != test_pos:
                negs.append(x)
        return np.array([int(test_pos)] + negs, dtype=np.int64)

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        s = self.samples[idx]
        base_return = (
            s["user_id"],
            s["train_seq"],
            s["train_time_seq"],
            s["train_pos_seq"],
            s["test_seq"],
            s["test_time_seq"],
            s["test_candidates"],
        )

        if self.config.use_behavior_module:
            return base_return + (s["train_type_seq"], s["test_type_seq"])

        return base_return

def make_taobao_collate_fn(config, seed=42, pad_id=0, num_neg=5):
    return TaobaoCollator(config=config, seed=seed, pad_id=pad_id, num_neg=num_neg)


class TaobaoCollator:
    """Windows 多进程可 pickle 的 collate callable。"""

    def __init__(self, config, seed=42, pad_id=0, num_neg=5):
        self.config = config
        self.seed = int(seed)
        self.pad_id = int(pad_id)
        self.num_neg = int(num_neg)
        self._rng = np.random.default_rng(self.seed)

    def __call__(self, batch):
        data_len = len(batch[0])

        if data_len == 9:
            (user_ids, train_seqs, train_time_seqs, train_pos_seqs, test_seqs, test_time_seqs, test_candidates, train_type_seqs, test_type_seqs) = zip(*batch)
        else:
            (user_ids, train_seqs, train_time_seqs, train_pos_seqs, test_seqs, test_time_seqs, test_candidates) = zip(*batch)
            train_type_seqs = test_type_seqs = None

        user_ids = torch.tensor(user_ids, dtype=torch.long)
        train_seqs = torch.tensor(np.stack(train_seqs), dtype=torch.long)            # [B, L]
        train_time_seqs = torch.tensor(np.stack(train_time_seqs), dtype=torch.long)  # [B, L]
        train_pos_seqs = torch.tensor(np.stack(train_pos_seqs), dtype=torch.long)    # [B, L]
        test_seqs = torch.tensor(np.stack(test_seqs), dtype=torch.long)              # [B, L]
        test_time_seqs = torch.tensor(np.stack(test_time_seqs), dtype=torch.long)    # [B, L]
        test_candidates = torch.tensor(np.stack(test_candidates), dtype=torch.long)  # [B, C]


        B, L = train_pos_seqs.shape
        K = self.num_neg
        train_neg_seqs = torch.full((B, L, K), self.pad_id, dtype=torch.long)        # [B, L, K]
        pos_np = train_pos_seqs.numpy()

        for t in range(L):
            col = pos_np[:, t]                           # 当前位置所有用户的正样本 [B]
            valid_idx = np.where(col != self.pad_id)[0] # 非 padding 的用户索引
            if len(valid_idx) <= 1:
                continue

            for i in valid_idx:
                # 其他用户同位置正样本，且非 padding
                cand = col[valid_idx[valid_idx != i]]
                if cand.size == 0:
                    continue

                # 候选不足 K 时有放回采样，保证形状稳定
                replace = cand.size < K
                sampled = self._rng.choice(cand, size=K, replace=replace)
                train_neg_seqs[i, t, :] = torch.as_tensor(sampled, dtype=torch.long)

        res = {
            "user_id": user_ids,
            "train_seq": train_seqs,
            "train_time_seq": train_time_seqs,
            "train_pos_seq": train_pos_seqs,
            "train_neg_seq": train_neg_seqs,
            "test_seq": test_seqs,
            "test_time_seq": test_time_seqs, 
            "test_candidates": test_candidates,
        }

        if train_type_seqs is not None:
            res["train_type_seq"] = torch.tensor(np.stack(train_type_seqs), dtype=torch.long)
            res["test_type_seq"] = torch.tensor(np.stack(test_type_seqs), dtype=torch.long)

        return res

def reindex_taobao_dataset(taobao_dataset, pad_id=0):
    # 1) user 重映射
    raw_users = sorted({s["user_id"] for s in taobao_dataset.samples})
    user2idx = {u: i + 1 for i, u in enumerate(raw_users)}  # 0 留给 padding/unknown

    # 2) item 重映射（用 all_items，避免从每条样本重复收集）
    raw_items = sorted(map(int, taobao_dataset.all_items.tolist()))
    item2idx = {it: i + 1 for i, it in enumerate(raw_items)}  # 0 为 padding

    def map_item_array(arr):
        # 作用是将原始 item ID 数组转换为新的索引空间，同时保持 padding 位不变。
        out = np.zeros_like(arr, dtype=np.int64)
        # 仅映射非 padding 位
        nz = (arr != pad_id)
        if nz.any():
            out[nz] = np.array([item2idx[int(x)] for x in arr[nz]], dtype=np.int64)
        return out

    for s in taobao_dataset.samples:
        s["user_id"] = user2idx[int(s["user_id"])]
        s["train_seq"] = map_item_array(s["train_seq"])
        s["train_pos_seq"] = map_item_array(s["train_pos_seq"])
        s["test_seq"] = map_item_array(s["test_seq"])
        s["test_candidates"] = map_item_array(s["test_candidates"])

    # all_items 也更新到新索引空间，供测试负采样或调试使用
    taobao_dataset.all_items = np.arange(1, len(item2idx) + 1, dtype=np.int64)

    user_num = len(user2idx)
    item_num = len(item2idx)
    return user_num, item_num, user2idx, item2idx
