import SwiftUI
import SwiftData

struct PetConfigView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var petItems: [PetCareItem]
    
    var body: some View {
        ZStack {
            Color.wood50.edgesIgnoringSafeArea(.all)
            
            if petItems.isEmpty {
                VStack {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.wood300)
                    Text("暂无宠物配置数据")
                        .foregroundColor(.wood400)
                        .padding(.top, 8)
                }
            } else {
                List {
                    Section(header: Text("日常护理").font(.system(size: 14, weight: .bold)).foregroundColor(.wood800)) {
                        ForEach(petItems.sorted(by: { $0.cycleHours < $1.cycleHours })) { item in
                            PetConfigRow(item: item)
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .listStyle(InsetGroupedListStyle())
            }
        }
        .navigationTitle("宠物护理频率管理")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PetConfigRow: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var item: PetCareItem
    
    @State private var intervalValue: Double
    @State private var selectedUnit: String
    
    init(item: PetCareItem) {
        self.item = item
        
        let preferred = item.preferredUnit
        var val = item.cycleHours
        if preferred == "DAYS" { val = val / 24.0 }
        
        // Prevent 0 value
        if val < 1 { val = 1 }
        
        _intervalValue = State(initialValue: val)
        _selectedUnit = State(initialValue: preferred)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(item.name)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.wood900)
            
            HStack {
                TextField("", value: $intervalValue, formatter: NumberFormatter())
                    .keyboardType(.decimalPad)
                    .font(.title2.bold())
                    .foregroundColor(.orange)
                    .multilineTextAlignment(.center)
                    .frame(width: 60, height: 40)
                    .background(Color.wood100.opacity(0.5))
                    .cornerRadius(8)
                
                Spacer()
                
                // Unit Picker
                Picker("Unit", selection: $selectedUnit) {
                    Text("小时").tag("HOURS")
                    Text("天").tag("DAYS")
                }
                .pickerStyle(SegmentedPickerStyle())
                .frame(width: 140)
            }
        }
        .padding(.vertical, 8)
        .onChange(of: intervalValue) { saveChanges() }
        .onChange(of: selectedUnit) { saveChanges() }
    }
    
    private func saveChanges() {
        item.preferredUnit = selectedUnit
        if selectedUnit == "DAYS" {
            item.cycleHours = intervalValue * 24.0
        } else {
            item.cycleHours = intervalValue
        }
        try? modelContext.save()
    }
}

#Preview {
    NavigationView {
        PetConfigView()
            .modelContainer(for: PetCareItem.self, inMemory: true)
    }
}
