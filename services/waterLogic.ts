import { WaterState, SleepWindow, WaterLog, WaterActionReport } from '../types';

/**
 * WATER MODULE LOGIC CORE
 * Version: 0.3.0 (Strict PRD Compliance: Outlier Protection & Scenario A/B)
 */

const HOUR_MS = 3600 * 1000;

// PRD Constants
const OUTLIER_MIN_FACTOR = 0.5;
const OUTLIER_MAX_FACTOR = 2.0;

// Helper for consistent Local Date Strings (YYYY-MM-DD)
const getLocalDateStr = (timestamp: number): string => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates the "Active Duration" between two timestamps.
 * Active Duration = Total Duration - Sleep Duration.
 */
export const get_active_duration = (
  start: number, 
  end: number, 
  sleepWindow: SleepWindow = { start: 23, end: 7 }
): number => {
  if (end <= start) return 0;

  let activeHours = 0;
  let current = new Date(start);
  const finish = new Date(end);

  // Safety break for simulation (max 60 days)
  if ((end - start) > 60 * 24 * HOUR_MS) {
      return 60 * 16; // Cap at ~60 active days
  }

  // Iterate hour by hour
  while (current < finish) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1, 0, 0, 0);
    
    const segmentEnd = nextHour < finish ? nextHour : finish;
    const durationHours = (segmentEnd.getTime() - current.getTime()) / HOUR_MS;

    const currentHour = current.getHours();
    
    let isSleeping = false;
    if (sleepWindow.start < sleepWindow.end) {
       isSleeping = currentHour >= sleepWindow.start && currentHour < sleepWindow.end;
    } else {
       isSleeping = currentHour >= sleepWindow.start || currentHour < sleepWindow.end;
    }

    if (!isSleeping) {
      activeHours += durationHours;
    }

    current = nextHour;
  }

  return activeHours;
};

/**
 * Reverse-engineers the start timestamp required to achieve targetActiveHours from 'now'.
 */
export const backtrack_timestamp_for_active_hours = (
  now: number,
  targetActiveHours: number,
  sleepWindow: SleepWindow
): number => {
  let remainingActive = targetActiveHours;
  let cursor = new Date(now);
  
  // Safety break to prevent infinite loops
  let safetyCounter = 0;
  const MAX_ITERATIONS = 24 * 60; // Max 60 days lookback approx
  
  while (remainingActive > 0 && safetyCounter < MAX_ITERATIONS) {
    safetyCounter++;
    
    const hourStart = new Date(cursor);
    hourStart.setMinutes(0, 0, 0);
    
    let timeInSegment = (cursor.getTime() - hourStart.getTime()) / HOUR_MS;
    
    if (timeInSegment <= 0.0001) {
       cursor = new Date(cursor.getTime() - 1);
       continue; 
    }
    
    const currentHour = cursor.getHours();
    
    let isSleeping = false;
    if (sleepWindow.start < sleepWindow.end) {
       isSleeping = currentHour >= sleepWindow.start && currentHour < sleepWindow.end;
    } else {
       isSleeping = currentHour >= sleepWindow.start || currentHour < sleepWindow.end;
    }

    if (isSleeping) {
      cursor = hourStart;
    } else {
      if (remainingActive <= timeInSegment) {
        return cursor.getTime() - (remainingActive * HOUR_MS);
      } else {
        remainingActive -= timeInSegment;
        cursor = hourStart;
      }
    }
  }
  
  return cursor.getTime();
};

/**
 * Calculates the current water level based on elapsed active time.
 */
export const calculate_current_level = (
  maxCapacity: number,
  lastRefillTime: number,
  now: number,
  rate: number,
  sleepWindow: SleepWindow
): number => {
  const activeHours = get_active_duration(lastRefillTime, now, sleepWindow);
  const consumed = activeHours * rate;
  return Math.max(0, maxCapacity - consumed);
};

/**
 * Predicts how many natural hours are remaining until empty.
 */
export const predict_endurance_hours = (
  currentLevel: number,
  rate: number,
  sleepWindow: SleepWindow,
  nowTimestamp: number
): number => {
  if (rate <= 0.001) return 999; 
  if (currentLevel <= 0) return 0;

  let hoursRemaining = 0;
  let waterLeft = currentLevel;
  const now = new Date(nowTimestamp); 

  const MAX_LOOPS = 24 * 60; // 60 Days limit

  for (let i = 0; i < MAX_LOOPS; i++) {
    const currentHour = (now.getHours() + i) % 24;
    
    let isSleeping = false;
    if (sleepWindow.start < sleepWindow.end) {
       isSleeping = currentHour >= sleepWindow.start && currentHour < sleepWindow.end;
    } else {
       isSleeping = currentHour >= sleepWindow.start || currentHour < sleepWindow.end;
    }

    if (!isSleeping) {
      const consumption = rate;
      if (waterLeft <= consumption) {
        hoursRemaining += (waterLeft / consumption);
        return hoursRemaining;
      }
      waterLeft -= consumption;
    }
    
    hoursRemaining += 1;
  }

  return hoursRemaining;
};

/**
 * CORE HELPER: Distributes consumption over time segments (Day by Day)
 */
const distribute_water_usage = (
  start: number,
  end: number,
  maxCapacity: number,
  rate: number,
  sleepWindow: SleepWindow
): Map<string, number> => {
  const usageMap = new Map<string, number>();
  
  if (start >= end || maxCapacity <= 0) return usageMap;

  let cursor = start;
  let remainingWater = maxCapacity; // We simulate the tank draining

  const MAX_DAYS = 365;
  let loopCount = 0;

  while (cursor < end && remainingWater > 0 && loopCount < MAX_DAYS) {
      loopCount++;
      const currentObj = new Date(cursor);
      const dateStr = getLocalDateStr(cursor);

      // Find end of this day (Local Midnight)
      const nextMidnight = new Date(currentObj);
      nextMidnight.setDate(currentObj.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      // The segment ends at midnight OR at systemTime (Now), whichever comes first
      const segmentEnd = Math.min(nextMidnight.getTime(), end);

      // Calculate active hours in this specific segment
      const activeHrs = get_active_duration(cursor, segmentEnd, sleepWindow);
      const consumed = activeHrs * rate;

      // Cap consumption by remaining water in the tank
      const actualConsumed = Math.min(consumed, remainingWater);

      if (actualConsumed > 0) {
          const currentVal = usageMap.get(dateStr) || 0;
          usageMap.set(dateStr, currentVal + actualConsumed);
          remainingWater -= actualConsumed;
      }

      cursor = segmentEnd;
  }
  
  return usageMap;
};

/**
 * Generates the full trend history (Logs + Current Cycle Breakdown)
 */
export const generate_trend_data = (
  state: WaterState,
  systemTime: number
): WaterLog[] => {
  const { history_logs, last_refill_timestamp, current_cycle_rate, sleep_window, max_capacity } = state;
  
  // 1. Start with Archived History
  const dailyMap = new Map<string, number>();
  history_logs.forEach(log => {
    dailyMap.set(log.date, (dailyMap.get(log.date) || 0) + log.daily_consumption_liters);
  });

  // 2. Add Current Cycle Distribution
  const currentCycleMap = distribute_water_usage(
      last_refill_timestamp, 
      systemTime, 
      max_capacity, 
      current_cycle_rate, 
      sleep_window
  );

  currentCycleMap.forEach((val, date) => {
      dailyMap.set(date, (dailyMap.get(date) || 0) + val);
  });

  // 3. Generate last 7 days array
  const result: WaterLog[] = [];
  for (let i = 6; i >= 0; i--) {
      const d = new Date(systemTime);
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateStr(d.getTime());
      
      result.push({
          date: dateStr,
          daily_consumption_liters: Number((dailyMap.get(dateStr) || 0).toFixed(1))
      });
  }

  return result;
};

/**
 * REFILL LOGIC (PRD Page 2 & 3)
 * Implements "Learning Phase" and "Outlier Protection".
 */
export const process_refill_logic = (currentState: WaterState, now: number): WaterState => {
  const { 
      last_refill_timestamp, 
      max_capacity, 
      learned_hourly_rate, 
      current_cycle_rate, 
      sleep_window,
      has_calibrated_this_cycle 
  } = currentState;
  
  const activeHours = get_active_duration(last_refill_timestamp, now, sleep_window);
  
  // --- Step 1: Determine Final Cycle Rate (PRD Page 2, Learning Phase) ---
  
  let finalCycleRate = current_cycle_rate;

  // Scenario B: Has Calibrated -> Trust current_cycle_rate (it was already corrected)
  if (has_calibrated_this_cycle) {
      finalCycleRate = current_cycle_rate;
  } 
  // Scenario A: No Calibration -> Calculate implied rate based on "Empty Tank / Time"
  else {
      // Avoid division by zero
      if (activeHours > 0.1) {
          finalCycleRate = max_capacity / activeHours;
      } else {
          // Fallback if impossibly short time
          finalCycleRate = learned_hourly_rate; 
      }
  }

  // --- Step 2: Outlier Protection (PRD Page 3, Section 2.2) ---
  
  const minValid = learned_hourly_rate * OUTLIER_MIN_FACTOR; // 0.5x
  const maxValid = learned_hourly_rate * OUTLIER_MAX_FACTOR; // 2.0x
  
  let isOutlier = false;
  let outlierType: 'FAST_CONSUMPTION' | 'SLOW_CONSUMPTION' | null = null;
  let newLearnedRate = learned_hourly_rate;

  if (finalCycleRate < minValid) {
      isOutlier = true;
      outlierType = 'SLOW_CONSUMPTION'; // Too slow
  } else if (finalCycleRate > maxValid) {
      isOutlier = true;
      outlierType = 'FAST_CONSUMPTION'; // Too fast
  }

  // --- Step 3: Update Long-term Model (PRD Page 3, Section 2.3) ---
  
  if (!isOutlier) {
      // Valid: Weighted Update (0.7 old + 0.3 new)
      newLearnedRate = (learned_hourly_rate * 0.7) + (finalCycleRate * 0.3);
  } else {
      // Invalid: Keep old learned rate (Dirty data ignored for learning)
      newLearnedRate = learned_hourly_rate;
  }

  // --- Step 4: Archive History (PRD Page 3, Section 2.4) ---
  
  // PRD says: "Archive the final_cycle_rate... for Trend Chart"
  // Even if it is an outlier, it represents the physical reality of THIS cycle (the water IS gone).
  // So we use finalCycleRate for distributing the usage history.
  
  const usageMap = distribute_water_usage(
      last_refill_timestamp,
      now,
      max_capacity,
      finalCycleRate, 
      sleep_window
  );

  const existingHistory = [...currentState.history_logs];
  usageMap.forEach((amount, dateStr) => {
      const index = existingHistory.findIndex(l => l.date === dateStr);
      if (index >= 0) {
          existingHistory[index].daily_consumption_liters += amount;
      } else {
          existingHistory.push({ date: dateStr, daily_consumption_liters: amount });
      }
  });
  existingHistory.sort((a, b) => a.date.localeCompare(b.date));

  // --- Construct Report ---
  const report: WaterActionReport = {
      timestamp: now,
      action: 'REFILL',
      is_outlier: isOutlier,
      outlier_type: outlierType,
      message: isOutlier 
          ? (outlierType === 'FAST_CONSUMPTION' ? "今天喝了很多水欸，家里来了客人吗？" : "很久没换水了，最近不在家吗？")
          : undefined
  };

  return {
    ...currentState,
    current_level: max_capacity, // Reset to full
    last_refill_timestamp: now,
    learned_hourly_rate: newLearnedRate,
    current_cycle_rate: newLearnedRate, // Start next cycle with the updated long-term habit
    has_calibrated_this_cycle: false,   // Reset calibration flag for new cycle
    history_logs: existingHistory.slice(-14),
    last_action_report: report
  };
};

/**
 * Calibration Phase: Processes a User Calibration.
 * Implements PRD Page 3, Calibration Logic.
 */
export const process_calibration_logic = (currentState: WaterState, now: number, actualLevel: number): WaterState => {
  const { max_capacity, last_refill_timestamp, sleep_window } = currentState;
  
  const actualConsumed = max_capacity - actualLevel;
  const elapsedActive = get_active_duration(last_refill_timestamp, now, sleep_window);
  
  // Safety check (PRD Page 3.3.3) - Skip rate calc if < 0.5 hours active to prevent division noise
  if (elapsedActive >= 0.5) {
     const correctedRate = actualConsumed / elapsedActive;
     return {
       ...currentState,
       current_level: actualLevel,
       current_cycle_rate: correctedRate,
       has_calibrated_this_cycle: true, // Mark this cycle as calibrated (Scenario B)
       last_action_report: {
           timestamp: now,
           action: 'CALIBRATE',
           is_outlier: false,
           outlier_type: null
       }
     };
  }
  
  // If time is too short, we just update the level and time, but don't change rate logic yet
  // We strictly follow "Update current level" but PRD says "Skip rate correction", 
  // implies we might just shift the start time to match the *existing* rate?
  // PRD Page 3.3.3 says "Only update current water level value". 
  // But if we only update level and keep rate, the calculation `Level = Max - (Time * Rate)` will drift again immediately.
  // To keep `Level` fixed at `actualLevel` while keeping `Rate` fixed, we MUST shift `Time`.
  
  const safeRate = currentState.current_cycle_rate || 0.15;
  const neededActiveHours = actualConsumed / safeRate;
  const shiftedTimestamp = backtrack_timestamp_for_active_hours(now, neededActiveHours, sleep_window);

  return {
    ...currentState,
    current_level: actualLevel,
    last_refill_timestamp: shiftedTimestamp,
    // has_calibrated_this_cycle: true, // Arguable, but we did touch it. Let's say yes.
    has_calibrated_this_cycle: true,
    last_action_report: {
        timestamp: now,
        action: 'CALIBRATE',
        is_outlier: false,
        outlier_type: null
    }
  };
};
