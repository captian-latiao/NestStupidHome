
import { InventoryItem, InventoryLog } from '../types';

/**
 * INVENTORY LOGIC CORE
 * Version: v0.7 (Final Inventory Core)
 * 
 * Implements:
 * 1. Rolling Window Consumption Rate
 * 2. Visual Stacking Position Generator
 * 3. Step Chart Data Transformer
 */

const ONE_DAY_MS = 24 * 3600 * 1000;
const WINDOW_DAYS = 60; // Default sliding window

// [PORTABLE]
export const calculate_daily_rate = (
    logs: InventoryLog[], 
    windowDays: number = WINDOW_DAYS,
    currentSystemTime: number
): number | null => {
    // 1. Filter logs for 'OPEN' action within the window
    const windowStart = currentSystemTime - (windowDays * ONE_DAY_MS);
    
    // We need at least 2 'OPEN' events to calculate a reliable rate interval, 
    // OR 1 'OPEN' event if we use the installation date (but simplifying to 2 events for stability)
    // Actually PRD 3.1 says: Rate = Sum(OpenCounts) / DaysElapsed.
    // Ideally we find the first Open in window and last Open in window to get exact elapsed time.
    
    const openLogs = logs
        .filter(l => l.action === 'OPEN' && l.ts >= windowStart)
        .sort((a, b) => a.ts - b.ts);

    if (openLogs.length < 2) {
        return null; // "Learning..." state
    }

    const firstOpen = openLogs[0];
    const lastOpen = openLogs[openLogs.length - 1];
    
    const daysElapsed = (lastOpen.ts - firstOpen.ts) / ONE_DAY_MS;
    
    // Avoid division by zero
    if (daysElapsed < 1) return openLogs.length; // Super fast consumption (all in one day)

    // Count is total opens in this period.
    // Note: If we have 3 opens (A, B, C), the duration is A->C. The consumption is 2 intervals? 
    // No, "Sum(OpenCounts)". If I opened 10 items in 60 days, rate is 10/60.
    // However, to be precise, if I opened #1 on Day 0 and #10 on Day 90. Rate is 9 items / 90 days? 
    // PRD Formula: Sum(OpenCounts in Window) / DaysElapsed.
    // Let's use the range between first and last log for accuracy in sparse data.
    
    // We use (Count - 1) because the "span" covers N-1 intervals? 
    // Actually, simply: Quantity Consumed / Time Span.
    // If I open 1 item today, and 1 item tomorrow. Span = 1 day. Consumed = 1 item (the "gap").
    // So Count - 1 is safer for "Rate".
    const consumedCount = openLogs.length - 1;
    
    if (consumedCount <= 0) return null;

    return consumedCount / daysElapsed;
};

// [PORTABLE]
export const get_prediction = (currentStock: number, dailyRate: number | null): number | null => {
    if (dailyRate === null || dailyRate <= 0) return null;
    return currentStock / dailyRate;
};

// [PORTABLE]
export const generate_visual_positions = (count: number, seed: string): Array<{x: number, y: number, r: number}> => {
    // Deterministic random based on seed (itemId + index) would be ideal, 
    // but for simple React state, we just generate once.
    // We simulate a "Pile" effect.
    // X: 10% - 90%
    // Y: Stacked from bottom.
    
    const positions = [];
    const max = Math.min(count, 30);
    
    for (let i = 0; i < max; i++) {
        // Randomize slightly for "Physical" look
        const r = Math.random();
        // X spread
        const x = 10 + Math.random() * 80;
        // Y stacking: Lower items (higher index) should be at bottom? 
        // Let's just random spread in the bottom 50% container for the pile look.
        // Or Grid. PRD says "Random or Grid".
        // Let's do a loose grid with jitter.
        
        const row = Math.floor(i / 5);
        const col = i % 5;
        
        const gridX = (col * 20) + 10 + (Math.random() * 10 - 5);
        const gridY = 80 - (row * 15) + (Math.random() * 10 - 5); // 80% is bottom
        
        positions.push({
            x: gridX,
            y: gridY,
            r: (Math.random() * 30) - 15 // Rotation
        });
    }
    return positions;
};

// [PORTABLE] Chart Data Generator
export interface ChartPoint {
    x: number; // Timestamp
    y: number; // Stock Level
    type: 'step_start' | 'step_end' | 'event';
    action?: string;
}

export const generate_step_chart_data = (
    logs: InventoryLog[], 
    currentStock: number,
    daysWindow: number = 90,
    systemTime: number
) => {
    const cutoff = systemTime - (daysWindow * ONE_DAY_MS);
    
    // 1. Sort logs
    const sortedLogs = [...logs].sort((a, b) => a.ts - b.ts);
    
    // 2. Reconstruct balances if needed, or trust log.balance.
    // PRD schema has `balance` in log. We trust it.
    // However, we want to filter logs within window.
    // BUT we need the starting balance at the beginning of the window.
    
    let relevantLogs = sortedLogs.filter(l => l.ts >= cutoff);
    
    // If no logs in window, just show current line?
    if (relevantLogs.length === 0) {
        return [{ x: cutoff, y: currentStock }, { x: systemTime, y: currentStock }];
    }

    // Step Chart Logic:
    // For a step chart, between Event A (t1, y1) and Event B (t2, y2),
    // the value stays at y1 until t2.
    // At t2, it jumps to y2.
    
    const points: Array<{x: number, y: number, isDot?: boolean, color?: string}> = [];
    
    // Initial Point (Start of window)
    // We need to find what the balance was BEFORE the first relevant log.
    // Balance before first log = firstLog.balance - firstLog.delta.
    const firstLog = relevantLogs[0];
    const startBalance = firstLog.balance - firstLog.delta;
    
    points.push({ x: cutoff, y: startBalance });
    
    relevantLogs.forEach(log => {
        // Line stays horizontal until the log timestamp
        // Push "Before Jump" point
        // Previous Y is effectively the last point added
        const prevY = points[points.length - 1].y;
        points.push({ x: log.ts, y: prevY });
        
        // Push "After Jump" point (The Event)
        points.push({ 
            x: log.ts, 
            y: log.balance, 
            isDot: true, 
            color: log.action === 'OPEN' ? '#ef4444' : '#22c55e' // red-500 : green-500
        });
    });
    
    // Final extension to Now
    points.push({ x: systemTime, y: currentStock });
    
    return points;
};
