import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var systemStates: [SystemState]
    @Query private var petItems: [PetCareItem]
    @Query private var inventoryItems: [InventoryItem]
    @Query private var hygieneItems: [HygieneItem]

    @State private var selectedMainTab: Int = 0
    @State private var selectedLifeTab: LifeTab = .water
    @State private var showDebugConsole = false
    
    var body: some View {
        TabView(selection: $selectedMainTab) {
            DashboardView(selectedMainTab: $selectedMainTab, selectedLifeTab: $selectedLifeTab)
                .tabItem {
                    Label("我家", systemImage: "house.fill")
                }
                .tag(0)
            
            LifeTabView(selectedTab: $selectedLifeTab)
                .tabItem {
                    Label("生活", systemImage: "sparkles")
                }
                .tag(1)
            
            MeTabView()
                .tabItem {
                    Label("我的", systemImage: "person.fill")
                }
                .tag(2)
        }
        .overlay(alignment: .topTrailing) {
            Button(action: {
                withAnimation { showDebugConsole = true }
            }) {
                Image(systemName: "ladybug.fill")
                    .foregroundColor(.wood400)
                    .padding(8)
                    .background(.ultraThinMaterial)
                    .clipShape(Circle())
            }
            .padding(.trailing, 16)
            .padding(.top, 56)
        }
        .overlay {
            if showDebugConsole {
                DebugConsoleView(isPresented: $showDebugConsole)
            }
        }
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            // Fix: Use fixed light wood color to prevent black/white switch in Dark Mode
            appearance.backgroundColor = UIColor(red: 250/255, green: 248/255, blue: 245/255, alpha: 1.0)
            
            let itemApp = UITabBarItemAppearance()
            itemApp.normal.iconColor = UIColor.lightGray
            itemApp.normal.titleTextAttributes = [.foregroundColor: UIColor.lightGray]
            itemApp.selected.iconColor = UIColor(red: 105/255, green: 65/255, blue: 35/255, alpha: 1.0) // .wood800 approx
            itemApp.selected.titleTextAttributes = [.foregroundColor: UIColor(red: 105/255, green: 65/255, blue: 35/255, alpha: 1.0)]
            
            appearance.stackedLayoutAppearance = itemApp
            appearance.inlineLayoutAppearance = itemApp
            appearance.compactInlineLayoutAppearance = itemApp
            
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
            
            initializeDefaultData()
        }
    }

    /// 首次启动无数据时，写入一条默认设置
    private func initializeDefaultData() {
        SeedData.seedIfNeeded(context: modelContext)
        
        // Safety net: ensure an owner exists if state exists but members are empty
        if let state = try? modelContext.fetch(FetchDescriptor<SystemState>()).first {
            if state.members.isEmpty {
                let owner = UserMember(name: "白PP", role: .owner, avatarUrl: nil, isCurrentUser: true)
                owner.systemState = state
                modelContext.insert(owner)
                try? modelContext.save()
            }
        }
    }

}

#Preview {
    ContentView()
        .modelContainer(for: SystemState.self, inMemory: true)
}
