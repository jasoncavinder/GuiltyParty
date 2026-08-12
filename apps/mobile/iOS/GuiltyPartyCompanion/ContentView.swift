import SwiftUI
import UIKit

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("appearance") private var appearanceValue = AppAppearance.system.rawValue
    @StateObject private var session = CompanionSession()

    private var appearance: AppAppearance {
        AppAppearance(rawValue: appearanceValue) ?? .system
    }

    var body: some View {
        ZStack {
            CaseFileTheme.background.ignoresSafeArea()
            content
                .tint(CaseFileTheme.accent)
                .foregroundStyle(CaseFileTheme.text)
                .background {
                    CaptureStateReader { active in
                        session.setCaptureActive(active)
                    }
                    .frame(width: 1, height: 1)
                }

            if scenePhase != .active {
                AppSwitcherPrivacyShield()
                    .zIndex(100)
            }
        }
        .preferredColorScheme(appearance.colorScheme)
        .onAppear { session.setAppActive(scenePhase == .active) }
        .onChange(of: scenePhase) { _, newPhase in
            session.setAppActive(newPhase == .active)
        }
        .onReceive(
            NotificationCenter.default.publisher(
                for: UIApplication.userDidTakeScreenshotNotification
            )
        ) { _ in
            session.screenshotDetected()
        }
        .alert(
            "Screenshot detected",
            isPresented: Binding(
                get: { session.screenshotWarningIsPresented },
                set: { if !$0 { session.dismissScreenshotWarning() } }
            )
        ) {
            Button("OK") { session.dismissScreenshotWarning() }
        } message: {
            Text("This screenshot may contain private game content. Please delete it and do not share it. Guilty Party did not prevent or delete the screenshot.")
        }
    }

    @ViewBuilder
    private var content: some View {
        switch session.phase {
        case .manualRejoin, .expiredOrRevoked, .sessionEnded:
            JoinView(session: session, appearanceValue: $appearanceValue)
        case .joining, .waitingForAssignment, .connected, .reconnecting, .rejoined:
            SessionView(session: session, appearanceValue: $appearanceValue)
        }
    }
}

private struct JoinView: View {
    private enum JoinField: Hashable {
        case nickname
        case invitation
    }

    @ObservedObject var session: CompanionSession
    @Binding var appearanceValue: String
    @State private var nickname = ""
    @State private var invitation = ""
    @State private var joinIsPending = false
    @FocusState private var focusedField: JoinField?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("PRIVATE PLAYER VIEW", systemImage: "lock.fill")
                            .font(.caption.weight(.bold))
                            .tracking(1.4)
                            .foregroundStyle(CaseFileTheme.privacy)
                        Text("Guilty Party")
                            .font(.system(.largeTitle, design: .serif, weight: .bold))
                        Text("Your invitation opens a private case file for this session.")
                            .font(.headline)
                            .foregroundStyle(CaseFileTheme.mutedText)
                    }

                    StatusBanner(
                        title: session.phase.title,
                        message: session.statusMessage,
                        systemImage: session.phase == .expiredOrRevoked
                            ? "exclamationmark.shield"
                            : session.phase == .sessionEnded ? "flag.checkered" : "lock.shield"
                    )

                    VStack(alignment: .leading, spacing: 18) {
                        CardHeading(
                            eyebrow: "SESSION ACCESS",
                            title: "Join with an invitation",
                            systemImage: "envelope.open"
                        )

                        TextField("Nickname", text: $nickname)
                            .textContentType(.nickname)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .nickname)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .invitation }
                            .accessibilityLabel("Session nickname")

                        SecureField("GP1 invitation", text: $invitation)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .invitation)
                            .submitLabel(.join)
                            .privacySensitive()
                            .accessibilityLabel("Private GP1 invitation")
                            .onSubmit(join)

                        Text("Paste or enter the complete invitation. Guilty Party clears it immediately and does not save it to a URL, file, setting, diagnostic, or log.")
                            .font(.footnote)
                            .foregroundStyle(CaseFileTheme.mutedText)

                        Button(action: join) {
                            Label(
                                joinIsPending ? "Joining…" : "Join private session",
                                systemImage: "arrow.right.circle.fill"
                            )
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(
                            joinIsPending
                                || nickname.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                || invitation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        )
                        .keyboardShortcut(.defaultAction)
                    }
                    .textFieldStyle(.roundedBorder)
                    .caseCard(emphasized: true)

                    Label(
                        "This private test uses no analytics, recording, notifications, media, remote AI, or retained private gameplay content.",
                        systemImage: "hand.raised.fill"
                    )
                    .font(.footnote)
                    .foregroundStyle(CaseFileTheme.mutedText)
                }
                .frame(maxWidth: 620, alignment: .leading)
                .padding(24)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(CaseFileTheme.background)
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    AppearanceMenu(selection: $appearanceValue)
                }
            }
        }
    }

    private func join() {
        guard !joinIsPending else { return }
        joinIsPending = true
        let oneTimeInvitation = invitation
        let oneTimeNickname = nickname
        focusedField = nil
        invitation = ""

        Task { @MainActor in
            await Task.yield()
            await session.join(
                invitationPayload: oneTimeInvitation,
                displayName: oneTimeNickname
            )
            joinIsPending = false
        }
    }
}

private struct SessionView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @ObservedObject var session: CompanionSession
    @Binding var appearanceValue: String

    private var usesTwoColumns: Bool {
        horizontalSizeClass == .regular && !dynamicTypeSize.isAccessibilitySize
    }

    var body: some View {
        Group {
            if usesTwoColumns {
                NavigationSplitView {
                    SessionContextRail(session: session)
                        .navigationTitle("Guilty Party")
                } detail: {
                    SessionDetail(session: session)
                        .navigationTitle("Private case file")
                }
            } else {
                NavigationStack {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            SessionStatusSection(session: session)
                            PrivateSessionContent(session: session)
                        }
                        .padding()
                    }
                    .background(CaseFileTheme.background)
                    .navigationTitle("Guilty Party")
                }
            }
        }
        .toolbar { sessionToolbar }
    }

    @ToolbarContentBuilder
    private var sessionToolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            PrivacyToolbarButton(session: session)
            AppearanceMenu(selection: $appearanceValue)
        }
    }
}

private struct SessionContextRail: View {
    @ObservedObject var session: CompanionSession

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SessionStatusSection(session: session)
                if let projection = session.projection {
                    VStack(alignment: .leading, spacing: 12) {
                        CardHeading(
                            eyebrow: "CURRENT SCENE",
                            title: projection.scene?.name ?? String(localized: "The room is gathering"),
                            systemImage: "theatermasks"
                        )
                        Text(projection.scene?.publicNarrative ?? String(localized: "Waiting for the Host to begin."))
                            .foregroundStyle(CaseFileTheme.mutedText)
                        Divider()
                        LabeledContent(
                            "Session language",
                            value: localizedLanguageName(projection.gameplayLanguage)
                        )
                    }
                    .caseCard()
                }
                VStack(alignment: .leading, spacing: 12) {
                    PrivacyToolbarButton(session: session)
                    Button("Rejoin manually", role: .destructive) {
                        session.manualRejoin()
                    }
                }
                .caseCard()
            }
            .padding()
        }
        .background(CaseFileTheme.background)
    }
}

private struct SessionDetail: View {
    @ObservedObject var session: CompanionSession

    var body: some View {
        ScrollView {
            PrivateSessionContent(session: session)
                .frame(maxWidth: 760, alignment: .leading)
                .padding(24)
                .frame(maxWidth: .infinity)
        }
        .background(CaseFileTheme.background)
    }
}

private struct SessionStatusSection: View {
    @ObservedObject var session: CompanionSession

    var body: some View {
        StatusBanner(
            title: session.phase.title,
            message: session.statusMessage,
            systemImage: statusImage
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Connection status: \(session.phase.title). \(session.statusMessage)")
    }

    private var statusImage: String {
        switch session.phase {
        case .connected: "checkmark.circle.fill"
        case .rejoined: "arrow.trianglehead.2.clockwise.rotate.90.circle.fill"
        case .waitingForAssignment: "hourglass.circle"
        case .joining, .reconnecting: "network"
        case .expiredOrRevoked: "exclamationmark.shield"
        case .sessionEnded: "flag.checkered"
        case .manualRejoin: "lock.shield"
        }
    }
}

private struct PrivateSessionContent: View {
    @ObservedObject var session: CompanionSession

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let reason = session.privacyInterruption {
                PrivacyShield(reason: reason, session: session)
            } else if let projection = session.projection {
                ProjectionContent(projection: projection, session: session)
            } else {
                StatusBanner(
                    title: session.phase.title,
                    message: "Private content remains unavailable until a fresh server-authorized view arrives.",
                    systemImage: "lock.fill"
                )
            }
        }
    }
}

private struct ProjectionContent: View {
    let projection: ParticipantProjection
    @ObservedObject var session: CompanionSession

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(projection.scenarioTitle)
                        .font(.system(.largeTitle, design: .serif, weight: .bold))
                    Text("Gameplay language: \(localizedLanguageName(projection.gameplayLanguage))")
                        .font(.subheadline)
                        .foregroundStyle(CaseFileTheme.mutedText)
                }
                Spacer()
                Label("Private", systemImage: "lock.fill")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(CaseFileTheme.privacy)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(CaseFileTheme.privacy.opacity(0.12), in: Capsule())
            }

            VStack(alignment: .leading, spacing: 12) {
                CardHeading(
                    eyebrow: "YOUR ROLE",
                    title: projection.assignedCharacter ?? String(localized: "Waiting for assignment"),
                    systemImage: "person.text.rectangle"
                )
                Divider()
                Text("Private objective")
                    .font(.caption.weight(.bold))
                    .tracking(0.8)
                    .foregroundStyle(CaseFileTheme.privacy)
                Text(projection.privateObjective ?? String(localized: "Your private objective will appear after assignment."))
                    .font(.body)
                    .foregroundStyle(
                        projection.privateObjective == nil
                            ? CaseFileTheme.mutedText
                            : CaseFileTheme.text
                    )
                    .accessibilityLabel(
                        projection.privateObjective == nil
                            ? "Private objective not assigned"
                            : "Private objective: \(projection.privateObjective ?? "")"
                    )
            }
            .caseCard(emphasized: true)

            VStack(alignment: .leading, spacing: 10) {
                CardHeading(
                    eyebrow: "SCENE",
                    title: projection.scene?.name ?? String(localized: "The room is gathering"),
                    systemImage: "theatermasks"
                )
                Text(projection.scene?.publicNarrative ?? String(localized: "Waiting for the Host to begin."))
                    .foregroundStyle(CaseFileTheme.mutedText)
            }
            .caseCard()

            VStack(alignment: .leading, spacing: 16) {
                CardHeading(
                    eyebrow: "EVIDENCE",
                    title: "Clues revealed to you",
                    systemImage: "doc.text.magnifyingglass"
                )
                if projection.clues.isEmpty {
                    Text("No clues have been revealed to you yet.")
                        .foregroundStyle(CaseFileTheme.mutedText)
                } else {
                    ForEach(projection.clues) { clue in
                        VStack(alignment: .leading, spacing: 5) {
                            Text(clue.name)
                                .font(.system(.headline, design: .serif))
                            Text(clue.description)
                                .foregroundStyle(CaseFileTheme.mutedText)
                        }
                        .accessibilityElement(children: .combine)
                        if clue.id != projection.clues.last?.id { Divider() }
                    }
                }
            }
            .caseCard()

            VotingCard(projection: projection, session: session)

            if let outcome = projection.publicOutcome {
                VStack(alignment: .leading, spacing: 10) {
                    CardHeading(
                        eyebrow: "CASE CLOSED",
                        title: "Outcome",
                        systemImage: "checkmark.seal"
                    )
                    Text(outcome)
                }
                .caseCard(emphasized: true)
            }
        }
        .privacySensitive()
    }
}

private struct VotingCard: View {
    let projection: ParticipantProjection
    @ObservedObject var session: CompanionSession
    @State private var selectedTargetID: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            CardHeading(
                eyebrow: "DELIBERATION",
                title: "Voting",
                systemImage: "checkmark.seal"
            )

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 20) {
                    LabeledContent("Voting", value: votingStateTitle)
                    Spacer()
                    LabeledContent("Votes cast", value: String(projection.votesCast))
                }
                VStack(alignment: .leading, spacing: 8) {
                    LabeledContent("Voting", value: votingStateTitle)
                    LabeledContent("Votes cast", value: String(projection.votesCast))
                }
            }
            .font(.subheadline)

            votingAction
        }
        .caseCard(emphasized: projection.votingPhase == .open && !projection.ownVoteRecorded)
        .onChange(of: projection.voteTargets.map(\.id)) { _, ids in
            if let selectedTargetID, !ids.contains(selectedTargetID) {
                self.selectedTargetID = nil
            }
        }
    }

    @ViewBuilder
    private var votingAction: some View {
        if projection.ownVoteRecorded {
            Label("Your vote is recorded", systemImage: "checkmark.circle.fill")
                .font(.headline)
                .foregroundStyle(CaseFileTheme.success)
        } else {
            switch projection.votingPhase {
            case .unavailable:
                Text("Direct voting becomes available after you rejoin with a current invitation.")
                    .foregroundStyle(CaseFileTheme.mutedText)
            case .notOpen:
                Text("Voting has not opened yet.")
                    .foregroundStyle(CaseFileTheme.mutedText)
            case .closed:
                Text("Voting is closed.")
                    .foregroundStyle(CaseFileTheme.mutedText)
            case .resolved:
                Text("The vote has been resolved.")
                    .foregroundStyle(CaseFileTheme.mutedText)
            case .open:
                if projection.voteTargets.isEmpty {
                    Text("No voting choices are available to this participant.")
                        .foregroundStyle(CaseFileTheme.mutedText)
                } else {
                    Text("Choose the character you believe is responsible.")
                        .foregroundStyle(CaseFileTheme.mutedText)

                    VStack(spacing: 10) {
                        ForEach(projection.voteTargets) { target in
                            Button {
                                selectedTargetID = target.id
                            } label: {
                                HStack {
                                    Text(target.name)
                                        .font(.headline)
                                        .foregroundStyle(CaseFileTheme.text)
                                    Spacer()
                                    Image(systemName: selectedTargetID == target.id ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(CaseFileTheme.accent)
                                }
                                .padding(14)
                                .background(
                                    selectedTargetID == target.id
                                        ? CaseFileTheme.accent.opacity(0.12)
                                        : CaseFileTheme.background,
                                    in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                                )
                                .overlay {
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(
                                            selectedTargetID == target.id
                                                ? CaseFileTheme.accent
                                                : CaseFileTheme.border,
                                            lineWidth: 1
                                        )
                                }
                            }
                            .buttonStyle(.plain)
                            .disabled(session.voteSubmissionIsPending)
                            .accessibilityLabel(target.name)
                            .accessibilityValue(selectedTargetID == target.id ? "Selected" : "Not selected")
                        }
                    }

                    Button(action: submitVote) {
                        Label(
                            session.voteSubmissionIsPending ? "Submitting vote…" : "Cast private vote",
                            systemImage: "checkmark.seal.fill"
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(!session.canCastVote || selectedTargetID == nil)
                    .keyboardShortcut(.defaultAction)
                }
            }
        }
    }

    private var votingStateTitle: String {
        if projection.ownVoteRecorded { return String(localized: "Recorded") }
        switch projection.votingPhase {
        case .unavailable: return String(localized: "Unavailable")
        case .notOpen: return String(localized: "Not open")
        case .open: return String(localized: "Open")
        case .closed: return String(localized: "Closed")
        case .resolved: return String(localized: "Resolved")
        }
    }

    private func submitVote() {
        guard let selectedTargetID else { return }
        Task { await session.castVote(targetCharacterID: selectedTargetID) }
    }
}

private struct PrivacyShield: View {
    let reason: PrivacyInterruption
    @ObservedObject var session: CompanionSession

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: reason == .capture ? "record.circle" : "lock.shield.fill")
                .font(.largeTitle)
                .foregroundStyle(CaseFileTheme.privacy)
                .accessibilityHidden(true)
            Text("Private view protected")
                .font(.system(.title2, design: .serif, weight: .bold))
            Text(reason.message)
                .multilineTextAlignment(.center)
                .foregroundStyle(CaseFileTheme.mutedText)
            Text("A fresh authorized view is required before private content or actions return.")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(CaseFileTheme.mutedText)
            if reason == .manual {
                Button("Request a fresh private view") { session.revealPrivateView() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }
            Button("Rejoin manually", role: .destructive) { session.manualRejoin() }
        }
        .frame(maxWidth: .infinity, minHeight: 320)
        .caseCard(emphasized: true)
        .accessibilityElement(children: .contain)
    }
}

private struct PrivacyToolbarButton: View {
    @ObservedObject var session: CompanionSession

    var body: some View {
        Button { session.hidePrivateView() } label: {
            Label("Hide private view", systemImage: "eye.slash")
        }
        .disabled(session.projection == nil)
        .accessibilityHint("Clears private content and requires a fresh server view")
    }
}

private struct AppearanceMenu: View {
    @Binding var selection: String

    var body: some View {
        Menu {
            Picker("Appearance", selection: $selection) {
                ForEach(AppAppearance.allCases) { appearance in
                    Label(appearance.title, systemImage: appearance.systemImage)
                        .tag(appearance.rawValue)
                }
            }
        } label: {
            Label("Appearance", systemImage: "circle.lefthalf.filled")
        }
    }
}

private struct CardHeading: View {
    let eyebrow: String
    let title: String
    let systemImage: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: systemImage)
                .font(.title3)
                .foregroundStyle(CaseFileTheme.brass)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(eyebrow)
                    .font(.caption2.weight(.bold))
                    .tracking(1.2)
                    .foregroundStyle(CaseFileTheme.brass)
                Text(title)
                    .font(.system(.title3, design: .serif, weight: .semibold))
            }
        }
    }
}

private struct StatusBanner: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: systemImage)
                .font(.title3)
                .foregroundStyle(CaseFileTheme.privacy)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(CaseFileTheme.mutedText)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(CaseFileTheme.privacy.opacity(0.09), in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(CaseFileTheme.privacy.opacity(0.28), lineWidth: 1)
        }
    }
}

private struct AppSwitcherPrivacyShield: View {
    var body: some View {
        ZStack {
            CaseFileTheme.background.ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "lock.shield.fill")
                    .font(.largeTitle)
                    .foregroundStyle(CaseFileTheme.privacy)
                    .accessibilityHidden(true)
                Text("Guilty Party")
                    .font(.system(.title, design: .serif, weight: .bold))
                Text("Private view protected")
                    .foregroundStyle(CaseFileTheme.mutedText)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Guilty Party private view protected")
        }
    }
}

private func localizedLanguageName(_ identifier: String) -> String {
    Locale.current.localizedString(forIdentifier: identifier) ?? identifier
}
