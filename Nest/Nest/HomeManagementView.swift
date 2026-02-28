import SwiftUI
import SwiftData

struct HomeManagementView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var systemStates: [SystemState]
    
    @State private var tempHomeName: String = ""
    @State private var isEditingHomeName = false
    @FocusState private var isHomeNameFocused: Bool
    @FocusState private var isNewMemberFocused: Bool
    
    @State private var isAddingMember = false
    @State private var newMemberName: String = ""
    @State private var newMemberRole: String = "HUMAN" // "HUMAN", "CAT", "DOG"
    
    private var state: SystemState? { systemStates.first }
    private var members: [UserMember] {
        state?.members ?? []
    }
    
    var body: some View {
        ZStack {
            Color.wood50.edgesIgnoringSafeArea(.all)
            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 24) {
                        
                        // Home Detail Card
                        homeDetailCard
                        
                        // Sleep Cycle
                        sleepCycleCard
                        
                        // Members
                        membersSection
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    // Add bottom padding when adding a member so the ScrollView can scroll the form up above the keyboard
                    .padding(.bottom, isAddingMember ? 280 : 60)
                }
                .onChange(of: isAddingMember) { newValue in
                    if newValue {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            withAnimation(.spring()) {
                                proxy.scrollTo("AddMemberForm", anchor: .bottom)
                            }
                            isNewMemberFocused = true
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .navigationTitle("家庭管理")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            tempHomeName = state?.homeName ?? ""
        }
    }
    
    // MARK: - Components
    
    private var homeDetailCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("NEST HOME")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.wood300)
                .tracking(2)
            
            if isEditingHomeName {
                HStack {
                    TextField("家庭名称", text: $tempHomeName)
                        .font(.system(size: 32, weight: .bold, design: .serif))
                        .foregroundColor(.white)
                        .focused($isHomeNameFocused)
                        .padding(.bottom, 4)
                        .overlay(Rectangle().frame(height: 1).foregroundColor(.wood400), alignment: .bottom)
                        .onSubmit {
                            saveHomeName()
                        }
                    
                    Button(action: saveHomeName) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.wood600)
                            .clipShape(Circle())
                    }
                }
            } else {
                HStack(alignment: .top) {
                    Text(state?.homeName ?? "巢 (Nest)")
                        .font(.system(size: 32, weight: .bold, design: .serif))
                        .foregroundColor(.white)
                    
                    Button(action: {
                        isEditingHomeName = true
                        isHomeNameFocused = true
                    }) {
                        Image(systemName: "pencil")
                            .font(.system(size: 14))
                            .foregroundColor(.wood300)
                            .padding(.top, 8)
                    }
                }
            }
            
            let humans = members.filter { $0.role != .pet }.count
            let pets = members.filter { $0.role == .pet }.count
            
            HStack(spacing: 6) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 12))
                Text("\(humans) 位成员 · \(pets) 只宠物")
            }
            .font(.system(size: 14))
            .foregroundColor(.wood200)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        // Similar gradient as background in React
        .background(
            LinearGradient(colors: [Color.wood800, Color.wood700], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .cornerRadius(24)
        .shadow(color: Color.wood900.opacity(0.15), radius: 15, y: 8)
    }
    
    private var sleepCycleCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "moon.stars.fill")
                    .foregroundColor(.indigo)
                    .padding(6)
                    .background(Color.indigo.opacity(0.1))
                    .cornerRadius(8)
                
                Text("作息规律 (Biological Clock)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.wood800)
            }
            
            if let state = state {
                SleepCycleSlider(
                    startHour: Binding(
                        get: { state.sleepStartHour },
                        set: {
                            state.sleepStartHour = $0
                            state.updateWaterBaselineRate()
                            try? modelContext.save()
                        }
                    ),
                    endHour: Binding(
                        get: { state.sleepEndHour },
                        set: {
                            state.sleepEndHour = $0
                            state.updateWaterBaselineRate()
                            try? modelContext.save()
                        }
                    )
                )
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            
            Text("* 此设置将作为全屋设备的参考生物钟，影响饮水预测、设备静音等逻辑。")
                .font(.system(size: 12))
                .foregroundColor(.wood400)
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(24)
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.wood100, lineWidth: 1))
    }
    
    private var membersSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("家庭成员 & 宠物")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.wood800)
                .padding(.horizontal, 4)
            
            VStack(spacing: 12) {
                ForEach(members) { member in
                    memberRow(for: member)
                }
                
                if isAddingMember {
                    newMemberForm
                } else {
                    Button(action: {
                        withAnimation { isAddingMember = true }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "plus")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.wood500)
                                .padding(6)
                                .background(Color.wood100)
                                .clipShape(Circle())
                            Text("添加成员 / 宠物")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.wood500)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .contentShape(Rectangle())
                        .background(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(style: StrokeStyle(lineWidth: 1, dash: [4]))
                                .foregroundColor(.wood200)
                        )
                        .cornerRadius(16)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
    
    private func memberRow(for member: UserMember) -> some View {
        HStack(spacing: 16) {
            // Avatar
            ZStack {
                Circle().fill(Color.wood100).frame(width: 48, height: 48)
                Image(systemName: member.role == .pet ? "pawprint.fill" : "person.fill")
                    .foregroundColor(.wood400)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(member.name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.wood900)
                    
                    if member.isCurrentUser {
                        Text("我")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.wood400)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.wood50)
                            .cornerRadius(4)
                            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.wood100, lineWidth: 1))
                    }
                }
                
                let subtitle: String = {
                    if member.role == .owner { return "一家之主" }
                    if member.role == .pet {
                        return member.species == .cat ? "🐱 猫咪" : "🐶 狗狗"
                    }
                    return "家庭成员"
                }()
                
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.wood400)
            }
            
            Spacer()
            
            if member.role == .owner {
                Image(systemName: "crown.fill")
                    .foregroundColor(.wood300)
            }
            
            // Delete button for non-owners (assuming current user is owner)
            let currentUser = members.first { $0.isCurrentUser }
            if currentUser?.role == .owner && member.role != .owner {
                Button(action: {
                    memberToDelete = member
                }) {
                    Image(systemName: "trash")
                        .foregroundColor(.wood300)
                        .padding(8)
                        .background(Color.wood50)
                        .clipShape(Circle())
                }
            }
        }
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.wood100, lineWidth: 1))
        .alert("确定移除 \(member.name) 吗？", isPresented: Binding(
            get: { memberToDelete?.id == member.id },
            set: { _ in }
        )) {
            Button("取消", role: .cancel) { memberToDelete = nil }
            Button("移除", role: .destructive) {
                if let m = memberToDelete { deleteMember(m) }
                memberToDelete = nil
            }
        }
    }
    
    @State private var memberToDelete: UserMember?
    
    private var newMemberForm: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Color.wood100).frame(width: 40, height: 40)
                    Image(systemName: "person.badge.plus")
                        .foregroundColor(.wood400)
                }
                TextField("输入名字", text: $newMemberName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.wood900) // Fix for Dark Mode text visibility
                    .focused($isNewMemberFocused)
            }
            
            HStack(spacing: 8) {
                typeButton("人类", type: "HUMAN")
                typeButton("猫猫", type: "CAT")
                typeButton("狗狗", type: "DOG")
            }
            
            HStack(spacing: 16) {
                Spacer()
                Button(action: {
                    withAnimation { isAddingMember = false }
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.wood400)
                        .padding(8)
                }
                
                Button(action: addMember) {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                        Text("添加")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(newMemberName.isEmpty ? Color.wood200 : Color.wood300)
                    .cornerRadius(12)
                }
                .disabled(newMemberName.isEmpty)
            }
            .padding(.top, 4)
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.wood200.opacity(0.6), lineWidth: 1))
        .id("AddMemberForm")
    }
    
    private func typeButton(_ label: String, type: String) -> some View {
        let isSelected = newMemberRole == type
        var bgColor: Color = .white
        var fgColor: Color = .wood400
        var borderColor: Color = .wood100
        
        if isSelected {
            if type == "HUMAN" {
                bgColor = .wood800; fgColor = .white; borderColor = .wood800
            } else if type == "CAT" {
                bgColor = .orange.opacity(0.1); fgColor = .orange; borderColor = .orange.opacity(0.3)
            } else if type == "DOG" {
                bgColor = .blue.opacity(0.1); fgColor = .blue; borderColor = .blue.opacity(0.3)
            }
        }
        
        return Button(action: { newMemberRole = type }) {
            Text(label)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(fgColor)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .contentShape(Rectangle())
                .background(bgColor)
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(borderColor, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Actions
    
    private func saveHomeName() {
        if let s = state, !tempHomeName.isEmpty {
            s.homeName = tempHomeName
            try? modelContext.save()
            isEditingHomeName = false
            isHomeNameFocused = false
        }
    }
    
    private func addMember() {
        guard !newMemberName.isEmpty, let s = state else { return }
        
        let role: UserRole = newMemberRole == "HUMAN" ? .member : .pet
        let species: PetSpecies? = newMemberRole == "CAT" ? .cat : (newMemberRole == "DOG" ? .dog : nil)
        
        // Ensure new member is not set as current user
        let newMember = UserMember(name: newMemberName, role: role, isCurrentUser: false, species: species)
        newMember.systemState = s
        
        modelContext.insert(newMember)
        
        // Update baseline rate when member joins
        s.updateWaterBaselineRate()
        
        try? modelContext.save()
        
        newMemberName = ""
        isAddingMember = false
    }
    
    private func deleteMember(_ member: UserMember) {
        modelContext.delete(member)
        
        // Update baseline rate when member leaves
        state?.updateWaterBaselineRate()
        
        try? modelContext.save()
    }
}

// MARK: - Sleep Cycle Slider (Custom Bidirectional wrap-around logic)

struct SleepCycleSlider: View {
    @Binding var startHour: Int
    @Binding var endHour: Int
    
    var body: some View {
        VStack(spacing: 24) {
            // Header Stats
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("入睡时间")
                        .font(.caption)
                        .foregroundColor(.wood400)
                    Text("\(startHour):00")
                        .font(.title3.bold())
                        .foregroundColor(.wood900)
                }
                
                Spacer()
                let length = startHour > endHour ? (24 - startHour + endHour) : (endHour - startHour)
                Text("\(length) 小时")
                    .font(.caption.bold())
                    .foregroundColor(.wood500)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.wood100)
                    .cornerRadius(12)
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("起床时间")
                        .font(.caption)
                        .foregroundColor(.wood400)
                    Text("\(endHour):00")
                        .font(.title3.bold())
                        .foregroundColor(.wood900)
                }
            }
            
            // Slider Track
            GeometryReader { geom in
                let width = geom.size.width
                
                ZStack(alignment: .leading) {
                    // Background Track
                    Rectangle()
                        .fill(Color.wood200)
                        .frame(height: 8)
                        .cornerRadius(4)
                    
                    // Active Track (handles wrapping around midnight)
                    if startHour <= endHour {
                        Rectangle()
                            .fill(Color.wood600)
                            .frame(width: max(0, CGFloat(endHour - startHour) / 24.0 * width), height: 8)
                            .offset(x: CGFloat(startHour) / 24.0 * width)
                            .cornerRadius(4)
                    } else {
                        // Two segments: start to 24, and 0 to end
                        Rectangle()
                            .fill(Color.wood600)
                            .frame(width: max(0, CGFloat(24 - startHour) / 24.0 * width), height: 8)
                            .offset(x: CGFloat(startHour) / 24.0 * width)
                            .cornerRadius(4)
                        
                        Rectangle()
                            .fill(Color.wood600)
                            .frame(width: max(0, CGFloat(endHour) / 24.0 * width), height: 8)
                            .offset(x: 0)
                            .cornerRadius(4)
                    }
                    
                    // Start Thumb (Bedtime)
                    thumb(icon: "moon.fill", color: .indigo, position: CGFloat(startHour) / 24.0 * width)
                        .gesture(
                            DragGesture().onChanged { value in
                                let hour = Int(round(max(0, min(1, value.location.x / width)) * 24))
                                startHour = min(max(0, hour), 23)
                            }
                        )
                    
                    // End Thumb (Wake up)
                    thumb(icon: "sun.max.fill", color: .orange, position: CGFloat(endHour) / 24.0 * width)
                        .gesture(
                            DragGesture().onChanged { value in
                                let hour = Int(round(max(0, min(1, value.location.x / width)) * 24))
                                endHour = min(max(0, hour), 23)
                            }
                        )
                }
            }
            .frame(height: 44)
        }
        .padding()
        .background(Color.wood50)
        .cornerRadius(16)
    }
    
    private func thumb(icon: String, color: Color, position: CGFloat) -> some View {
        ZStack {
            Circle()
                .fill(Color.white)
                .shadow(color: Color.black.opacity(0.15), radius: 3, x: 0, y: 2)
                .frame(width: 36, height: 36)
            Image(systemName: icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(color)
        }
        // Offset centers the thumb on the precise point
        .position(x: position, y: 22) // geometry reader height / 2 = 22
    }
}

#Preview {
    HomeManagementView()
        .modelContainer(for: SystemState.self, inMemory: true)
}
