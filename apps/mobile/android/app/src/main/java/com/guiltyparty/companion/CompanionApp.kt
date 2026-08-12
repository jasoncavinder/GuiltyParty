package com.guiltyparty.companion

import android.app.Activity
import android.os.Build
import android.view.WindowInsetsController
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import java.util.Locale

@Composable
fun CompanionApp(controller: CompanionController) {
    val context = LocalContext.current
    val view = LocalView.current
    var appearance by remember { mutableStateOf(AppAppearance.load(context)) }
    val effectiveDarkAppearance = when (appearance) {
        AppAppearance.SYSTEM -> isSystemInDarkTheme()
        AppAppearance.LIGHT -> false
        AppAppearance.DARK -> true
    }
    GuiltyPartyTheme(appearance) {
        val systemBarColor = MaterialTheme.colorScheme.background.toArgb()
        SideEffect {
            val window = (view.context as? Activity)?.window
            val lightBars = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            window?.insetsController?.setSystemBarsAppearance(
                if (effectiveDarkAppearance) 0 else lightBars,
                lightBars,
            )
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                @Suppress("DEPRECATION")
                window?.statusBarColor = systemBarColor
                @Suppress("DEPRECATION")
                window?.navigationBarColor = systemBarColor
            }
        }
        val snapshot = controller.snapshot
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            when (snapshot.phase) {
                CompanionPhase.MANUAL_REJOIN,
                CompanionPhase.EXPIRED_OR_REVOKED,
                CompanionPhase.SESSION_ENDED,
                -> JoinScreen(snapshot, controller, appearance) { selected ->
                    appearance = selected
                    AppAppearance.save(context, selected)
                }
                else -> SessionScreen(
                    snapshot,
                    controller,
                    appearance = appearance,
                    onAppearance = { selected ->
                        appearance = selected
                        AppAppearance.save(context, selected)
                    },
                )
            }
        }
    }
}

@Composable
private fun JoinScreen(
    snapshot: UiSnapshot,
    controller: CompanionController,
    appearance: AppAppearance,
    onAppearance: (AppAppearance) -> Unit,
) {
    var nickname by remember { mutableStateOf("") }
    var invitation by remember { mutableStateOf("") }
    var developmentOrigin by remember { mutableStateOf("") }
    var developerOptionsVisible by remember { mutableStateOf(false) }

    fun join() {
        if (nickname.isBlank() || invitation.isBlank()) return
        val oneTimeInvitation = invitation
        invitation = ""
        controller.join(oneTimeInvitation, nickname, developmentOrigin)
    }

    Box(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 680.dp)
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 32.dp)
                .testTag("join_screen"),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Text(
                stringResource(R.string.app_name),
                style = MaterialTheme.typography.displaySmall,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                stringResource(R.string.join_intro),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (snapshot.phase != CompanionPhase.MANUAL_REJOIN ||
                snapshot.statusMessage != stringResource(R.string.status_join_ready)
            ) {
                StatusCard(phaseTitle(snapshot.phase), snapshot.statusMessage)
            }
            CaseCard(title = stringResource(R.string.join_with_invitation), emphasized = true) {
                OutlinedTextField(
                    value = nickname,
                    onValueChange = { nickname = it },
                    modifier = Modifier.fillMaxWidth().testTag("nickname_field"),
                    label = { Text(stringResource(R.string.session_name)) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                )
                OutlinedTextField(
                    value = invitation,
                    onValueChange = { invitation = it },
                    modifier = Modifier.fillMaxWidth().testTag("invitation_field"),
                    label = { Text(stringResource(R.string.invitation)) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { join() }),
                )
                Text(
                    stringResource(R.string.invitation_help),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(
                    onClick = { join() },
                    enabled = nickname.isNotBlank() && invitation.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("join_button"),
                ) {
                    Text(stringResource(R.string.join_action))
                }
            }
            AppearancePicker(appearance, onAppearance)
            if (BuildConfig.DEBUG) {
                TextButton(
                    onClick = { developerOptionsVisible = !developerOptionsVisible },
                    modifier = Modifier.heightIn(min = 48.dp).testTag("developer_options_toggle"),
                ) {
                    Text(
                        stringResource(
                            if (developerOptionsVisible) R.string.hide_developer_options
                            else R.string.developer_options,
                        ),
                    )
                }
                if (developerOptionsVisible) {
                    CaseCard(
                        title = stringResource(R.string.developer_options),
                        modifier = Modifier.testTag("developer_options_panel"),
                    ) {
                        OutlinedTextField(
                            value = developmentOrigin,
                            onValueChange = { developmentOrigin = it },
                            modifier = Modifier.fillMaxWidth().testTag("development_origin_field"),
                            label = { Text(stringResource(R.string.development_origin)) },
                            placeholder = { Text(BuildConfig.DEFAULT_API_ORIGIN) },
                            singleLine = true,
                        )
                        Text(
                            stringResource(R.string.development_help),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Text(
                stringResource(R.string.privacy_disclosure),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

internal enum class SessionLayout { COMPACT, EXPANDED }

@Composable
internal fun SessionScreen(
    snapshot: UiSnapshot,
    controller: CompanionController,
    appearance: AppAppearance = AppAppearance.SYSTEM,
    onAppearance: (AppAppearance) -> Unit = {},
    onLayout: ((SessionLayout) -> Unit)? = null,
) {
    val configuration = LocalConfiguration.current
    BoxWithConstraints(
        Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).testTag("session_screen"),
    ) {
        val layout = if (maxWidth >= 840.dp && configuration.fontScale < 1.5f) {
            SessionLayout.EXPANDED
        } else {
            SessionLayout.COMPACT
        }
        SideEffect { onLayout?.invoke(layout) }
        if (layout == SessionLayout.EXPANDED) {
            Row(Modifier.fillMaxSize().testTag("expanded_layout")) {
                SessionSidebar(
                    snapshot,
                    controller,
                    appearance,
                    onAppearance,
                    Modifier.width(340.dp).fillMaxHeight(),
                )
                VerticalDivider(Modifier.fillMaxHeight().width(1.dp))
                PrivatePane(snapshot, controller, Modifier.weight(1f).fillMaxHeight())
            }
        } else {
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 20.dp)
                    .testTag("compact_layout"),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                ProductHeader(snapshot, controller)
                DevelopmentTransportWarning(snapshot)
                AttentionStatus(snapshot)
                PrivateContent(snapshot, controller, includeScene = true)
                AppearancePicker(appearance, onAppearance)
                RecoverySupport(controller)
            }
        }
    }
}

@Composable
private fun SessionSidebar(
    snapshot: UiSnapshot,
    controller: CompanionController,
    appearance: AppAppearance,
    onAppearance: (AppAppearance) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            stringResource(R.string.app_name),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.semantics { heading() },
        )
        DevelopmentTransportWarning(snapshot)
        AttentionStatus(snapshot)
        snapshot.projection?.let { projection ->
            SceneCard(projection)
            CaseCard(stringResource(R.string.session_language)) {
                Text(displayLanguage(projection.gameplayLanguage))
            }
        }
        PrivacyActions(snapshot, controller, vertical = true)
        AppearancePicker(appearance, onAppearance)
        RecoverySupport(controller)
    }
}

@Composable
private fun ProductHeader(snapshot: UiSnapshot, controller: CompanionController) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            stringResource(R.string.app_name),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.weight(1f).semantics { heading() },
        )
        if (snapshot.privacyInterruption == PrivacyInterruption.MANUAL) {
            Button(
                onClick = controller::revealPrivateView,
                modifier = Modifier.heightIn(min = 48.dp).testTag("reveal_private"),
            ) { Text(stringResource(R.string.reveal_private_view)) }
        } else {
            OutlinedButton(
                onClick = controller::hidePrivateView,
                modifier = Modifier.heightIn(min = 48.dp).testTag("hide_private"),
            ) { Text(stringResource(R.string.hide_private_view)) }
        }
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
            stringResource(R.string.unencrypted_warning),
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
        ProductHeader(snapshot, controller)
        PrivateContent(snapshot, controller, includeScene = false)
    }
}

@Composable
private fun PrivacyActions(
    snapshot: UiSnapshot,
    controller: CompanionController,
    vertical: Boolean,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (snapshot.privacyInterruption == PrivacyInterruption.MANUAL) {
            Button(
                onClick = controller::revealPrivateView,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("reveal_private"),
            ) { Text(stringResource(R.string.reveal_private_view)) }
        } else {
            OutlinedButton(
                onClick = controller::hidePrivateView,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("hide_private"),
            ) { Text(stringResource(R.string.hide_private_view)) }
        }
        if (vertical) {
            OutlinedButton(
                onClick = controller::manualRejoin,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("manual_rejoin"),
            ) { Text(stringResource(R.string.rejoin_manually)) }
        }
    }
}

@Composable
private fun RecoverySupport(controller: CompanionController) {
    CaseCard(stringResource(R.string.support)) {
        Text(
            stringResource(R.string.support_rejoin_help),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedButton(
            onClick = controller::manualRejoin,
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("manual_rejoin"),
        ) { Text(stringResource(R.string.rejoin_manually)) }
    }
}

@Composable
private fun AttentionStatus(snapshot: UiSnapshot) {
    if (snapshot.phase in setOf(CompanionPhase.JOINING, CompanionPhase.RECONNECTING, CompanionPhase.REJOINED) ||
        snapshot.privacyInterruption != null
    ) {
        StatusCard(phaseTitle(snapshot.phase), snapshot.statusMessage)
    }
}

@Composable
private fun PrivateContent(
    snapshot: UiSnapshot,
    controller: CompanionController,
    includeScene: Boolean,
) {
    val interruption = snapshot.privacyInterruption
    val projection = snapshot.projection
    when {
        interruption != null -> PrivacyShield(interruption, controller)
        projection != null -> ProjectionContent(
            projection,
            controller,
            snapshot.votePending,
            includeScene,
        )
        else -> StatusCard(phaseTitle(snapshot.phase), stringResource(R.string.fresh_projection_required))
    }
}

@Composable
private fun PrivacyShield(reason: PrivacyInterruption, controller: CompanionController) {
    Card(
        modifier = Modifier.fillMaxWidth().testTag("privacy_shield"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                stringResource(R.string.private_view_protected),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.semantics { heading() },
            )
            Text(privacyMessage(reason))
            if (reason == PrivacyInterruption.MANUAL) {
                Button(
                    onClick = controller::revealPrivateView,
                    modifier = Modifier.heightIn(min = 48.dp),
                ) { Text(stringResource(R.string.request_fresh_private_view)) }
            }
        }
    }
}

@Composable
private fun ProjectionContent(
    projection: ParticipantProjection,
    controller: CompanionController,
    votePending: Boolean,
    includeScene: Boolean,
) {
    val privateContentDescription = stringResource(R.string.private_content_label)
    Column(
        Modifier.fillMaxWidth().testTag("private_projection"),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(
                    projection.scenarioTitle,
                    style = MaterialTheme.typography.headlineLarge,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    displayLanguage(projection.gameplayLanguage),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                stringResource(R.string.status_private),
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics {
                    contentDescription = privateContentDescription
                },
            )
        }
        CharacterCard(projection)
        if (includeScene) SceneCard(projection)
        ClueCard(projection)
        VotingCard(projection, controller, votePending)
        projection.publicOutcome?.let { outcome ->
            CaseCard(stringResource(R.string.public_outcome), emphasized = true) { Text(outcome) }
        }
    }
}

@Composable
private fun CharacterCard(projection: ParticipantProjection) {
    CaseCard(stringResource(R.string.your_character), emphasized = projection.hasAssignment) {
        Text(
            projection.assignedCharacter ?: stringResource(R.string.waiting_for_assignment),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.semantics { heading() },
        )
        if (projection.hasAssignment) {
            Text(
                stringResource(R.string.private_objective),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
            )
            Text(projection.privateObjective ?: stringResource(R.string.objective_waiting))
        } else {
            Text(
                stringResource(R.string.objective_waiting),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun SceneCard(projection: ParticipantProjection) {
    CaseCard(stringResource(R.string.current_scene)) {
        Text(
            projection.scene?.name ?: stringResource(R.string.scene_gathering),
            style = MaterialTheme.typography.titleLarge,
        )
        Text(projection.scene?.publicNarrative ?: stringResource(R.string.scene_waiting))
    }
}

@Composable
private fun ClueCard(projection: ParticipantProjection) {
    CaseCard(stringResource(R.string.clues_for_you)) {
        if (projection.clues.isEmpty()) {
            Text(
                stringResource(R.string.no_clues),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            projection.clues.forEachIndexed { index, clue ->
                if (index > 0) HorizontalDivider()
                Text(clue.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(clue.description)
            }
        }
    }
}

@Composable
private fun VotingCard(
    projection: ParticipantProjection,
    controller: CompanionController,
    votePending: Boolean,
) {
    val targetSignature = projection.voteTargets.joinToString("|") { it.id }
    var selectedTarget by remember(targetSignature) { mutableStateOf<String?>(null) }
    val phase = projection.votingPhase
    val recorded = projection.ownVoteRecorded
    val title = when {
        votePending -> R.string.voting_submitting_title
        recorded -> R.string.voting_recorded_title
        phase == ParticipantVotingPhase.NOT_OPEN -> R.string.voting_not_open_title
        phase == ParticipantVotingPhase.OPEN -> R.string.voting_open_title
        phase == ParticipantVotingPhase.CLOSED -> R.string.voting_closed_title
        phase == ParticipantVotingPhase.RESOLVED -> R.string.voting_resolved_title
        else -> R.string.voting_unavailable_title
    }
    val body = when {
        votePending -> R.string.voting_submitting_body
        recorded -> R.string.voting_recorded_body
        phase == ParticipantVotingPhase.NOT_OPEN -> R.string.voting_not_open_body
        phase == ParticipantVotingPhase.OPEN -> R.string.voting_open_body
        phase == ParticipantVotingPhase.CLOSED -> R.string.voting_closed_body
        phase == ParticipantVotingPhase.RESOLVED -> R.string.voting_resolved_body
        else -> R.string.voting_unavailable_body
    }
    CaseCard(stringResource(R.string.voting), emphasized = phase == ParticipantVotingPhase.OPEN) {
        Text(stringResource(title), style = MaterialTheme.typography.titleLarge)
        Text(stringResource(body), color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            stringResource(R.string.votes_cast, projection.votesCast),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (phase == ParticipantVotingPhase.OPEN && !recorded) {
            Column(
                Modifier.fillMaxWidth().selectableGroup(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                projection.voteTargets.forEach { target ->
                    val selected = selectedTarget == target.id
                    OutlinedButton(
                        onClick = { selectedTarget = target.id },
                        enabled = !votePending,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                            .semantics { this.selected = selected }
                            .testTag("vote_target_choice"),
                        colors = if (selected) {
                            ButtonDefaults.outlinedButtonColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            )
                        } else {
                            ButtonDefaults.outlinedButtonColors()
                        },
                        border = BorderStroke(
                            if (selected) 2.dp else 1.dp,
                            if (selected) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outline,
                        ),
                    ) { Text(target.name) }
                }
            }
            Button(
                onClick = {
                    selectedTarget?.let(controller::castVote)
                    selectedTarget = null
                },
                enabled = controller.canCastVote && selectedTarget != null && !votePending,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("cast_vote"),
            ) { Text(stringResource(R.string.cast_vote)) }
        }
    }
}

@Composable
private fun AppearancePicker(
    appearance: AppAppearance,
    onAppearance: (AppAppearance) -> Unit,
) {
    val fontScale = LocalConfiguration.current.fontScale
    CaseCard(stringResource(R.string.appearance)) {
        BoxWithConstraints(Modifier.fillMaxWidth()) {
            val stackOptions = maxWidth < 360.dp || fontScale >= 1.3f
            if (stackOptions) {
                Column(
                    Modifier.selectableGroup(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    AppAppearance.entries.forEach { option ->
                        AppearanceButton(option, appearance, onAppearance, Modifier.fillMaxWidth())
                    }
                }
            } else {
                Row(
                    Modifier.fillMaxWidth().selectableGroup(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    AppAppearance.entries.forEach { option ->
                        AppearanceButton(
                            option,
                            appearance,
                            onAppearance,
                            Modifier.weight(1f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AppearanceButton(
    option: AppAppearance,
    current: AppAppearance,
    onAppearance: (AppAppearance) -> Unit,
    modifier: Modifier,
) {
    val label = when (option) {
        AppAppearance.SYSTEM -> R.string.appearance_system
        AppAppearance.LIGHT -> R.string.appearance_light
        AppAppearance.DARK -> R.string.appearance_dark
    }
    OutlinedButton(
        onClick = { onAppearance(option) },
        modifier = modifier
            .heightIn(min = 48.dp)
            .semantics { selected = current == option }
            .testTag("appearance_option_${option.persistedValue}"),
        colors = if (current == option) {
            ButtonDefaults.outlinedButtonColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        } else {
            ButtonDefaults.outlinedButtonColors()
        },
    ) { Text(stringResource(label)) }
}

@Composable
private fun CaseCard(
    title: String,
    modifier: Modifier = Modifier,
    emphasized: Boolean = false,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (emphasized) MaterialTheme.colorScheme.surfaceVariant
            else MaterialTheme.colorScheme.surface,
        ),
        border = BorderStroke(
            if (emphasized) 1.5.dp else 1.dp,
            MaterialTheme.colorScheme.outline,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            content()
        }
    }
}

@Composable
private fun StatusCard(title: String, message: String) {
    Card(
        modifier = Modifier.fillMaxWidth().testTag("connection_status"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
            Box(
                Modifier
                    .padding(top = 4.dp)
                    .width(10.dp)
                    .height(10.dp)
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
private fun phaseTitle(phase: CompanionPhase): String = stringResource(
    when (phase) {
        CompanionPhase.MANUAL_REJOIN -> R.string.join_private_session
        CompanionPhase.JOINING -> R.string.joining
        CompanionPhase.WAITING_FOR_ASSIGNMENT -> R.string.waiting_for_assignment
        CompanionPhase.CONNECTED -> R.string.connected
        CompanionPhase.RECONNECTING -> R.string.reconnecting
        CompanionPhase.REJOINED -> R.string.rejoined
        CompanionPhase.EXPIRED_OR_REVOKED -> R.string.access_expired
        CompanionPhase.SESSION_ENDED -> R.string.session_ended
    },
)

@Composable
private fun privacyMessage(reason: PrivacyInterruption): String = stringResource(
    when (reason) {
        PrivacyInterruption.BACKGROUND_OR_LOCK -> R.string.privacy_background
        PrivacyInterruption.CONNECTION_UNCERTAIN -> R.string.privacy_uncertain
        PrivacyInterruption.MANUAL -> R.string.privacy_manual
    },
)

@Composable
private fun displayLanguage(tag: String): String {
    val interfaceLocale = LocalConfiguration.current.locales[0]
    val locale = Locale.forLanguageTag(tag)
    val display = locale.getDisplayName(interfaceLocale).trim()
    return if (display.isBlank()) tag else display.replaceFirstChar {
        if (it.isLowerCase()) it.titlecase(interfaceLocale) else it.toString()
    }
}
