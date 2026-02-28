import SwiftUI
import SwiftData

// MARK: - WaterHeaderInfo (Reusable Header for Masking)
struct WaterHeaderInfo: View {
    let percentage: Double
    let currentLevel: Double
    let maxCapacity: Double
    let isRefilling: Bool
    let enduranceText: String
    let isLightMode: Bool // True when inside water (white text)

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text("\(Int(isRefilling ? 100 : percentage))")
                        .font(.system(size: 48, weight: .bold, design: .serif))
                    Text("%")
                        .font(.system(size: 24, weight: .semibold, design: .serif))
                        .opacity(0.8)
                }
                Text("\(String(format: "%.1f", isRefilling ? maxCapacity : currentLevel))L / \(String(format: "%.1f", maxCapacity))L")
                    .font(.system(size: 12, weight: .medium))
                    .opacity(0.8)
            }
            Spacer()
            HStack(spacing: 4) {
                Image(systemName: percentage < 20 ? "exclamationmark.triangle.fill" : "clock.fill")
                    .font(.system(size: 10))
                Text(isRefilling ? "正在注水..." : enduranceText)
            }
            .font(.system(size: 10, weight: .bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(isLightMode ? Color.white.opacity(0.2) : Color.wood800.opacity(0.1))
            .cornerRadius(8)
        }
        .foregroundColor(isLightMode ? .white : .wood800)
    }
}

// MARK: - WaterDetailView
// Reference: modules/WaterViews.tsx + services/waterLogic.ts + prd/饮用水管理.md

struct WaterDetailView: View {
    @Query private var systemStates: [SystemState]
    @Query(sort: \WaterLog.date) private var waterLogs: [WaterLog]
    @Environment(\.modelContext) private var modelContext

    @State private var isRefilling = false
    @State private var showOutlierToast = false
    @State private var showCalibration = false
    @State private var showConfig = false
    @State private var calibrationLevel: Double = 10.0
    @State private var newCapacity: Double = 18.9
    @State private var showOutlierAlert = false
    @State private var outlierMessage = ""
    
    // Animation states
    @State private var waveAnimOffset1: CGFloat = 0
    @State private var waveAnimOffset2: CGFloat = 0

    var state: SystemState? { systemStates.first }
    var maxCapacity: Double { state?.waterMaxCapacity ?? 0 }
    var systemTime: Date { state?.systemTime ?? Date() }

    // ── CORE: Use WaterLogic algorithms (not simple arithmetic) ──

    private var sleepWindow: SleepWindow {
        SleepWindow(
            startHour: state?.sleepStartHour ?? 23,
            endHour: state?.sleepEndHour ?? 7
        )
    }

    /// Current water level: calculated from active elapsed time × current_cycle_rate
    var currentLevel: Double {
        guard let s = state, maxCapacity > 0 else { return 0 }
        return calculateCurrentLevel(
            maxCapacity: s.waterMaxCapacity,
            lastRefillTime: s.waterLastRefillAt,
            now: systemTime,
            rate: s.currentCycleRate,
            sleep: sleepWindow
        )
    }

    var percentage: Double {
        guard maxCapacity > 0 else { return 0 }
        let raw = (currentLevel / maxCapacity) * 100
        // Bug Fix: Snap to 100% quickly to show full state, but keep it slightly below 100 for visual wave space
        if raw > 99.0 { return 100.0 }
        return min(100, max(0, raw))
    }

    /// Endurance: bioclock-aware prediction (skips sleep hours)
    var enduranceText: String {
        guard let s = state else { return "暂无数据" }
        let hours = predictEnduranceHours(
            currentLevel: currentLevel,
            rate: s.currentCycleRate,
            sleep: sleepWindow,
            now: systemTime
        )
        return formatEnduranceText(hours: hours)
    }

    // ── Trend data from WaterLogic (last 7 days) ──
    var trendData: [(date: String, liters: Double)] {
        guard let s = state else { return [] }
        return generateTrendData(
            historyLogs: Array(waterLogs),
            lastRefillTime: s.waterLastRefillAt,
            currentCycleRate: s.currentCycleRate,
            maxCapacity: s.waterMaxCapacity,
            sleep: sleepWindow,
            now: systemTime
        )
    }

    // ── Color by PRD 4.A ──
    var liquidGradient: LinearGradient {
        if isRefilling {
            return LinearGradient(colors: [.cyan.opacity(0.8), .blue.opacity(0.6)], startPoint: .top, endPoint: .bottom)
        } else if percentage < 20 {
            return LinearGradient(colors: [.orange.opacity(0.8), .red.opacity(0.8)], startPoint: .top, endPoint: .bottom)
        } else if percentage < 40 {
            return LinearGradient(colors: [.blue.opacity(0.8), .indigo.opacity(0.8)], startPoint: .top, endPoint: .bottom)
        } else {
            return LinearGradient(colors: [.cyan.opacity(0.8), .blue.opacity(0.8)], startPoint: .top, endPoint: .bottom)
        }
    }

    // MARK: - Body

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                if maxCapacity <= 0 {
                    waterSetupCard
                } else {
                    waterSphereCard
                    trendChartCard
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 10)
            .padding(.bottom, 100)
        }
        // Force redraw when debug time offset changes structure
        .id(state?.debugTimeOffset ?? 0)
        .sheet(isPresented: $showCalibration) { calibrationSheet }
        .sheet(isPresented: $showConfig) { configSheet }
    }

    // MARK: - Setup Card (未配置时)
    private var waterSetupCard: some View {
        VStack(spacing: 24) {
            Image(systemName: "drop.circle")
                .font(.system(size: 64))
                .foregroundColor(.blue.opacity(0.5))
            VStack(spacing: 8) {
                Text("设置水桶容量")
                    .font(.system(size: 20, weight: .bold, design: .serif))
                    .foregroundColor(.wood800)
                Text("设定你家水桶的最大容量，开始监测饮水状态")
                    .font(.system(size: 13))
                    .foregroundColor(.wood500)
                    .multilineTextAlignment(.center)
            }
            Button(action: { newCapacity = 18.9; showConfig = true }) {
                Text("立即设置")
                    .font(.system(size: 16, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                    .frame(height: 54)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(16)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 40)
        }
        .padding(40)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .cornerRadius(32)
        .overlay(RoundedRectangle(cornerRadius: 32).stroke(Color.wood100, lineWidth: 1))
    }

    // MARK: - Water Sphere Card
    private var waterSphereCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 40, style: .continuous)
                .fill(Color.wood50)
                .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)

            GeometryReader { geo in
                // Cap targetPercent at 0.98 visually so the waves are always visible at the top, even when logically 100%
                let basePercent = percentage / 100.0
                let targetPercent = isRefilling ? 0.98 : min(0.98, basePercent)
                // We use clipping to restrict all liquid visuals to the container bounds
                ZStack(alignment: .bottom) {
                    
                    // The liquid base
                    Rectangle()
                        .fill(liquidGradient)
                        .frame(height: geo.size.height * targetPercent)
                        
                    // Bubble Particles (only inside liquid)
                    BubbleParticles()
                        .frame(height: geo.size.height * targetPercent)
                    
                    // Surface waves (Top edge of the liquid)
                    ZStack {
                        // Back wave (slower, opposite direction)
                        WavePath(offset: 0, percent: targetPercent, speed: -12.0)
                            .foregroundStyle(liquidGradient.opacity(0.3)) // Matches layer opacity
                            .scaleEffect(x: -1, y: 1) // Flip horizontally
                            .offset(y: -12) // Slightly higher
                        
                        // Front wave
                        WavePath(offset: 0.5, percent: targetPercent, speed: 8.0)
                            .foregroundStyle(liquidGradient.opacity(0.5))
                            .offset(y: -5)
                    }
                    
                    // Top edge glow
                    Rectangle()
                        .fill(Color.white.opacity(0.3))
                        .blur(radius: 20)
                        .frame(height: 60)
                        .offset(y: -(geo.size.height * targetPercent) + 30)

                    // Pouring stream effect
                    if isRefilling {
                        RefillStream()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                .clipShape(RoundedRectangle(cornerRadius: 40, style: .continuous))
                .animation(.spring(response: 2.0, dampingFraction: 0.8), value: isRefilling)
                .animation(.spring(response: 1.0, dampingFraction: 0.8), value: currentLevel)
            }

            VStack(alignment: .leading) {
                // Layer 1: Dark Text (Behind Liquid)
                WaterHeaderInfo(
                    percentage: percentage,
                    currentLevel: currentLevel,
                    maxCapacity: maxCapacity,
                    isRefilling: isRefilling,
                    enduranceText: enduranceText,
                    isLightMode: false
                )

                Spacer()

                // Bottom Toast Overlay (above buttons)
                if showOutlierToast {
                    HStack(spacing: 8) {
                        Image(systemName: "info.circle.fill")
                            .foregroundColor(.blue)
                        Text(outlierMessage)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.wood800)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.1), radius: 10, y: 5)
                    .padding(.bottom, 8)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            withAnimation { self.showOutlierToast = false }
                        }
                    }
                }

                HStack(spacing: 12) {
                    // [主按钮] 换新水 - immediate execution
                    Button(action: { executeRefill() }) {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 16, weight: .bold))
                                .rotationEffect(.degrees(isRefilling ? 360 : 0))
                                .animation(isRefilling ? Animation.linear(duration: 1).repeatForever(autoreverses: false) : .default, value: isRefilling)
                            Text(isRefilling ? "注水中..." : "换新水")
                        }
                        .font(.system(size: 16, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color.white)
                        .foregroundColor(.wood900)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                    }
                    .disabled(isRefilling)

                    // [辅助按钮] 手动校准 (PRD 4.B)
                    Button(action: { calibrationLevel = currentLevel; showCalibration = true }) {
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 20))
                            .frame(width: 56, height: 56)
                            .background(Color.white.opacity(0.4))
                            .foregroundColor(.wood800)
                            .cornerRadius(16)
                    }
                }
            }
            .padding(24)
            
            // Layer 2: Light Text (Masked by liquid)
            GeometryReader { geo in
                let basePercent = percentage / 100.0
                let targetPercent = isRefilling ? 0.98 : min(0.98, basePercent)
                VStack(alignment: .leading) {
                    WaterHeaderInfo(
                        percentage: percentage,
                        currentLevel: currentLevel,
                        maxCapacity: maxCapacity,
                        isRefilling: isRefilling,
                        enduranceText: enduranceText,
                        isLightMode: true
                    )
                    Spacer()
                }
                .padding(24)
                // Mask strictly to the liquid area (just using the base rectangle is fine for text masking)
                .mask(
                    VStack(spacing: 0) {
                        Spacer(minLength: 0)
                        Rectangle()
                            .frame(height: geo.size.height * targetPercent)
                    }
                )
            }
            .allowsHitTesting(false) // Let touches pass through to the buttons below
        }
        .frame(height: 450)
    }

    // MARK: - Trend Chart Card
    private var trendChartCard: some View {
        let maxConsumption = trendData.map { $0.liters }.max() ?? 1.0
        let currentRate = state?.currentCycleRate ?? 0.5
        // Benchmark line: 2.0L × memberCount (PRD: §3.1.1)
        let memberCount = 1  // TODO: read from SystemState when member model added
        let benchmarkLiters = 2.0 * Double(memberCount)

        return VStack(alignment: .leading, spacing: 16) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "water.waves")
                        .foregroundColor(.blue.opacity(0.8))
                        .padding(6)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                    Text("饮水趋势")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.wood800)
                }
                Spacer()
                Button(action: { newCapacity = maxCapacity; showConfig = true }) {
                    HStack(spacing: 4) {
                        Image(systemName: "pencil")
                        Text("容器设置")
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.wood400)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.wood50)
                    .cornerRadius(8)
                }
            }

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                let rateML = Int(currentRate * 1000)
                Text("\(rateML)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.wood900)
                Text("ml/h")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(.wood400)
                Text("≈ \(String(format: "%.1f", currentRate * 1000 / 250)) 杯/小时")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.blue.opacity(0.8))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(10)
            }

            Text("当前周期流速（已扣除睡眠时段）")
                .font(.system(size: 12))
                .foregroundColor(.wood400)

            if trendData.allSatisfy({ $0.liters == 0 }) {
                Text("暂无饮水记录")
                    .font(.system(size: 14))
                    .foregroundColor(.wood300)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .frame(height: 120)
            } else {
                // Bar chart with benchmark line
                GeometryReader { geo in
                    let chartMax = max(maxConsumption, benchmarkLiters) * 1.2
                    let benchmarkY = geo.size.height * (1 - CGFloat(benchmarkLiters / chartMax))

                    ZStack(alignment: .bottom) {
                        // Benchmark dashed line
                        Path { path in
                            path.move(to: CGPoint(x: 0, y: benchmarkY))
                            path.addLine(to: CGPoint(x: geo.size.width, y: benchmarkY))
                        }
                        .stroke(Color.blue.opacity(0.4), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))

                        // Bars
                        HStack(alignment: .bottom, spacing: 8) {
                            ForEach(trendData, id: \.date) { entry in
                                VStack(spacing: 4) {
                                    Spacer()
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(entry.liters >= benchmarkLiters ? Color.blue.opacity(0.7) : Color.blue.opacity(0.4))
                                        .frame(height: max(4, CGFloat(entry.liters / chartMax) * geo.size.height))
                                    Text(shortDateLabel(entry.date))
                                        .font(.system(size: 9))
                                        .foregroundColor(.wood400)
                                }
                                .frame(maxWidth: .infinity)
                            }
                        }
                    }
                }
                .frame(height: 130)
            }
        }
        .padding(24)
        .background(Color.white)
        .cornerRadius(24)
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.wood100, lineWidth: 1))
    }

    // MARK: - Calibration Sheet (PRD 4.B)
    private var calibrationSheet: some View {
        NavigationView {
            VStack(spacing: 32) {
                Text("当前真实水位 (L)")
                    .font(.headline)
                    .foregroundColor(.wood800)

                Text(String(format: "%.1f L", calibrationLevel))
                    .font(.system(size: 40, weight: .bold, design: .serif))
                    .foregroundColor(.blue)

                // Default = current predicted level (PRD: min=0, max=waterMax)
                Slider(value: $calibrationLevel, in: 0...maxCapacity, step: 0.1)
                    .accentColor(.blue)
                    .padding(.horizontal)

                Text("拖动至实际水位，仅在预测偏差较大时使用")
                    .font(.system(size: 12))
                    .foregroundColor(.wood400)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Button(action: {
                    executeCalibration(actualLevel: calibrationLevel)
                    showCalibration = false
                }) {
                    Text("确认校准")
                        .font(.system(size: 16, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .contentShape(Rectangle())
                        .frame(height: 54)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                }
                .buttonStyle(.plain)
                .padding(.horizontal)

                Spacer()
            }
            .padding(.top, 32)
            .navigationTitle("校准水位")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { showCalibration = false }
                }
            }
            .onAppear {
                calibrationLevel = min(currentLevel, maxCapacity)
            }
        }
    }

    // MARK: - Config Sheet (PRD 4.C)
    private var configSheet: some View {
        NavigationView {
            VStack(spacing: 32) {
                Text("水桶最大容量 (L)")
                    .font(.headline)
                    .foregroundColor(.wood800)

                Text(String(format: "%.1f L", newCapacity))
                    .font(.system(size: 40, weight: .bold, design: .serif))
                    .foregroundColor(.wood900)

                Slider(value: $newCapacity, in: 1...30, step: 0.5)
                    .accentColor(.wood800)
                    .padding(.horizontal)

                Button(action: {
                    if let s = state {
                        s.waterMaxCapacity = newCapacity
                        s.waterCurrentLevel = newCapacity
                        s.waterLastRefillAt = systemTime
                        s.hasCalibratedThisCycle = false
                        try? modelContext.save()
                    }
                    showConfig = false
                }) {
                    Text("保存设置")
                        .font(.system(size: 16, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .contentShape(Rectangle())
                        .frame(height: 54)
                        .background(Color.wood900)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                }
                .buttonStyle(.plain)
                .padding(.horizontal)

                Spacer()
            }
            .padding(.top, 32)
            .navigationTitle("容器设置")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { showConfig = false }
                }
            }
        }
    }

    // MARK: - Actions

    /// REFILL: Full PRD algorithm (learning + outlier protection + archive)
    private func executeRefill() {
        guard !isRefilling, let s = state else { return }
        isRefilling = true

        // Optimistic UI: level animates to 100%
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            let result = processRefill(
                lastRefillTime: s.waterLastRefillAt,
                maxCapacity: s.waterMaxCapacity,
                learnedHourlyRate: s.learnedHourlyRate,
                currentCycleRate: s.currentCycleRate,
                hasCalibratedThisCycle: s.hasCalibratedThisCycle,
                sleep: sleepWindow,
                now: systemTime
            )

            // Archive daily usage logs
            for (dateStr, liters) in result.usageMap {
                let existing = waterLogs.first { $0.date == dateStr }
                if let existing = existing {
                    existing.consumptionLiters += liters
                } else {
                    modelContext.insert(WaterLog(date: dateStr, consumptionLiters: liters))
                }
            }

            // Update SystemState
            s.waterCurrentLevel = s.waterMaxCapacity
            s.waterLastRefillAt = systemTime
            s.learnedHourlyRate = result.newLearnedRate
            s.currentCycleRate = result.newLearnedRate
            s.hasCalibratedThisCycle = false

            try? modelContext.save()
            isRefilling = false

            // Show outlier toast if needed, otherwise show default success toast
            if result.isOutlier, let msg = result.outlierMessage {
                outlierMessage = msg
                withAnimation { showOutlierToast = true }
            } else {
                outlierMessage = "✨ 水桶已重新加满"
                withAnimation { showOutlierToast = true }
            }
        }
    }

    /// CALIBRATE: Full PRD algorithm (corrects rate or shifts anchor)
    private func executeCalibration(actualLevel: Double) {
        guard let s = state else { return }

        let result = processCalibration(
            lastRefillTime: s.waterLastRefillAt,
            maxCapacity: s.waterMaxCapacity,
            currentCycleRate: s.currentCycleRate,
            actualLevel: actualLevel,
            sleep: sleepWindow,
            now: systemTime
        )

        s.waterCurrentLevel = result.newCurrentLevel
        s.currentCycleRate = result.newCycleRate
        s.hasCalibratedThisCycle = true
        if let shifted = result.newLastRefillTime {
            s.waterLastRefillAt = shifted
        }
        try? modelContext.save()
    }

    // MARK: - Helpers
    private func shortDateLabel(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        if parts.count == 3 { return "\(parts[1])/\(parts[2])" }
        return dateStr
    }
}

#Preview {
    ZStack {
        Color.wood50.edgesIgnoringSafeArea(.all)
        WaterDetailView()
    }
    .modelContainer(for: [WaterLog.self, SystemState.self], inMemory: true)
}

// MARK: - WavePath (Web Stable Port)

// Shape shifting coordinates (2x width)
struct WavePathFixed: Shape {
    var percent: Double

    var animatableData: Double {
        get { percent }
        set { percent = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let yoffset = CGFloat(1 - percent) * rect.height
        let amplitude: CGFloat = 12
        let width = rect.width
        let w2 = width * 2 // 200%
        
        p.move(to: CGPoint(x: 0, y: yoffset))
        
        // Cubic bezier to make an S shape across 100% width
        // Then repeat for 200%
        p.addCurve(to: CGPoint(x: width, y: yoffset),
                   control1: CGPoint(x: width * 0.25, y: yoffset - amplitude),
                   control2: CGPoint(x: width * 0.75, y: yoffset + amplitude))
                   
        p.addCurve(to: CGPoint(x: w2, y: yoffset),
                   control1: CGPoint(x: width + width * 0.25, y: yoffset - amplitude),
                   control2: CGPoint(x: width + width * 0.75, y: yoffset + amplitude))
                   
        p.addLine(to: CGPoint(x: w2, y: rect.height))
        p.addLine(to: CGPoint(x: 0, y: rect.height))
        p.closeSubpath()
        return p
    }
}

// Redefine WavePath to use the fixed one, we animate X offset outside of Shape
// Using TimelineView to guarantee an unstoppable continuous flow effect
struct WavePath: View {
    var offset: CGFloat // Phase shift
    var percent: Double
    var speed: Double // seconds for a full cycle

    var body: some View {
        TimelineView(.animation) { context in
            GeometryReader { geo in
                // Calculate continuous offset based on actual time
                let phase = context.date.timeIntervalSinceReferenceDate.remainder(dividingBy: speed) / speed
                let currentOffset = offset + CGFloat(phase) * 0.5 // 0.5 represents half of the 200% width

                WavePathFixed(percent: percent)
                    .frame(width: geo.size.width * 2)
                    .offset(x: -currentOffset * geo.size.width * 2)
            }
        }
    }
}

// MARK: - BubbleParticles
struct BubbleParticles: View {
    // Generate static random positions for 12 bubbles
    let bubbles = (0..<12).map { _ in
        (x: CGFloat.random(in: 0.05...0.95), size: CGFloat.random(in: 4...10), delay: Double.random(in: 0...2), duration: Double.random(in: 3...6))
    }
    
    @State private var isAnimating = false
    
    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(0..<bubbles.count, id: \.self) { i in
                    Circle()
                        .fill(Color.white.opacity(0.3))
                        .frame(width: bubbles[i].size, height: bubbles[i].size)
                        .position(
                            x: bubbles[i].x * geo.size.width,
                            y: isAnimating ? geo.size.height * -0.1 : geo.size.height * 1.0 // Bottom to top
                        )
                        .opacity(isAnimating ? 0.0 : 0.6)
                        .animation(
                            Animation.easeOut(duration: bubbles[i].duration)
                                .repeatForever(autoreverses: false)
                                .delay(bubbles[i].delay),
                            value: isAnimating
                        )
                }
            }
            .onAppear {
                isAnimating = true
            }
        }
    }
}

// MARK: - RefillStream
struct RefillStream: View {
    @State private var isAnimating = false
    
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            
            ZStack {
                // Outer Glow Column
                Rectangle()
                    .fill(
                        LinearGradient(colors: [Color.white.opacity(0.4), Color.blue.opacity(0.2), Color.blue.opacity(0.1)], startPoint: .top, endPoint: .bottom)
                    )
                    .frame(width: 80, height: h)
                    .blur(radius: 20)
                    .position(x: w / 2, y: h / 2)
                
                // Inner Core Stream
                Rectangle()
                    .fill(
                        LinearGradient(colors: [Color.white.opacity(0.9), Color.white.opacity(0.5), Color.clear], startPoint: .top, endPoint: .bottom)
                    )
                    .frame(width: 20, height: h)
                    .blur(radius: 2)
                    .position(x: w / 2, y: h / 2)
                
                // Turbulence Impact Bubbles
                ForEach(0..<15, id: \.self) { i in
                    Circle()
                        .fill(Color.white.opacity(0.6))
                        .frame(width: 12, height: 12)
                        .position(
                            x: w / 2 + CGFloat.random(in: -40...40),
                            y: isAnimating ? geo.size.height * (CGFloat.random(in: 0.8...0.9)) : geo.size.height * 1.1
                        )
                        .scaleEffect(isAnimating ? CGFloat.random(in: 0.5...1.5) : 0.2)
                        .opacity(isAnimating ? 0 : 1)
                        .animation(
                            Animation.easeOut(duration: Double.random(in: 1.0...2.0))
                                .repeatForever(autoreverses: false)
                                .delay(Double.random(in: 0...0.5)),
                            value: isAnimating
                        )
                }
            }
            .onAppear {
                isAnimating = true
            }
        }
    }
}
