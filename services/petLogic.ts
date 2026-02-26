

import { PetCareItem, PetCareType, PetState } from '../types';

/**
 * PET MODULE LOGIC CORE (v1.6)
 * Update: Visuals matched to Hygiene Module (Photos + Textures)
 */

// PRD Defined Statuses
export enum PetCareStatus {
  HAPPY = 'HAPPY',   // 0.0 - 0.5
  OKAY = 'OKAY',     // 0.5 - 1.0
  STALE = 'STALE',   // 1.0 - 1.5 (Scratches)
  CRISIS = 'CRISIS'  // > 1.5 (Muddy Paws)
}

// --- Visual Assets ---

// Export Raw SVGs for React Component usage (Random Placement)
export const SCRATCH_SVG_RAW = `data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='rgba(255,255,255,0.4)' stroke-width='4' fill='none'%3E%3Cpath d='M40,40 Q90,90 140,70' /%3E%3Cpath d='M50,50 Q100,100 150,80' /%3E%3Cpath d='M60,60 Q110,110 160,90' /%3E%3C/g%3E%3C/svg%3E`;

export const PAW_PRINT_SVG_RAW = `data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='rgba(90, 60, 40, 0.8)'%3E%3Ccircle cx='50' cy='60' r='15' /%3E%3Cellipse cx='30' cy='35' rx='8' ry='12' transform='rotate(-20 30 35)' /%3E%3Cellipse cx='45' cy='25' rx='8' ry='12' transform='rotate(-10 45 25)' /%3E%3Cellipse cx='65' cy='25' rx='8' ry='12' transform='rotate(10 65 25)' /%3E%3Cellipse cx='80' cy='35' rx='8' ry='12' transform='rotate(20 80 35)' /%3E%3C/g%3E%3C/svg%3E`;

// Keep legacy export for safety if used elsewhere, though we move to component rendering
export const PET_TEXTURES = {
  STALE_OVERLAY: `url("${SCRATCH_SVG_RAW}")`,
  CRISIS_OVERLAY: `url("${PAW_PRINT_SVG_RAW}")`
};

// High-quality images for backgrounds
export const PET_IMAGES: Record<string, string> = {
  feed: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80',
  scoop: 'https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?auto=format&fit=crop&w=600&q=80', // Sand texture
  water: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=600&q=80',
  deep_clean: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
  nails: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=600&q=80',
  bath: 'https://images.unsplash.com/photo-1599150567227-2b7372332997?auto=format&fit=crop&w=600&q=80', // Foam
  deworm: 'https://images.unsplash.com/photo-1623366302587-b38b1ddaefd9?auto=format&fit=crop&w=600&q=80', // Medical/Clean
};

export const get_pet_image = (type: string) => PET_IMAGES[type] || PET_IMAGES['feed'];

export interface PetConfigType {
    type: PetCareType;
    name: string;
    base_interval_hours: number;
    preferred_unit?: 'HOURS' | 'DAYS';
    is_shared: boolean;
    colorTheme: string;
    iconEmoji: string;
    bgGradient: string;
}

// Default Configuration
export const PET_DEFAULT_CONFIG: Record<string, Omit<PetCareItem, 'id' | 'last_action_at'> & { colorTheme: string, iconEmoji: string, bgGradient: string }> = {
  feed: { 
      type: 'feed', 
      name: '干饭', 
      base_interval_hours: 12, 
      preferred_unit: 'HOURS',
      is_shared: false,
      colorTheme: 'text-orange-600',
      iconEmoji: '🍗',
      bgGradient: 'from-orange-50 to-amber-100'
  },
  scoop: { 
      type: 'scoop', 
      name: '铲屎', 
      base_interval_hours: 24, 
      preferred_unit: 'DAYS',
      is_shared: true,
      colorTheme: 'text-stone-600',
      iconEmoji: '🧹',
      bgGradient: 'from-stone-50 to-stone-200'
  },
  water: { 
      type: 'water', 
      name: '换水', 
      base_interval_hours: 24, 
      preferred_unit: 'DAYS',
      is_shared: true,
      colorTheme: 'text-cyan-600',
      iconEmoji: '💧',
      bgGradient: 'from-cyan-50 to-blue-100'
  },
  deep_clean: { 
      type: 'deep_clean', 
      name: '换砂', // Renamed from 砂盆大扫除
      base_interval_hours: 14 * 24, 
      preferred_unit: 'DAYS',
      is_shared: true,
      colorTheme: 'text-indigo-600',
      iconEmoji: '🧼',
      bgGradient: 'from-indigo-50 to-violet-100'
  },
  nails: { 
      type: 'nails', 
      name: '指甲', // Renamed from 剪指甲
      base_interval_hours: 14 * 24, 
      preferred_unit: 'DAYS',
      is_shared: false,
      colorTheme: 'text-rose-600',
      iconEmoji: '💅',
      bgGradient: 'from-rose-50 to-pink-100'
  },
  bath: { 
      type: 'bath' as PetCareType,
      name: '洗澡', // Renamed from 洗白白
      base_interval_hours: 30 * 24, 
      preferred_unit: 'DAYS',
      is_shared: false,
      colorTheme: 'text-sky-600',
      iconEmoji: '🛁',
      bgGradient: 'from-sky-50 to-blue-100'
  },
  deworm: { 
      type: 'deworm' as PetCareType, 
      name: '驱虫', 
      base_interval_hours: 30 * 24, 
      preferred_unit: 'DAYS',
      is_shared: false,
      colorTheme: 'text-emerald-600',
      iconEmoji: '💊',
      bgGradient: 'from-emerald-50 to-green-100'
  },
};

export const INITIAL_PET_ITEMS: PetCareItem[] = Object.keys(PET_DEFAULT_CONFIG).map((key) => {
  const config = PET_DEFAULT_CONFIG[key];
  return {
    id: `p_item_${key}`,
    last_action_at: Date.now(), 
    type: config.type,
    name: config.name,
    base_interval_hours: config.base_interval_hours,
    preferred_unit: config.preferred_unit,
    is_shared: config.is_shared
  };
});

/**
 * Calculates Load Factor based on Pet Count
 */
export const get_pet_load_factor = (isShared: boolean, petCount: number): number => {
  if (isShared && petCount > 1) {
    return 1.5;
  }
  return 1.0;
};

/**
 * Wraps hygiene logic with Pet specific parameters
 */
export const calculate_pet_entropy = (
  item: PetCareItem,
  petCount: number,
  currentTime: number
): number => {
  const loadFactor = get_pet_load_factor(item.is_shared, petCount);
  const thresholdMs = (item.base_interval_hours * 3600 * 1000) / loadFactor;
  const elapsedMs = Math.max(0, currentTime - item.last_action_at);
  
  if (thresholdMs === 0) return 0;
  return elapsedMs / thresholdMs;
};

export const get_pet_status = (progress: number): PetCareStatus => {
  if (progress <= 0.5) return PetCareStatus.HAPPY;
  if (progress <= 1.0) return PetCareStatus.OKAY;
  if (progress <= 1.5) return PetCareStatus.STALE;
  return PetCareStatus.CRISIS;
};

export const get_pet_config = (type: string) => {
    // Fallback for old types like 'grooming' if they exist in legacy data
    if (type === 'grooming') return PET_DEFAULT_CONFIG.bath; 
    return PET_DEFAULT_CONFIG[type] || PET_DEFAULT_CONFIG.feed;
};

// Copywriting (Pet POV)
export const get_pet_copy = (status: PetCareStatus): string => {
  const phrases = {
    [PetCareStatus.HAPPY]: ["最爱铲屎官了！😻", "肚皮吃饱饱~", "呼噜噜...💤", "今天也是元气猫猫！"],
    [PetCareStatus.OKAY]: ["现在感觉还不错", "在此刻，我是一只冷静的猫", "观察人类中...", "一切正常喵"],
    [PetCareStatus.STALE]: ["水有点不新鲜了...", "厕所好挤哦", "有点味道了喵...", "在吗？该干活了"],
    [PetCareStatus.CRISIS]: ["本喵要生气了！😾", "快来救驾！", "这是猫过的日子吗？", "拒绝使用此设施！"]
  };
  
  const list = phrases[status];
  return list[Math.floor(Math.random() * list.length)];
};
