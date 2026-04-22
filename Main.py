import os
import random
import importlib.util
import numpy as np
import pandas as pd
import torch
import time
from functools import partial
from torch.utils.data import Dataset, DataLoader
from Dataset import *
from Model import *
from Config import *
import torch.nn.functional as F

def seed_everything(seed=42, deterministic=False):
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = deterministic
    torch.backends.cudnn.benchmark = not deterministic

def seed_worker(worker_id, seed=42):
    worker_seed = seed + worker_id
    random.seed(worker_seed)
    np.random.seed(worker_seed)
    torch.manual_seed(worker_seed)

def can_use_torch_compile(device):
    if device != "cuda":
        return False, "non-cuda device"
    if not hasattr(torch, "compile"):
        return False, "torch.compile not available"
    # torch.compile + inductor on CUDA requires a working triton installation.
    if importlib.util.find_spec("triton") is None:
        return False, "triton not installed"
    return True, "ok"

def info_nce_loss(pos_logits, neg_logits, pos_seqs, neg_seqs, temperature=0.2):
    """
    pos_logits: [B, L]
    neg_logits: [B, L, K]
    """
    pos_mask = (pos_seqs != 0)
    neg_mask = (neg_seqs != 0)
    valid_rows = pos_mask & neg_mask.any(dim=-1)

    if not valid_rows.any():
        return torch.tensor(0.0, device=pos_logits.device, requires_grad=True)

    pos_flat = pos_logits[valid_rows]          # [N]
    neg_flat = neg_logits[valid_rows]          # [N, K]
    neg_mask_flat = neg_mask[valid_rows]       # [N, K]

    neg_flat = neg_flat.masked_fill(~neg_mask_flat, -1e9)
    logits = torch.cat([pos_flat.unsqueeze(-1), neg_flat], dim=-1) / temperature
    labels = torch.zeros(logits.size(0), dtype=torch.long, device=logits.device)
    return F.cross_entropy(logits, labels)

@torch.no_grad()
def evaluate_hr_ndcg(model, data_loader, device, config, k=10):
    model.eval()
    total = 0
    hit_k = 0.0
    ndcg_k = 0.0

    for batch in data_loader:
        test_seq = batch["test_seq"].to(device)
        test_time_seq = batch["test_time_seq"].to(device)
        test_candidates = batch["test_candidates"].to(device)  # 第0个是正样本
        # 消融
        test_type_seq = batch["test_type_seq"].to(device) if config.use_behavior_module else None

        scores = model.predict(test_seq, test_candidates, test_time_seq, test_type_seq)        # [B, C]
        pos_scores = scores[:, :1]
        rank = (scores > pos_scores).sum(dim=1) + 1              # 1-based rank

        hit = (rank <= k).float()
        ndcg = torch.where(
            rank <= k,
            1.0 / torch.log2(rank.float() + 1.0),
            torch.zeros_like(rank, dtype=torch.float),
        )

        hit_k += hit.sum().item()
        ndcg_k += ndcg.sum().item()
        total += test_seq.size(0)

    hr = hit_k / max(total, 1)
    ndcg = ndcg_k / max(total, 1)
    return hr, ndcg

if __name__ == "__main__":
    current_exp_id = 6
    config = AblationConfig(exp_id=current_exp_id)
    # 固定随机种子，方便复现结果
    seed = 42
    deterministic = False  # True 更可复现；False 更快
    seed_everything(seed, deterministic=deterministic)

    if torch.cuda.is_available():
        torch.set_float32_matmul_precision("high")
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

    batch_size = 1580
    cpu_count = os.cpu_count() or 4
    num_workers = min(8, max(2, cpu_count // 2))
    prefetch_factor = 4
    progress_every = 50  # 每多少 step 打印一次 epoch 内进度
    num_neg = 30  # 每个正样本对应的负样本数量，collate_fn 中使用
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # 全量数据：
    # Total number of lines in the file: 100150807
    # user_num = 987793 item_num = 4162024
    taobao_dataset = TaobaoDataset(
        config=config,
        file_path="./data/Taobao_User_Behavior/UserBehavior.parquet", # 替换 CSV 为 Parquet
        nrows=None,  
        max_len=154, 
        pad_id=0,
        num_test_neg=100,
        seed=seed,
    )

    # DataLoader shuffle 的随机源也固定住
    train_generator = torch.Generator()
    train_generator.manual_seed(seed)
    train_collate = make_taobao_collate_fn(config=config, seed=seed, pad_id=0, num_neg=num_neg)
    train_dataloader = DataLoader(
        taobao_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        collate_fn=train_collate,
        worker_init_fn=partial(seed_worker, seed=seed),
        generator=train_generator,
        drop_last=False,
        pin_memory=torch.cuda.is_available(),
        persistent_workers=(num_workers > 0),
        prefetch_factor=prefetch_factor if num_workers > 0 else None,
    )

    eval_generator = torch.Generator()
    eval_generator.manual_seed(seed)
    test_collate = make_taobao_collate_fn(config=config, seed=seed + 999, pad_id=0, num_neg=num_neg)
    test_dataloader = DataLoader(
        taobao_dataset, 
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        collate_fn=test_collate,
        worker_init_fn=partial(seed_worker, seed=seed + 999),
        generator=eval_generator,
        drop_last=False,
        pin_memory=torch.cuda.is_available(),
        persistent_workers=(num_workers > 0),
        prefetch_factor=prefetch_factor if num_workers > 0 else None,
    )

    # 重新索引后，请重建 dataloader（因为底层样本被更新）
    user_num, item_num, user2idx, item2idx = reindex_taobao_dataset(taobao_dataset, pad_id=0)
    print("user_num =", user_num, "item_num =", item_num)

    model = HSTURecTaobao(
        user_num=user_num,
        item_num=item_num,
        config=config,   #消融开关
        maxlen=154,
        d_model=64,   # RoPE 需要维度为偶数
        n_heads=1,
        n_blocks=2,
        dropout=0.2,
    ).to(device)

    use_compile, compile_reason = can_use_torch_compile(device)
    if use_compile:
        try:
            model = torch.compile(model)
            print("torch.compile enabled")
        except Exception as e:
            use_compile = False
            print(f"torch.compile disabled: {e}")
    else:
        print(f"torch.compile disabled: {compile_reason}")

    # 消融
    if config.use_behavior_module:
        with torch.no_grad():
            # 初始化 residual=0
            model.behavior_mod.type_pair_raw.zero_()
        
            # 初始化 prior
            p = model.behavior_mod.type_pair_prior
            p.zero_()
        
            # PV
            p[:, 1, 1] = 0.05
        
            # Fav
            p[:, 2, 1] = 0.3
            p[:, 2, 2] = 0.05
        
            # Cart
            p[:, 3, 2] = 0.8
            p[:, 3, 1] = 0.2
            p[:, 3, 3] = 0.05
        
            # Buy
            p[:, 4, 3] = 1.2   # Cart → Buy（最强）
            p[:, 4, 2] = 0.8   # Fav → Buy
            p[:, 4, 1] = 0.2   # PV → Buy
            p[:, 4, 4] = 0.1   # Buy → Buy
        
            # Padding 清零
            p[:, 0, :] = 0.0
            p[:, :, 0] = 0.0
        
            # scale 初始化
            model.behavior_mod.type_pair_scale.fill_(1.5)
        
        # 参数组
            param_groups = [
                {"params": model.item_emb.parameters(), "lr": 1e-3},
                {"params": model.layers.parameters(), "lr": 1e-3},
                
                # 行为emb
                {"params": model.behavior_mod.type_emb.parameters(), "lr": 1e-3},
                
                # 门控
                {
                    "params": list(model.behavior_mod.lambda_mlp.parameters()) + \
                              list(model.behavior_mod.q_gate_mlp.parameters()) + \
                              list(model.behavior_mod.k_gate_mlp.parameters()) + \
                              list(model.behavior_mod.v_gate_mlp.parameters()) + \
                              list(model.behavior_mod.fusion_gate.parameters()), 
                    "lr": 1.2e-3
                },
                
                # 行为特征投影
                {"params": model.behavior_mod.behavior_proj.parameters(), "lr": 1.2e-3},
                
                # 行为 bias（残差部分）
                {
                    "params": [model.behavior_mod.type_pair_raw],
                    "lr": 1e-4,          
                    "weight_decay": 2e-4  
                },
                {
                    "params": [model.behavior_mod.type_pair_scale],
                    "lr": 2e-4,  
                    "weight_decay": 0.0
                },        
            ]
    
        # 消融：参数梯度锁定
        if config.freeze_behavior_params:
            if hasattr(model, 'behavior_mod'):
                model.behavior_mod.type_pair_raw.requires_grad = False
                model.behavior_mod.type_pair_scale.requires_grad = False
    else:
        param_groups = model.parameters()

    if torch.cuda.is_available():
        # 注意：使用 FusedAdam 时，确保所有参数都在 GPU 上
        optimizer = torch.optim.Adam(param_groups, betas=(0.9, 0.98), fused=True)
    else:
        optimizer = torch.optim.Adam(param_groups, betas=(0.9, 0.98))
    # ---------------------------
    scaler = torch.amp.GradScaler("cuda", enabled=torch.cuda.is_available())

    num_epochs = 40
    eval_every = 1   # 每多少 epoch 评估一次
    temperature = 0.3   # infoNCE 温度系数
    start_epoch = 1
    best_hr = 0.0
    best_ndcg = 0.0
    best_epoch = -1

    dataset_name = "Taobao"
    run_name = str(int(time.time()))
    save_dir = f"./result/HSTU_Taobao/{run_name}"
    os.makedirs(save_dir, exist_ok=True)
    log_file = os.path.join(save_dir, "log.txt")
    latest_ckpt = os.path.join(save_dir, "latest.pth")
    best_ckpt = os.path.join(save_dir, "best.pth")

    # 重新训练时可加载断点
    resume = False
    resume_path = ""  # 替换为指定已有 checkpoint 路径
    if resume and os.path.exists(resume_path):
        ckpt = torch.load(resume_path, map_location=device)
        model.load_state_dict(ckpt["model_state_dict"])
        optimizer.load_state_dict(ckpt["optimizer_state_dict"])
        start_epoch = ckpt["epoch"] + 1
        best_hr = ckpt.get("best_hr", 0.0)
        best_ndcg = ckpt.get("best_ndcg", 0.0)
        best_epoch = ckpt.get("best_epoch", -1)
        print(f"Resume from {resume_path}, start_epoch={start_epoch}")

    BEST_PATH = "./result/HSTU_Taobao/1776459191/best.pth"
    inference_only = False  # 设为 True 可直接评估（前提是已加载训练好的 checkpoint）
    if not inference_only:
        # 消融
        if config.use_behavior_module:
            scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)
        for epoch in range(start_epoch, num_epochs + 1):
            model.train()
            epoch_loss = 0.0
            step_count = 0
            total_steps = len(train_dataloader)
            epoch_start = time.time()
            print(f"epoch {epoch}/{num_epochs} start: total_steps={total_steps}")

            for step, batch in enumerate(train_dataloader, start=1):
                user_id = batch["user_id"].to(device, non_blocking=True)
                train_seq = batch["train_seq"].to(device, non_blocking=True)
                train_time_seq = batch["train_time_seq"].to(device, non_blocking=True)
                train_pos = batch["train_pos_seq"].to(device, non_blocking=True)
                train_neg = batch["train_neg_seq"].to(device, non_blocking=True)
                train_type_seq = batch["train_type_seq"].to(device, non_blocking=True) if config.use_behavior_module else None

                with torch.autocast(device_type=device, dtype=torch.float16, enabled=torch.cuda.is_available()):
                    pos_logits, neg_logits = model(
                        user_ids=user_id,
                        log_seqs=train_seq,
                        pos_seqs=train_pos,
                        neg_seqs=train_neg,
                        seq_time=train_time_seq,
                        type_seq=train_type_seq 
                    )
                    main_loss = info_nce_loss(
                        pos_logits=pos_logits,
                        neg_logits=neg_logits,
                        pos_seqs=train_pos,
                        neg_seqs=train_neg,
                        temperature=temperature,
                    )

                    loss = main_loss

                    # 消融：只有Exp5,6的loss
                    if config.enable_behavior_loss:
                        bias_table = model.behavior_mod.current_pair_bias_table().mean(dim=0)
                        loss_bias = (
                            torch.relu(bias_table[4, 2] - bias_table[4, 3]) +
                            torch.relu(bias_table[4, 3] - bias_table[4, 1])
                        )
                        pair_reg = 1e-4 * (model.behavior_mod.type_pair_raw ** 2).mean()
                        loss += pair_reg + 0.01 * loss_bias

                optimizer.zero_grad()
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()

                epoch_loss += loss.item()
                step_count += 1

                if (step % progress_every == 0) or (step == total_steps):
                    elapsed = time.time() - epoch_start
                    steps_per_sec = step / max(elapsed, 1e-6)
                    eta_sec = (total_steps - step) / max(steps_per_sec, 1e-6)
                    avg_loss_so_far = epoch_loss / max(step_count, 1)
                    print(
                        f"epoch {epoch}/{num_epochs} step {step}/{total_steps} "
                        f"loss={avg_loss_so_far:.6f} speed={steps_per_sec:.2f} step/s ETA={eta_sec/60.0:.1f} min"
                    )

            avg_loss = epoch_loss / max(step_count, 1)
            print(f"epoch {epoch} train_loss {avg_loss:.6f} time={(time.time() - epoch_start)/60.0:.2f} min")
            if hasattr(model, 'type_rope_scale'):
                # 如果使用了 torch.compile，需要访问 model._orig_mod
                curr_model = model._orig_mod if hasattr(model, '_orig_mod') else model
                scales = curr_model.type_rope_scale.weight.detach().cpu().numpy()
                print(f"--- Epoch {epoch} Type Scales (0:Pad, 1:pv, 2:fav, 3:cart, 4:buy) ---")
                print(scales.flatten())        

            # 每个 epoch 保存 latest（用于恢复）
            torch.save(
                {
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "best_hr": best_hr,
                    "best_ndcg": best_ndcg,
                    "best_epoch": best_epoch,
                    "config": {
                        "batch_size": batch_size,
                        "num_neg": num_neg,
                        "temperature": temperature,
                        "seed": seed,
                        "user_num": user_num,
                        "item_num": item_num,
                    },
                },
                latest_ckpt,
            )

            if epoch % eval_every == 0:
                hr10, ndcg10 = evaluate_hr_ndcg(model, test_dataloader, device, config, k=10)
                print(f"eval HR@10={hr10:.4f}, NDCG@10={ndcg10:.4f}")

                # 任一指标提升即视为最佳
                is_best = (hr10 > best_hr) or (ndcg10 > best_ndcg)
                if is_best:
                    best_hr = max(best_hr, hr10)
                    best_ndcg = max(best_ndcg, ndcg10)
                    best_epoch = epoch
                    torch.save(
                        {
                            "epoch": epoch,
                            "model_state_dict": model.state_dict(),
                            "optimizer_state_dict": optimizer.state_dict(),
                            "best_hr": best_hr,
                            "best_ndcg": best_ndcg,
                            "best_epoch": best_epoch,
                            "config": {
                                "batch_size": batch_size,
                                "num_neg": num_neg,
                                "temperature": temperature,
                                "seed": seed,
                                "user_num": user_num,
                                "item_num": item_num,
                            },
                        },
                        best_ckpt,
                    )

                with open(log_file, "a", encoding="utf-8") as f:
                    f.write(
                        f"epoch={epoch}  train_loss={avg_loss:.6f}  HR@10={hr10:.6f}  NDCG@10={ndcg10:.6f}  "
                        f"best_epoch={best_epoch}  best_hr={best_hr:.6f}  best_ndcg={best_ndcg:.6f}\n"
                    )
            if epoch >= 10:
                # 消融
                if config.use_behavior_module:
                    scheduler.step()
        
        print("Training Done")
        print("save_dir:", save_dir)
    else:
        print("Inference Only Mode")
        checkpoint = torch.load(BEST_PATH, map_location=device, weights_only=True)
        model.load_state_dict(checkpoint["model_state_dict"])
        # model.eval()
        hr10, ndcg10 = evaluate_hr_ndcg(model, test_dataloader, device, config, k=10)
        print(f"eval HR@10={hr10:.4f}, NDCG@10={ndcg10:.4f}")