import Foundation
import SwiftData

/// 宠物喂食记录 (简化版自原有 PetFoodLog 类似逻辑，为了适配 Widget)
@Model
final class PetFoodLog {
    var id: UUID
    var date: String // "yyyy-MM-dd HH:mm:ss"
    var amountGrams: Double
    var timestamp: Date

    init(id: UUID = UUID(), date: String, amountGrams: Double, timestamp: Date = Date()) {
        self.id = id
        self.date = date
        self.amountGrams = amountGrams
        self.timestamp = timestamp
    }
}
