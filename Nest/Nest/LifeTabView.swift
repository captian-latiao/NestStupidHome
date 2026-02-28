import SwiftUI
import SwiftData

enum LifeTab: String, CaseIterable, Identifiable {
    case water = "饮水"
    case pet = "宠物"
    case inventory = "库存"
    case hygiene = "清洁"
    
    var id: String { self.rawValue }
}

struct LifeTabView: View {
    @Binding var selectedTab: LifeTab
    @Namespace private var namespace
    
    @Query private var systemStates: [SystemState]
    private var hasPet: Bool {
        systemStates.first?.members.contains(where: { $0.role == .pet }) ?? false
    }
    
    // Filter out pet tab if no pet
    private var availableTabs: [LifeTab] {
        LifeTab.allCases.filter { tab in
            if tab == .pet && !hasPet { return false }
            return true
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Segment Control (Horizontal scrollable pills)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(availableTabs) { tab in
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                selectedTab = tab
                            }
                        }) {
                            Text(tab.rawValue)
                                .font(.system(size: 14, weight: selectedTab == tab ? .bold : .medium))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(
                                    ZStack {
                                        if selectedTab == tab {
                                            RoundedRectangle(cornerRadius: 20)
                                                .fill(Color.white)
                                                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 20)
                                                        .stroke(Color.wood100.opacity(0.5), lineWidth: 1)
                                                )
                                                .matchedGeometryEffect(id: "TabBackground", in: namespace)
                                        }
                                    }
                                )
                                .foregroundColor(selectedTab == tab ? .wood900 : .wood400)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
            }
            .background(Color.sunLight.opacity(0.95)) // To match the backdrop-blur-sm behavior
            
            // Tab Content
            TabView(selection: $selectedTab) {
                WaterDetailView()
                    .tag(LifeTab.water)
                
                PetDetailView()
                    .tag(LifeTab.pet)
                
                InventoryDetailView()
                    .tag(LifeTab.inventory)
                
                HygieneDetailView()
                    .tag(LifeTab.hygiene)
            }
            .tabViewStyle(.page(indexDisplayMode: .never)) // Allows swiping between views
            .background(Color.wood50)
            .edgesIgnoringSafeArea(.bottom) // Extend behind the main TabView if needed
        }
        .background(Color.wood50.edgesIgnoringSafeArea(.all))
    }
}

#Preview {
    LifeTabView(selectedTab: .constant(.water))
}
