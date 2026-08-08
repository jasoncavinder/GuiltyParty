import SwiftUI
import UIKit

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var session = CompanionSession()

    var body: some View {
        ZStack {
            content
                .tint(.indigo)
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
        .onAppear {
            session.setAppActive(scenePhase == .active)
        }
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
            Button("OK") {
                session.dismissScreenshotWarning()
            }
        } message: {
            Text("This screenshot may contain private game content. Please delete it and do not share it. Guilty Party did not prevent or delete the screenshot.")
        }
    }

    @ViewBuilder
    private var content: some View {
        switch session.phase {
        case .manualRejoin, .expiredOrRevoked, .sessionEnded:
            JoinView(session: session)
        case .joining, .waitingForAssignment, .connected, .reconnecting, .rejoined:
            SessionView(session: session)
        }
    }
}

private struct JoinView: View {
    @ObservedObject var session: CompanionSession
    @State private var nickname = ""
    @State private var invitation = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Image(systemName: "theatermasks.fill")
                            .font(.largeTitle)
                            .accessibilityHidden(true)
                        Text("Guilty Party")
                            .font(.largeTitle.bold())
                        Text("Private Companion development build")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                    }

                    StatusBanner(
                        title: session.phase.title,
                        message: session.statusMessage,
                        systemImage: session.phase == .expiredOrRevoked
                            ? "exclamationmark.shield"
                            : session.phase == .sessionEnded ? "flag.checkered" : "lock.shield"
                    )

                    GroupBox("Join with an invitation") {
                        VStack(alignment: .leading, spacing: 16) {
                            TextField("Nickname", text: $nickname)
                                .textContentType(.nickname)
                                .textInputAutocapitalization(.words)
                                .autocorrectionDisabled()
                                .accessibilityLabel("Session nickname")

                            SecureField("GP1 invitation", text: $invitation)
                                .textContentType(.oneTimeCode)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .privacySensitive()
                                .accessibilityLabel("Private GP1 invitation")
                                .onSubmit(join)

                            Text("Paste or enter the complete GP1 transfer. The app clears this field immediately and never writes the invitation to a URL, file, setting, diagnostic, or log.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)

                            Button(action: join) {
                                Label("Join private session", systemImage: "arrow.right.circle.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.large)
                            .disabled(
                                nickname.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                    || invitation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            )
                            .keyboardShortcut(.defaultAction)
                        }
                        .textFieldStyle(.roundedBorder)
                        .padding(.top, 8)
                    }

                    Text("Use a nickname. This account-free test does not use analytics, recording, notifications, media, remote AI, or persistent private gameplay storage.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: 620, alignment: .leading)
                .padding(24)
                .frame(maxWidth: .infinity)
            }
            .navigationTitle("Companion")
        }
    }

    private func join() {
        let oneTimeInvitation = invitation
        invitation = ""
        Task {
            await session.join(
                invitationPayload: oneTimeInvitation,
                displayName: nickname
            )
        }
    }
}

private struct SessionView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @ObservedObject var session: CompanionSession

    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                NavigationSplitView {
                    SessionSidebar(session: session)
                        .navigationTitle("Guilty Party")
                } detail: {
                    PrivateSessionDetail(session: session)
                        .navigationTitle("Private Companion")
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
                    .navigationTitle("Guilty Party")
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            PrivacyToolbarButton(session: session)
                        }
                    }
                }
            }
        }
    }
}

private struct SessionSidebar: View {
    @ObservedObject var session: CompanionSession

    var body: some View {
        List {
            Section("Connection") {
                SessionStatusSection(session: session)
            }
            if let projection = session.projection {
                Section("Current scene") {
                    Text(projection.scene?.name ?? "The room is gathering")
                        .font(.headline)
                    Text(projection.scene?.publicNarrative ?? "Waiting for the Host to begin.")
                        .foregroundStyle(.secondary)
                }
                Section("Session language") {
                    Text(projection.gameplayLanguage)
                        .accessibilityLabel("Gameplay language, \(projection.gameplayLanguage)")
                }
            }
            Section {
                PrivacyToolbarButton(session: session)
                Button("Rejoin manually", role: .destructive) {
                    session.manualRejoin()
                }
            }
        }
    }
}

private struct PrivateSessionDetail: View {
    @ObservedObject var session: CompanionSession

    var body: some View {
        ScrollView {
            PrivateSessionContent(session: session)
                .frame(maxWidth: 760, alignment: .leading)
                .padding(24)
                .frame(maxWidth: .infinity)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                PrivacyToolbarButton(session: session)
            }
        }
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
                    message: "Private content remains unavailable until a fresh server-authorized projection arrives.",
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
                VStack(alignment: .leading) {
                    Text(projection.scenarioTitle)
                        .font(.title.bold())
                    Text("Gameplay language: \(projection.gameplayLanguage)")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Label("Private", systemImage: "lock.fill")
                    .font(.caption.bold())
                    .foregroundStyle(.indigo)
            }

            GroupBox("Your character") {
                VStack(alignment: .leading, spacing: 10) {
                    Text(projection.assignedCharacter ?? "Waiting for assignment")
                        .font(.title2.bold())
                    Text(projection.privateObjective ?? "Your private objective will appear after assignment.")
                        .foregroundStyle(projection.privateObjective == nil ? .secondary : .primary)
                        .accessibilityLabel(
                            projection.privateObjective == nil
                                ? "Private objective not assigned"
                                : "Private objective: \(projection.privateObjective ?? "")"
                        )
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 6)
            }

            GroupBox("Current scene") {
                VStack(alignment: .leading, spacing: 6) {
                    Text(projection.scene?.name ?? "The room is gathering")
                        .font(.headline)
                    Text(projection.scene?.publicNarrative ?? "Waiting for the Host to begin.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 6)
            }

            GroupBox("Clues revealed to you") {
                if projection.clues.isEmpty {
                    Text("No clues have been revealed to this participant.")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 6)
                } else {
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(projection.clues) { clue in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(clue.name).font(.headline)
                                Text(clue.description).foregroundStyle(.secondary)
                            }
                            .accessibilityElement(children: .combine)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 6)
                }
            }

            VotingCard(projection: projection, session: session)

            if let outcome = projection.publicOutcome {
                GroupBox("Public outcome") {
                    Text(outcome)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 6)
                }
            }
        }
        .privacySensitive()
    }
}

private struct VotingCard: View {
    let projection: ParticipantProjection
    @ObservedObject var session: CompanionSession
    @State private var targetCharacterID = ""

    var body: some View {
        GroupBox("Voting") {
            VStack(alignment: .leading, spacing: 12) {
                LabeledContent("Voting state", value: projection.votingOpen ? "Open" : "Closed")
                LabeledContent("Votes cast", value: String(projection.votesCast))
                LabeledContent("Your vote", value: projection.ownVoteRecorded ? "Recorded" : "Not recorded")

                if projection.votingOpen && !projection.ownVoteRecorded {
                    Divider()
                    TextField("Target character identifier", text: $targetCharacterID)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)
                        .accessibilityLabel("Vote target character identifier")
                        .onSubmit(submitVote)
                    Text("The current v1 participant projection does not include vote-target identifiers. Enter the synthetic target identifier supplied for this private test; the server remains authoritative.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Button(action: submitVote) {
                        Label("Cast vote", systemImage: "checkmark.seal.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(!session.canCastVote || targetCharacterID.isEmpty)
                    .keyboardShortcut(.defaultAction)
                }
            }
            .padding(.top, 6)
        }
    }

    private func submitVote() {
        let target = targetCharacterID
        targetCharacterID = ""
        Task {
            await session.castVote(targetCharacterID: target)
        }
    }
}

private struct PrivacyShield: View {
    let reason: PrivacyInterruption
    @ObservedObject var session: CompanionSession

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: reason == .capture ? "record.circle" : "lock.shield.fill")
                .font(.largeTitle)
                .foregroundStyle(.indigo)
                .accessibilityHidden(true)
            Text("Private view protected")
                .font(.title2.bold())
            Text(reason.message)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Text("A fresh authorized projection is required before any private content or action returns.")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            if reason == .manual {
                Button("Request a fresh private view") {
                    session.revealPrivateView()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            Button("Rejoin manually", role: .destructive) {
                session.manualRejoin()
            }
        }
        .frame(maxWidth: .infinity, minHeight: 320)
        .padding(24)
        .accessibilityElement(children: .contain)
    }
}

private struct PrivacyToolbarButton: View {
    @ObservedObject var session: CompanionSession

    var body: some View {
        Button {
            session.hidePrivateView()
        } label: {
            Label("Hide private view", systemImage: "eye.slash")
        }
        .disabled(session.projection == nil)
        .accessibilityHint("Clears private content and requires a fresh server projection")
    }
}

private struct StatusBanner: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundStyle(.indigo)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(message).font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.indigo.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
    }
}

private struct AppSwitcherPrivacyShield: View {
    var body: some View {
        ZStack {
            Color(uiColor: .systemBackground).ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "lock.shield.fill")
                    .font(.largeTitle)
                    .foregroundStyle(.indigo)
                    .accessibilityHidden(true)
                Text("Guilty Party")
                    .font(.title.bold())
                Text("Private view protected")
                    .foregroundStyle(.secondary)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Guilty Party private view protected")
        }
    }
}
