
import { useState, useEffect, useCallback, useRef } from 'react';
import { NestState, HomeMode, ThemeMode, UserRole, UserProfile, WaterState, HygieneState, PetState, PetSpecies, InventoryState, InventoryItem, InventoryLog, InventoryActionType } from '../types';
import { process_refill_logic, process_calibration_logic, calculate_current_level } from './waterLogic';
import { INITIAL_HYGIENE_ITEMS, HYGIENE_DEFAULT_CONFIG } from './hygieneLogic';
import { INITIAL_PET_ITEMS, calculate_pet_entropy, PetCareStatus, get_pet_status, PET_DEFAULT_CONFIG } from './petLogic';
import { authHeaders, getCurrentUser } from './authService';

const STORAGE_KEY = 'nest_kernel_v1_5_0'; // Kept for migration detection
const API_BASE = '/api/state';
const SAVE_DEBOUNCE_MS = 500;

// Base Rate per person (L/h)
const PER_PERSON_RATE = 0.106;

const INITIAL_WATER_STATE: WaterState = {
  max_capacity: 0,
  current_level: 0,
  last_refill_timestamp: Date.now(),
  learned_hourly_rate: PER_PERSON_RATE * 2,
  current_cycle_rate: PER_PERSON_RATE * 2,
  has_calibrated_this_cycle: false,
  sleep_window: { start: 23, end: 7 },
  history_logs: []
};

const INITIAL_HYGIENE_STATE: HygieneState = {
  items: INITIAL_HYGIENE_ITEMS
};

const INITIAL_PET_STATE: PetState = {
  care_items: INITIAL_PET_ITEMS
};

// --- Inventory Init ---
const INITIAL_INVENTORY_STATE: InventoryState = {
  categories: [
    { id: 'c1', name: '日用纸品', emoji: '🧻' },
    { id: 'c2', name: '洗护用品', emoji: '🧴' },
    { id: 'c3', name: '宠物储备', emoji: '🥫' }
  ],
  items: [
    {
      id: 'i_001',
      category_id: 'c1',
      name: '维达卷纸 140g',
      current_stock: 12,
      threshold: 2,
      is_shared: true,
      history_logs: [
        { ts: Date.now() - 1000 * 3600 * 24 * 10, action: 'RESTOCK', delta: 20, balance: 20 },
        { ts: Date.now() - 1000 * 3600 * 24 * 8, action: 'OPEN', delta: -1, balance: 19 },
        { ts: Date.now() - 1000 * 3600 * 24 * 5, action: 'OPEN', delta: -1, balance: 18 },
        { ts: Date.now() - 1000 * 3600 * 24 * 2, action: 'OPEN', delta: -1, balance: 17 },
        { ts: Date.now() - 1000 * 3600 * 24 * 1, action: 'RESTOCK', delta: 6, balance: 23 }, // Recent restock
        { ts: Date.now() - 1000 * 3600 * 4, action: 'OPEN', delta: -1, balance: 22 }, // Today
      ]
    },
    {
      id: 'i_002',
      category_id: 'c2',
      name: '洗衣液 2kg',
      current_stock: 2,
      threshold: 1,
      is_shared: true,
      history_logs: [
        { ts: Date.now() - 1000 * 3600 * 24 * 60, action: 'RESTOCK', delta: 4, balance: 4 },
        { ts: Date.now() - 1000 * 3600 * 24 * 30, action: 'OPEN', delta: -1, balance: 3 },
      ]
    },
    {
      id: 'i_003',
      category_id: 'c3',
      name: '主食罐头',
      current_stock: 45,
      threshold: 10,
      is_shared: false,
      history_logs: [
        { ts: Date.now() - 1000 * 3600 * 24 * 5, action: 'RESTOCK', delta: 48, balance: 48 },
        { ts: Date.now() - 1000 * 3600 * 24 * 3, action: 'OPEN', delta: -1, balance: 47 },
        { ts: Date.now() - 1000 * 3600 * 24 * 1, action: 'OPEN', delta: -1, balance: 46 },
      ]
    }
  ]
};


// 根据当前登录用户动态生成默认状态
function buildDefaultState(): NestState {
  const authUser = getCurrentUser();
  const displayName = authUser?.displayName ?? '用户';

  const initialUser: UserProfile = {
    id: `u_${authUser?.id ?? '001'}`,
    name: displayName,
    role: UserRole.OWNER,
    isCurrentUser: true,
    avatarUrl: 'bg-wood-200'
  };

  return {
    version: '1.5.0',
    user: initialUser,
    homeName: `${displayName}的家`,
    members: [initialUser], // 只有当前用户一人，不预设模拟成员
    homeMode: HomeMode.HOME,
    themeMode: ThemeMode.LIGHT,
    installDate: Date.now(),
    debug_time_offset: 0,
    modules: {
      waterEnabled: true,
      inventoryEnabled: true,
      hygieneEnabled: true,
      petEnabled: false, // 新用户默认关闭，有宠物再开
      fridgeEnabled: false,
    },
    moduleData: {
      water: INITIAL_WATER_STATE,
      hygiene: INITIAL_HYGIENE_STATE,
      pet: INITIAL_PET_STATE,
      inventory: INITIAL_INVENTORY_STATE,
      fridge: { fridgeTemp: 4, freezerTemp: -18, expiringCount: 2 }
    },
    moduleOrder: ['water', 'hygiene', 'inventory']
  };
}

export type DebugScenario =
  | 'LOW'
  | 'FULL'
  | 'STAGNANT'
  | 'ALMOST_EMPTY'
  | 'RATE_FAST'
  | 'RATE_SLOW'
  | 'TREND_VARIED'
  | 'TREND_PEAK'
  | 'TREND_EMPTY';

// Helper: merge loaded data with defaults (handles version upgrades)
function mergeWithDefaults(parsed: any): NestState {
  const merged = { ...buildDefaultState(), ...parsed };

  if (!merged.moduleData.water) merged.moduleData.water = INITIAL_WATER_STATE;

  // Ensure Hygiene Init and Backfill Preferred Units
  if (!merged.moduleData.hygiene || !merged.moduleData.hygiene.items) {
    merged.moduleData.hygiene = INITIAL_HYGIENE_STATE;
  } else {
    merged.moduleData.hygiene.items = merged.moduleData.hygiene.items.map((item: any) => {
      const defaultConfig = HYGIENE_DEFAULT_CONFIG[item.category];
      if (!item.preferred_unit && defaultConfig) {
        return { ...item, preferred_unit: defaultConfig.preferred_unit };
      }
      return item;
    });
  }

  // Ensure Pet Init 
  if (!merged.moduleData.pet || !merged.moduleData.pet.care_items) {
    merged.moduleData.pet = INITIAL_PET_STATE;
  }

  // Ensure Inventory Init (v1.5)
  if (!merged.moduleData.inventory || !merged.moduleData.inventory.items) {
    merged.moduleData.inventory = INITIAL_INVENTORY_STATE;
  } else {
    if (!merged.moduleData.inventory.categories) {
      merged.moduleData.inventory.categories = INITIAL_INVENTORY_STATE.categories;
    }
  }

  if (merged.moduleData.water.has_calibrated_this_cycle === undefined) {
    merged.moduleData.water.has_calibrated_this_cycle = false;
  }

  if (!merged.members || merged.members.length === 0) {
    merged.members = [merged.user];
  }

  if (merged.moduleOrder) {
    merged.moduleOrder = merged.moduleOrder.filter((id: string) => {
      if (id === 'fridge' && !merged.modules.fridgeEnabled) return false;
      return true;
    });
  }

  return merged;
}

export const useNestKernel = () => {
  const [state, setState] = useState<NestState>(() => buildDefaultState());
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // === LOAD: Fetch state from SQLite API (with localStorage migration) ===
  useEffect(() => {
    const loadState = async () => {
      try {
        // Step 1: Try loading from the database API
        const response = await fetch(API_BASE, { headers: authHeaders() });
        const result = await response.json();

        if (result.exists && result.state) {
          // Database has state — use it
          console.log('[Nest Kernel] Loaded state from database');
          setState(mergeWithDefaults(result.state));
        } else {
          // Step 2: No state in DB — check localStorage for migration
          const localData = localStorage.getItem(STORAGE_KEY);
          if (localData) {
            const parsed = JSON.parse(localData);
            const merged = mergeWithDefaults(parsed);
            setState(merged);

            // Migrate to database
            console.log('[Nest Kernel] Migrating localStorage data to database...');
            const migrateRes = await fetch(`${API_BASE}/migrate`, {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify(merged),
            });
            const migrateResult = await migrateRes.json();
            if (migrateResult.migrated) {
              console.log('[Nest Kernel] ✅ Migration successful! localStorage data is now in SQLite.');
              // Keep localStorage as fallback for now; can be removed later
            }
          } else {
            // No data anywhere — use defaults
            console.log('[Nest Kernel] First run, using default state');
          }
        }
      } catch (err) {
        // API not available — fallback to localStorage
        console.warn('[Nest Kernel] API unavailable, falling back to localStorage:', err);
        try {
          const localData = localStorage.getItem(STORAGE_KEY);
          if (localData) {
            setState(mergeWithDefaults(JSON.parse(localData)));
          }
        } catch (e) {
          console.warn('[Nest Kernel] localStorage fallback also failed:', e);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadState();
  }, []);

  // === SAVE: Debounced save to SQLite API ===
  useEffect(() => {
    if (!isLoaded) return;

    // Skip the first render after load (we just loaded this state, no need to save it back)
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    // Clear previous pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(API_BASE, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(state),
        });
      } catch (err) {
        // API failed — save to localStorage as fallback
        console.warn('[Nest Kernel] Failed to save to API, using localStorage fallback:', err);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, isLoaded]);

  // Helper to get virtual system time
  const getSystemTime = (currentState: NestState) => {
    return Date.now() + (currentState.debug_time_offset || 0);
  };

  // Actions
  const setHomeMode = useCallback((mode: HomeMode) => {
    setState(prev => ({ ...prev, homeMode: mode }));
  }, []);

  const updateUser = useCallback((name: string, avatarUrl?: string) => {
    setState(prev => {
      const updatedUser = {
        ...prev.user,
        name,
        ...(avatarUrl ? { avatarUrl } : {})
      };

      const updatedMembers = prev.members.map(m =>
        m.id === prev.user.id ? { ...m, name, ...(avatarUrl ? { avatarUrl } : {}) } : m
      );

      return {
        ...prev,
        user: updatedUser,
        members: updatedMembers,
      };
    });
  }, []);

  const updateHomeName = useCallback((name: string) => {
    setState(prev => ({ ...prev, homeName: name }));
  }, []);

  const adjustWaterRateForMembers = (currentWaterState: WaterState, memberCount: number): WaterState => {
    if (currentWaterState.history_logs.length > 0) {
      return currentWaterState; // Don't touch if learning has started
    }
    const newRate = Math.max(0.05, Number((memberCount * PER_PERSON_RATE).toFixed(3)));
    return {
      ...currentWaterState,
      learned_hourly_rate: newRate,
      current_cycle_rate: newRate
    };
  };

  const addMember = useCallback((name: string) => {
    setState(prev => {
      const newMember: UserProfile = {
        id: `u_${Date.now()}`,
        name: name,
        role: UserRole.MEMBER,
        isCurrentUser: false,
        avatarUrl: 'bg-wood-100'
      };
      const newMembers = [...prev.members, newMember];

      const humanCount = newMembers.filter(m => m.role !== UserRole.PET).length;
      const newWater = adjustWaterRateForMembers(prev.moduleData.water, humanCount);

      return {
        ...prev,
        members: newMembers,
        moduleData: { ...prev.moduleData, water: newWater }
      };
    });
  }, []);

  const addPet = useCallback((name: string, species: PetSpecies) => {
    setState(prev => {
      const newPet: UserProfile = {
        id: `u_pet_${Date.now()}`,
        name: name,
        role: UserRole.PET,
        isCurrentUser: false,
        species: species,
        avatarUrl: 'bg-orange-100'
      };
      const newMembers = [...prev.members, newPet];

      return {
        ...prev,
        members: newMembers,
        modules: { ...prev.modules, petEnabled: true }
      }
    });
  }, []);

  const removeMember = useCallback((id: string) => {
    setState(prev => {
      const newMembers = prev.members.filter(m => m.id !== id);
      const humanCount = newMembers.filter(m => m.role !== UserRole.PET).length;
      const newWater = adjustWaterRateForMembers(prev.moduleData.water, humanCount);

      return {
        ...prev,
        members: newMembers,
        moduleData: { ...prev.moduleData, water: newWater }
      };
    });
  }, []);

  const reorderModules = useCallback((newOrder: string[]) => {
    setState(prev => ({ ...prev, moduleOrder: newOrder }));
  }, []);

  const updateModuleData = useCallback((moduleId: string, data: any) => {
    setState(prev => ({
      ...prev,
      moduleData: {
        ...prev.moduleData,
        [moduleId]: { ...prev.moduleData[moduleId], ...data }
      }
    }));
  }, []);

  // --- WATER MODULE ACTIONS ---

  const refillWater = useCallback(() => {
    setState(prev => {
      const now = getSystemTime(prev);
      const newWaterState = process_refill_logic(prev.moduleData.water, now);
      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          water: newWaterState
        }
      };
    });
  }, []);

  const calibrateWater = useCallback((actualLevel: number) => {
    setState(prev => {
      const now = getSystemTime(prev);
      const newWaterState = process_calibration_logic(prev.moduleData.water, now, actualLevel);
      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          water: newWaterState
        }
      };
    });
  }, []);

  const updateWaterMaxCapacity = useCallback((capacity: number) => {
    setState(prev => {
      const now = getSystemTime(prev);
      let waterState = { ...prev.moduleData.water, max_capacity: capacity };
      waterState = process_refill_logic(waterState, now);
      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          water: waterState
        }
      };
    });
  }, []);

  const updateSleepWindow = useCallback((start: number, end: number) => {
    setState(prev => ({
      ...prev,
      moduleData: {
        ...prev.moduleData,
        water: {
          ...prev.moduleData.water,
          sleep_window: { start, end }
        }
      }
    }));
  }, []);

  // --- HYGIENE MODULE ACTIONS ---

  const cleanHygieneItem = useCallback((itemId: string) => {
    setState(prev => {
      const now = getSystemTime(prev);
      const updatedItems = prev.moduleData.hygiene.items.map(item =>
        item.id === itemId
          ? { ...item, last_cleaned_at: now }
          : item
      );

      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          hygiene: {
            ...prev.moduleData.hygiene,
            items: updatedItems
          }
        }
      };
    });
  }, []);

  const updateHygieneItemConfig = useCallback((itemId: string, newInterval: number, newUnit?: 'DAYS' | 'WEEKS' | 'MONTHS') => {
    setState(prev => {
      const updatedItems = prev.moduleData.hygiene.items.map(item =>
        item.id === itemId
          ? {
            ...item,
            base_interval_days: newInterval,
            preferred_unit: newUnit ?? item.preferred_unit
          }
          : item
      );

      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          hygiene: {
            ...prev.moduleData.hygiene,
            items: updatedItems
          }
        }
      };
    });
  }, []);

  // --- PET MODULE ACTIONS ---

  const performPetCare = useCallback((itemId: string) => {
    setState(prev => {
      const now = getSystemTime(prev);
      const updatedItems = prev.moduleData.pet.care_items.map(item =>
        item.id === itemId
          ? { ...item, last_action_at: now }
          : item
      );

      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          pet: {
            ...prev.moduleData.pet,
            care_items: updatedItems
          }
        }
      }
    });
  }, []);

  const updatePetItemConfig = useCallback((itemId: string, newIntervalHours: number, newUnit?: 'HOURS' | 'DAYS') => {
    setState(prev => {
      const updatedItems = prev.moduleData.pet.care_items.map(item =>
        item.id === itemId
          ? {
            ...item,
            base_interval_hours: newIntervalHours,
            preferred_unit: newUnit ?? item.preferred_unit
          }
          : item
      );

      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          pet: {
            ...prev.moduleData.pet,
            care_items: updatedItems
          }
        }
      }
    });
  }, []);

  // --- INVENTORY MODULE ACTIONS (v1.5) ---

  const openInventoryItem = useCallback((itemId: string) => {
    setState(prev => {
      const now = getSystemTime(prev);
      const updatedItems = prev.moduleData.inventory.items.map(item => {
        if (item.id !== itemId) return item;
        if (item.current_stock <= 0) return item; // Cannot open empty

        const newBalance = item.current_stock - 1;
        const newLog: InventoryLog = {
          ts: now,
          action: 'OPEN',
          delta: -1,
          balance: newBalance
        };

        return {
          ...item,
          current_stock: newBalance,
          history_logs: [...item.history_logs, newLog]
        };
      });

      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          inventory: {
            ...prev.moduleData.inventory,
            items: updatedItems
          }
        }
      };
    });
  }, []);

  const restockInventoryItem = useCallback((itemId: string, amount: number) => {
    setState(prev => {
      const now = getSystemTime(prev);
      const updatedItems = prev.moduleData.inventory.items.map(item => {
        if (item.id !== itemId) return item;

        const newBalance = item.current_stock + amount;
        const newLog: InventoryLog = {
          ts: now,
          action: 'RESTOCK',
          delta: amount,
          balance: newBalance
        };

        return {
          ...item,
          current_stock: newBalance,
          history_logs: [...item.history_logs, newLog]
        };
      });

      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          inventory: {
            ...prev.moduleData.inventory,
            items: updatedItems
          }
        }
      };
    });
  }, []);

  const updateInventoryItem = useCallback((itemId: string, updates: Partial<InventoryItem>) => {
    setState(prev => {
      const updatedItems = prev.moduleData.inventory.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          inventory: {
            ...prev.moduleData.inventory,
            items: updatedItems
          }
        }
      };
    });
  }, []);

  const addInventoryItem = useCallback((newItem: Omit<InventoryItem, 'id' | 'history_logs'>) => {
    setState(prev => {
      const item: InventoryItem = {
        id: `i_${Date.now()}`,
        history_logs: [],
        ...newItem
      };
      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          inventory: {
            ...prev.moduleData.inventory,
            items: [...prev.moduleData.inventory.items, item]
          }
        }
      };
    });
  }, []);

  const deleteInventoryItem = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      moduleData: {
        ...prev.moduleData,
        inventory: {
          ...prev.moduleData.inventory,
          items: prev.moduleData.inventory.items.filter(i => i.id !== itemId)
        }
      }
    }));
  }, []);

  const addInventoryCategory = useCallback((name: string, emoji: string) => {
    setState(prev => {
      const newCat = { id: `c_${Date.now()}`, name, emoji };
      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          inventory: {
            ...prev.moduleData.inventory,
            categories: [...prev.moduleData.inventory.categories, newCat]
          }
        }
      };
    });
  }, []);

  const deleteInventoryCategory = useCallback((categoryId: string) => {
    setState(prev => ({
      ...prev,
      moduleData: {
        ...prev.moduleData,
        inventory: {
          ...prev.moduleData.inventory,
          categories: prev.moduleData.inventory.categories.filter(c => c.id !== categoryId)
        }
      }
    }));
  }, []);


  // --- DEBUG ---

  const debugTimeTravel = useCallback((hours: number) => {
    setState(prev => {
      const additionalOffset = hours * 3600 * 1000;
      const newOffset = (prev.debug_time_offset || 0) + additionalOffset;
      return {
        ...prev,
        debug_time_offset: newOffset
      };
    });
  }, []);

  const resetDebugTime = useCallback(() => {
    setState(prev => ({ ...prev, debug_time_offset: 0 }));
  }, []);

  const debugWater = useCallback((scenario: DebugScenario) => {
    setState(prev => {
      const now = getSystemTime(prev);
      let newState = { ...prev.moduleData.water };

      if (newState.max_capacity === 0) {
        newState.max_capacity = 18.9;
        newState.current_level = 18.9;
      }

      switch (scenario) {
        case 'LOW':
          newState.last_refill_timestamp = now - (24 * 3600 * 1000 * 3);
          newState.current_cycle_rate = 0.25;
          break;
        case 'ALMOST_EMPTY':
          newState.last_refill_timestamp = now - (24 * 3600 * 1000 * 4);
          newState.current_cycle_rate = 0.3;
          break;
        case 'FULL':
          newState.last_refill_timestamp = now;
          newState.current_cycle_rate = 0.15;
          break;
        case 'STAGNANT':
          newState.last_refill_timestamp = now - (24 * 3600 * 1000 * 10);
          newState.current_cycle_rate = 0.05;
          break;
        case 'RATE_FAST':
          newState.current_cycle_rate = 1.2;
          break;
        case 'RATE_SLOW':
          newState.current_cycle_rate = 0.01;
          break;
        case 'TREND_VARIED':
          newState.history_logs = [];
          break;
        case 'TREND_PEAK':
          newState.history_logs = [];
          break;
        case 'TREND_EMPTY':
          newState.history_logs = [];
          break;
      }

      if (['LOW', 'ALMOST_EMPTY', 'FULL', 'STAGNANT', 'RATE_FAST', 'RATE_SLOW'].includes(scenario)) {
        const level = calculate_current_level(
          newState.max_capacity,
          newState.last_refill_timestamp,
          now,
          newState.current_cycle_rate,
          newState.sleep_window
        );
        newState.current_level = level;
      }

      return {
        ...prev,
        moduleData: {
          ...prev.moduleData,
          water: newState
        }
      }
    });
  }, []);

  const resetKernel = useCallback(async () => {
    setState(buildDefaultState());
    try {
      await fetch(`${API_BASE}/reset`, { method: 'POST' });
    } catch (err) {
      console.warn('[Nest Kernel] Failed to reset via API:', err);
    }
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);

  return {
    state,
    isLoaded,
    systemTime: getSystemTime(state),
    actions: {
      setHomeMode,
      updateUser,
      updateHomeName,
      addMember,
      addPet,
      removeMember,
      reorderModules,
      updateModuleData,
      refillWater,
      calibrateWater,
      updateWaterMaxCapacity,
      updateSleepWindow,
      cleanHygieneItem,
      updateHygieneItemConfig,
      performPetCare,
      updatePetItemConfig,
      openInventoryItem,
      restockInventoryItem,
      updateInventoryItem,
      addInventoryItem, // Exported
      deleteInventoryItem, // Exported
      addInventoryCategory, // Exported
      deleteInventoryCategory, // Exported
      debugTimeTravel,
      resetDebugTime,
      debugWater,
      resetKernel
    }
  };
};
