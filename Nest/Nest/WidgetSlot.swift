import SwiftUI

struct WidgetSlot<Content: View>: View {
    var title: String
    var icon: String
    var isPlaceholder: Bool = false
    @ViewBuilder var content: () -> Content
    
    var body: some View {
        Group {
            if isPlaceholder {
                HStack(spacing: 16) {
                    Image(systemName: icon)
                        .foregroundColor(.wood400)
                        .padding(8)
                        .background(Color.wood50)
                        .cornerRadius(12)
                    
                    Text(title)
                        .font(.system(size: 18, weight: .bold, design: .serif))
                        .foregroundColor(.wood600)
                    Spacer()
                }
                .padding(.horizontal, 24)
                .frame(height: 80)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.wood100, lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
            } else {
                content()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .frame(minHeight: 160)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 32, style: .continuous)
                            .stroke(Color.wood100, lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
            }
        }
    }
}

#Preview {
    ZStack {
        Color.sunLight.ignoresSafeArea()
        VStack(spacing: 20) {
            WidgetSlot(title: "测试", icon: "drop.fill", isPlaceholder: true) { EmptyView() }
            WidgetSlot(title: "测试2", icon: "drop.fill") {
                Text("真实卡片内容")
                    .foregroundColor(.wood800)
            }
        }
        .padding()
    }
}
