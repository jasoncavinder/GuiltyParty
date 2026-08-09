import SwiftUI
import UIKit

struct CaptureStateReader: UIViewRepresentable {
    let onChange: (Bool) -> Void

    func makeUIView(context: Context) -> CaptureMonitoringView {
        CaptureMonitoringView(onChange: onChange)
    }

    func updateUIView(_ uiView: CaptureMonitoringView, context: Context) {
        uiView.onChange = onChange
        uiView.reportCurrentState()
    }
}

final class CaptureMonitoringView: UIView {
    var onChange: (Bool) -> Void
    private var lastReportedValue: Bool?

    init(onChange: @escaping (Bool) -> Void) {
        self.onChange = onChange
        super.init(frame: .zero)
        isHidden = true
        isAccessibilityElement = false
        _ = registerForTraitChanges([UITraitSceneCaptureState.self]) {
            (view: CaptureMonitoringView, previousTraitCollection: UITraitCollection) in
            view.reportCurrentState()
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("CaptureMonitoringView does not support Interface Builder")
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        reportCurrentState()
    }

    func reportCurrentState() {
        let active = traitCollection.sceneCaptureState == .active
        guard active != lastReportedValue else { return }
        lastReportedValue = active
        onChange(active)
    }
}
