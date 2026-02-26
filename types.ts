



// Domain Types for the Nest Kernel

export enum HomeMode {
  HOME = 'HOME',
  AWAY = 'AWAY',
  SLEEP = 'SLEEP'
}

export enum ThemeMode {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM'
}

export enum UserRole {
  OWNER = 'OWNER', // 一家之主
  MEMBER = 'MEMBER', // 家庭成员
  PET = 'PET'      // 宠物 (Data Container)
}

export enum PetSpecies {
  CAT = 'CAT',
  DOG = 'DOG'
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string; // CSS background class (legacy) or Base64 Data URI (new)
  isCurrentUser?: boolean;
  species?: PetSpecies; // Only for role === PET
}

// --- WATER MODULE SPECIFIC TYPES ---

export interface WaterLog {
  date: string; // YYYY-MM-DD
  daily_consumption_liters: number;
}

export interface SleepWindow {
  start: number; // Hour (0-23)
  end: number;   // Hour (0-23)
}

export type OutlierType = 'FAST_CONSUMPTION' | 'SLOW_CONSUMPTION' | null;

export interface WaterActionReport {
  timestamp: number;
  action: 'REFILL' | 'CALIBRATE' | 'CONFIG';
  is_outlier: boolean;
  outlier_type: OutlierType;
  message?: string;
}

export interface WaterState {
  max_capacity: number; // Liters, default 18.9
  current_level: number; // Liters
  last_refill_timestamp: number; // Epoch
  
  // Core Algorithm Parameters
  learned_hourly_rate: number; // L/h, Long-term habit
  current_cycle_rate: number; // L/h, Immediate rate (mutable by calibration)
  has_calibrated_this_cycle: boolean; // Flag for PRD Scenario B logic
  
  // Config
  sleep_window: SleepWindow;
  
  // Analytics
  history_logs: WaterLog[];
  
  // Feedback Channel
  last_action_report?: WaterActionReport;
}

// --- HYGIENE (CLEANING) MODULE SPECIFIC TYPES ---

export type HygieneCategory = 
  | 'stove' 
  | 'floor_vac' 
  | 'floor_mop' 
  | 'bedding' 
  | 'toilet' 
  | 'washer' 
  | 'ac_filter' 
  | 'curtain';

export interface HygieneItem {
  id: string;
  category: HygieneCategory;
  name: string; // Display Name (e.g., "灶台")
  last_cleaned_at: number; // Epoch
  base_interval_days: number;
  preferred_unit?: 'DAYS' | 'WEEKS' | 'MONTHS'; // New Unit Preference
  is_public_area: boolean;
}

export interface HygieneState {
  items: HygieneItem[];
}

// --- PET MODULE SPECIFIC TYPES ---

export type PetCareType = 
  | 'feed'
  | 'scoop'
  | 'water'
  | 'deep_clean'
  | 'nails'
  | 'bath'
  | 'deworm';

export interface PetCareItem {
  id: string;
  type: PetCareType;
  name: string;
  last_action_at: number; // Epoch
  base_interval_hours: number;
  preferred_unit?: 'HOURS' | 'DAYS'; // User preference for display
  is_shared: boolean; // Affects LoadFactor
}

export interface PetState {
  care_items: PetCareItem[];
}

// --- INVENTORY MODULE SPECIFIC TYPES (v1.5) ---

export type InventoryActionType = 'RESTOCK' | 'OPEN' | 'EDIT';

export interface InventoryLog {
  ts: number;
  action: InventoryActionType;
  delta: number; // +N or -N
  balance: number; // Snapshot of stock after action
}

export interface InventoryCategory {
  id: string;
  name: string;
  emoji: string; // Single Char
}

export interface InventoryItem {
  id: string;
  category_id: string;
  name: string;
  current_stock: number;
  threshold: number;
  is_shared: boolean;
  history_logs: InventoryLog[];
}

export interface InventoryState {
  categories: InventoryCategory[];
  items: InventoryItem[];
}

// --- GLOBAL STATE ---

// The Core State Object (Persisted to LocalStorage)
export interface NestState {
  version: string;
  user: UserProfile; // Current user
  homeName: string;
  members: UserProfile[]; // List of all members in the home (including Pets)
  homeMode: HomeMode;
  themeMode: ThemeMode;
  installDate: number;
  
  // Debug / Time Travel
  debug_time_offset?: number; // Milliseconds to shift "Now" forward

  // Module Presence Flags
  modules: {
    waterEnabled: boolean;
    inventoryEnabled: boolean;
    hygieneEnabled: boolean;
    petEnabled: boolean;
    fridgeEnabled: boolean;
  };

  // Shared Family Data for Business Modules
  moduleData: {
    water: WaterState;
    hygiene: HygieneState;
    pet: PetState;
    inventory: InventoryState;
    fridge: any;    // Legacy placeholder
    [key: string]: any; 
  };

  // Order of modules for the dashboard
  moduleOrder: string[];
}

// Context for the Kernel
export interface NestKernelContextType {
  state: NestState;
  systemTime: number; // The virtual "Now"
  setHomeMode: (mode: HomeMode) => void;
  updateUser: (name: string, avatarUrl?: string) => void;
  updateHomeName: (name: string) => void;
  addMember: (name: string) => void;
  addPet: (name: string, species: PetSpecies) => void;
  removeMember: (id: string) => void;
  reorderModules: (newOrder: string[]) => void;
  updateModuleData: (moduleId: string, data: any) => void;
  
  // Specific Water Actions
  refillWater: () => void;
  calibrateWater: (actualLevel: number) => void;
  updateWaterMaxCapacity: (capacity: number) => void;
  updateSleepWindow: (start: number, end: number) => void;
  
  // Specific Hygiene Actions
  cleanHygieneItem: (itemId: string) => void;
  updateHygieneItemConfig: (itemId: string, newInterval: number, newUnit?: 'DAYS' | 'WEEKS' | 'MONTHS') => void;

  // Specific Pet Actions
  performPetCare: (itemId: string) => void;
  updatePetItemConfig: (itemId: string, newIntervalHours: number, newUnit?: 'HOURS' | 'DAYS') => void;

  // Specific Inventory Actions (v1.5)
  openInventoryItem: (itemId: string) => void;
  restockInventoryItem: (itemId: string, amount: number) => void;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'history_logs'>) => void;
  deleteInventoryItem: (itemId: string) => void;
  addInventoryCategory: (name: string, emoji: string) => void;
  deleteInventoryCategory: (categoryId: string) => void;

  // Debug
  debugTimeTravel: (hours: number) => void;
  debugWater: (scenario: any) => void;
  resetKernel: () => void;
}
