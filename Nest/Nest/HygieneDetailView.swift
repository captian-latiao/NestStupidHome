import SwiftUI
import SwiftData

// MARK: - HygieneDetailView
// Reference: modules/HygieneViews.tsx / services/hygieneLogic.ts / prd/清洁管理.md

struct HygieneDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \HygieneItem.lastCleanedAt) private var items: [HygieneItem]
    @Query private var systemStates: [SystemState]

    let householdMembers: Int = 2   // TODO: from FamilyModel
    var systemTime: Date { systemStates.first?.systemTime ?? Date() }

    private var processedItems: [(item: HygieneItem, progress: Double, status: HygieneStatus, daysSince: Int)] {
        items.map { item in
            let entropy = HygieneLogic.calculateEntropy(
                lastCleanedAt: item.lastCleanedAt,
                baseIntervalDays: item.baseIntervalDays,
                isPublicArea: item.isPublicArea,
                householdMembers: householdMembers,
                currentTime: systemTime
            )
            let status = HygieneLogic.getHygieneStatus(entropy: entropy)
            let days = Int(systemTime.timeIntervalSince(item.lastCleanedAt) / 86400)
            return (item, entropy, status, days)
        }.sorted { $0.progress > $1.progress }
    }

    @Namespace private var animationNamespace

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 24) {
                if !processedItems.isEmpty {
                    // Top: Hero Card (Urgent / Most needing clean)
                    // Implemented as a horizontal scroll view so it matches the screenshot's "peeking" edge feel,
                    // or just a large card if there's only one.
                    let topItem = processedItems.first!
                    let restItems = Array(processedItems.dropFirst())

                    // We use a horizontal scroll view for the top item(s) to allow swiping if we ever wanted
                    // multiple hero cards, but here we just show the first one large.
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            // Currently just showing the absolute most urgent item as the hero
                            HygieneAgingCard(
                                item: topItem.item,
                                progress: topItem.progress,
                                status: topItem.status,
                                daysSince: topItem.daysSince
                            ) {
                                let id = topItem.item.id
                                if let match = items.first(where: { $0.id == id }) {
                                    match.lastCleanedAt = Date()
                                    try? modelContext.save()
                                }
                            }
                            .frame(width: UIScreen.main.bounds.width - 40)
                            .matchedGeometryEffect(id: topItem.item.id, in: animationNamespace)
                        }
                        .padding(.horizontal, 20)
                    }

                    // Bottom: Grid for the rest
                    if !restItems.isEmpty {
                        VStack(spacing: 14) {
                            ForEach(restItems, id: \.item.id) { entry in
                                HygieneAgingCard(
                                    item: entry.item,
                                    progress: entry.progress,
                                    status: entry.status,
                                    daysSince: entry.daysSince
                                ) {
                                    let id = entry.item.id
                                    if let match = items.first(where: { $0.id == id }) {
                                        match.lastCleanedAt = Date()
                                        try? modelContext.save()
                                    }
                                }
                                .matchedGeometryEffect(id: entry.item.id, in: animationNamespace)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 100)
            .animation(.spring(response: 0.6, dampingFraction: 0.8), value: processedItems.map { $0.item.lastCleanedAt })
        }
    }
}

// MARK: - Category Image URL
// Ported from HygieneViews.tsx → CATEGORY_IMAGES

func hygieneCategoryImageURL(for category: String) -> URL? {
    let urls: [String: String] = [
        "stove":     "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80",
        "floor_vac": "https://images.unsplash.com/photo-1581539250439-c96689b516dd?auto=format&fit=crop&w=600&q=80",
        "floor_mop": "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=600&q=80",
        "bedding":   "https://plus.unsplash.com/premium_photo-1673942750147-87233d9f29d5?q=80&w=997&auto=format&fit=crop",
        "curtain":   "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
        "toilet":    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
        "washer":    "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
        "ac_filter": "https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=600&q=80",
    ]
    let raw = urls[category] ?? urls["floor_vac"]!
    return URL(string: raw)
}

// MARK: - Hygiene Aging Card
// Reference: HygieneViews.tsx → AgingCard component

struct HygieneAgingCard: View {
    let item: HygieneItem
    let progress: Double
    let status: HygieneStatus
    let daysSince: Int
    let onClean: () -> Void

    @State private var isCleaning = false
    @State private var bgImage: UIImage? = nil

    private let normalizedProgress: Double

    init(item: HygieneItem, progress: Double, status: HygieneStatus, daysSince: Int, onClean: @escaping () -> Void) {
        self.item = item
        self.progress = progress
        self.status = status
        self.daysSince = daysSince
        self.onClean = onClean
        self.normalizedProgress = min(2.0, progress)
    }

    // Derived visual intensities from progress (ported from HygieneViews.tsx)
    private var noiseOpacity: Double   { min(0.6, normalizedProgress * 0.3) }
    private var grungeOpacity: Double  { max(0, min(0.7, (normalizedProgress - 0.5) * 0.7)) }
    private var darkenAmount: Double   { max(0, min(0.3, (progress - 1.0) * 0.3)) }

    private var isFresh: Bool { status == .fresh }

    private var lastCleanedLabel: String {
        isCleaning ? "刚刚" : (daysSince == 0 ? "今天" : "\(daysSince) 天前")
    }

    var body: some View {
        ZStack {
            // Base: wood-50 background
            Color(hex: "FAFAF7")

            // Background photo (from Unsplash, cached via AsyncImage)
            if let url = hygieneCategoryImageURL(for: item.category) {
                GeometryReader { geo in
                    AsyncImage(url: url) { phase in
                        if let img = phase.image {
                            img.resizable()
                                .scaledToFill()
                                .frame(width: geo.size.width, height: geo.size.height)
                                .opacity(0.30)
                                .saturation(0.0)   // desaturated like Web version
                        } else {
                            Color.clear
                        }
                    }
                }
                .clipped()
                .allowsHitTesting(false)
            }

            // Gradient overlay
            LinearGradient(
                colors: [
                    Color.white.opacity(0.7),
                    Color(hex: "F5F0E8").opacity(0.4),
                    Color(hex: "E8D9B8").opacity(0.9)
                ],
                startPoint: .top, endPoint: .bottom
            )
            .allowsHitTesting(false)

            // Noise texture (TV Static)
            Image(uiImage: .noiseTexture)
                .resizable(resizingMode: .tile)
                .blendMode(.overlay)
                .opacity(noiseOpacity * 1.5)
                .allowsHitTesting(false)

            // Grunge radial dimming
            RadialGradient(
                colors: [Color.clear, Color(hex: "3C3220").opacity(grungeOpacity * 0.5)],
                center: .center,
                startRadius: 10,
                endRadius: 120
            )
            .allowsHitTesting(false)

            // Darkening for messy state
            Color.black.opacity(darkenAmount * 0.7)
                .allowsHitTesting(false)

            // Clean reveal overlay: white expanding from bottom-right
            // Use an animation-driven state so it actually scales up visibly
            GeometryReader { geo in
                let circleSize = max(geo.size.width, geo.size.height) * 2.5
                Circle()
                    .fill(Color.white.opacity(0.92))
                    .frame(width: circleSize, height: circleSize)
                    // Place center near the bottom right button
                    .position(x: geo.size.width - 40, y: geo.size.height - 40)
                    .scaleEffect(isCleaning ? 1.0 : 0.0, anchor: UnitPoint(x: (geo.size.width - 40)/circleSize, y: (geo.size.height - 40)/circleSize))
                    .animation(.easeInOut(duration: 1.2), value: isCleaning)
            }
            .allowsHitTesting(false)
            .clipped()

            // Content
            VStack(alignment: .leading, spacing: 0) {
                // Name + badges
                VStack(alignment: .leading, spacing: 8) {
                    Text(item.name)
                        .font(.system(size: 18, weight: .bold, design: .serif))
                        .foregroundColor(.wood900)
                        .lineLimit(2)
                        .shadow(color: Color.black.opacity(0.06), radius: 2, x: 0, y: 1)

                    HStack(spacing: 6) {
                        HygieneStatusBadge(status: isCleaning ? .fresh : status)
                        HStack(spacing: 2) {
                            Image(systemName: "clock").font(.system(size: 9, weight: .medium))
                            Text("\(Int(item.baseIntervalDays))天").font(.system(size: 10, weight: .medium))
                        }
                        .foregroundColor(.wood600)
                        .padding(.horizontal, 6).padding(.vertical, 3)
                        .background(Color.white.opacity(0.7))
                        .cornerRadius(8)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)

                Spacer()

                // Bottom: last cleaned + action button
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("上次清洁")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.wood500)
                        Text(lastCleanedLabel)
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(.wood800)
                    }

                    Spacer()

                    // 焕新 button
                    Button(action: handleClean) {
                        HStack(spacing: 5) {
                            if isCleaning {
                                ProgressView().scaleEffect(0.7)
                                    .progressViewStyle(CircularProgressViewStyle(tint: .wood600))
                                Text("焕新中").font(.system(size: 11, weight: .bold))
                            } else {
                                Image(systemName: "sparkles").font(.system(size: 11, weight: .bold))
                                    .foregroundColor(isFresh ? .wood400 : Color(hex: "FDE68A"))
                                Text("焕新").font(.system(size: 11, weight: .bold))
                            }
                        }
                        .padding(.horizontal, 14).padding(.vertical, 8)
                        .background(
                            isCleaning ? Color.wood100
                            : (isFresh ? Color.white.opacity(0.9) : Color.wood800)
                        )
                        .foregroundColor(
                            isCleaning ? Color.wood600
                            : (isFresh ? Color.wood400 : Color.white)
                        )
                        .cornerRadius(18)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .stroke(isFresh ? Color.wood100 : Color.clear, lineWidth: 1)
                        )
                        .shadow(color: (!isFresh && !isCleaning) ? Color.black.opacity(0.12) : Color.clear, radius: 4)
                    }
                    .disabled(isCleaning)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }

            // Sparkles on clean
            if isCleaning {
                HygieneSparkleView()
                    .transition(.opacity)
                    .allowsHitTesting(false)
            }

            // Progress bar at bottom
            VStack(spacing: 0) {
                Spacer()
                GeometryReader { geo in
                    let pct = min(1.0, isCleaning ? 0.0 : progress)
                    ZStack(alignment: .leading) {
                        Rectangle().fill(Color.white.opacity(0.3)).frame(height: 5)
                        Rectangle()
                            .fill(progress > 1.5 ? Color.red : (progress > 1.0 ? Color.orange : (progress > 0.8 ? Color.yellow : Color.green)))
                            .frame(width: geo.size.width * CGFloat(pct), height: 5)
                            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: pct)
                    }
                }
                .frame(height: 5)
            }
        }
        .frame(height: 180)
        .cornerRadius(28)
        .overlay(RoundedRectangle(cornerRadius: 28).stroke(Color.wood100.opacity(0.5), lineWidth: 1))
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
        .clipped()
    }

    private func handleClean() {
        guard !isCleaning else { return }
        isCleaning = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            onClean()
            isCleaning = false
        }
    }
}

// MARK: - Hygiene Status Badge (ported from HygieneViews.tsx → StatusBadge)

struct HygieneStatusBadge: View {
    let status: HygieneStatus
    var body: some View {
        HStack(spacing: 3) {
            badgeIcon
            Text(badgeLabel).font(.system(size: 10, weight: .bold))
        }
        .padding(.horizontal, 7).padding(.vertical, 3)
        .background(badgeBg)
        .foregroundColor(badgeColor)
        .cornerRadius(7)
    }
    private var badgeLabel: String {
        switch status {
        case .fresh:  return "洁净一新"
        case .normal: return "略有灰尘"
        case .dusty:  return "家务时间到"
        case .messy:  return "过敏警告"
        }
    }
    private var badgeBg: Color {
        switch status {
        case .fresh:  return Color.green.opacity(0.15)
        case .normal: return Color.blue.opacity(0.1)
        case .dusty:  return Color.orange.opacity(0.2)
        case .messy:  return Color.red.opacity(0.15)
        }
    }
    private var badgeColor: Color {
        switch status {
        case .fresh:  return Color(hex: "166534")
        case .normal: return Color(hex: "1D4ED8")
        case .dusty:  return Color(hex: "9A3412")
        case .messy:  return Color(hex: "991B1B")
        }
    }
    @ViewBuilder
    private var badgeIcon: some View {
        switch status {
        case .fresh: Image(systemName: "sparkles").font(.system(size: 8, weight: .bold))
        case .dusty: Image(systemName: "clock").font(.system(size: 8, weight: .bold))
        case .messy: Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 8, weight: .bold))
        default: EmptyView()
        }
    }
}

// MARK: - Sparkle burst for clean animation

struct HygieneSparkleView: View {
    @State private var isAnimating = false
    private let positions: [(CGFloat, CGFloat)] = [
        (0.2, 0.3), (0.5, 0.2), (0.8, 0.4),
        (0.3, 0.6), (0.7, 0.7), (0.4, 0.8),
        (0.6, 0.5), (0.15, 0.65), (0.85, 0.35)
    ]
    var body: some View {
        GeometryReader { geo in
            ForEach(Array(positions.enumerated()), id: \.offset) { idx, pos in
                Image(systemName: "sparkles")
                    .font(.system(size: 12 + CGFloat(idx % 3) * 4))
                    .foregroundColor(.yellow)
                    .position(x: geo.size.width * pos.0, y: geo.size.height * pos.1)
                    .scaleEffect(isAnimating ? 0.0 : 1.2)
                    .opacity(isAnimating ? 0.0 : 1.0)
                    .offset(y: isAnimating ? -30 : 0)
                    .rotationEffect(.degrees(isAnimating ? 90 : 0))
                    .animation(.easeOut(duration: 0.8).delay(Double(idx) * 0.06), value: isAnimating)
            }
        }
        .onAppear { isAnimating = true }
    }
}

#Preview {
    HygieneDetailView()
        .modelContainer(for: [HygieneItem.self], inMemory: true)
}

// MARK: - Noise Texture Generator
extension UIImage {
    static let noiseTexture: UIImage = {
        let width = 128
        let height = 128
        let colorSpace = CGColorSpaceCreateDeviceGray()
        var data = [UInt8](repeating: 0, count: width * height)
        for i in 0..<data.count {
            data[i] = UInt8.random(in: 10...240)
        }
        let context = CGContext(data: &data, width: width, height: height,
                                bitsPerComponent: 8, bytesPerRow: width,
                                space: colorSpace, bitmapInfo: CGImageAlphaInfo.none.rawValue)
        let cgImage = context!.makeImage()!
        return UIImage(cgImage: cgImage)
    }()
}
