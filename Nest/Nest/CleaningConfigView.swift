import SwiftUI
import SwiftData

struct CleaningConfigView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var hygieneItems: [HygieneItem]
    
    // Convert SwiftData array into a dictionary grouped by category
    var itemsByCategory: [String: [HygieneItem]] {
        Dictionary(grouping: hygieneItems, by: { $0.category })
    }
    
    // Grouping labels corresponding to the web's category descriptions
    private func categoryLabel(for category: String) -> String {
        switch category {
        case "floor_vac": return "地面吸尘"
        case "floor_mop": return "地面湿拖"
        case "stove": return "灶台清理"
        case "bedding": return "四件套"
        case "toilet": return "马桶"
        case "washer": return "洗衣机自洁"
        case "ac_filter": return "空调滤网"
        case "curtain": return "窗帘清洗"
        default: return category
        }
    }
    
    var body: some View {
        ZStack {
            Color.wood50.edgesIgnoringSafeArea(.all)
            
            if hygieneItems.isEmpty {
                VStack {
                    Image(systemName: "sparkles")
                        .font(.system(size: 40))
                        .foregroundColor(.wood300)
                    Text("暂无清洁配置数据")
                        .foregroundColor(.wood400)
                        .padding(.top, 8)
                }
            } else {
                List {
                    ForEach(Array(itemsByCategory.keys.sorted()), id: \.self) { category in
                        Section(header: Text(categoryLabel(for: category)).font(.system(size: 14, weight: .bold)).foregroundColor(.wood800)) {
                            ForEach(itemsByCategory[category] ?? []) { item in
                                HygieneConfigRow(item: item)
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .listStyle(InsetGroupedListStyle())
            }
        }
        .navigationTitle("清洁频率管理")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct HygieneConfigRow: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var item: HygieneItem
    
    // Local state for the UI before saving
    @State private var intervalValue: Double
    @State private var selectedUnit: String
    
    init(item: HygieneItem) {
        self.item = item
        
        let preferred = item.preferredUnit
        var val = item.baseIntervalDays
        if preferred == "WEEKS" { val = val / 7.0 }
        else if preferred == "MONTHS" { val = val / 30.0 }
        
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
                    .foregroundColor(.indigo)
                    .multilineTextAlignment(.center)
                    .frame(width: 60, height: 40)
                    .background(Color.wood100)
                    .cornerRadius(8)
                
                Spacer()
                
                // Unit Picker
                Picker("Unit", selection: $selectedUnit) {
                    Text("天").tag("DAYS")
                    Text("周").tag("WEEKS")
                    Text("月").tag("MONTHS")
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
        switch selectedUnit {
        case "WEEKS": item.baseIntervalDays = intervalValue * 7.0
        case "MONTHS": item.baseIntervalDays = intervalValue * 30.0
        default: item.baseIntervalDays = intervalValue
        }
        try? modelContext.save()
    }
}

#Preview {
    NavigationView {
        CleaningConfigView()
            .modelContainer(for: HygieneItem.self, inMemory: true)
    }
}
