package com.guiltyparty.companion

import androidx.activity.compose.setContent
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class AdaptiveLayoutInstrumentedTest {
    @Test
    fun realComposeSessionSelectsLayoutForCurrentPhoneOrTabletWidth() {
        ActivityScenario.launch(UiTestActivity::class.java).use { scenario ->
            val observed = AtomicReference<SessionLayout>()
            val composed = CountDownLatch(1)
            var controller: CompanionController? = null
            scenario.onActivity { activity ->
                controller = CompanionController(
                    activity.applicationContext,
                    credentialStore = EmptyCredentialStore,
                )
                activity.setContent {
                    GuiltyPartyTheme {
                        SessionScreen(snapshot(), requireNotNull(controller)) { layout ->
                            observed.set(layout)
                            composed.countDown()
                        }
                    }
                }
            }

            check(composed.await(10, TimeUnit.SECONDS)) { "Compose layout did not settle" }
            var widthDp = 0
            scenario.onActivity { activity -> widthDp = activity.resources.configuration.screenWidthDp }
            val expected = if (widthDp >= 840) SessionLayout.EXPANDED else SessionLayout.COMPACT
            assertEquals(expected, observed.get())
            scenario.onActivity { controller?.dispose() }
        }
    }

    private fun snapshot() = UiSnapshot(
        phase = CompanionPhase.CONNECTED,
        statusMessage = "Synthetic private view is current.",
        projection = ParticipantProjection(
            scenarioTitle = "The Synthetic Artifact",
            gameplayLanguage = "en",
            assignedCharacter = "Curator",
            privateObjective = "Synthetic private objective",
            clues = listOf(ProjectedClue("clue-1", "Folded Note", "Synthetic clue")),
            scene = ProjectedScene("Arrival", "Synthetic public narrative"),
            votingPhase = ParticipantVotingPhase.OPEN,
            voteTargets = listOf(ProjectedVoteTarget("character-suspect", "The Archivist")),
            ownVoteRecorded = false,
            votesCast = 1,
            publicOutcome = null,
        ),
    )

    private data object EmptyCredentialStore : ResumeCredentialStore {
        override fun load(): StoredResumeCredential? = null
        override fun save(credential: StoredResumeCredential) = Unit
        override fun delete() = Unit
    }
}
