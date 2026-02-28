import SwiftUI
import SwiftData

struct DebugConsoleView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var systemStates: [SystemState]
    @Query private var petItems: [PetCareItem]
    @Query private var inventoryItems: [InventoryItem]
    @Query private var hygieneItems: [HygieneItem]
    @Query private var inventoryCats: [InventoryCategory]
    @Query private var waterLogs: [WaterLog]
    @Query private var inventoryLogs: [InventoryHistory]
    
    @Binding var isPresented: Bool
    
    var state: SystemState? { systemStates.first }
    var systemTime: Date { state?.systemTime ?? Date() }
    
    var body: some View {
        ZStack {
            // Backdrop
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation { isPresented = false }
                }
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    Label("开发者控制台", systemImage: "ladybug.fill")
                        .font(.headline)
                        .foregroundColor(.wood800)
                    Spacer()
                    Button(action: {
                        withAnimation { isPresented = false }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.wood400)
                            .font(.title3)
                    }
                }
                .padding()
                .background(Color.wood50)
                
                ScrollView {
                    VStack(spacing: 24) {
                        
                        // Time Monitor
                        VStack(spacing: 8) {
                            HStack {
                                Image(systemName: "clock.fill")
                                    .foregroundColor(.indigo)
                                VStack(alignment: .leading) {
                                    Text("System Time")
                                        .font(.caption)
                                        .foregroundColor(.indigo.opacity(0.7))
                                    Text("系统时间")
                                        .font(.subheadline)
                                        .bold()
                                        .foregroundColor(.indigo)
                                }
                                Spacer()
                                VStack(alignment: .trailing) {
                                    Text(systemTime, style: .time)
                                        .font(.title3)
                                        .bold()
                                        .foregroundColor(.indigo)
                                    Text(systemTime, style: .date)
                                        .font(.caption)
                                        .foregroundColor(.indigo.opacity(0.7))
                                }
                            }
                            .padding()
                            .background(Color.indigo.opacity(0.1))
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.indigo.opacity(0.2), lineWidth: 1))
                        }
                        
                        // Time Travel
                        VStack(alignment: .leading, spacing: 12) {
                            Label("时间加速 (Time Travel)", systemImage: "forward.fill")
                                .font(.caption)
                                .bold()
                                .foregroundColor(.wood500)
                            
                            HStack(spacing: 12) {
                                timeTravelButton(label: "+1 小时", hours: 1)
                                timeTravelButton(label: "+1 天", hours: 24)
                                timeTravelButton(label: "+1 周", hours: 24 * 7)
                            }
                            
                            Button(action: { resetDebugTime() }) {
                                Text("重置时间偏移")
                                    .font(.caption)
                                    .bold()
                                    .foregroundColor(.wood500)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .background(Color.wood100)
                                    .cornerRadius(8)
                            }
                        }
                        
                        Divider()
                        
                        // Danger Zone
                        VStack(alignment: .leading, spacing: 12) {
                            Button(action: {
                                resetKernel()
                            }) {
                                HStack {
                                    Image(systemName: "power")
                                    Text("重置系统 (Factory Reset)")
                                }
                                .font(.subheadline)
                                .bold()
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(16)
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.red.opacity(0.2), lineWidth: 1))
                            }
                        }
                        
                    }
                    .padding()
                }
                .background(Color.white)
            }
            .frame(maxWidth: 340)
            .cornerRadius(24)
            .shadow(color: Color.black.opacity(0.15), radius: 20, y: 10)
            .padding()
        }
        .zIndex(100)
    }
    
    private func timeTravelButton(label: String, hours: Double) -> some View {
        Button(action: {
            debugTimeTravel(hours: hours)
        }) {
            Text(label)
                .font(.footnote)
                .bold()
                .foregroundColor(.wood800)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.wood50)
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.wood200, lineWidth: 1))
        }
    }
    
    private func debugTimeTravel(hours: Double) {
        if let s = state {
            s.debugTimeOffset += (hours * 3600)
            try? modelContext.save()
        }
    }
    
    private func resetDebugTime() {
        if let s = state {
            s.debugTimeOffset = 0
            try? modelContext.save()
        }
    }
    
    private func resetKernel() {
        // Warning: This wipes data
        for wl in waterLogs { modelContext.delete(wl) }
        for hist in inventoryLogs { modelContext.delete(hist) }
        for pet in petItems { modelContext.delete(pet) }
        for inv in inventoryItems { modelContext.delete(inv) }
        for cat in inventoryCats { modelContext.delete(cat) }
        for hyg in hygieneItems { modelContext.delete(hyg) }
        
        if let s = state {
            modelContext.delete(s)
        }
        
        try? modelContext.save()
        SeedData.seedIfNeeded(context: modelContext)
        
        withAnimation {
            isPresented = false
        }
    }
}
