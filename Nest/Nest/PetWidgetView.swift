import SwiftUI
import SwiftData

// MARK: - PetWidget local urgency helper (internal only — not the PRD status enum)
private struct PetUrgencyStatus: Identifiable {
    let id: String
    let item: PetCareItem
    let urgencyRatio: Double

    var isCrisis: Bool  { urgencyRatio >= 1.0 }
    var isWarning: Bool { urgencyRatio >= 0.75 }

    var timeDescription: String {
        let remaining = item.lastActionAt.addingTimeInterval(item.cycleHours * 3600).timeIntervalSinceNow
        if remaining <= 0 {
            let overdue = abs(remaining) / 3600
            if overdue < 1 { return "刚刚逾期" }
            if overdue < 24 { return "逾期 \(Int(overdue))h" }
            return "逾期 \(Int(overdue / 24))天"
        } else {
            let h = remaining / 3600
            if h < 1 { return "不足 1 小时" }
            if h < 24 { return "\(Int(h))h 后" }
            return "\(Int(h / 24))天后"
        }
    }
}

// MARK: - View

struct PetWidgetView: View {
    @Query(sort: \PetCareItem.lastActionAt) private var careItems: [PetCareItem]
    @Query private var systemStates: [SystemState]
    
    var systemTime: Date { systemStates.first?.systemTime ?? Date() }

    /// 计算每个护理项的紧急比例，按紧急程度降序排列
    private var sortedStatuses: [PetUrgencyStatus] {
        careItems.map { item in
            let elapsed = systemTime.timeIntervalSince(item.lastActionAt) / 3600.0
            let ratio = elapsed / item.cycleHours
            return PetUrgencyStatus(id: item.id, item: item, urgencyRatio: ratio)
        }
        .sorted { $0.urgencyRatio > $1.urgencyRatio }
    }

    private var mostUrgent: PetUrgencyStatus? { sortedStatuses.first }
    private var crisisCount: Int { sortedStatuses.filter { $0.isCrisis }.count }
    private var warningCount: Int { sortedStatuses.filter { $0.isWarning }.count }

    var body: some View {
        ZStack {
            // Ambient background based on urgency
            if crisisCount > 0 {
                LinearGradient(
                    colors: [Color.red.opacity(0.08), Color.orange.opacity(0.05)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            } else if warningCount > 0 {
                LinearGradient(
                    colors: [Color.orange.opacity(0.08), Color.yellow.opacity(0.04)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            } else {
                Color.wood50
            }

            VStack(alignment: .leading, spacing: 0) {
                // Header row
                HStack {
                    Image(systemName: "pawprint.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .padding(6)
                        .background(Color.orange.opacity(0.12))
                        .cornerRadius(8)
                    Text("宠物")
                        .font(.system(size: 18, weight: .bold, design: .serif))
                        .foregroundColor(.wood800)
                    Spacer()
                    if crisisCount > 0 {
                        urgencyBadge(text: "\(crisisCount) 逾期", color: .red)
                    } else if warningCount > 0 {
                        urgencyBadge(text: "\(warningCount) 待办", color: .orange)
                    }
                }

                Spacer()

                if careItems.isEmpty {
                    emptyState
                } else if let top = mostUrgent {
                    primaryTaskView(top)
                }
            }
            .padding(20)
        }
    }

    // MARK: Sub-views

    @ViewBuilder
    private func primaryTaskView(_ status: PetUrgencyStatus) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 10) {
                Text(iconFor(type: status.item.type))
                    .font(.system(size: 24))
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.8))
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)

                VStack(alignment: .leading, spacing: 2) {
                    Text(status.item.name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.wood900)
                        .lineLimit(1)
                    Text(status.timeDescription)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(status.isCrisis ? .red : status.isWarning ? .orange : .wood500)
                }
                Spacer()
            }

            // Urgency progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4).fill(Color.white.opacity(0.6))
                    RoundedRectangle(cornerRadius: 4)
                        .fill(status.isCrisis ? Color.red : status.isWarning ? Color.orange : Color.green)
                        .frame(width: geo.size.width * min(1.0, CGFloat(status.urgencyRatio)))
                        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: status.urgencyRatio)
                }
            }
            .frame(height: 5)

            if sortedStatuses.count > 1 {
                Text("另有 \(sortedStatuses.count - 1) 项护理任务")
                    .font(.system(size: 10))
                    .foregroundColor(.wood400)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "pawprint").font(.system(size: 32)).foregroundColor(.wood300)
            Text("暂无护理计划").font(.system(size: 12)).foregroundColor(.wood400)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    @ViewBuilder
    private func urgencyBadge(text: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "exclamationmark.circle.fill").font(.system(size: 9))
            Text(text).font(.system(size: 10, weight: .bold))
        }
        .padding(.horizontal, 8).padding(.vertical, 4)
        .background(color.opacity(0.12)).foregroundColor(color).cornerRadius(12)
    }

    private func iconFor(type: String) -> String {
        switch type {
        case "feed":      return "🍗"
        case "scoop":     return "🧹"
        case "water":     return "💧"
        case "deep_clean":return "🧼"
        case "nails":     return "💅"
        case "bath":      return "🛁"
        case "deworm":    return "💊"
        default:          return "🐾"
        }
    }
}

#Preview {
    PetWidgetView()
        .frame(width: 180, height: 180)
        .modelContainer(for: [PetCareItem.self], inMemory: true)
}
