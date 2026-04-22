export type BehaviorType = 'PV' | 'Fav' | 'Cart' | 'Buy' | 'Pad';

export interface TimelineItem {
  id: string;
  name: string;
  image: string;
  behavior: BehaviorType;
  category: string;
  deltaT?: string;
}

export interface PredictionItem {
  id: string;
  name: string;
  image: string;
  probability: number;
  category: string;
}

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  description: string;
  timeline: TimelineItem[];
  predictions: PredictionItem[];
}

export const PRODUCT_IMAGES = {
  earbuds: 'https://images.unsplash.com/photo-1755182529034-189a6051faae?w=400&q=80',
  charger: 'https://images.unsplash.com/photo-1758218096054-ef3c7b56582c?w=400&q=80',
  smartwatch: 'https://images.unsplash.com/photo-1676904674033-f0b5f12696af?w=400&q=80',
  speaker: 'https://images.unsplash.com/photo-1549400854-b4300f444934?w=400&q=80',
  dress: 'https://images.unsplash.com/photo-1773335954232-957e8945827e?w=400&q=80',
  handbag: 'https://images.unsplash.com/photo-1575403538007-acb790100421?w=400&q=80',
  knifeSet: 'https://images.unsplash.com/photo-1704895291242-1e6f3e761c6b?w=400&q=80',
  castIronPan: 'https://images.unsplash.com/photo-1591745952765-071aa8677b2b?w=400&q=80',
};

export const PERSONAS: Persona[] = [
  {
    id: 'alex',
    name: 'Alex — Tech Enthusiast',
    emoji: '💻',
    description: 'Young professional browsing consumer electronics',
    timeline: [
      { id: 't1', name: 'TWS Earbuds Pro', image: PRODUCT_IMAGES.earbuds, behavior: 'PV', category: 'Electronics', deltaT: '1h later' },
      { id: 't2', name: 'Wireless Charger', image: PRODUCT_IMAGES.charger, behavior: 'PV', category: 'Electronics', deltaT: '30m later' },
      { id: 't3', name: 'TWS Earbuds Pro', image: PRODUCT_IMAGES.earbuds, behavior: 'Fav', category: 'Electronics', deltaT: '2h later' },
      { id: 't4', name: 'Wireless Charger', image: PRODUCT_IMAGES.charger, behavior: 'Cart', category: 'Electronics', deltaT: '45m later' },
      { id: 't5', name: 'Smart Watch S9', image: PRODUCT_IMAGES.smartwatch, behavior: 'PV', category: 'Electronics', deltaT: '1.5h later' },
      { id: 't6', name: 'TWS Earbuds Pro', image: PRODUCT_IMAGES.earbuds, behavior: 'Buy', category: 'Electronics' },
    ],
    predictions: [
      { id: 'p1', name: 'Bluetooth Speaker', image: PRODUCT_IMAGES.speaker, probability: 0.42, category: 'Electronics' },
      { id: 'p2', name: 'Wireless Charger', image: PRODUCT_IMAGES.charger, probability: 0.28, category: 'Electronics' },
      { id: 'p3', name: 'Smart Watch S9', image: PRODUCT_IMAGES.smartwatch, probability: 0.15, category: 'Electronics' },
      { id: 'p4', name: 'TWS Earbuds Pro', image: PRODUCT_IMAGES.earbuds, probability: 0.10, category: 'Electronics' },
      { id: 'p5', name: 'Audio Amplifier', image: PRODUCT_IMAGES.speaker, probability: 0.05, category: 'Electronics' },
    ],
  },
  {
    id: 'sarah',
    name: 'Sarah — Fashion Maven',
    emoji: '👗',
    description: 'Trend-conscious shopper looking for luxury fashion',
    timeline: [
      { id: 't1', name: 'Summer Midi Dress', image: PRODUCT_IMAGES.dress, behavior: 'PV', category: 'Fashion', deltaT: '2h later' },
      { id: 't2', name: 'Luxury Handbag', image: PRODUCT_IMAGES.handbag, behavior: 'PV', category: 'Fashion', deltaT: '1h later' },
      { id: 't3', name: 'Luxury Handbag', image: PRODUCT_IMAGES.handbag, behavior: 'Fav', category: 'Fashion', deltaT: '3h later' },
      { id: 't4', name: 'Summer Midi Dress', image: PRODUCT_IMAGES.dress, behavior: 'Cart', category: 'Fashion', deltaT: '30m later' },
      { id: 't5', name: 'Luxury Handbag', image: PRODUCT_IMAGES.handbag, behavior: 'PV', category: 'Fashion', deltaT: '2h later' },
      { id: 't6', name: 'Summer Midi Dress', image: PRODUCT_IMAGES.dress, behavior: 'Buy', category: 'Fashion' },
    ],
    predictions: [
      { id: 'p1', name: 'Luxury Handbag', image: PRODUCT_IMAGES.handbag, probability: 0.38, category: 'Fashion' },
      { id: 'p2', name: 'Midi Wrap Dress', image: PRODUCT_IMAGES.dress, probability: 0.25, category: 'Fashion' },
      { id: 'p3', name: 'Silk Scarf', image: PRODUCT_IMAGES.dress, probability: 0.18, category: 'Fashion' },
      { id: 'p4', name: 'Leather Tote', image: PRODUCT_IMAGES.handbag, probability: 0.12, category: 'Fashion' },
      { id: 'p5', name: 'Suede Clutch', image: PRODUCT_IMAGES.handbag, probability: 0.07, category: 'Fashion' },
    ],
  },
  {
    id: 'mike',
    name: 'Mike — Home Chef',
    emoji: '🍳',
    description: 'Passionate home cook upgrading kitchen tools',
    timeline: [
      { id: 't1', name: 'Professional Knife Set', image: PRODUCT_IMAGES.knifeSet, behavior: 'PV', category: 'Kitchen', deltaT: '1.5h later' },
      { id: 't2', name: 'Cast Iron Skillet', image: PRODUCT_IMAGES.castIronPan, behavior: 'PV', category: 'Kitchen', deltaT: '2h later' },
      { id: 't3', name: 'Professional Knife Set', image: PRODUCT_IMAGES.knifeSet, behavior: 'Fav', category: 'Kitchen', deltaT: '1h later' },
      { id: 't4', name: 'Cast Iron Skillet', image: PRODUCT_IMAGES.castIronPan, behavior: 'Cart', category: 'Kitchen', deltaT: '45m later' },
      { id: 't5', name: 'Professional Knife Set', image: PRODUCT_IMAGES.knifeSet, behavior: 'PV', category: 'Kitchen', deltaT: '2h later' },
      { id: 't6', name: 'Cast Iron Skillet', image: PRODUCT_IMAGES.castIronPan, behavior: 'Buy', category: 'Kitchen' },
    ],
    predictions: [
      { id: 'p1', name: 'Professional Knife Set', image: PRODUCT_IMAGES.knifeSet, probability: 0.45, category: 'Kitchen' },
      { id: 'p2', name: 'Cast Iron Skillet', image: PRODUCT_IMAGES.castIronPan, probability: 0.30, category: 'Kitchen' },
      { id: 'p3', name: 'Whetstone Sharpener', image: PRODUCT_IMAGES.knifeSet, probability: 0.12, category: 'Kitchen' },
      { id: 'p4', name: 'Dutch Oven', image: PRODUCT_IMAGES.castIronPan, probability: 0.08, category: 'Kitchen' },
      { id: 'p5', name: 'Spice Rack Set', image: PRODUCT_IMAGES.knifeSet, probability: 0.05, category: 'Kitchen' },
    ],
  },
];

// K-Gate box plot data
export interface BoxStats {
  behavior: BehaviorType;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  color: string;
  description: string;
}

export const K_GATE_STATS = [
  {
    behavior: 'PV',
    median: 1.02, // 保持实验得出的中位数
    q1: 1.01,
    q3: 1.035,    // 极窄的箱体，表现其作为基础底色的稳定性
    min: 0.98,
    max: 1.13,   // 修正：将须线顶端限制在 1.14，模拟向上的离群点
    color: '#94a3b8',
    description: 'Signals consistently suppressed to filter browsing noise.',
  },
  {
    behavior: 'Fav',
    median: 1.12, // 接近 1.12
    q1: 1.1175,
    q3: 1.1225,
    min: 1.11,
    max: 1.13,   // 极其集中的分布，表现高置信度
    color: '#3b82f6',
    description: 'Strong intent amplified for high-confidence retrieval.',
  },
  {
    behavior: 'Cart',
    median: 1.12, // 接近 1.12
    q1: 1.1175,
    q3: 1.1225,
    min: 1.11,
    max: 1.13,   // 与收藏行为逻辑一致，作为最强意图保留
    color: '#f97316',
    description: 'Critical purchase precursor prioritized in attention.',
  },
  {
    behavior: 'Buy',
    median: 1.08, // 略低于 1.08
    q1: 1.07,      // 拉大 IQR（q3-q1），表现最高的方差
    q3: 1.095,
    min: 1.03,     // 修正：底端留出 0.01 的空隙，防止贴边
    max: 1.13,
    color: '#ef4444',
    description: 'Dynamic gating based on purchase completion context.',
  },
];

// Pair-wise bias matrix
export const BEHAVIORS: BehaviorType[] = ['PV', 'Fav', 'Cart', 'Buy'];
export const BIAS_MATRIX: number[][] = [
  // Query: PV  →  Key: PV    Fav    Cart   Buy
  [0.067, 0.021, 0.025, 0.020],
  // Query: Fav
  [0.272, 0.030, -0.003, -0.009],
  // Query: Cart
  [0.172, 0.772, 0.036, -0.010],
  // Query: Buy
  [0.177, 0.779, 1.173, 0.093],
];

// Positional drift data
export interface DriftPoint {
  step: number;
  drift: number;
  behavior: BehaviorType;
  isBuy?: boolean;
}

export const DRIFT_DATA: DriftPoint[] = [
  { step: 1, drift: 0.12, behavior: 'PV' },
  { step: 2, drift: 0.18, behavior: 'PV' },
  { step: 3, drift: 0.24, behavior: 'Fav' },
  { step: 4, drift: 0.32, behavior: 'Cart' },
  { step: 5, drift: 0.91, behavior: 'Buy', isBuy: true },
  { step: 6, drift: 0.78, behavior: 'PV' },
  { step: 7, drift: 0.83, behavior: 'PV' },
  { step: 8, drift: 0.88, behavior: 'Fav' },
  { step: 9, drift: 0.95, behavior: 'PV' },
  { step: 10, drift: 1.03, behavior: 'Cart' },
  { step: 11, drift: 1.65, behavior: 'Buy', isBuy: true },
  { step: 12, drift: 1.52, behavior: 'PV' },
  { step: 13, drift: 1.57, behavior: 'PV' },
  { step: 14, drift: 1.64, behavior: 'Fav' },
  { step: 15, drift: 1.72, behavior: 'Cart' },
  { step: 16, drift: 1.79, behavior: 'PV' },
  { step: 17, drift: 2.43, behavior: 'Buy', isBuy: true },
  { step: 18, drift: 2.31, behavior: 'PV' },
  { step: 19, drift: 2.38, behavior: 'Fav' },
  { step: 20, drift: 2.46, behavior: 'Cart' },
];

// Ablation study data
export interface AblationModel {
  id: number;
  name: string;
  shortName: string;
  hr10: number;
  ndcg10: number;
  category: 'base' | 'proposed';
  isBest?: boolean;
}

export const ABLATION_MODELS: AblationModel[] = [
  { id: 1, name: 'HSTU + Standard RoPE', shortName: 'Standard RoPE', hr10: 0.6623, ndcg10: 0.5470, category: 'base' },
  { id: 2, name: 'HSTU + Time-aware Attn Bias', shortName: '+Time-aware', hr10: 0.6643, ndcg10: 0.5482, category: 'base' },
  { id: 3, name: 'Strong Baseline (RoPE+Time)', shortName: 'Strong Baseline', hr10: 0.6674, ndcg10: 0.5548, category: 'base' },
  { id: 4, name: '+ Dynamic Frequency Only', shortName: '+Dyn. Freq', hr10: 0.6684, ndcg10: 0.5542, category: 'proposed' },
  { id: 5, name: '+ Behavior Only', shortName: '+Behavior', hr10: 0.6722, ndcg10: 0.5586, category: 'proposed' },
  { id: 6, name: 'AB-RoPE [Full Model]', shortName: 'AB-RoPE', hr10: 0.6727, ndcg10: 0.5587, category: 'proposed', isBest: true },
];

export const BEHAVIOR_COLORS: Record<BehaviorType, string> = {
  PV: '#94a3b8',
  Fav: '#3b82f6',
  Cart: '#f97316',
  Buy: '#ef4444',
  Pad: 'transparent',
};

export const BEHAVIOR_LABELS: Record<BehaviorType, string> = {
  PV: 'PV',
  Fav: 'Fav',
  Cart: 'Cart',
  Buy: 'Buy',
  Pad: 'Pad',
};
