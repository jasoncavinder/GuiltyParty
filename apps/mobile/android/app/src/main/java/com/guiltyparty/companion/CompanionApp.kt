package com.guiltyparty.companion

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = Color(0xFF5B3F96),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE9DDFF),
    onPrimaryContainer = Color(0xFF251047),
    secondary = Color(0xFF675A73),
    background = Color(0xFFFFF8FF),
    surface = Color(0xFFFFF8FF),
    surfaceVariant = Color(0xFFE8E0EA),
)

@Composable
fun GuiltyPartyTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LightColors, content = content)
}

@Composable
fun CompanionApp(controller: CompanionController) {
    val snapshot = controller.snapshot
    Surface(modifier = Modifier.fillMaxSize()) {
        when (snapshot.phase) {
            CompanionPhase.MANUAL_REJOIN,
            CompanionPhase.EXPIRED_OR_REVOKED,
            CompanionPhase.SESSION_ENDED,
            -> JoinScreen(snapshot, controller)
            else -> SessionScreen(snapshot, controller)
        }
    }
}

@Composable
private fun JoinScreen(snapshot: UiSnapshot, controller: CompanionController) {
    var nickname by remember { mutableStateOf("") }
    var invitation by remember { mutableStateOf("") }
    var developmentOrigin by remember { mutableStateOf("") }
    var joining by remember { mutableStateOf(false) }

    fun join() {
        if (joining || nickname.isBlank() || invitation.isBlank()) return
        joining = true
        val oneTimeInvitation = invitation
        invitation = ""
        controller.join(oneTimeInvitation, nickname, developmentOrigin)
        joining = false
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .testTag("join_screen"),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Spacer(Modifier.height(8.dp))
            Text("Guilty Party", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
            Text(
                "Private Android player development build",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.secondary,
            )
            StatusCard(snapshot.phase.title, snapshot.statusMessage)
            SectionCard("Join with an invitation") {
                OutlinedTextField(
                    value = nickname,
                    onValueChange = { nickname = it },
                    modifier = Modifier.fillMaxWidth().testTag("nickname_field"),
                    label = { Text("Nickname") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                )
                OutlinedTextField(
                    value = invitation,
                    onValueChange = { invitation = it },
                    modifier = Modifier.fillMaxWidth().testTag("invitation_field"),
                    label = { Text("GP1 invitation") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { join() }),
                )
                Text(
                    "Paste or enter the complete GP1 transfer. It is cleared immediately and is never written to a URL, setting, diagnostic, or log.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                )
                if (BuildConfig.DEBUG) {
                    OutlinedTextField(
                        value = developmentOrigin,
                        onValueChange = { developmentOrigin = it },
                        modifier = Modifier.fillMaxWidth().testTag("development_origin_field"),
                        label = { Text("Development server origin (optional)") },
                        placeholder = { Text(BuildConfig.DEFAULT_API_ORIGIN) },
                        singleLine = true,
                    )
                    Text(
                        "Debug builds may use HTTP only for synthetic local/LAN testing. Release builds require HTTPS/WSS.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
                Button(
                    onClick = { join() },
                    enabled = !joining && nickname.isNotBlank() && invitation.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().testTag("join_button"),
                ) {
                    Text("Join private session")
                }
            }
            Text(
                "Use a nickname. This account-free test does not use analytics, recording, notifications, media, remote AI, or persistent private gameplay storage.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.secondary,
            )
        }
    }
}

internal enum class SessionLayout { COMPACT, EXPANDED }

@Composable
internal fun SessionScreen(
    snapshot: UiSnapshot,
    controller: CompanionController,
    onLayout: ((SessionLayout) -> Unit)? = null,
) {
    BoxWithConstraints(Modifier.fillMaxSize().testTag("session_screen")) {
        val layout = if (maxWidth >= 840.dp) SessionLayout.EXPANDED else SessionLayout.COMPACT
        SideEffect { onLayout?.invoke(layout) }
        if (layout == SessionLayout.EXPANDED) {
            Row(Modifier.fillMaxSize().testTag("expanded_layout")) {
                SessionSidebar(snapshot, controller, Modifier.width(320.dp).fillMaxHeight())
                VerticalDivider(Modifier.fillMaxHeight().width(1.dp))
                PrivatePane(snapshot, controller, Modifier.weight(1f).fillMaxHeight())
            }
        } else {
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
                    .testTag("compact_layout"),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text("Guilty Party", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                DevelopmentTransportWarning(snapshot)
                StatusCard(snapshot.phase.title, snapshot.statusMessage)
                PrivacyActions(snapshot, controller)
                PrivateContent(snapshot, controller)
            }
        }
    }
}

@Composable
private fun SessionSidebar(
    snapshot: UiSnapshot,
    controller: CompanionController,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Guilty Party", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        DevelopmentTransportWarning(snapshot)
        StatusCard(snapshot.phase.title, snapshot.statusMessage)
        snapshot.projection?.let { projection ->
            SectionCard("Current scene") {
                Text(projection.scene?.name ?: "The room is gathering", fontWeight = FontWeight.Bold)
                Text(projection.scene?.publicNarrative ?: "Waiting for the Host to begin.")
            }
            SectionCard("Session language") { Text(projection.gameplayLanguage) }
        }
        PrivacyActions(snapshot, controller)
    }
}

@Composable
private fun DevelopmentTransportWarning(snapshot: UiSnapshot) {
    if (!snapshot.insecureDevelopmentTransport) return
    Card(
        modifier = Modifier.fillMaxWidth().testTag("development_transport_warning"),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFDDB3)),
    ) {
        Text(
            "UNENCRYPTED SYNTHETIC DEVELOPMENT SESSION — do not use accounts, real participant data, licensed content, payments, recording, or private communications.",
            modifier = Modifier.padding(16.dp),
            color = Color(0xFF3D2700),
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun PrivatePane(
    snapshot: UiSnapshot,
    controller: CompanionController,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier.verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Private player view", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        PrivateContent(snapshot, controller)
    }
}

@Composable
private fun PrivacyActions(snapshot: UiSnapshot, controller: CompanionController) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        if (snapshot.privacyInterruption == PrivacyInterruption.MANUAL) {
            Button(onClick = controller::revealPrivateView, modifier = Modifier.testTag("reveal_private")) {
                Text("Reveal private view")
            }
        } else {
            OutlinedButton(onClick = controller::hidePrivateView, modifier = Modifier.testTag("hide_private")) {
                Text("Hide private view")
            }
        }
        OutlinedButton(onClick = controller::manualRejoin, modifier = Modifier.testTag("manual_rejoin")) {
            Text("Rejoin manually")
        }
    }
}

@Composable
private fun PrivateContent(snapshot: UiSnapshot, controller: CompanionController) {
    val interruption = snapshot.privacyInterruption
    val projection = snapshot.projection
    when {
        interruption != null -> PrivacyShield(interruption, controller)
        projection != null -> ProjectionContent(projection, controller, snapshot.votePending)
        else -> StatusCard(
            snapshot.phase.title,
            "Private content remains unavailable until a fresh server-authorized projection arrives.",
        )
    }
}

@Composable
private fun PrivacyShield(reason: PrivacyInterruption, controller: CompanionController) {
    Card(
        modifier = Modifier.fillMaxWidth().testTag("privacy_shield"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Private view protected", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(reason.message)
            if (reason == PrivacyInterruption.MANUAL) {
                Button(onClick = controller::revealPrivateView) { Text("Request a fresh private view") }
            }
        }
    }
}

@Composable
private fun ProjectionContent(
    projection: ParticipantProjection,
    controller: CompanionController,
    votePending: Boolean,
) {
    var targetCharacterId by remember { mutableStateOf("") }
    Column(
        Modifier.fillMaxWidth().testTag("private_projection"),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(projection.scenarioTitle, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                Text("Gameplay language: ${projection.gameplayLanguage}")
            }
            Text(
                "PRIVATE",
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { contentDescription = "Private participant content" },
            )
        }
        SectionCard("Your character") {
            Text(projection.assignedCharacter ?: "Waiting for assignment", style = MaterialTheme.typography.titleLarge)
            Text(projection.privateObjective ?: "Your private objective will appear after assignment.")
        }
        SectionCard("Current scene") {
            Text(projection.scene?.name ?: "The room is gathering", fontWeight = FontWeight.Bold)
            Text(projection.scene?.publicNarrative ?: "Waiting for the Host to begin.")
        }
        SectionCard("Clues revealed to you") {
            if (projection.clues.isEmpty()) {
                Text("No clues have been revealed to this participant.")
            } else {
                projection.clues.forEachIndexed { index, clue ->
                    if (index > 0) HorizontalDivider()
                    Text(clue.name, fontWeight = FontWeight.Bold)
                    Text(clue.description)
                }
            }
        }
        SectionCard("Voting") {
            KeyValue("Voting state", if (projection.votingOpen) "Open" else "Closed")
            KeyValue("Votes cast", projection.votesCast.toString())
            KeyValue("Your vote", if (projection.ownVoteRecorded) "Recorded" else "Not recorded")
            if (projection.votingOpen && !projection.ownVoteRecorded) {
                HorizontalDivider()
                OutlinedTextField(
                    value = targetCharacterId,
                    onValueChange = { targetCharacterId = it },
                    modifier = Modifier.fillMaxWidth().testTag("vote_target"),
                    label = { Text("Target character identifier") },
                    singleLine = true,
                )
                Text(
                    "The current v1 projection does not expose vote-target identifiers. Enter the synthetic identifier supplied for this test; the server remains authoritative.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                )
                Button(
                    onClick = {
                        val target = targetCharacterId
                        targetCharacterId = ""
                        controller.castVote(target)
                    },
                    enabled = controller.canCastVote && targetCharacterId.isNotBlank() && !votePending,
                    modifier = Modifier.fillMaxWidth().testTag("cast_vote"),
                ) {
                    Text(if (votePending) "Submitting…" else "Cast vote")
                }
            }
        }
        projection.publicOutcome?.let { outcome ->
            SectionCard("Public outcome") { Text(outcome) }
        }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            content()
        }
    }
}

@Composable
private fun StatusCard(title: String, message: String) {
    Card(
        modifier = Modifier.fillMaxWidth().testTag("connection_status"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
            Box(
                Modifier
                    .padding(top = 4.dp)
                    .size(10.dp)
                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(50)),
            )
            Spacer(Modifier.width(12.dp))
            Column {
                Text(title, fontWeight = FontWeight.Bold)
                Text(message, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun KeyValue(label: String, value: String) {
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(1f), color = MaterialTheme.colorScheme.secondary)
        Text(value, fontWeight = FontWeight.Medium)
    }
}
