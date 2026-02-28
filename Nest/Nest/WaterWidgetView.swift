import SwiftUI
import SwiftData

struct WaterWidgetView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var systemStates: [SystemState]
    @Query(sort: \WaterLog.timestamp, order: .reverse) private var logs: [WaterLog]
    
    var systemTime: Date { systemStates.first?.systemTime ?? Date() }
    
    var state: SystemState? { systemStates.first }
    
    var maxCapacity: Double {
        let cap = state?.waterMaxCapacity ?? 0.0
        return cap > 0 ? cap : 0.0
    }
    
    // 水量：直接读取精确水位（换水/校准时更新），再叠加上次补水后的消耗记录
    var currentLevel: Double {
        guard let s = state, s.waterMaxCapacity > 0 else { return 0 }
        // PRD: Level is derived from active elapsed time × current_cycle_rate
        return calculateCurrentLevel(
            maxCapacity: s.waterMaxCapacity,
            lastRefillTime: s.waterLastRefillAt,
            now: systemTime,
            rate: s.currentCycleRate,
            sleep: SleepWindow(startHour: s.sleepStartHour, endHour: s.sleepEndHour)
        )
    }

    var percentage: Double {
        guard let s = state, s.waterMaxCapacity > 0 else { return 0 }
        let raw = (currentLevel / s.waterMaxCapacity) * 100
        if raw > 99.0 { return 100.0 }
        return min(100, max(0, raw))
    }

    var enduranceText: String {
        guard let s = state else { return "暂无数据" }
        let hours = predictEnduranceHours(
            currentLevel: currentLevel,
            rate: s.currentCycleRate,
            sleep: SleepWindow(startHour: s.sleepStartHour, endHour: s.sleepEndHour),
            now: Date()
        )
        return formatEnduranceText(hours: hours)
    }
    
    var body: some View {
        if maxCapacity <= 0 {
            // 未配置状态
            ZStack {
                Color.wood50
                VStack(spacing: 8) {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 56, height: 56)
                        .overlay(
                            Image(systemName: "info.circle")
                                .font(.title)
                                .foregroundColor(.blue)
                        )
                        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                    
                    Text("配置容器")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.wood800)
                    Text("点击设置容量")
                        .font(.system(size: 10))
                        .foregroundColor(.wood400)
                }
                
                // Header (Overlay)
                VStack {
                    HStack {
                        Image(systemName: "drop.fill")
                            .font(.caption)
                            .foregroundColor(.blue)
                            .padding(6)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                        Text("饮水")
                            .font(.system(size: 18, weight: .bold, design: .serif))
                            .foregroundColor(.wood800)
                        Spacer()
                    }
                    .padding(20)
                    Spacer()
                }
            }
        } else {
            // 已配置状态：精确水位 + 续航估算
            GeometryReader { geo in
                ZStack(alignment: .bottom) {
                    Color.wood50
                    
                    // Liquid Fill
                    Rectangle()
                        .fill(LinearGradient(
                            colors: percentage < 20
                                ? [Color.red.opacity(0.7), Color.orange.opacity(0.5)]
                                : [Color.blue, Color.cyan],
                            startPoint: .bottom, endPoint: .top
                        ))
                        .frame(height: geo.size.height * CGFloat(percentage / 100.0))
                        .animation(.spring(response: 0.5, dampingFraction: 0.8), value: percentage)
                    
                    // Text Overlay
                    VStack {
                        HStack {
                            Image(systemName: "drop.fill")
                                .font(.caption)
                                .foregroundColor(percentage > 85 ? .white : .blue)
                                .padding(6)
                                .background(percentage > 85 ? Color.white.opacity(0.2) : Color.blue.opacity(0.1))
                                .cornerRadius(8)
                            Text("饮水")
                                .font(.system(size: 18, weight: .bold, design: .serif))
                                .foregroundColor(percentage > 85 ? .white : .wood800)
                            Spacer()
                        }
                        
                        Spacer()
                        
                        HStack(alignment: .bottom) {
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(alignment: .firstTextBaseline, spacing: 2) {
                                    Text("\(Int(percentage))")
                                        .font(.system(size: 36, weight: .bold, design: .serif))
                                    Text("%")
                                        .font(.system(size: 20))
                                        .opacity(0.6)
                                }
                                Text(String(format: "%.1fL / %.0fL", currentLevel, maxCapacity))
                                    .font(.system(size: 10, weight: .medium))
                                    .opacity(0.8)
                            }
                            .foregroundColor(percentage > 40 ? .white : .wood800)
                            
                            Spacer()
                            
                            // Endurance Badge
                            HStack(spacing: 4) {
                                Image(systemName: percentage < 20 ? "exclamationmark.triangle.fill" : "clock")
                                    .font(.system(size: 10))
                                Text(enduranceText)
                                    .font(.system(size: 10, weight: .bold))
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(percentage > 40 ? Color.white.opacity(0.2) : Color.wood800.opacity(0.1))
                            .foregroundColor(percentage > 40 ? .white : .wood700)
                            .cornerRadius(8)
                        }
                    }
                    .padding(20)
                }
            }
        }
    }
}

#Preview {
    WaterWidgetView()
        .modelContainer(for: [SystemState.self, WaterLog.self], inMemory: true)
}
