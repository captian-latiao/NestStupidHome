import SwiftUI

struct ModuleSettingsView: View {
    var body: some View {
        ZStack {
            Color.wood50.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 12) {
                NavigationLink(destination: CleaningConfigView()) {
                    settingRow(icon: "sparkles", title: "清洁管理", subtitle: "设置各区域/物品的打扫频率阈值", bgColor: .yellow.opacity(0.1), fgColor: .yellow)
                }
                
                NavigationLink(destination: PetConfigView()) {
                    settingRow(icon: "cat.fill", title: "宠物管理", subtitle: "设置铲屎、喂食等护理周期", bgColor: .orange.opacity(0.1), fgColor: .orange)
                }
                
                Spacer()
            }
            .padding(20)
        }
        .navigationTitle("模块设置")
    }
    
    private func settingRow(icon: String, title: String, subtitle: String, bgColor: Color, fgColor: Color) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(fgColor)
                .frame(width: 44, height: 44)
                .background(bgColor)
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(fgColor.opacity(0.2), lineWidth: 1))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.wood800)
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.wood400)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.wood300)
        }
        .padding(16)
        .contentShape(Rectangle())
        .background(Color.white)
        .cornerRadius(20)
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.wood100, lineWidth: 1))
        .shadow(color: Color.black.opacity(0.02), radius: 5, y: 2)
    }
}

#Preview {
    NavigationView {
        ModuleSettingsView()
    }
}
