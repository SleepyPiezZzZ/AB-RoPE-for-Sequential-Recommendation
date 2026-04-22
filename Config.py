class AblationConfig:
    def __init__(self, exp_id):
        self.exp_id = exp_id
        # (1) HSTU + Standard RoPE
        # (2) HSTU + Time-aware attention bias (RAB)
        # (3) HSTU + Standard RoPE + RAB (Baseline)
        # (4) Baseline + Dynamic-frequency-only-RoPE
        # (5) Baseline + Behavior-only
        # (6) Full Model
        
        # 基础组件开关
        self.use_rope = exp_id in [1, 3, 4, 5, 6]
        self.use_rab = exp_id in [2, 3, 4, 5, 6]
        
        # 行为模块开关 (Exp 4, 5, 6)
        self.use_behavior_module = exp_id in [4, 5, 6]
        
        # 行为模块内部的细分模式
        # 'dynamic_only': 屏蔽行为语义，只留时间动态
        # 'behavior_only': 屏蔽时间动态，只留行为语义
        # None: 完整模式
        self.behavior_mode = None
        if exp_id == 4:
            self.behavior_mode = 'dynamic_only'
        elif exp_id == 5:
            self.behavior_mode = 'behavior_only'
            
        # 训练逻辑开关
        self.enable_behavior_loss = exp_id in [5, 6] # 只有包含行为语义时才加 Loss 约束
        self.freeze_behavior_params = (exp_id == 4)  # Exp 4 需要锁定行为参数梯度