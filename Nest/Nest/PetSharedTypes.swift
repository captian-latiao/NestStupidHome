import Foundation

/// PRD pet care status enum — shared across PetDetailView and any other module.
/// Thresholds (PRD §B / petLogic.ts: get_pet_status):
///   Happy  0.0 – 0.5
///   Okay   0.5 – 1.0
///   Stale  1.0 – 1.5
///   Crisis  > 1.5
enum PetCareStatus: String {
    case happy, okay, stale, crisis
}
