import Foundation

// [PORTABLE] HYGIENE MODULE LOGIC CORE
// Ported from: services/hygieneLogic.ts
// Reference: prd/清洁管理.md

// MARK: - Status Enum

enum HygieneStatus: String, Codable {
    case fresh  = "FRESH"   // 0.0 – 0.5
    case normal = "NORMAL"  // 0.5 – 1.0
    case dusty  = "DUSTY"   // 1.0 – 1.5
    case messy  = "MESSY"   // > 1.5
}

// MARK: - Logic

class HygieneLogic {

    /// [PORTABLE] Calculates the entropy progress (0.0 → ∞) for a hygiene item.
    ///
    /// Formula (PRD §2.1):
    ///   Progress = elapsed / (baseThreshold / LoadFactor)
    ///
    /// LoadFactor (PRD §2.1):
    ///   Default = 1.0
    ///   IF householdSize > 2 AND is_public_area → LoadFactor = 1.2
    ///
    /// NOTE: No random variance — PRD mandates deterministic algorithms.
    ///
    /// Ported from: hygieneLogic.ts → calculate_entropy()
    static func calculateEntropy(
        lastCleanedAt: Date,
        baseIntervalDays: Double,
        isPublicArea: Bool,
        householdMembers: Int = 2,
        currentTime: Date = Date()
    ) -> Double {
        let elapsedHours = currentTime.timeIntervalSince(lastCleanedAt) / 3600.0
        let baseIntervalHours = baseIntervalDays * 24.0

        // PRD: LoadFactor = 1.2 when householdSize > 2 AND public area
        let loadFactor: Double = (isPublicArea && householdMembers > 2) ? 1.2 : 1.0

        let effectiveIntervalHours = baseIntervalHours / loadFactor

        guard effectiveIntervalHours > 0 else { return 0 }
        return max(0.0, elapsedHours / effectiveIntervalHours)
    }

    /// [PORTABLE] Maps entropy value to a status enum.
    ///
    /// Thresholds (PRD §2.2):
    ///   Fresh  0.0 – 0.5
    ///   Normal 0.5 – 1.0
    ///   Dusty  1.0 – 1.5
    ///   Messy  > 1.5
    ///
    /// Ported from: hygieneLogic.ts → get_hygiene_status()
    static func getHygieneStatus(entropy: Double) -> HygieneStatus {
        if entropy < 0.5  { return .fresh }
        if entropy < 1.0  { return .normal }
        if entropy < 1.5  { return .dusty }
        return .messy
    }
    
    /// PRD §4.2 Friendly tone copywriting
    static func getCopy(status: HygieneStatus, itemName: String) -> String {
        switch status {
        case .fresh:  return "干净得在发光 ✨"
        case .normal: return "上次打扫是 \(Int(0)) 天前"   // caller should format days
        case .dusty:  return "好像该照顾一下了 🌱"
        case .messy:  return "焕新一下心情吧 🛁"
        }
    }
}
