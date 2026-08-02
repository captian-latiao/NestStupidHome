import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct DashboardView: View {
    @Query private var systemStates: [SystemState]
    var systemTime: Date { systemStates.first?.systemTime ?? Date() }
    @Query(sort: \PetCareItem.lastActionAt) private var petItems: [PetCareItem]
    @Query private var hygieneItems: [HygieneItem]
    @Query(sort: \InventoryItem.name) private var inventoryItems: [InventoryItem]
    
    @Binding var selectedMainTab: Int
    @Binding var selectedLifeTab: LifeTab
    
    var state: SystemState? { systemStates.first }
    
    // MARK: - Dynamic Butler Message
    
    /// 最紧急的宠物护理项 (urgencyRatio >= 1.0 即逾期)
    var mostUrgentPet: PetCareItem? {
        petItems
            .filter { systemTime.timeIntervalSince($0.lastActionAt) / 3600.0 >= $0.cycleHours }
            .max { a, b in
                (systemTime.timeIntervalSince(a.lastActionAt) / a.cycleHours)
                < (systemTime.timeIntervalSince(b.lastActionAt) / b.cycleHours)
            }
    }
    
    /// 最脏的清洁项
    var messiest: HygieneItem? {
        hygieneItems
            .map { item -> (HygieneItem, Double) in
                let entropy = HygieneLogic.calculateEntropy(
                    lastCleanedAt: item.lastCleanedAt,
                    baseIntervalDays: item.baseIntervalDays,
                    isPublicArea: item.isPublicArea
                )
                return (item, entropy)
            }
            .filter { $0.1 >= 1.3 } // MESSY 阈值
            .max { $0.1 < $1.1 }?.0
    }
    
    var lowStockCount: Int {
        inventoryItems.filter { $0.currentStock <= $0.threshold }.count
    }
    
    /// 根据真实数据动态生成管家提醒
    var butlerMessage: String {
        // 优先级：宠物 > 清洁 > 库存 > 饮水 > 默认
        if let pet = mostUrgentPet {
            return "喵~ \(pet.name) 已经等很久啦，主人快去处理吧！😿"
        }
        if let area = messiest {
            return "主人，\(area.name) 积灰严重了，要不要今天打扫一下？🧹"
        }
        if lowStockCount > 0 {
            return "主人注意~ 有 \(lowStockCount) 样物品库存不足，需要补货哦 📦"
        }
        let hour = Calendar.current.component(.hour, from: systemTime)
        if hour < 9 {
            return "早起的小主人最棒啦！今天也要元气满满喵 ☀️"
        }
        if hour >= 22 {
            return "夜深了，主人早点休息，军军陪着你 🌙"
        }
        return "喵~ 家里一切都好，今天阳光正好，要不要陪军军发发呆？🦋"
    }
    
    var greeting: String {
        let hour = Calendar.current.component(.hour, from: systemTime)
        if hour < 6 { return "夜深了" }
        if hour < 9 { return "早安" }
        if hour < 12 { return "上午好" }
        if hour < 18 { return "下午好" }
        if hour < 22 { return "晚上好" }
        return "夜深了"
    }

    private var currentUser: UserMember? {
        state?.members.first(where: { $0.isCurrentUser })
    }

    private var hasPet: Bool {
        state?.members.contains(where: { $0.role == .pet }) ?? false
    }

    @State private var isEditingLayout = false

    // Sorting State
    @AppStorage("dashboardWidgetOrder") private var widgetOrderStr: String = "water,inventory,hygiene,pet"
    
    private var widgetOrder: [String] {
        get { widgetOrderStr.split(separator: ",").map(String.init) }
        set { widgetOrderStr = newValue.joined(separator: ",") }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                // Header (Greeting)
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .bottom, spacing: 0) {
                        Text("\(greeting)，")
                            .font(.system(size: 28, weight: .bold, design: .serif))
                            .foregroundColor(.wood800)
                        Text(currentUser?.name ?? "主人")
                            .font(.system(size: 28, weight: .bold, design: .serif))
                            .foregroundColor(.wood600)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                
                // Butler (军军)
                HStack(alignment: .top, spacing: 16) {
                    // Avatar
                    ZStack(alignment: .bottomTrailing) {
                        Circle()
                            .fill(Color.wood200)
                            .frame(width: 48, height: 48)
                            .overlay(
                                Circle().stroke(Color.white, lineWidth: 2)
                            )
                            .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                            .overlay(
                                Image(systemName: "pawprint.fill")
                                    .font(.title2)
                                    .foregroundColor(.wood800)
                            )
                        
                        Text("军军")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.wood50)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.wood800)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Color.white, lineWidth: 1))
                            .offset(x: 4, y: 4)
                    }
                    
                    // Bubble
                    Text(butlerMessage)
                        .font(.system(size: 14))
                        .foregroundColor(.wood800)
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.white)
                        .clipShape(
                            .rect(
                                topLeadingRadius: 4,
                                bottomLeadingRadius: 16,
                                bottomTrailingRadius: 16,
                                topTrailingRadius: 16
                            )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(Color.wood100.opacity(0.5), lineWidth: 1)
                        )
                        .shadow(color: Color.black.opacity(0.02), radius: 2, x: 0, y: 1)
                        .padding(.top, 4)
                }
                .padding(.horizontal, 24)
                
                // Widgets Title
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("认真生活中")
                            .font(.system(size: 20, weight: .bold, design: .serif))
                            .foregroundColor(.wood800)
                        Spacer()
                        Button(action: {
                            withAnimation { isEditingLayout.toggle() }
                        }) {
                            Image(systemName: isEditingLayout ? "checkmark" : "slider.horizontal.3")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(isEditingLayout ? .white : .wood400)
                                .padding(8)
                                .background(isEditingLayout ? Color.blue : Color.clear)
                                .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal, 24)
                    
                    if isEditingLayout {
                        Text("长按卡片右上方可拖拽排序，点击完成退出编辑")
                            .font(.system(size: 12))
                            .foregroundColor(.wood400)
                            .padding(.horizontal, 24)
                            .transition(.opacity)
                    }
                    
                    // Widgets List (1 per row) Reorderable
                    VStack(spacing: 16) {
                        ForEach(widgetOrder, id: \.self) { widgetKey in
                            draggableWidget(key: widgetKey)
                        }
                    }
                    .animation(.spring(), value: widgetOrderStr)
                    .padding(.horizontal, 24)
                }
            }
            .padding(.bottom, 40)
        }
        .background(Color.sunLight.ignoresSafeArea())
        .onTapGesture {
            if isEditingLayout {
                withAnimation { isEditingLayout = false }
            }
        }
    }
    
    // MARK: - Widget Rendering Helpers
    
    @ViewBuilder
    private func widgetContent(key: String) -> some View {
        if key == "water" {
            WidgetSlot(title: "饮水", icon: "drop.fill", isPlaceholder: false) { WaterWidgetView() }
        } else if key == "pet" {
            WidgetSlot(title: "宠物", icon: "pawprint.fill", isPlaceholder: false) { PetWidgetView() }
        } else if key == "inventory" {
            WidgetSlot(title: "库存", icon: "archivebox.fill", isPlaceholder: false) { InventoryWidgetView() }
        } else if key == "hygiene" {
            WidgetSlot(title: "清洁", icon: "sparkles", isPlaceholder: false) { HygieneWidgetView() }
        }
    }

    private func getTab(for key: String) -> LifeTab {
        if key == "pet" { return .pet }
        if key == "inventory" { return .inventory }
        if key == "hygiene" { return .hygiene }
        return .water
    }

    @ViewBuilder
    private func draggableWidget(key: String) -> some View {
        if key == "pet" && !hasPet {
            EmptyView()
        } else {
            let content = widgetContent(key: key)
                .onTapGesture {
                    if !isEditingLayout {
                        selectedLifeTab = getTab(for: key)
                        selectedMainTab = 1
                    }
                }
            
            if isEditingLayout {
                content
                    .overlay(
                        RoundedRectangle(cornerRadius: 32)
                            .stroke(Color.wood400.opacity(0.8), style: StrokeStyle(lineWidth: 2, dash: [6]))
                    )
                    .overlay(alignment: .topTrailing) {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.wood400.opacity(0.9))
                            .clipShape(Circle())
                            .padding(16)
                            .shadow(radius: 2)
                            .onDrag { NSItemProvider(object: key as NSString) }
                    }
                    .onDrop(of: [.text], delegate: DropViewDelegate(item: key, items: $widgetOrderStr, allKeys: widgetOrder))
                    .transition(.opacity)
            } else {
                content
            }
        }
    }
}

struct DropViewDelegate: DropDelegate {
    let item: String
    @Binding var items: String
    let allKeys: [String]
    
    func dropEntered(info: DropInfo) {
        // Find the dragging item
        guard let itemProvider = info.itemProviders(for: [.text]).first else { return }
        itemProvider.loadItem(forTypeIdentifier: "public.text", options: nil) { (data, error) in
            guard let data = data as? Data,
                  let draggingItem = String(data: data, encoding: .utf8) else { return }
            
            DispatchQueue.main.async {
                if item != draggingItem {
                    let from = allKeys.firstIndex(of: draggingItem)!
                    let to = allKeys.firstIndex(of: item)!
                    var newKeys = allKeys
                    newKeys.move(fromOffsets: IndexSet(integer: from), toOffset: to > from ? to + 1 : to)
                    items = newKeys.joined(separator: ",")
                }
            }
        }
    }
    
    func performDrop(info: DropInfo) -> Bool {
        return true
    }
}

#Preview {
    DashboardView(selectedMainTab: .constant(0), selectedLifeTab: .constant(.water))
        .modelContainer(for: SystemState.self, inMemory: true)
}
