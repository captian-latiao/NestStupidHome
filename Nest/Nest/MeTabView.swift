import SwiftUI
import SwiftData

struct MeTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var systemStates: [SystemState]
    
    // View Routing
    @State private var path = NavigationPath()
    
    private var state: SystemState? { systemStates.first }
    private var currentUser: UserMember? {
        state?.members.first(where: { $0.isCurrentUser }) ?? state?.members.first
    }
    
    var body: some View {
        NavigationStack(path: $path) {
            ZStack {
                Color.wood50.edgesIgnoringSafeArea(.all)
                
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Profile Banner Card
                        profileCard
                        
                        // Navigation Menu
                        VStack(spacing: 12) {
                            NavigationLink(value: "HomeManagement") {
                                menuRow(icon: "house.fill", title: "家庭管理")
                            }
                            NavigationLink(value: "ModuleSettings") {
                                menuRow(icon: "square.grid.2x2.fill", title: "模块设置")
                            }
                        }
                        
                        // Logout Button (Placeholder implementation)
                        Button(action: {
                            // TODO: Add logout logic via Auth handler
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                Text("退出登录")
                            }
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.red.opacity(0.8))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .contentShape(Rectangle())
                            .background(Color.white)
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.red.opacity(0.2), lineWidth: 1))
                        }
                        .padding(.top, 8)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 120)
                }
            }
            .navigationTitle("我的")
            .navigationBarTitleDisplayMode(.large)
            // Router mapping
            .navigationDestination(for: String.self) { dst in
                if dst == "HomeManagement" {
                    HomeManagementView()
                } else if dst == "ModuleSettings" {
                    ModuleSettingsView()
                }
            }
        }
    }
    
    // MARK: - Components
    
    private var profileCard: some View {
        HStack(spacing: 16) {
            // Avatar Placeholder (Since it handles base64 urls in React, we use a default SFSymbol for now)
            ZStack {
                Circle()
                    .fill(Color.wood100)
                    .frame(width: 80, height: 80)
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .foregroundColor(.wood300)
                    .frame(width: 80, height: 80)
            }
            
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .center, spacing: 8) {
                    Text(currentUser?.name ?? "未命名")
                        .font(.system(size: 24, weight: .bold, design: .serif))
                        .foregroundColor(.wood900)
                    
                    if currentUser?.role == .owner {
                        HStack(spacing: 4) {
                            Image(systemName: "crown.fill")
                                .font(.system(size: 10))
                            Text("一家之主")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundColor(.wood800)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.wood100)
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.wood200, lineWidth: 1))
                    }
                }
                
                Text(state?.homeName ?? "巢 (Nest)")
                    .font(.system(size: 14))
                    .foregroundColor(.wood400)
            }
            Spacer()
            
            // Edit profile button placeholder
            Button(action: {
                // TODO: Open edit profile modal
            }) {
                Image(systemName: "pencil")
                    .font(.system(size: 16))
                    .foregroundColor(.wood500)
                    .padding(10)
                    .background(Color.wood50)
                    .clipShape(Circle())
            }
        }
        .padding(24)
        .background(Color.white)
        .cornerRadius(24)
        .shadow(color: Color.black.opacity(0.02), radius: 10, y: 5)
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.wood100.opacity(0.5), lineWidth: 1))
    }
    
    private func menuRow(icon: String, title: String) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.wood500)
                .frame(width: 40, height: 40)
                .background(Color.white)
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
            
            Text(title)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.wood800)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.wood300)
        }
        .padding(16)
        .contentShape(Rectangle())
        .background(Color.white.opacity(0.6))
        .cornerRadius(20)
    }
}

#Preview {
    MeTabView()
        .modelContainer(for: SystemState.self, inMemory: true)
}
