import SwiftUI
import SwiftData

struct InventoryWidgetView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \InventoryItem.name) private var items: [InventoryItem]
    
    var lowStockItems: [InventoryItem] {
        items.filter { $0.currentStock <= $0.threshold }
    }
    
    var lowStockItemsCount: Int {
        lowStockItems.count
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.wood50
            
            VStack {
                HStack {
                    Image(systemName: "archivebox.fill")
                        .font(.caption)
                        .foregroundColor(.brown)
                        .padding(6)
                        .background(Color.brown.opacity(0.1))
                        .cornerRadius(8)
                    Text("库存")
                        .font(.system(size: 18, weight: .bold, design: .serif))
                        .foregroundColor(.wood800)
                    Spacer()
                }
                
                Spacer()
                
                if items.isEmpty {
                    // 空状态
                    VStack(spacing: 8) {
                        Image(systemName: "box.truck")
                            .font(.system(size: 32))
                            .foregroundColor(.wood300)
                        Text("暂无物品")
                            .font(.system(size: 12))
                            .foregroundColor(.wood400)
                    }
                    Spacer()
                } else if lowStockItemsCount > 0 {
                    // 有不足状态
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(lowStockItemsCount) 项不足")
                            .font(.system(size: 24, weight: .bold, design: .serif))
                            .foregroundColor(.wood800)
                        
                        // 显示最多两项不足的物品名称
                        let displayItems = lowStockItems.prefix(2)
                        let names = displayItems.map { $0.name }.joined(separator: ", ")
                        Text(names + (lowStockItemsCount > 2 ? " 等" : ""))
                            .font(.system(size: 12))
                            .foregroundColor(.wood500)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Spacer()
                    
                    HStack {
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 10))
                            Text("需补货")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.1))
                        .foregroundColor(.orange)
                        .cornerRadius(8)
                    }
                } else {
                    // 充足状态
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(items.count) 项物品")
                            .font(.system(size: 24, weight: .bold, design: .serif))
                            .foregroundColor(.wood800)
                        Text("物资充足")
                            .font(.system(size: 12))
                            .foregroundColor(.wood500)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Spacer()
                    
                    HStack {
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 10))
                            Text("健康")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.1))
                        .foregroundColor(.green)
                        .cornerRadius(8)
                    }
                }
            }
            .padding(20)
        }
    }
}

#Preview {
    InventoryWidgetView()
        .modelContainer(for: [InventoryItem.self, InventoryHistory.self], inMemory: true)
}
