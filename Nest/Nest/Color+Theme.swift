import SwiftUI

// MARK: - Color hex initializer
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Wood palette (separate extension to avoid self-referential ambiguity)
extension Color {
    static let wood50   = Color(hex: "FAF8F5")
    static let wood100  = Color(hex: "F2EDE4")
    static let wood200  = Color(hex: "E8DDCD")
    static let wood300  = Color(hex: "D5C3AC")
    static let wood400  = Color(hex: "BFA183")
    static let wood500  = Color(hex: "AD8560")
    static let wood600  = Color(hex: "9C6D46")
    static let wood700  = Color(hex: "835339")
    static let wood800  = Color(hex: "6C4431")
    static let wood900  = Color(hex: "57372A")
    static let sunLight = Color(hex: "FEFDF5")
}
