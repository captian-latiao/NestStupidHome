import SwiftUI
import SwiftData

@main
struct NestApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            SystemState.self,
            UserMember.self,
            WaterLog.self,
            InventoryCategory.self,
            InventoryItem.self,
            InventoryHistory.self,
            PetCareItem.self,
            PetFoodLog.self,
            HygieneItem.self
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            SeedingView()
        }
        .modelContainer(sharedModelContainer)
    }
}

// MARK: - SeedingView
// Wraps ContentView and triggers first-launch data seeding before display.

private struct SeedingView: View {
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        ContentView()
            .task {
                await MainActor.run {
                    SeedData.seedIfNeeded(context: modelContext)
                }
            }
    }
}
