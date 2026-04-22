import math
import torch
import torch.nn as nn
from Config import *

class RelativeAttentionBiasModule(nn.Module):
    """Only time-gap bucket bias, outputs [B, H, Lq, Lk]."""

    def __init__(self, num_heads=1, time_num_buckets=64, max_time_span=86400 * 90, share_across_heads=True):
        super().__init__()
        self.num_heads = num_heads
        self.time_num_buckets = time_num_buckets
        self.max_time_span = max_time_span
        emb_dim = 1 if share_across_heads else num_heads
        self.time_bias = nn.Embedding(time_num_buckets, emb_dim)
        nn.init.trunc_normal_(self.time_bias.weight, std=0.02)
        self.register_buffer("_boundaries", self._build_boundaries(time_num_buckets, max_time_span), persistent=False)

    @staticmethod
    def _build_boundaries(num_buckets, max_val):
        steps = max(1, num_buckets - 1)
        start = math.log(1.0)
        end = math.log(max(max_val, 1))
        log_part = torch.exp(torch.linspace(start, end, steps=steps))
        b = torch.unique(torch.floor(log_part.clamp(min=1)).to(torch.int64))
        return b.to(torch.float32)

    def forward(self, ts_q, ts_k):
        tdiff = (ts_q.unsqueeze(2) - ts_k.unsqueeze(1)).abs().clamp_min(1).to(torch.float32)
        bucket = torch.bucketize(tdiff, self._boundaries.to(ts_q.device))
        bias = self.time_bias(bucket)  # [B, L, L, emb_dim]
        bias = bias.squeeze(-1).unsqueeze(1)  # [B, 1, L, L]
        return bias


class BehaviorTimeModulator(nn.Module):
    def __init__(self, n_heads, d_model, config, type_dim=16, hidden_dim=32, n_types=5):
        super().__init__()
        self.n_heads = n_heads
        self.d_model = d_model
        self.config = config
        self.n_types = n_types

        self.type_emb = nn.Embedding(n_types, type_dim, padding_idx=0)

        # k,v,g gate
        self.k_gate_mlp = nn.Sequential(
            nn.Linear(type_dim + 1, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, n_heads),
        )
        self.v_gate_mlp = nn.Sequential(
            nn.Linear(type_dim + 1, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, n_heads),
        )
        self.q_gate_mlp = nn.Sequential(
            nn.Linear(type_dim + 1, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, n_heads),
        )
        # 用于特征融合的 Gate
        self.fusion_gate = nn.Sequential(
            nn.Linear(type_dim + 1, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, d_model),
            nn.Sigmoid()
        )
        self.behavior_proj = nn.Sequential(
            nn.Linear(type_dim + 1, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, d_model),
        )
        self.lambda_mlp = nn.Sequential(
            nn.Linear(type_dim + 1, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, 1),
        )

        # Behavior pair bias: fixed prior + trainable residual
        prior = torch.zeros(n_heads, n_types, n_types)
        
        # Padding 行/列保持 0
        # row = Query, col = Key
        prior[:, 1, 1] = 0.05   # PV <- PV
        prior[:, 2, 1] = 0.35   # Fav <- PV
        prior[:, 2, 2] = 0.05   # Fav <- Fav
        prior[:, 3, 2] = 0.85   # Cart <- Fav
        prior[:, 3, 1] = 0.25   # Cart <- PV
        prior[:, 3, 3] = 0.05   # Cart <- Cart
        prior[:, 4, 3] = 1.20   # Buy <- Cart   (*)
        prior[:, 4, 2] = 0.80   # Buy <- Fav
        prior[:, 4, 1] = 0.25   # Buy <- PV
        prior[:, 4, 4] = 0.10   # Buy <- Buy
        
        self.register_buffer("type_pair_prior", prior, persistent=True)
        
        self.type_pair_raw = nn.Parameter(torch.zeros(n_heads, n_types, n_types))
        nn.init.trunc_normal_(self.type_pair_raw, std=0.02)
        
        # bias 在 attention logits 里的缩放系数
        self.type_pair_scale = nn.Parameter(torch.tensor(1.5))
        
        nn.init.trunc_normal_(self.type_emb.weight, std=0.02)
        with torch.no_grad():
            self.type_emb.weight[0].fill_(0)

    def current_pair_bias_table(self):
    # prior + bounded residual，避免矩阵失控
        return self.type_pair_prior + 0.25 * torch.tanh(self.type_pair_raw)

    @staticmethod
    def _delta_t(seq_time, pad_mask):
        dt = torch.zeros_like(seq_time, dtype=torch.float32)
        if seq_time.size(1) > 1:
            diff = (seq_time[:, 1:] - seq_time[:, :-1]).clamp_min(0).to(torch.float32)
            dt[:, 1:] = diff
        dt = dt * pad_mask.to(torch.float32)
        return dt

    def forward(self, type_seq, seq_time):
        pad_mask = (type_seq != 0)
        dt = self._delta_t(seq_time, pad_mask)
        
        dt_feat_raw = torch.log1p(dt).unsqueeze(-1)
        type_e_raw = self.type_emb(type_seq.long())

        mode = self.config.behavior_mode
        if mode == "dynamic_only":
            type_e = torch.zeros_like(type_e_raw)
            dt_feat = dt_feat_raw
        elif mode == "behavior_only":
            type_e = type_e_raw
            dt_feat = torch.zeros_like(dt_feat_raw)
        else:
            type_e = type_e_raw
            dt_feat = dt_feat_raw
        
        x = torch.cat([type_e, dt_feat], dim=-1)

        rope_lambda = 1.0 + 0.15 * torch.tanh(self.lambda_mlp(x))
        q_gate = 1.0 + 0.12 * torch.tanh(self.q_gate_mlp(x)) 
        k_gate = 1.0 + 0.12 * torch.tanh(self.k_gate_mlp(x))
        v_gate = 1.0 + 0.25 * torch.tanh(self.v_gate_mlp(x)) 
        
        f_gate = self.fusion_gate(x)
        behavior_embed = self.behavior_proj(x)

        # Masking
        m = pad_mask.unsqueeze(-1).to(x.dtype)
        rope_lambda = rope_lambda * m
        behavior_embed = behavior_embed * m
        q_gate = q_gate * m + (~pad_mask).unsqueeze(-1)
        k_gate = k_gate * m + (~pad_mask).unsqueeze(-1)
        v_gate = v_gate * m + (~pad_mask).unsqueeze(-1)

        return rope_lambda, q_gate, k_gate, v_gate, f_gate, behavior_embed, pad_mask

    def pair_bias(self, type_seq):
        bias_table = self.current_pair_bias_table()   # [H, T, T]
        pair_id = type_seq.unsqueeze(2) * self.n_types + type_seq.unsqueeze(1)  # [B, L, L]
        flat = bias_table.reshape(self.n_heads, -1)   # [H, T*T]
        bias = flat[:, pair_id].permute(1, 0, 2, 3).contiguous()  # [B, H, L, L]
        valid = (type_seq != 0)
        mask = (valid.unsqueeze(2) & valid.unsqueeze(1)).unsqueeze(1)
        return bias * mask
        
    def pair_bias_l2(self):
        return (self.type_pair_raw ** 2).mean()
        
class SequentialTransductionUnit(nn.Module):
    def __init__(self, d_model, n_heads, config, dropout=0.2, attn_dropout=0.1, rab=None):
        super().__init__()
        self.d_model, self.n_heads = d_model, n_heads
        self.d_head = d_model // n_heads
        self.rab = rab
        # 消融开关
        self.config = config

        self.proj = nn.Linear(d_model, n_heads * (self.d_head * 4))
        self.act = nn.SiLU()
        self.dropout = nn.Dropout(dropout)
        self.attn_drop = nn.Dropout(attn_dropout)
        self.out = nn.Linear(d_model, d_model)
        self.norm = nn.LayerNorm(d_model)

        # 消融
        if config.use_behavior_module:
            self.head_scale = nn.Parameter(torch.ones(n_heads) * (self.d_head ** -0.5))
        else:
            nn.init.trunc_normal_(self.proj.weight, std=0.02)
            nn.init.zeros_(self.proj.bias)
            nn.init.trunc_normal_(self.out.weight, std=0.02)
            nn.init.zeros_(self.out.bias)

    def _split(self, t):
        B, L, _ = t.shape
        return t.view(B, L, self.n_heads, self.d_head).permute(0, 2, 1, 3).contiguous()

    def _apply_rope(self, q, k, rope_lambda=None):
        B, H, L, D = q.shape
        inv_freq = 1.0 / (10000 ** (torch.arange(0, D, 2, device=q.device).float() / D))
        # 消融
        if getattr(self.config, "use_behavior_module", True):
            # Exp 4,5,6
            if rope_lambda is not None:
                pos = torch.cumsum(rope_lambda.squeeze(-1), dim=1)
                freqs = torch.einsum("bl,d->bld", pos, inv_freq).unsqueeze(1)
            else:
                pos = torch.arange(L, device=q.device).float()
                freqs = torch.einsum("l,d->ld", pos, inv_freq).unsqueeze(0).unsqueeze(0)
        else:
            # Exp 1,2,3
            pos = torch.arange(L, device=q.device, dtype=torch.float32)
            freqs = torch.einsum("l,d->ld", pos, inv_freq).unsqueeze(0).unsqueeze(0)            
        
        cos, sin = freqs.cos().to(q.dtype), freqs.sin().to(q.dtype)

        if getattr(self.config, "use_behavior_module", True):
            def rot(t):
                t_even, t_odd = t[..., 0::2], t[..., 1::2]
                return torch.cat([t_even * cos - t_odd * sin, t_even * sin + t_odd * cos], dim=-1)
            return rot(q), rot(k)
        else:
            q_even, q_odd = q[..., 0::2], q[..., 1::2]
            k_even, k_odd = k[..., 0::2], k[..., 1::2]
    
            q_rot_even = q_even * cos - q_odd * sin
            q_rot_odd = q_even * sin + q_odd * cos
            k_rot_even = k_even * cos - k_odd * sin
            k_rot_odd = k_even * sin + k_odd * cos
    
            q_out = torch.empty_like(q)
            k_out = torch.empty_like(k)
            q_out[..., 0::2] = q_rot_even
            q_out[..., 1::2] = q_rot_odd
            k_out[..., 0::2] = k_rot_even
            k_out[..., 1::2] = k_rot_odd
            return q_out, k_out

    def forward(self, x, attn_mask, ts, rope_lambda=None, q_gate=None, k_gate=None, v_gate=None, type_pair_bias=None):
        B, L, _ = x.shape
        u, v, q, k = torch.split(self.act(self.proj(x)), self.n_heads * self.d_head, dim=-1)
        u, v, q, k = self._split(u), self._split(v), self._split(q), self._split(k)

        # 消融，排除Exp 2
        if getattr(self.config, "use_rope", True):
            q, k = self._apply_rope(q, k, rope_lambda)

        # 消融
        if self.config.use_behavior_module:
            # 门控应用
            if q_gate is not None: q = q * q_gate.permute(0, 2, 1).unsqueeze(-1)
            if k_gate is not None: k = k * k_gate.permute(0, 2, 1).unsqueeze(-1)
            if v_gate is not None: v = v * v_gate.permute(0, 2, 1).unsqueeze(-1)

        attn_logits = torch.einsum("bhid,bhjd->bhij", q, k)

        #消融
        if self.config.use_behavior_module:
            # 可学习的 head_scale
            attn_logits *= self.head_scale.view(1, -1, 1, 1)
        else:
            # 固定值 d_head
            attn_logits /= math.sqrt(self.d_head)

        # 消融，排除Exp 1
        if self.config.use_rab and self.rab is not None and ts is not None:
            attn_logits = attn_logits + 2.0 * self.rab(ts, ts)

        if self.config.use_behavior_module and type_pair_bias is not None:
            attn_logits = attn_logits + self.rab_scale * type_pair_bias if hasattr(self, "rab_scale") else attn_logits + type_pair_bias
            attn_logits = attn_logits + 3.0 * type_pair_bias # 加强bias
        
        # SiLU
        attn_logits = self.act(attn_logits)
        if self.config.use_behavior_module:
            attn_logits = attn_logits.masked_fill(~attn_mask.unsqueeze(1), 0.0)
        else:
            attn_logits = attn_logits * attn_mask.unsqueeze(1).to(attn_logits.dtype)
        
        y = torch.einsum("bhij,bhjd->bhid", self.attn_drop(attn_logits), v)
        
        y = y.permute(0, 2, 1, 3).contiguous().view(B, L, self.d_model)
        y = y * u.permute(0, 2, 1, 3).contiguous().view(B, L, self.d_model)

        if self.config.use_behavior_module:
            return self.norm(x + self.dropout(self.out(y)))
        else:
            y = self.out(y)
            y = self.dropout(y)
            return self.norm(x + y)

class HSTURecTaobao(nn.Module):
    def __init__(self, user_num, item_num, config, maxlen=154, d_model=64, n_heads=4, n_blocks=2, dropout=0.2):
        super().__init__()
        self.user_num = user_num
        self.item_num = item_num
        self.config = config
        self.maxlen = maxlen
        self.d_model = d_model
        self.n_heads = n_heads

        self.item_emb = nn.Embedding(item_num + 1, d_model, padding_idx=0)
        # 消融
        if config.use_behavior_module:
            self.behavior_mod = BehaviorTimeModulator(n_heads=n_heads, d_model=d_model, config=config)

        self.emb_dropout = nn.Dropout(dropout)

        rab = RelativeAttentionBiasModule(num_heads=n_heads)
        
        self.layers = nn.ModuleList([
            SequentialTransductionUnit(d_model=d_model, n_heads=n_heads, config=config, dropout=dropout, attn_dropout=0.1, rab=rab)
            for _ in range(n_blocks)
        ])

        nn.init.trunc_normal_(self.item_emb.weight, std=0.02)
        with torch.no_grad():
            self.item_emb.weight[0].fill_(0)

        self.time_proj = nn.Linear(4, d_model, bias=False)

    def log2feats(self, log_seqs, seq_time, type_seq=None):
        B, L = log_seqs.shape
        seqs = log_seqs.long()
        
        emb = self.item_emb(seqs) * math.sqrt(self.d_model)

        pad_mask = (seqs != 0)

        rope_lambda = None
        q_gate = None
        behavior_embed = None
        type_pair_bias = None

        # 消融 Exp 4,5,6
        if self.config.use_behavior_module and type_seq is not None:
            rope_lambda, q_gate, k_gate, v_gate, f_gate, behavior_embed, _ = self.behavior_mod(type_seq, seq_time)
            type_pair_bias = self.behavior_mod.pair_bias(type_seq) if self.config.exp_id != 4 else None # 消融 Exp 5,6
            emb = emb * f_gate + behavior_embed            

        emb = self.emb_dropout(emb)

        # Correct causal + padding mask
        causal = torch.tril(torch.ones((L, L), dtype=torch.bool, device=seqs.device))
        # 消融
        if self.config.use_behavior_module:
            # Exp 4,5,6 双向padding mask
            valid_2d = pad_mask.unsqueeze(1) & pad_mask.unsqueeze(2)
            attn_mask = causal.unsqueeze(0) & valid_2d
        else:
            # Exp 1,2,3 单向有效mask
            attn_mask = causal.unsqueeze(0) & pad_mask.unsqueeze(1)

        out = emb
        for layer in self.layers:
            if self.config.use_behavior_module:
                out = layer(
                    out,
                    attn_mask=attn_mask,
                    ts=seq_time,
                    rope_lambda=rope_lambda,
                    q_gate=q_gate,
                    k_gate=k_gate,   
                    v_gate=v_gate,  
                    type_pair_bias=type_pair_bias,
                )
            else:
                out = layer(out, attn_mask=attn_mask, ts=seq_time)

        # 消融 Exp 4,5,6
        if self.config.use_behavior_module:
            out = out * pad_mask.unsqueeze(-1).to(out.dtype)
            
        return out

    def forward(self, user_ids, log_seqs, pos_seqs, neg_seqs, seq_time, type_seq=None):
        feats = self.log2feats(log_seqs, seq_time, type_seq=type_seq)
        pos_emb = self.item_emb(pos_seqs.long())
        pos_logits = (feats * pos_emb).sum(dim=-1)

        neg_emb = self.item_emb(neg_seqs.long())
        neg_logits = (feats.unsqueeze(2) * neg_emb).sum(dim=-1)
        return pos_logits, neg_logits

    @torch.no_grad()
    def predict(self, log_seqs, item_indices, seq_time, type_seq=None):
        feats = self.log2feats(log_seqs, seq_time, type_seq=type_seq)[:, -1, :]
        item_embs = self.item_emb(item_indices.long())
        logits = torch.einsum("bcd,bd->bc", item_embs, feats)
        return torch.sigmoid(logits)