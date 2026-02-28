import Foundation
import SwiftData

// MARK: - SeedData
// First-launch default data, ported from:
//   services/petLogic.ts     → PET_DEFAULT_CONFIG / INITIAL_PET_ITEMS
//   services/hygieneLogic.ts → INITIAL_HYGIENE_ITEMS
//   state/inventoryState.ts  → INITIAL_INVENTORY (stable Web version)

struct SeedData {

    /// Call once on first launch. Checks if data already exists before inserting.
    @MainActor
    static func seedIfNeeded(context: ModelContext) {
        seedSystemState(context: context)
        seedPetItems(context: context)
        seedHygieneItems(context: context)
        seedInventory(context: context)
        try? context.save()
    }

    // MARK: - SystemState Seed (Users & Home)
    private static func seedSystemState(context: ModelContext) {
        let existing = (try? context.fetch(FetchDescriptor<SystemState>())) ?? []
        guard existing.isEmpty else { return }
        
        // Match React stable Web version defaults
        let state = SystemState(
            homeName: "白PP的家",
            members: []
        )
        context.insert(state)
        
        let owner = UserMember(name: "白PP", role: .owner, avatarUrl: nil, isCurrentUser: true)
        let pet = UserMember(name: "锅包肉", role: .pet, avatarUrl: nil, isCurrentUser: false, species: .cat)
        
        owner.systemState = state
        pet.systemState = state
        
        context.insert(owner)
        context.insert(pet)
        
        // Ensure the baseline rate covers the seeded members
        state.updateWaterBaselineRate()
    }

    // MARK: - Pet Seed
    // Ported from: petLogic.ts → INITIAL_PET_ITEMS (PET_DEFAULT_CONFIG)

    private static func seedPetItems(context: ModelContext) {
        let existing = (try? context.fetch(FetchDescriptor<PetCareItem>())) ?? []
        guard existing.isEmpty else { return }

        let now = Date()
        let items: [(id: String, type: String, name: String, hours: Double, isShared: Bool)] = [
            ("p_feed",       "feed",       "干饭",     12,         false),
            ("p_scoop",      "scoop",      "铲屎",     24,         true),
            ("p_water",      "water",      "换水",     24,         true),
            ("p_deep_clean", "deep_clean", "换砂",     14 * 24,    true),
            ("p_nails",      "nails",      "指甲",     14 * 24,    false),
            ("p_bath",       "bath",       "洗澡",     30 * 24,    false),
            ("p_deworm",     "deworm",     "驱虫",     30 * 24,    false),
        ]

        for item in items {
            let petItem = PetCareItem(
                id: item.id,
                type: item.type,
                name: item.name,
                cycleHours: item.hours,
                isShared: item.isShared,
                lastActionAt: now
            )
            context.insert(petItem)
        }
    }

    // MARK: - Hygiene Seed
    // Ported from: prd/清洁管理.md Default Item List

    private static func seedHygieneItems(context: ModelContext) {
        let existing = (try? context.fetch(FetchDescriptor<HygieneItem>())) ?? []
        guard existing.isEmpty else { return }

        let now = Date()
        // (id, name, category, baseIntervalDays, isPublicArea)
        let items: [(String, String, String, Double, Bool)] = [
            ("h_stove",      "灶台",       "stove",     2,   true),
            ("h_floor_vac",  "地面吸尘",    "floor_vac", 3,   true),
            ("h_ac_filter",  "空调滤网",    "ac_filter", 90,  true),
            ("h_floor_mop",  "地板拖洗",    "floor_mop", 7,   true),
            ("h_toilet",     "浴室",       "toilet",    7,   true),
            ("h_curtain",    "窗帘",       "curtain",   180, true),
            ("h_bedding",    "床上用品",    "bedding",   14,  false),
            ("h_washer",     "洗衣机自洁",  "washer",    30,  true),
        ]

        for (id, name, category, days, isPublic) in items {
            let hygieneItem = HygieneItem(
                id: id,
                category: category,
                name: name,
                lastCleanedAt: now,
                baseIntervalDays: days,
                isPublicArea: isPublic
            )
            context.insert(hygieneItem)
        }
    }

    // MARK: - Inventory Seed
    // Ported from: Web stable version initial inventory state

    private static func seedInventory(context: ModelContext) {
        let existingCats = (try? context.fetch(FetchDescriptor<InventoryCategory>())) ?? []
        let existingItems = (try? context.fetch(FetchDescriptor<InventoryItem>())) ?? []

        // Categories Map (Matches Web INITIAL_INVENTORY_STATE)
        let categories: [(id: String, name: String, emoji: String)] = [
            ("c1", "日用纸品", "🧻"),
            ("c2", "洗护用品", "🧴"),
            ("c3", "宠物储备", "🥫"),
            ("c4", "食品生鲜", "🥩"),
            ("c5", "零食饮料", "🥤"),
            ("c6", "清洁用具", "🧹")
        ]

        var catMap: [String: InventoryCategory] = [:]
        
        if existingCats.isEmpty {
            for cat in categories {
                let c = InventoryCategory(id: cat.id, name: cat.name, emoji: cat.emoji)
                context.insert(c)
                catMap[cat.id] = c
            }
            try? context.save()
        } else {
            for cat in existingCats {
                catMap[cat.id] = cat
            }
        }

        if existingItems.isEmpty {
            // Default inventory items (matches Web INITIAL_INVENTORY_STATE)
            let items: [(String, String, String, Int, Int, Bool)] = [
                ("i_001", "维达卷纸 140g", "c1", 12, 2, true),
                ("i_002", "洗衣液 2kg", "c2", 2, 1, true),
                ("i_003", "主食罐头", "c3", 45, 10, false)
            ]

            for (id, name, catId, stock, threshold, isShared) in items {
                let item = InventoryItem(
                    id: id,
                    name: name,
                    currentStock: stock,
                    threshold: threshold,
                    isShared: isShared,
                    categoryId: catId
                )
                item.category = catMap[catId]
                context.insert(item)
            }
        } else {
            // Migration / Repair orphaned items backwards compatible
            for item in existingItems where item.category == nil {
                item.category = catMap[item.categoryId] 
            }
        }
        try? context.save()
    }
}
