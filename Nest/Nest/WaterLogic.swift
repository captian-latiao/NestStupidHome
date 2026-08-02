import Foundation

// [PORTABLE] WATER MODULE LOGIC CORE
// Ported from: services/waterLogic.ts (v0.3.0)
// Reference: prd/饮用水管理.md

// MARK: - Constants

private let OUTLIER_MIN_FACTOR = 0.5
private let OUTLIER_MAX_FACTOR = 2.0

// MARK: - Sleep Window

struct SleepWindow {
    var startHour: Int  // e.g. 23
    var endHour: Int    // e.g. 7
    
    static let `default` = SleepWindow(startHour: 23, endHour: 7)
    
    /// Returns true if the given hour is within the sleep window.
    func isSleeping(hour: Int) -> Bool {
        if startHour < endHour {
            return hour >= startHour && hour < endHour
        } else {
            // Crosses midnight  e.g. 23:00 → 07:00
            return hour >= startHour || hour < endHour
        }
    }
}

// MARK: - Outlier Type

enum OutlierType: String {
    case fastConsumption = "FAST_CONSUMPTION"
    case slowConsumption = "SLOW_CONSUMPTION"
}

// MARK: - Refill Result

struct RefillResult {
    var newLearnedRate: Double
    var isOutlier: Bool
    var outlierType: OutlierType?
    var outlierMessage: String?
    /// Daily usage map for archiving (date string → liters)
    var usageMap: [String: Double]
}

// MARK: - Active Duration

/// [PORTABLE] Calculates "active hours" between two dates, excluding sleep windows.
/// Ported from: get_active_duration() in waterLogic.ts
func getActiveDuration(start: Date, end: Date, sleep: SleepWindow = .default) -> Double {
    guard end > start else { return 0 }
    
    let totalElapsed = end.timeIntervalSince(start)
    let maxSleepHoursPerDay = sleep.startHour > sleep.endHour ? (24 - sleep.startHour + sleep.endHour) : (sleep.endHour - sleep.startHour)
    let daysElapsed = floor(totalElapsed / 86400)
    let fullDaysSleep = daysElapsed * Double(maxSleepHoursPerDay * 3600)
    
    var partialSleep: Double = 0
    let cal = Calendar.current
    var current = start.addingTimeInterval(daysElapsed * 86400)
    
    while current < end {
        let hour = cal.component(.hour, from: current)
        let isSleeping = sleep.startHour > sleep.endHour
            ? (hour >= sleep.startHour || hour < sleep.endHour)
            : (hour >= sleep.startHour && hour < sleep.endHour)
            
        let nextHourObj = cal.date(byAdding: .hour, value: 1, to: current)!
        let nextHourStart = cal.date(bySetting: .minute, value: 0, of: nextHourObj)!
        let stepEnd = min(nextHourStart, end)
        
        if isSleeping {
            partialSleep += stepEnd.timeIntervalSince(current)
        }
        current = stepEnd
    }
    
    let totalSleep = fullDaysSleep + partialSleep
    let activeSeconds = totalElapsed - totalSleep
    return max(0, activeSeconds / 3600.0)
}

// MARK: - Current Level

/// [PORTABLE] Calculates predicted current water level.
/// Ported from: calculate_current_level() in waterLogic.ts
/// Formula: Level = Max - (activeHours × rate)
func calculateCurrentLevel(
    maxCapacity: Double,
    lastRefillTime: Date,
    now: Date,
    rate: Double,
    sleep: SleepWindow = .default
) -> Double {
    let activeHours = getActiveDuration(start: lastRefillTime, end: now, sleep: sleep)
    let consumed = activeHours * rate
    return max(0, maxCapacity - consumed)
}

// MARK: - Endurance Prediction (Bioclock-aware)

/// [PORTABLE] Predicts natural hours remaining until tank is empty.
/// Accounts for sleep windows (doesn't count sleeping time).
/// Ported from: predict_endurance_hours() in waterLogic.ts
/// PRD: prd/饮用水管理.md §4, Section B
func predictEnduranceHours(
    currentLevel: Double,
    rate: Double,
    sleep: SleepWindow = .default,
    now: Date
) -> Double {
    guard rate > 0.001 else { return 999 }
    guard currentLevel > 0 else { return 0 }
    
    var hoursRemaining = 0.0
    var waterLeft = currentLevel
    let calendar = Calendar.current
    let baseHour = calendar.component(.hour, from: now)
    
    let maxLoops = 24 * 60 // 60-day safety cap
    
    for i in 0..<maxLoops {
        let currentHour = (baseHour + i) % 24
        
        if !sleep.isSleeping(hour: currentHour) {
            if waterLeft <= rate {
                hoursRemaining += waterLeft / rate
                return hoursRemaining
            }
            waterLeft -= rate
        }
        hoursRemaining += 1
    }
    
    return hoursRemaining
}

/// Formats endurance hours to the PRD-specified string.
/// PRD: prd/饮用水管理.md §4.B
/// - >24h → "约 X 天后见底"
/// - 0<X≤24 → "约 X 小时后见底"
/// - =0 → "已耗尽，请换水"
func formatEnduranceText(hours: Double) -> String {
    if hours <= 0 { return "已耗尽，请换水" }
    if hours > 24 {
        return "约 \(Int(round(hours / 24))) 天后见底"
    }
    return "约 \(Int(round(hours))) 小时后见底"
}

// MARK: - Trend Data (daily usage distribution)

/// Distributes water consumption day-by-day for trend chart generation.
/// Ported from: distribute_water_usage() in waterLogic.ts
func distributeWaterUsage(
    start: Date,
    end: Date,
    maxCapacity: Double,
    rate: Double,
    sleep: SleepWindow = .default
) -> [String: Double] {
    var usageMap: [String: Double] = [:]
    guard start < end, maxCapacity > 0 else { return usageMap }
    
    let calendar = Calendar.current
    var cursor = start
    var remainingWater = maxCapacity
    var loopCount = 0
    
    while cursor < end && remainingWater > 0 && loopCount < 365 {
        loopCount += 1
        let dateStr = localDateString(from: cursor)
        
        // Find next day midnight
        let nextMidnight: Date = {
            var c = calendar.dateComponents([.year, .month, .day], from: cursor)
            c.day = (c.day ?? 0) + 1
            c.hour = 0; c.minute = 0; c.second = 0
            return calendar.date(from: c) ?? end
        }()
        
        let segmentEnd = min(nextMidnight, end)
        let activeHrs = getActiveDuration(start: cursor, end: segmentEnd, sleep: sleep)
        let consumed = activeHrs * rate
        let actualConsumed = min(consumed, remainingWater)
        
        if actualConsumed > 0 {
            usageMap[dateStr, default: 0] += actualConsumed
            remainingWater -= actualConsumed
        }
        
        cursor = segmentEnd
    }
    
    return usageMap
}

/// Returns last 7 days' consumption data for the trend chart.
/// Ported from: generate_trend_data() in waterLogic.ts
func generateTrendData(
    historyLogs: [WaterLog],
    lastRefillTime: Date,
    currentCycleRate: Double,
    maxCapacity: Double,
    sleep: SleepWindow = .default,
    now: Date = Date()
) -> [(date: String, liters: Double)] {
    // 1. Start with archived history
    var dailyMap: [String: Double] = [:]
    for log in historyLogs {
        dailyMap[log.date, default: 0] += log.consumptionLiters
    }
    
    // 2. Add current cycle distribution
    let currentCycleMap = distributeWaterUsage(
        start: lastRefillTime,
        end: now,
        maxCapacity: maxCapacity,
        rate: currentCycleRate,
        sleep: sleep
    )
    for (date, val) in currentCycleMap {
        dailyMap[date, default: 0] += val
    }
    
    // 3. Return last 7 days
    let calendar = Calendar.current
    return (0..<7).reversed().map { daysAgo -> (String, Double) in
        let date = calendar.date(byAdding: .day, value: -daysAgo, to: now) ?? now
        let dateStr = localDateString(from: date)
        let liters = (dailyMap[dateStr] ?? 0).rounded(toDecimalPlaces: 1)
        return (dateStr, liters)
    }
}

// MARK: - REFILL Logic

/// [PORTABLE] Processes a REFILL action.
/// Ported from: process_refill_logic() in waterLogic.ts
/// PRD: prd/饮用水管理.md §3.2 Learning Phase
func processRefill(
    lastRefillTime: Date,
    maxCapacity: Double,
    learnedHourlyRate: Double,
    currentCycleRate: Double,
    hasCalibratedThisCycle: Bool,
    sleep: SleepWindow = .default,
    now: Date = Date()
) -> RefillResult {
    let activeHours = getActiveDuration(start: lastRefillTime, end: now, sleep: sleep)
    
    // --- Step 1: Determine final cycle rate (Scenario A or B) ---
    var finalCycleRate: Double
    if hasCalibratedThisCycle {
        // Scenario B: User calibrated → trust current_cycle_rate
        finalCycleRate = currentCycleRate
    } else {
        // Scenario A: No calibration → implied rate = max / activeHours
        finalCycleRate = activeHours > 0.1 ? maxCapacity / activeHours : learnedHourlyRate
    }
    
    // --- Step 2: Outlier Protection ---
    let minValid = learnedHourlyRate * OUTLIER_MIN_FACTOR
    let maxValid = learnedHourlyRate * OUTLIER_MAX_FACTOR
    var isOutlier = false
    var outlierType: OutlierType? = nil
    
    if finalCycleRate < minValid {
        isOutlier = true; outlierType = .slowConsumption
    } else if finalCycleRate > maxValid {
        isOutlier = true; outlierType = .fastConsumption
    }
    
    // --- Step 3: Weighted update of long-term model ---
    let newLearnedRate: Double
    if !isOutlier {
        newLearnedRate = (learnedHourlyRate * 0.7) + (finalCycleRate * 0.3)
    } else {
        newLearnedRate = learnedHourlyRate  // keep unchanged
    }
    
    // --- Step 4: Archive usage (use finalCycleRate — physical reality) ---
    let usageMap = distributeWaterUsage(
        start: lastRefillTime, end: now,
        maxCapacity: maxCapacity, rate: finalCycleRate, sleep: sleep
    )
    
    var message: String? = nil
    if isOutlier {
        message = outlierType == .fastConsumption
            ? "今天喝了很多水欸，家里来了客人吗？"
            : "很久没换水了，最近不在家吗？"
    }
    
    return RefillResult(
        newLearnedRate: newLearnedRate,
        isOutlier: isOutlier,
        outlierType: outlierType,
        outlierMessage: message,
        usageMap: usageMap
    )
}

// MARK: - CALIBRATE Logic

struct CalibrateResult {
    var newCurrentLevel: Double
    var newCycleRate: Double
    var newLastRefillTime: Date?  // non-nil only when we shift the anchor
}

/// [PORTABLE] Processes a CALIBRATE action.
/// Ported from: process_calibration_logic() in waterLogic.ts
/// PRD: prd/饮用水管理.md §3.3 Calibration Phase
func processCalibration(
    lastRefillTime: Date,
    maxCapacity: Double,
    currentCycleRate: Double,
    actualLevel: Double,
    sleep: SleepWindow = .default,
    now: Date = Date()
) -> CalibrateResult {
    let actualConsumed = maxCapacity - actualLevel
    let elapsedActive = getActiveDuration(start: lastRefillTime, end: now, sleep: sleep)
    
    if elapsedActive >= 0.5 {
        // Normal path: recalculate rate from real consumption
        let correctedRate = actualConsumed / elapsedActive
        return CalibrateResult(
            newCurrentLevel: actualLevel,
            newCycleRate: correctedRate,
            newLastRefillTime: nil
        )
    } else {
        // Too short: only shift anchor time to preserve level without changing rate
        let safeRate = currentCycleRate > 0 ? currentCycleRate : 0.15
        let neededActive = actualConsumed / safeRate
        let shiftedTime = backtrackTimestampForActiveHours(
            now: now, targetActiveHours: neededActive, sleep: sleep
        )
        return CalibrateResult(
            newCurrentLevel: actualLevel,
            newCycleRate: currentCycleRate,
            newLastRefillTime: shiftedTime
        )
    }
}

/// Reverse-engineers a start time such that exactly `targetActiveHours` of active time
/// elapses between that start and `now`.
/// Ported from: backtrack_timestamp_for_active_hours() in waterLogic.ts
func backtrackTimestampForActiveHours(
    now: Date,
    targetActiveHours: Double,
    sleep: SleepWindow = .default
) -> Date {
    var remainingActive = targetActiveHours
    var cursor = now
    let calendar = Calendar.current
    var safetyCounter = 0
    let maxIterations = 24 * 60
    
    while remainingActive > 0 && safetyCounter < maxIterations {
        safetyCounter += 1
        
        let hourStart = calendar.date(
            from: calendar.dateComponents([.year, .month, .day, .hour], from: cursor)
        ) ?? cursor
        
        let timeInSegment = cursor.timeIntervalSince(hourStart) / 3600.0
        if timeInSegment <= 0.0001 {
            cursor = cursor.addingTimeInterval(-1)
            continue
        }
        
        let currentHour = calendar.component(.hour, from: cursor)
        if sleep.isSleeping(hour: currentHour) {
            cursor = hourStart
        } else {
            if remainingActive <= timeInSegment {
                return cursor.addingTimeInterval(-(remainingActive * 3600))
            } else {
                remainingActive -= timeInSegment
                cursor = hourStart
            }
        }
    }
    
    return cursor
}

// MARK: - Utilities

func localDateString(from date: Date) -> String {
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    fmt.locale = Locale(identifier: "en_US_POSIX")
    return fmt.string(from: date)
}

private extension Double {
    func rounded(toDecimalPlaces places: Int) -> Double {
        let factor = pow(10.0, Double(places))
        return (self * factor).rounded() / factor
    }
}
