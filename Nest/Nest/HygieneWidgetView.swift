import SwiftUI
import SwiftData

struct HygieneWidgetView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var systemStates: [SystemState]
    @Query private var items: [HygieneItem]
    
    var state: SystemState? { systemStates.first }
    
    struct ComputedItem {
        let item: HygieneItem
        let progress: Double
        let status: HygieneStatus
    }
    
    var computedItems: [ComputedItem] {
        items.map { item in
            let progress = HygieneLogic.calculateEntropy(
                lastCleanedAt: item.lastCleanedAt,
                baseIntervalDays: item.baseIntervalDays,
                isPublicArea: item.isPublicArea,
                householdMembers: 2 // default to 2
            )
            let status = HygieneLogic.getHygieneStatus(entropy: progress)
            return ComputedItem(item: item, progress: progress, status: status)
        }
        .sorted { $0.progress > $1.progress }
    }
    
    var urgentItems: [ComputedItem] {
        computedItems.filter { $0.status == .dusty || $0.status == .messy }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Ambient Background
            if urgentItems.isEmpty {
                LinearGradient(colors: [Color.blue.opacity(0.1), Color.wood50], startPoint: .topLeading, endPoint: .bottomTrailing)
            } else if urgentItems.first?.status == .messy {
                LinearGradient(colors: [Color.red.opacity(0.1), Color.orange.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing)
            } else {
                LinearGradient(colors: [Color.orange.opacity(0.1), Color.yellow.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing)
            }
            
            VStack {
                HStack {
                    Image(systemName: "sparkles")
                        .font(.caption)
                        .foregroundColor(.blue)
                        .padding(6)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                    Text("清洁")
                        .font(.system(size: 18, weight: .bold, design: .serif))
                        .foregroundColor(.wood800)
                    Spacer()
                    
                    if !urgentItems.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 10))
                            Text("\(urgentItems.count) 待办")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red.opacity(0.1))
                        .foregroundColor(.red)
                        .cornerRadius(12)
                    }
                }
                
                Spacer()
                
                if items.isEmpty {
                    // Empty state (no data)
                    VStack(spacing: 8) {
                        Image(systemName: "sparkles.rectangle.stack")
                            .font(.system(size: 32))
                            .foregroundColor(.wood300)
                        Text("暂无区域")
                            .font(.system(size: 12))
                            .foregroundColor(.wood400)
                    }
                    Spacer()
                } else if urgentItems.isEmpty {
                    // All Clean State
                    VStack(alignment: .center, spacing: 8) {
                        Circle()
                            .fill(LinearGradient(colors: [Color.blue.opacity(0.2), Color.cyan.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 48, height: 48)
                            .overlay(
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.title2)
                                    .foregroundColor(.blue)
                            )
                        VStack(spacing: 2) {
                            Text("焕然一新")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.wood800)
                            Text("全屋卫生状况良好")
                                .font(.system(size: 10))
                                .foregroundColor(.wood400)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    Spacer()
                } else {
                    // Urgent State
                    if let topItem = urgentItems.first {
                        let isMessy = topItem.status == .messy
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: isMessy ? "exclamationmark.triangle.fill" : "wind")
                                    .font(.system(size: 20))
                                    .foregroundColor(isMessy ? .red : .orange)
                                    .padding(8)
                                    .background(Color.white.opacity(0.8))
                                    .cornerRadius(12)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(topItem.item.name)
                                        .font(.system(size: 18, weight: .bold, design: .serif))
                                        .foregroundColor(.wood900)
                                    Text(isMessy ? "严重积灰 · 建议立即打扫" : "有些脏了 · 建议打扫")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(isMessy ? .red : .orange)
                                }
                            }
                            
                            // Progress bar
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Rectangle()
                                        .fill(Color.white.opacity(0.6))
                                        .cornerRadius(4)
                                    
                                    Rectangle()
                                        .fill(isMessy ? Color.red : Color.orange)
                                        .cornerRadius(4)
                                        .frame(width: geo.size.width * min(1.0, CGFloat(topItem.progress)))
                                }
                            }
                            .frame(height: 6)
                            
                            if urgentItems.count > 1 {
                                Text("还有 \(urgentItems.count - 1) 处区域需要清洁")
                                    .font(.system(size: 10))
                                    .foregroundColor(.wood400)
                                    .frame(maxWidth: .infinity, alignment: .center)
                            }
                        }
                        Spacer()
                    }
                }
            }
            .padding(20)
        }
    }
}

#Preview {
    HygieneWidgetView()
        .modelContainer(for: [SystemState.self, HygieneItem.self], inMemory: true)
}
