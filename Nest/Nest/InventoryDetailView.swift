import SwiftUI
import SwiftData

// MARK: - InventoryDetailView
// Reference: modules/InventoryViews.tsx / services/inventoryLogic.ts

struct InventoryDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \InventoryItem.name) private var items: [InventoryItem]
    @Query(sort: \InventoryCategory.name) private var categories: [InventoryCategory]
    @Query private var systemStates: [SystemState]
    
    var systemTime: Date { systemStates.first?.systemTime ?? Date() }

    @State private var selectedCategoryId: String = "all"
    @State private var sortAscending = true
    @State private var selectedItem: InventoryItem? = nil
    @State private var showAddItemSheet = false

    // PRD §3.1 rolling 60-day rate
    func calculateDailyRate(for item: InventoryItem) -> Double? {
        let windowStart = systemTime.addingTimeInterval(-60 * 86400)
        let openLogs = item.histories
            .filter { $0.action == "OPEN" && $0.ts >= windowStart }
            .sorted { $0.ts < $1.ts }
        guard openLogs.count >= 2 else { return nil }
        let daysElapsed = openLogs.last!.ts.timeIntervalSince(openLogs.first!.ts) / 86400.0
        if daysElapsed < 1 { return Double(openLogs.count) }
        let consumed = openLogs.count - 1
        return consumed > 0 ? Double(consumed) / daysElapsed : nil
    }

    func predictedDaysLeft(for item: InventoryItem) -> Double? {
        guard let rate = calculateDailyRate(for: item), rate > 0 else { return nil }
        return Double(item.currentStock) / rate
    }

    // PRD §3.2 dual alert: stock <= threshold OR daysLeft <= 3
    func isUrgent(_ item: InventoryItem) -> Bool {
        if item.currentStock <= item.threshold { return true }
        if let days = predictedDaysLeft(for: item), days <= 3 { return true }
        return false
    }

    func category(for item: InventoryItem) -> InventoryCategory? {
        categories.first { $0.id == item.categoryId }
    }

    var displayedItems: [InventoryItem] {
        var filtered = items
        if selectedCategoryId != "all" {
            filtered = filtered.filter { $0.categoryId == selectedCategoryId }
        }
        return filtered.sorted {
            sortAscending ? $0.currentStock < $1.currentStock : $0.currentStock > $1.currentStock
        }
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            VStack(spacing: 0) {
                // Header bar: category filter + sort toggle
                HStack {
                    // Category dropdown (Menu)
                    Menu {
                        Button("全部品类") { selectedCategoryId = "all" }
                        Divider()
                        ForEach(categories) { cat in
                            Button("\(cat.emoji) \(cat.name)") { selectedCategoryId = cat.id }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            if selectedCategoryId == "all" {
                                Text("全部品类")
                            } else if let cat = categories.first(where: { $0.id == selectedCategoryId }) {
                                Text("\(cat.emoji) \(cat.name)")
                            }
                            Image(systemName: "chevron.down")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.wood800)
                        .padding(.horizontal, 14).padding(.vertical, 8)
                        .background(Color.white)
                        .cornerRadius(18)
                        .shadow(color: Color.black.opacity(0.06), radius: 3, x: 0, y: 1)
                    }

                    Spacer()

                    Button(action: { sortAscending.toggle() }) {
                        HStack(spacing: 4) {
                            Image(systemName: sortAscending ? "arrow.down.to.line" : "arrow.up.to.line")
                                .font(.system(size: 12, weight: .bold))
                            Text(sortAscending ? "缺货优先" : "库存充裕")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .foregroundColor(.wood600)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Color.white)
                        .cornerRadius(18)
                        .shadow(color: Color.black.opacity(0.06), radius: 3, x: 0, y: 1)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 8)

                // Grid
                ScrollView(.vertical, showsIndicators: false) {
                    if displayedItems.isEmpty {
                        VStack(spacing: 16) {
                            Image(systemName: "shippingbox")
                                .font(.system(size: 48)).foregroundColor(.wood300)
                            Text("暂无物品").foregroundColor(.wood500)
                            Button("点击添加") { showAddItemSheet = true }
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.wood800)
                                .padding(.horizontal, 16).padding(.vertical, 8)
                                .background(Color.wood100).cornerRadius(12)
                        }
                        .padding(.top, 60)
                    } else {
                        VStack(spacing: 14) {
                            ForEach(displayedItems) { item in
                                let cat = category(for: item)
                                InvStackingCard(
                                    item: item,
                                    emoji: cat?.emoji ?? "📦",
                                    categoryName: cat?.name ?? "未知",
                                    isUrgent: isUrgent(item),
                                    onOpen: { handleOpen(item: item) },
                                    onRestock: { selectedItem = item }
                                )
                                .onTapGesture { selectedItem = item }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 110)
                        .padding(.top, 4)
                        .animation(.spring(), value: displayedItems)
                    }
                }
            }

            // FAB
            Button(action: { showAddItemSheet = true }) {
                Image(systemName: "plus")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 56, height: 56)
                    .background(Color.wood800)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
            }
            .padding(.leading, 20)
            .padding(.bottom, 100)
        }
        .sheet(item: $selectedItem) { item in
            let cat = categories.first { $0.id == item.categoryId }
            InvDetailSheet(
                item: item,
                emoji: cat?.emoji ?? "📦",
                categoryName: cat?.name ?? "未知",
                predictedDaysLeft: predictedDaysLeft(for: item),
                onOpen: { handleOpen(item: item) },
                onRestock: { count in handleRestock(item: item, count: count) },
                onDelete: {
                    modelContext.delete(item)
                    try? modelContext.save()
                    selectedItem = nil
                }
            )
            .presentationDetents([.fraction(0.9)])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showAddItemSheet) {
            AddItemSheet(categories: categories, onAdd: { name, threshold, categoryId in
                let newItem = InventoryItem(id: UUID().uuidString, name: name, currentStock: 0, threshold: threshold, categoryId: categoryId)
                if let cat = categories.first(where: { $0.id == categoryId }) {
                    newItem.category = cat
                }
                modelContext.insert(newItem)
                try? modelContext.save()
            }, onAddCategory: { name, emoji in
                let cat = InventoryCategory(id: UUID().uuidString, name: name, emoji: emoji)
                modelContext.insert(cat)
                try? modelContext.save()
            })
            .presentationDetents([.fraction(0.75)])
        }
    }

    private func handleOpen(item: InventoryItem) {
        guard item.currentStock > 0 else { return }
        item.currentStock -= 1
        let log = InventoryHistory(ts: systemTime, action: "OPEN", delta: -1, balance: item.currentStock)
        log.item = item
        modelContext.insert(log)
        try? modelContext.save()
    }

    private func handleRestock(item: InventoryItem, count: Int) {
        guard count > 0 else { return }
        item.currentStock += count
        let log = InventoryHistory(ts: systemTime, action: "RESTOCK", delta: count, balance: item.currentStock)
        log.item = item
        modelContext.insert(log)
        try? modelContext.save()
    }
}

// MARK: - Visual Stacking Card
// Reference: InventoryViews.tsx → VisualStackingCard

struct InvStackingCard: View {
    let item: InventoryItem
    let emoji: String
    let categoryName: String
    let isUrgent: Bool
    let onOpen: () -> Void
    let onRestock: () -> Void

    @State private var isUnboxing = false
    @State private var emojiPositions: [(x: CGFloat, y: CGFloat, r: Double)] = []
    @State private var shakeOffset: CGFloat = 0

    var body: some View {
        ZStack {
            // Card bg
            (isUrgent ? Color(hex: "FFF1F0") : Color.white)

            // Emoji scatter (initialized once on appear)
            GeometryReader { geo in
                ForEach(Array(emojiPositions.enumerated()), id: \.offset) { _, pos in
                    Text(emoji)
                        .font(.system(size: 34))
                        .rotationEffect(.degrees(pos.r))
                        .position(x: pos.x * geo.size.width, y: pos.y * geo.size.height)
                        .opacity(0.9)
                        .blur(radius: 0.5)
                }
                // Gradient fade-out
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.05),
                        isUrgent ? Color(hex: "FFF1F0").opacity(0.6) : Color.white.opacity(0.55),
                        isUrgent ? Color(hex: "FFF1F0") : Color.white
                    ],
                    startPoint: .top, endPoint: .bottom
                )
            }

            // Content
            VStack(spacing: 0) {
                // Top section
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text(categoryName)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.wood500)
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(Color.white.opacity(0.6))
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.wood100.opacity(0.5)))
                        Spacer()
                        if isUrgent {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red).font(.system(size: 15))
                        }
                    }
                    .padding(.horizontal, 14).padding(.top, 14)

                    Text(item.name)
                        .font(.system(size: 15, weight: .bold, design: .serif))
                        .foregroundColor(.wood900)
                        .lineLimit(2)
                        .padding(.horizontal, 14).padding(.top, 6)
                }

                Spacer()

                // Stock number
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text("\(item.currentStock)")
                        .font(.system(size: 44, weight: .black, design: .serif))
                        .foregroundColor(isUrgent ? .red : .wood800)
                    Text("件")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.wood400)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 14).padding(.bottom, 4)

                // Action bar
                HStack(spacing: 8) {
                    Button(action: { onRestock() }) {
                        HStack(spacing: 3) {
                            Image(systemName: "plus").font(.system(size: 10, weight: .bold))
                            Text("补货").font(.system(size: 10, weight: .bold))
                        }
                        .frame(maxWidth: .infinity).frame(height: 38)
                        .background(Color.wood100).foregroundColor(.wood800).cornerRadius(12)
                    }

                    Button(action: handleOpen) {
                        HStack(spacing: 3) {
                            Image(systemName: "shippingbox.and.arrow.backward").font(.system(size: 10, weight: .bold))
                            Text("开封").font(.system(size: 10, weight: .bold))
                        }
                        .frame(maxWidth: .infinity).frame(height: 38)
                        .background(Color.white.opacity(0.85)).foregroundColor(.wood700).cornerRadius(12)
                    }
                    .disabled(item.currentStock <= 0)
                    .opacity(item.currentStock <= 0 ? 0.45 : 1.0)
                }
                .padding(.horizontal, 10).padding(.bottom, 10)
                .background(Color.white.opacity(0.4))
            }

            // Unbox animation overlay (PackageOpen centred pulse)
            if isUnboxing {
                ZStack {
                    Circle()
                        .fill(Color.wood800.opacity(0.85))
                        .frame(width: 60, height: 60)
                    Image(systemName: "shippingbox.and.arrow.backward")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                }
                .scaleEffect(isUnboxing ? 1.0 : 0.5)
                .opacity(isUnboxing ? 1.0 : 0.0)
                .animation(.spring(response: 0.3), value: isUnboxing)
            }
        }
        .frame(height: 208)
        .cornerRadius(28)
        .overlay(
            RoundedRectangle(cornerRadius: 28)
                .stroke(isUrgent ? Color.red.opacity(0.18) : Color.wood100, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.03), radius: 8, x: 0, y: 3)
        .offset(x: shakeOffset)
        .onAppear { generatePositions() }
        .onChange(of: item.currentStock) { _ in generatePositions() }
    }

    private func handleOpen() {
        guard item.currentStock > 0, !isUnboxing else { return }

        // Shake animation (InventoryViews.tsx: x: [0, -5, 5, -5, 5, 0])
        withAnimation(.easeInOut(duration: 0.05)) { shakeOffset = -5 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            withAnimation(.easeInOut(duration: 0.05)) { shakeOffset = 5 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                withAnimation(.easeInOut(duration: 0.05)) { shakeOffset = -4 }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                    withAnimation(.easeInOut(duration: 0.05)) { shakeOffset = 4 }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                        withAnimation(.easeInOut(duration: 0.1)) { shakeOffset = 0 }
                    }
                }
            }
        }

        isUnboxing = true
        onOpen()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { isUnboxing = false }
    }

    // Deterministic-enough positions using ID hash for seeding
    private func generatePositions() {
        let count = min(max(item.currentStock, 0), 12)
        let seed = item.id
        emojiPositions = (0..<count).map { i in
            let h = abs((seed + "\(i)").hashValue)
            return (
                x: CGFloat((h % 1000)) / 1000.0 * 0.8 + 0.1,
                y: CGFloat(((h >> 10) % 1000)) / 1000.0 * 0.6 + 0.1,
                r: Double((h >> 20) % 60) - 30
            )
        }
    }
}

// MARK: - Inventory Detail Sheet

struct InvDetailSheet: View {
    @Bindable var item: InventoryItem
    let emoji: String
    let categoryName: String
    let predictedDaysLeft: Double?
    let onOpen: () -> Void
    let onRestock: (Int) -> Void
    let onDelete: () -> Void

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var restockCount = 1
    @State private var showEdit = false
    @State private var showDelete = false
    @State private var isUnboxing = false

    // Header emoji positions (large header visual)
    @State private var headerPositions: [(x: CGFloat, y: CGFloat, r: Double)] = []

    var isCritical: Bool { item.currentStock <= item.threshold }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Visual header (LargeVisualHeader equivalent)
                ZStack {
                    LinearGradient(colors: [Color(hex: "FAF7F2"), Color.white], startPoint: .top, endPoint: .bottom)
                    GeometryReader { geo in
                        ForEach(Array(headerPositions.enumerated()), id: \.offset) { _, pos in
                            Text(emoji)
                                .font(.system(size: 64))
                                .rotationEffect(.degrees(pos.r))
                                .position(x: pos.x * geo.size.width, y: pos.y * geo.size.height)
                                .opacity(0.65)
                                .blur(radius: 0.5)
                        }
                    }
                }
                .frame(height: 160)
                .clipped()

                // Unboxing overlay
                if isUnboxing {
                    ZStack {
                        Color.black.opacity(0.05)
                        VStack(spacing: 8) {
                            Image(systemName: "shippingbox.and.arrow.backward")
                                .font(.system(size: 40))
                                .foregroundColor(.wood800)
                            Text("已开封 -1")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.wood800)
                        }
                        .padding(24)
                        .background(Color.white)
                        .cornerRadius(24)
                        .shadow(radius: 12)
                    }
                    .ignoresSafeArea()
                    .zIndex(10)
                }

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Title & category
                        VStack(alignment: .leading, spacing: 6) {
                            Text(categoryName)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.wood500)
                                .padding(.horizontal, 10).padding(.vertical, 4)
                                .background(Color.wood100.opacity(0.8)).cornerRadius(12)
                            Text(item.name)
                                .font(.system(size: 28, weight: .bold, design: .serif))
                                .foregroundColor(.wood900)
                        }

                        // Stats row
                        HStack(spacing: 20) {
                            StatBlock(label: "当前库存", value: "\(item.currentStock)", isCritical: isCritical)
                            Divider().frame(height: 48)
                            StatBlock(
                                label: "预计可用",
                                value: predictedDaysLeft != nil ? "\(Int(predictedDaysLeft!))天" : "--",
                                isCritical: (predictedDaysLeft ?? 99) <= 3 && predictedDaysLeft != nil
                            )
                            Divider().frame(height: 48)
                            StatBlock(label: "警戒线", value: "\(item.threshold)件", isCritical: false)
                        }

                        // Restock section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("补货数量").font(.system(size: 14, weight: .bold)).foregroundColor(.wood800)
                            HStack {
                                Button(action: { if restockCount > 1 { restockCount -= 1 } }) {
                                    Image(systemName: "minus").font(.system(size: 20, weight: .bold))
                                        .frame(width: 56, height: 56).background(Color.wood100).cornerRadius(16)
                                        .foregroundColor(.wood800)
                                }
                                Spacer()
                                Text("\(restockCount)")
                                    .font(.system(size: 48, weight: .bold, design: .serif))
                                    .foregroundColor(.wood900)
                                Spacer()
                                Button(action: { restockCount += 1 }) {
                                    Image(systemName: "plus").font(.system(size: 20, weight: .bold))
                                        .frame(width: 56, height: 56).background(Color.wood100).cornerRadius(16)
                                        .foregroundColor(.wood800)
                                }
                            }
                            // Quick add chips
                            HStack(spacing: 8) {
                                ForEach([5, 10, 20, 50], id: \.self) { n in
                                    Button("+\(n)") { restockCount += n }
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.wood500)
                                        .padding(.horizontal, 14).padding(.vertical, 8)
                                        .background(Color.wood50)
                                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.wood100))
                                        .cornerRadius(12)
                                }
                            }
                            Button(action: {
                                onRestock(restockCount)
                                restockCount = 1
                            }) {
                                Text("确认入库 +\(restockCount)")
                                    .font(.system(size: 16, weight: .bold))
                                    .frame(maxWidth: .infinity).frame(height: 52)
                                    .background(Color(hex: "5A7A4A")).foregroundColor(.white).cornerRadius(16)
                            }
                        }
                        .padding(16).background(Color.wood50).cornerRadius(20)

                        // Open button
                        Button(action: handleOpen) {
                            HStack {
                                Image(systemName: "shippingbox.and.arrow.backward")
                                Text("开封 -1")
                            }
                            .font(.system(size: 16, weight: .bold))
                            .frame(maxWidth: .infinity).frame(height: 52)
                            .background(Color.white)
                            .foregroundColor(.wood600)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.wood100))
                            .cornerRadius(16)
                        }
                        .disabled(item.currentStock <= 0)
                        .opacity(item.currentStock <= 0 ? 0.4 : 1.0)

                        // Delete
                        Button(action: { showDelete = true }) {
                            Text("删除此物品").font(.system(size: 14)).foregroundColor(.red)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle(item.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } }
                ToolbarItem(placement: .primaryAction) { Button("编辑") { showEdit = true } }
            }
            .sheet(isPresented: $showEdit) {
                EditInvItemSheet(item: item, categories: [])
                    .presentationDetents([.fraction(0.6)])
            }
            .alert("确认删除？", isPresented: $showDelete) {
                Button("删除", role: .destructive) { onDelete() }
                Button("取消", role: .cancel) {}
            } message: { Text("此操作不可撤销。") }
            .onAppear { generateHeaderPositions() }
        }
    }

    private func handleOpen() {
        guard item.currentStock > 0 else { return }
        isUnboxing = true
        onOpen()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { isUnboxing = false }
    }

    private func generateHeaderPositions() {
        let count = min(max(item.currentStock, 0), 20)
        let seed = item.id
        headerPositions = (0..<count).map { i in
            let h = abs((seed + "H\(i)").hashValue)
            return (
                x: CGFloat((h % 1000)) / 1000.0 * 0.85 + 0.075,
                y: CGFloat(((h >> 10) % 1000)) / 1000.0 * 0.85 + 0.075,
                r: Double((h >> 20) % 60) - 30
            )
        }
    }
}

// MARK: - Small Stat Block

struct StatBlock: View {
    let label: String
    let value: String
    let isCritical: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.system(size: 11, weight: .bold)).foregroundColor(.wood400)
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .serif))
                .foregroundColor(isCritical ? .red : .wood800)
        }
    }
}

// MARK: - Edit Sheet

struct EditInvItemSheet: View {
    @Bindable var item: InventoryItem
    let categories: [InventoryCategory]
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var threshold: Int
    init(item: InventoryItem, categories: [InventoryCategory]) {
        self.item = item
        self.categories = categories
        _name = State(initialValue: item.name)
        _threshold = State(initialValue: item.threshold)
    }
    var body: some View {
        NavigationView {
            Form {
                Section("物品信息") {
                    TextField("物品名称", text: $name)
                    Stepper("警戒线: \(threshold) 件", value: $threshold, in: 0...99)
                }
            }
            .navigationTitle("编辑物品").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        item.name = name; item.threshold = threshold
                        try? modelContext.save(); dismiss()
                    }.fontWeight(.bold)
                }
            }
        }
    }
}

// MARK: - Add Item Sheet

struct AddItemSheet: View {
    let categories: [InventoryCategory]
    let onAdd: (String, Int, String) -> Void
    let onAddCategory: (String, String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var threshold = 1
    @State private var categoryId: String = ""
    @State private var showAddCat = false
    @State private var newCatName = ""
    @State private var newCatEmoji = "📦"
    var body: some View {
        NavigationView {
            Form {
                Section("物品信息") {
                    TextField("名称 (如：维达卷纸)", text: $name)
                    Stepper("警戒线: \(threshold) 件", value: $threshold, in: 0...50)
                }
                Section("分类") {
                    if categories.isEmpty {
                        Text("暂无分类").foregroundColor(.wood400)
                    } else {
                        Picker("选择分类", selection: $categoryId) {
                            ForEach(categories) { c in
                                Text("\(c.emoji) \(c.name)").tag(c.id)
                            }
                        }
                        .onAppear { if categoryId.isEmpty { categoryId = categories.first?.id ?? "" } }
                    }
                    Button("+ 新建分类") { showAddCat = true }.foregroundColor(.blue)
                }
            }
            .navigationTitle("添加物品").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("添加") {
                        guard !name.isEmpty, !categoryId.isEmpty else { return }
                        onAdd(name, threshold, categoryId); dismiss()
                    }.disabled(name.isEmpty || categoryId.isEmpty).fontWeight(.bold)
                }
            }
            .sheet(isPresented: $showAddCat) {
                NavigationView {
                    Form {
                        TextField("分类名称", text: $newCatName)
                        TextField("Emoji", text: $newCatEmoji)
                    }
                    .navigationTitle("新建分类").navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) { Button("取消") { showAddCat = false } }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("新建") {
                                guard !newCatName.isEmpty else { return }
                                onAddCategory(newCatName, newCatEmoji); showAddCat = false
                            }.disabled(newCatName.isEmpty)
                        }
                    }
                }
                .presentationDetents([.fraction(0.4)])
            }
        }
    }
}

#Preview {
    InventoryDetailView()
        .modelContainer(for: [InventoryItem.self, InventoryCategory.self, InventoryHistory.self], inMemory: true)
}
