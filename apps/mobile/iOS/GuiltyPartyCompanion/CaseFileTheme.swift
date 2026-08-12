import SwiftUI
import UIKit

enum AppAppearance: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: String(localized: "System appearance")
        case .light: String(localized: "Light appearance")
        case .dark: String(localized: "Dark appearance")
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }

    var systemImage: String {
        switch self {
        case .system: "circle.lefthalf.filled"
        case .light: "sun.max"
        case .dark: "moon.stars"
        }
    }
}

enum CaseFileTheme {
    static let background = adaptive(light: 0xF7F1E8, dark: 0x171117)
    static let surface = adaptive(light: 0xFFFDFC, dark: 0x211922)
    static let raisedSurface = adaptive(light: 0xF4E8DC, dark: 0x2C2028)
    static let text = adaptive(light: 0x241A20, dark: 0xF6EDE6)
    static let mutedText = adaptive(light: 0x675A60, dark: 0xC7B7BC)
    static let border = adaptive(light: 0xC9B9AF, dark: 0x5A4850)
    static let accent = adaptive(light: 0x6E1F42, dark: 0xD68AB0)
    static let brass = adaptive(light: 0x795016, dark: 0xE0BC72)
    static let privacy = adaptive(light: 0x5C2D71, dark: 0xC9A1E2)
    static let success = adaptive(light: 0x276148, dark: 0x7FD0A8)
    static let warning = adaptive(light: 0x7A4E0D, dark: 0xE7C170)

    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

private extension UIColor {
    convenience init(rgb: UInt32) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}

struct CaseCardModifier: ViewModifier {
    let emphasized: Bool

    func body(content: Content) -> some View {
        content
            .padding(20)
            .background(
                emphasized ? CaseFileTheme.raisedSurface : CaseFileTheme.surface,
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(CaseFileTheme.border, lineWidth: emphasized ? 1.5 : 1)
            }
            .shadow(color: Color.black.opacity(0.06), radius: 10, y: 4)
    }
}

extension View {
    func caseCard(emphasized: Bool = false) -> some View {
        modifier(CaseCardModifier(emphasized: emphasized))
    }
}
