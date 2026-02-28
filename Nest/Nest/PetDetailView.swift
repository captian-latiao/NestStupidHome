import SwiftUI
import SwiftData

// MARK: - PetDetailView
// Reference: modules/PetViews.tsx / services/petLogic.ts / prd/宠物护理.md

// MARK: - Type Config (ported from petLogic.ts PET_DEFAULT_CONFIG)
struct PetTypeConfig {
    let iconEmoji: String
    let gradientColors: (Color, Color)   // light top, deeper bottom
}

func petTypeConfig(for type: String) -> PetTypeConfig {
    switch type {
    case "feed":       return PetTypeConfig(iconEmoji: "🍗", gradientColors: (Color(hex: "FFF7ED"), Color(hex: "FFEDD5")))
    case "scoop":      return PetTypeConfig(iconEmoji: "🧹", gradientColors: (Color(hex: "F0FDF4"), Color(hex: "DCFCE7")))
    case "water":      return PetTypeConfig(iconEmoji: "💧", gradientColors: (Color(hex: "EFF6FF"), Color(hex: "DBEAFE")))
    case "deep_clean": return PetTypeConfig(iconEmoji: "🧼", gradientColors: (Color(hex: "F0FDFA"), Color(hex: "CCFBF1")))
    case "nails":      return PetTypeConfig(iconEmoji: "💅", gradientColors: (Color(hex: "FFF1F2"), Color(hex: "FFE4E6")))
    case "bath":       return PetTypeConfig(iconEmoji: "🛁", gradientColors: (Color(hex: "F0F9FF"), Color(hex: "E0F2FE")))
    case "deworm":     return PetTypeConfig(iconEmoji: "💊", gradientColors: (Color(hex: "F0FDF4"), Color(hex: "DCFCE7")))
    default:           return PetTypeConfig(iconEmoji: "🐾", gradientColors: (Color(hex: "FAFAF9"), Color(hex: "F5F5F4")))
    }
}

// MARK: - PetDetailView Body

struct PetDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \PetCareItem.lastActionAt, order: .forward) private var careItems: [PetCareItem]
    @Query private var systemStates: [SystemState]

    var systemTime: Date { systemStates.first?.systemTime ?? Date() }
    var petCount: Int { max(1, careItems.count) }

    /// PRD entropy with LoadFactor
    func petEntropy(_ item: PetCareItem) -> Double {
        let loadFactor: Double = (item.isShared && petCount > 1) ? 1.5 : 1.0
        let effectiveHours = item.cycleHours / loadFactor
        guard effectiveHours > 0 else { return 0 }
        return max(0, systemTime.timeIntervalSince(item.lastActionAt) / 3600.0 / effectiveHours)
    }

    /// PRD thresholds: Happy(0-0.5) / Okay(0.5-1.0) / Stale(1.0-1.5) / Crisis(>1.5)
    func petStatus(_ prog: Double) -> PetCareStatus {
        if prog <= 0.5 { return .happy }
        if prog <= 1.0 { return .okay }
        if prog <= 1.5 { return .stale }
        return .crisis
    }

    private var itemsWithProgress: [(item: PetCareItem, prog: Double, status: PetCareStatus)] {
        careItems.map { item in
            let prog = petEntropy(item)
            return (item, prog, petStatus(prog))
        }.sorted {
            let aUrgent = $0.status == .stale || $0.status == .crisis
            let bUrgent = $1.status == .stale || $1.status == .crisis
            if aUrgent && !bUrgent { return true }
            if !aUrgent && bUrgent { return false }
            if aUrgent && bUrgent { return $0.prog > $1.prog }
            return $0.item.cycleHours < $1.item.cycleHours
        }
    }
    @Namespace private var animationNamespace

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 12) {
                ForEach(itemsWithProgress, id: \.item.id) { entry in
                    PetAgingCard(
                        item: entry.item,
                        progress: entry.prog,
                        status: entry.status,
                        systemTime: systemTime
                    ) {
                        entry.item.lastActionAt = Date()
                        try? modelContext.save()
                    }
                    .matchedGeometryEffect(id: entry.item.id, in: animationNamespace)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 100)
            .animation(.spring(response: 0.6, dampingFraction: 0.8), value: itemsWithProgress.map { $0.item.lastActionAt })
        }
    }
}

// MARK: - Pet Aging Card
// Reference: PetViews.tsx → PetAgingCard component

struct PetAgingCard: View {
    let item: PetCareItem
    let progress: Double
    let status: PetCareStatus
    let systemTime: Date
    let onCare: () -> Void

    @State private var isCleaning = false

    private var config: PetTypeConfig { petTypeConfig(for: item.type) }
    private var isDirty: Bool { status == .stale || status == .crisis }

    private var hoursSince: Double {
        systemTime.timeIntervalSince(item.lastActionAt) / 3600.0
    }

    private var lastActionLabel: String {
        if hoursSince < 1 { return "刚刚" }
        if hoursSince < 24 { return "\(Int(hoursSince))h 前" }
        return "\(Int(hoursSince / 24)) 天前"
    }

    private var thresholdLabel: String {
        item.cycleHours >= 24
            ? "\(Int(item.cycleHours / 24))天"
            : "\(Int(item.cycleHours))h"
    }

    // PRD pet copy — deterministic by id hash
    private var petCopy: String {
        let happyPhrases  = ["最爱铲屎官了！😻", "肚皮吃饱饱~", "呼噜噜...💤", "今天也是元气猫猫！"]
        let okayPhrases   = ["现在感觉还不错", "在此刻，我是一只冷静的猫", "观察人类中...", "一切正常喵"]
        let stalePhrases  = ["水有点不新鲜了...", "厕所好挤哦", "有点味道了喵...", "在吗？该干活了"]
        let crisisPhrases = ["本喵要生气了！😾", "快来救驾！", "这是猫过的日子吗？", "拒绝使用此设施！"]
        let idx = abs(item.id.hashValue) % 4
        switch status {
        case .happy:  return happyPhrases[idx]
        case .okay:   return okayPhrases[idx]
        case .stale:  return stalePhrases[idx]
        case .crisis: return crisisPhrases[idx]
        }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // --- Background: gradient by type ---
            LinearGradient(
                colors: [config.gradientColors.0, config.gradientColors.1],
                startPoint: .top, endPoint: .bottom
            )
            
            // --- Background Watermark ---
            VStack {
                HStack {
                    Spacer()
                    Text(config.iconEmoji)
                        .font(.system(size: 80))
                        .opacity(0.15)
                        .rotationEffect(.degrees(15))
                        .offset(x: 20, y: -10)
                }
                Spacer()
            }


            // --- Dirt overlay (Stale / Crisis): emoji "paw prints" ---
            if isDirty && !isCleaning {
                DirtOverlay(status: status, seed: item.id)
                    .transition(.opacity.animation(.easeOut(duration: 1.2)))
            }

            // --- Clean reveal circle (clip from bottom-right) ---
            if isCleaning {
                GeometryReader { geo in
                    let circleSize = max(geo.size.width, geo.size.height) * 2.5
                    Circle()
                        .fill(Color.white.opacity(0.9))
                        .frame(width: circleSize, height: circleSize)
                        // Place center near the bottom right button
                        .position(x: geo.size.width - 40, y: geo.size.height - 40)
                        .scaleEffect(isCleaning ? 1.0 : 0.0, anchor: UnitPoint(x: (geo.size.width - 40)/circleSize, y: (geo.size.height - 40)/circleSize))
                        .animation(.easeInOut(duration: 1.1), value: isCleaning)
                }
                .blendMode(.plusLighter)
                .allowsHitTesting(false)
                .clipped()
            }

            // --- Card content ---
            VStack(alignment: .leading, spacing: 0) {
                // Top section
                VStack(alignment: .leading, spacing: 6) {
                    // Name
                    Text(item.name.components(separatedBy: "(").first ?? item.name)
                        .font(.system(size: 17, weight: .bold, design: .serif))
                        .foregroundColor(.wood900)
                        .lineLimit(1)
                        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)

                    // Status badge + threshold
                    HStack(spacing: 6) {
                        PetStatusBadge(status: isCleaning ? .happy : status)
                        HStack(spacing: 2) {
                            Image(systemName: "clock")
                                .font(.system(size: 9, weight: .medium))
                            Text(thresholdLabel)
                                .font(.system(size: 10, weight: .medium))
                        }
                        .foregroundColor(.wood600)
                        .padding(.horizontal, 6).padding(.vertical, 3)
                        .background(Color.white.opacity(0.7))
                        .cornerRadius(8)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)

                Spacer()

                // Bottom section
                VStack(alignment: .leading, spacing: 8) {
                    // Pet POV copy
                    Text(isCleaning ? "重新开始喵~" : petCopy)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.wood500)
                        .italic()
                        .lineLimit(1)

                    // Last care time
                    VStack(alignment: .leading, spacing: 1) {
                        Text("上次护理")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.wood500)
                        Text(isCleaning ? "刚刚" : lastActionLabel)
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(.wood800)
                    }

                    // Action button
                    Button(action: handleCare) {
                        HStack(spacing: 6) {
                            if isCleaning {
                                ProgressView()
                                    .scaleEffect(0.7)
                                    .progressViewStyle(CircularProgressViewStyle(tint: .wood600))
                                Text("护理中").font(.system(size: 12, weight: .bold))
                            } else {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 12, weight: .bold))
                                Text("完成").font(.system(size: 12, weight: .bold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(
                            isCleaning ? Color.wood100
                            : (isDirty ? Color.wood800 : Color.white.opacity(0.9))
                        )
                        .foregroundColor(
                            isCleaning ? Color.wood600
                            : (isDirty ? Color.white : Color.wood400)
                        )
                        .cornerRadius(18)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .stroke(isCleaning ? Color.wood200 : Color.clear, lineWidth: 1)
                        )
                        .shadow(color: isDirty && !isCleaning ? Color.black.opacity(0.12) : Color.clear, radius: 4, x: 0, y: 2)
                    }
                    .disabled(isCleaning)
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 14)
            }

            // Progress bar at very bottom
            VStack(spacing: 0) {
                Spacer()
                GeometryReader { geo in
                    let pct = min(1.0, isCleaning ? 0.0 : progress)
                    let w = geo.size.width * CGFloat(pct)
                    ZStack(alignment: .leading) {
                        Rectangle().fill(Color.white.opacity(0.3)).frame(height: 4)
                        Rectangle()
                            .fill(status == .crisis ? Color.red : (status == .stale ? Color.orange : Color.green))
                            .frame(width: w, height: 4)
                            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: pct)
                    }
                }
                .frame(height: 4)
            }

            // Sparkle burst on clean
            if isCleaning {
                SparkleView()
                    .transition(.opacity)
                    .allowsHitTesting(false)
            }
        }
        .frame(minHeight: 200)
        .cornerRadius(28)
        .overlay(RoundedRectangle(cornerRadius: 28).stroke(Color.wood100.opacity(0.5), lineWidth: 1))
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
        .clipped()
    }

    private func handleCare() {
        guard !isCleaning else { return }
        isCleaning = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            onCare()
            isCleaning = false
        }
    }
}

// MARK: - Status Badge

struct PetStatusBadge: View {
    let status: PetCareStatus
    var body: some View {
        HStack(spacing: 3) {
            statusIcon
            Text(statusLabel)
                .font(.system(size: 10, weight: .bold))
        }
        .padding(.horizontal, 7).padding(.vertical, 3)
        .background(statusBg)
        .foregroundColor(statusColor)
        .cornerRadius(7)
    }
    private var statusLabel: String {
        switch status {
        case .happy:  return "惬意"
        case .okay:   return "舒适"
        case .stale:  return "有味道"
        case .crisis: return "脏乱!"
        }
    }
    private var statusBg: Color {
        switch status {
        case .happy:  return Color.green.opacity(0.15)
        case .okay:   return Color.blue.opacity(0.1)
        case .stale:  return Color.yellow.opacity(0.2)
        case .crisis: return Color.red.opacity(0.15)
        }
    }
    private var statusColor: Color {
        switch status {
        case .happy:  return Color(hex: "166534")
        case .okay:   return Color(hex: "1D4ED8")
        case .stale:  return Color(hex: "854D0E")
        case .crisis: return Color(hex: "991B1B")
        }
    }
    @ViewBuilder
    private var statusIcon: some View {
        switch status {
        case .happy:
            Image(systemName: "sparkles").font(.system(size: 8, weight: .bold))
        case .stale:
            Image(systemName: "clock").font(.system(size: 8, weight: .bold))
        case .crisis:
            Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 8, weight: .bold))
        default:
            EmptyView()
        }
    }
}

// MARK: - Dirt Overlay (paw/scratch marks)
// Reference: PetViews.tsx → DirtLayer component

struct DirtOverlay: View {
    let status: PetCareStatus
    let seed: String

    private struct DirtSpot: Identifiable {
        let id: Int
        let xPct: CGFloat
        let yPct: CGFloat
        let rotation: Double
        let scale: CGFloat
        let isPaw: Bool
    }

    private var spots: [DirtSpot] {
        let count = status == .crisis ? 8 : 3
        return (0..<count).map { i in
            let h = abs((seed + "\(i)").hashValue)
            let xPct = CGFloat((h % 1000)) / 1000.0 * 0.8 + 0.1
            let yPct = CGFloat(((h >> 10) % 1000)) / 1000.0 * 0.8 + 0.1
            let rotation = Double((h >> 20) % 360)
            let scale = CGFloat((h >> 28) % 10) / 20.0 + 0.4
            let isPaw = ((h >> 35) % 3) != 0
            return DirtSpot(id: i, xPct: xPct, yPct: yPct, rotation: rotation, scale: scale, isPaw: isPaw)
        }
    }

    var body: some View {
        GeometryReader { geo in
            ForEach(spots) { spot in
                Text(spot.isPaw ? "🐾" : "😾")
                    .font(.system(size: 24))
                    .scaleEffect(spot.scale)
                    .rotationEffect(.degrees(spot.rotation))
                    .position(x: geo.size.width * spot.xPct,
                              y: geo.size.height * spot.yPct)
                    .opacity(status == .crisis ? 0.5 : 0.25)
                    .saturation(status == .crisis ? 0.4 : 0.6)
            }
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Sparkle Burst Animation

struct SparkleView: View {
    @State private var isAnimating = false

    private let particlePositions: [(CGFloat, CGFloat)] = [
        (0.2, 0.3), (0.5, 0.2), (0.8, 0.4),
        (0.3, 0.6), (0.7, 0.7), (0.4, 0.8),
        (0.6, 0.5), (0.1, 0.7), (0.9, 0.3),
        (0.5, 0.5), (0.25, 0.45), (0.75, 0.55)
    ]

    var body: some View {
        GeometryReader { geo in
            ForEach(Array(particlePositions.enumerated()), id: \.offset) { idx, pos in
                Image(systemName: idx % 2 == 0 ? "heart.fill" : "sparkles")
                    .font(.system(size: 14))
                    .foregroundColor(idx % 2 == 0 ? .orange : .yellow)
                    .position(x: geo.size.width * pos.0, y: geo.size.height * pos.1)
                    .scaleEffect(isAnimating ? 0.0 : 1.2)
                    .opacity(isAnimating ? 0.0 : 0.9)
                    .offset(y: isAnimating ? -40 : 0)
                    .animation(
                        .easeOut(duration: 0.8).delay(Double(idx) * 0.05),
                        value: isAnimating
                    )
            }
        }
        .onAppear { isAnimating = true }
    }
}


#Preview {
    PetDetailView()
        .modelContainer(for: [PetCareItem.self], inMemory: true)
}

