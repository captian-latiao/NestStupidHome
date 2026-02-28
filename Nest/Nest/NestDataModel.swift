import Foundation
import SwiftData

// MARK: - Enums for Users
enum UserRole: String, Codable {
    case owner = "OWNER"
    case member = "MEMBER"
    case pet = "PET"
}

enum PetSpecies: String, Codable {
    case cat = "CAT"
    case dog = "DOG"
}

/// 家庭成员 / 宠物
@Model
final class UserMember {
    var id: UUID
    var name: String
    var roleStr: String // "OWNER", "MEMBER", "PET"
    var avatarUrl: String?
    var isCurrentUser: Bool
    var speciesStr: String? // "CAT", "DOG"
    
    var role: UserRole {
        get { UserRole(rawValue: roleStr) ?? .member }
        set { roleStr = newValue.rawValue }
    }
    
    var species: PetSpecies? {
        get { speciesStr.flatMap { PetSpecies(rawValue: $0) } }
        set { speciesStr = newValue?.rawValue }
    }

    // Inverse relationship back to SystemState
    var systemState: SystemState?

    init(id: UUID = UUID(), name: String, role: UserRole, avatarUrl: String? = nil, isCurrentUser: Bool = false, species: PetSpecies? = nil) {
        self.id = id
        self.name = name
        self.roleStr = role.rawValue
        self.avatarUrl = avatarUrl
        self.isCurrentUser = isCurrentUser
        self.speciesStr = species?.rawValue
    }
}

/// 饮水趋势记录
@Model
final class WaterLog {
    var id: UUID
    var date: String // 格式: "2026-02-26"
    var consumptionLiters: Double
    var timestamp: Date

    init(id: UUID = UUID(), date: String, consumptionLiters: Double, timestamp: Date = Date()) {
        self.id = id
        self.date = date
        self.consumptionLiters = consumptionLiters
        self.timestamp = timestamp
    }
}

/// 库存分类
@Model
final class InventoryCategory {
    var id: String
    var name: String
    var emoji: String
    
    // 反向关联
    @Relationship(deleteRule: .cascade, inverse: \InventoryItem.category)
    var items: [InventoryItem]
    
    init(id: String, name: String, emoji: String, items: [InventoryItem] = []) {
        self.id = id
        self.name = name
        self.emoji = emoji
        self.items = items
    }
}

/// 库存物品
@Model
final class InventoryItem {
    var id: String
    var name: String
    var currentStock: Int
    var threshold: Int
    var isShared: Bool
    var categoryId: String // Legacy / foreign key
    
    var category: InventoryCategory?
    @Relationship(deleteRule: .cascade, inverse: \InventoryHistory.item)
    var histories: [InventoryHistory]

    init(id: String, name: String, currentStock: Int, threshold: Int, isShared: Bool = true, categoryId: String, histories: [InventoryHistory] = []) {
        self.id = id
        self.name = name
        self.currentStock = currentStock
        self.threshold = threshold
        self.isShared = isShared
        self.categoryId = categoryId
        self.histories = histories
    }
}

/// 库存流转历史 (由于 SwiftData 目前对复杂值类型嵌套支持不佳，将其作为关联模型处理)
@Model
final class InventoryHistory {
    var ts: Date
    var action: String // "OPEN", "RESTOCK"
    var delta: Int
    var balance: Int
    
    // 反向关联 (这里不需要可选)
    var item: InventoryItem?

    init(ts: Date = Date(), action: String, delta: Int, balance: Int) {
        self.ts = ts
        self.action = action
        self.delta = delta
        self.balance = balance
    }
}

/// 宠物护理项
@Model
final class PetCareItem {
    var id: String
    var type: String // 'feed', 'scoop', 'water', etc.
    var name: String
    var cycleHours: Double // N 小时提醒一次
    var preferredUnit: String // 'HOURS' or 'DAYS'
    var isShared: Bool
    var lastActionAt: Date

    init(id: String, type: String = "feed", name: String, cycleHours: Double, preferredUnit: String = "DAYS", isShared: Bool = true, lastActionAt: Date = Date()) {
        self.id = id
        self.type = type
        self.name = name
        self.cycleHours = cycleHours
        self.preferredUnit = preferredUnit
        self.isShared = isShared
        self.lastActionAt = lastActionAt
    }
}

/// 家政/清洁项
@Model
final class HygieneItem {
    var id: String
    var category: String
    var name: String
    var lastCleanedAt: Date
    var baseIntervalDays: Double
    var preferredUnit: String // 'DAYS', 'WEEKS', 'MONTHS'
    var isPublicArea: Bool
    
    init(id: String, category: String = "floor_vac", name: String, lastCleanedAt: Date = Date(), baseIntervalDays: Double, preferredUnit: String = "DAYS", isPublicArea: Bool = true) {
        self.id = id
        self.category = category
        self.name = name
        self.lastCleanedAt = lastCleanedAt
        self.baseIntervalDays = baseIntervalDays
        self.preferredUnit = preferredUnit
        self.isPublicArea = isPublicArea
    }
}

/// 核心设置与全局状态 (单例概念，但在 SwiftData 当作一行处理)
@Model
final class SystemState {
    var homeName: String
    var homeMode: String // "HOME", "AWAY"
    var themeMode: String // "LIGHT", "DARK", "SYSTEM"
    
    var waterMaxCapacity: Double
    var waterLastRefillAt: Date
    var waterCurrentLevel: Double
    var learnedHourlyRate: Double
    var currentCycleRate: Double
    /// Tracks whether user has manually calibrated in the current water cycle
    /// Used by WaterLogic.processRefill to determine Scenario A vs B (PRD §3.2)
    var hasCalibratedThisCycle: Bool
    
    var sleepStartHour: Int
    var sleepEndHour: Int
    var petLastFedAt: Date?
    
    @Relationship(deleteRule: .cascade, inverse: \UserMember.systemState)
    var members: [UserMember]
    
    // Developer Backdoor offset in seconds
    var debugTimeOffset: Double = 0
    
    // Convenience property for current simulated time
    @Transient var systemTime: Date {
        Date().addingTimeInterval(debugTimeOffset)
    }
    
    // Module Feature Flags
    var waterEnabled: Bool
    var inventoryEnabled: Bool
    var hygieneEnabled: Bool
    var petEnabled: Bool

    init(
        homeName: String = "白PP的家",
        homeMode: String = "HOME",
        themeMode: String = "SYSTEM",
        waterMaxCapacity: Double = 0.0,
        waterLastRefillAt: Date = Date(),
        waterCurrentLevel: Double = 0.0,
        // PRD: learned_hourly_consumption = 2.0L × memberCount / activeHoursPerDay
        // Default: 1 person, 17h active (24 - 7h sleep) → 2.0/17 ≈ 0.118 L/h
        learnedHourlyRate: Double = 0.118,
        currentCycleRate: Double = 0.118,
        hasCalibratedThisCycle: Bool = false,
        sleepStartHour: Int = 23,
        sleepEndHour: Int = 7,
        petLastFedAt: Date? = nil,
        debugTimeOffset: Double = 0,
        waterEnabled: Bool = true,
        inventoryEnabled: Bool = true,
        hygieneEnabled: Bool = true,
        petEnabled: Bool = true,
        members: [UserMember] = []
    ) {
        self.homeName = homeName
        self.homeMode = homeMode
        self.themeMode = themeMode
        self.waterMaxCapacity = waterMaxCapacity
        self.waterLastRefillAt = waterLastRefillAt
        self.waterCurrentLevel = waterCurrentLevel
        self.learnedHourlyRate = learnedHourlyRate
        self.currentCycleRate = currentCycleRate
        self.hasCalibratedThisCycle = hasCalibratedThisCycle
        self.sleepStartHour = sleepStartHour
        self.sleepEndHour = sleepEndHour
        self.petLastFedAt = petLastFedAt
        self.debugTimeOffset = debugTimeOffset
        
        self.waterEnabled = waterEnabled
        self.inventoryEnabled = inventoryEnabled
        self.hygieneEnabled = hygieneEnabled
        self.petEnabled = petEnabled
        self.members = members
    }
    
    // Updates the baseline consumption rate based on PRD logic: 2.0L * humanCount / activeHours
    func updateWaterBaselineRate() {
        let sleepHours = sleepStartHour > sleepEndHour ? (24 - sleepStartHour + sleepEndHour) : (sleepEndHour - sleepStartHour)
        let activeHours = max(1.0, Double(24 - sleepHours))
        let humanCount = members.filter { $0.role != .pet }.count
        let count = Double(max(1, humanCount)) // At least 1 person's worth
        let newRate = (2.0 * count) / activeHours
        self.learnedHourlyRate = newRate
        self.currentCycleRate = newRate
    }
}
