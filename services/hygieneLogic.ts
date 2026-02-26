

import { HygieneItem, HygieneCategory } from '../types';

/**
 * HYGIENE MODULE LOGIC CORE
 * Philosophy: "Fighting Entropy"
 */

export enum HygieneStatus {
  FRESH = 'FRESH',   // 0.0 - 0.5
  NORMAL = 'NORMAL', // 0.5 - 1.0
  DUSTY = 'DUSTY',   // 1.0 - 1.5
  MESSY = 'MESSY'    // > 1.5
}

// Default Configuration Map
export const HYGIENE_DEFAULT_CONFIG: Record<HygieneCategory, Omit<HygieneItem, 'id' | 'last_cleaned_at'>> = {
  stove: { category: 'stove', name: '灶台', base_interval_days: 2, is_public_area: true, preferred_unit: 'DAYS' },
  floor_vac: { category: 'floor_vac', name: '地面吸尘', base_interval_days: 3, is_public_area: true, preferred_unit: 'DAYS' },
  toilet: { category: 'toilet', name: '马桶', base_interval_days: 7, is_public_area: true, preferred_unit: 'WEEKS' },
  floor_mop: { category: 'floor_mop', name: '地面拖洗', base_interval_days: 7, is_public_area: true, preferred_unit: 'WEEKS' },
  bedding: { category: 'bedding', name: '床上四件套', base_interval_days: 14, is_public_area: false, preferred_unit: 'WEEKS' },
  washer: { category: 'washer', name: '洗衣机自洁', base_interval_days: 30, is_public_area: true, preferred_unit: 'MONTHS' },
  ac_filter: { category: 'ac_filter', name: '空调滤网', base_interval_days: 90, is_public_area: true, preferred_unit: 'MONTHS' },
  curtain: { category: 'curtain', name: '窗帘', base_interval_days: 180, is_public_area: true, preferred_unit: 'MONTHS' },
};

export const INITIAL_HYGIENE_ITEMS: HygieneItem[] = Object.keys(HYGIENE_DEFAULT_CONFIG).map((key, index) => {
  const config = HYGIENE_DEFAULT_CONFIG[key as HygieneCategory];
  // Stagger initial clean times so they don't all expire at once for the demo
  const staggerDays = index * 2; 
  return {
    id: `h_item_${key}`,
    last_cleaned_at: Date.now() - (staggerDays * 24 * 3600 * 1000), 
    ...config
  };
});

/**
 * Calculates the entropy progress for a specific item.
 * 
 * Formula: Progress = (CurrentTime - LastCleanedTime) / (BaseThreshold / LoadFactor)
 * 
 * @param lastCleanedAt Timestamp (ms)
 * @param baseIntervalDays Days
 * @param isPublicArea Boolean
 * @param householdSize Number of people
 * @param currentTime Timestamp (ms)
 * @returns number (Progress score: 0.0 to 2.0+)
 */
// [PORTABLE]
export const calculate_entropy = (
  lastCleanedAt: number,
  baseIntervalDays: number,
  isPublicArea: boolean,
  householdSize: number,
  currentTime: number
): number => {
  const ONE_DAY_MS = 24 * 3600 * 1000;
  
  // 1. Calculate Load Factor
  // Default 1.0. If > 2 people and public area, 1.2 (dirty 20% faster)
  let loadFactor = 1.0;
  if (householdSize > 2 && isPublicArea) {
    loadFactor = 1.2;
  }

  // 2. Calculate Effective Threshold (ms)
  // Threshold shrinks as load factor increases
  const effectiveThresholdMs = (baseIntervalDays * ONE_DAY_MS) / loadFactor;

  // 3. Calculate Elapsed Time
  const elapsedMs = Math.max(0, currentTime - lastCleanedAt);

  // 4. Calculate Progress
  if (effectiveThresholdMs === 0) return 100; // Safety
  return elapsedMs / effectiveThresholdMs;
};

/**
 * Determines the status enum based on entropy progress.
 */
// [PORTABLE]
export const get_hygiene_status = (progress: number): HygieneStatus => {
  if (progress <= 0.5) return HygieneStatus.FRESH;
  if (progress <= 1.0) return HygieneStatus.NORMAL;
  if (progress <= 1.5) return HygieneStatus.DUSTY;
  return HygieneStatus.MESSY;
};

/**
 * Returns UI-friendly copy based on status.
 */
export const get_status_copy = (status: HygieneStatus, daysSince: number): string => {
  switch (status) {
    case HygieneStatus.FRESH:
      return "干净得在发光 ✨";
    case HygieneStatus.NORMAL:
      return daysSince === 0 ? "刚刚好" : `上次打扫是 ${daysSince} 天前`;
    case HygieneStatus.DUSTY:
      return "好像该照顾一下了 🌿";
    case HygieneStatus.MESSY:
      return "这里需要一次大扫除 🛁";
    default:
      return "";
  }
};
