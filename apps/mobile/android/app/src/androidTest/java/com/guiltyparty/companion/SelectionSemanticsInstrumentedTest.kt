package com.guiltyparty.companion

import android.view.View
import android.view.ViewGroup
import androidx.activity.compose.setContent
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsOwner
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class SelectionSemanticsInstrumentedTest {
    @Test
    fun voteAndAppearanceChoicesPublishTheirSelectedState() {
        ActivityScenario.launch(UiTestActivity::class.java).use { scenario ->
            val composed = CountDownLatch(1)
            val selectionsUpdated = CountDownLatch(1)
            var controller: CompanionController? = null
            scenario.onActivity { activity ->
                controller = CompanionController(
                    activity.applicationContext,
                    credentialStore = EmptyCredentialStore,
                )
                activity.setContent {
                    GuiltyPartyTheme {
                        var appearance by remember { mutableStateOf(AppAppearance.SYSTEM) }
                        SessionScreen(
                            snapshot(),
                            requireNotNull(controller),
                            appearance = appearance,
                            onAppearance = { appearance = it },
                        )
                        SideEffect {
                            composed.countDown()
                            if (appearance == AppAppearance.DARK) selectionsUpdated.countDown()
                        }
                    }
                }
            }

            check(composed.await(10, TimeUnit.SECONDS)) { "Compose semantics did not settle" }
            scenario.onActivity { activity ->
                val nodes = semanticsNodes(activity.window.decorView)
                val votes = nodes.filter { it.testTag() == "vote_target_choice" }
                assertTrue(votes.size == 2)
                assertFalse(votes[0].selected())
                assertTrue(votes[0].click())

                assertTrue(node(nodes, "appearance_option_system").selected())
                assertFalse(node(nodes, "appearance_option_dark").selected())
                assertTrue(node(nodes, "appearance_option_dark").click())
            }

            check(selectionsUpdated.await(10, TimeUnit.SECONDS)) {
                "Compose selection semantics did not update"
            }
            InstrumentationRegistry.getInstrumentation().waitForIdleSync()
            scenario.onActivity { activity ->
                val nodes = semanticsNodes(activity.window.decorView)
                val votes = nodes.filter { it.testTag() == "vote_target_choice" }
                assertTrue(votes[0].selected())
                assertFalse(votes[1].selected())
                assertTrue(node(nodes, "appearance_option_dark").selected())
                assertFalse(node(nodes, "appearance_option_system").selected())
                controller?.dispose()
            }
        }
    }

    private fun semanticsNodes(root: View): List<SemanticsNode> {
        val composeView = descendants(root).first {
            it.javaClass.name == "androidx.compose.ui.platform.AndroidComposeView"
        }
        val owner = composeView.javaClass.getMethod("getSemanticsOwner").invoke(composeView)
            as SemanticsOwner
        return flatten(owner.rootSemanticsNode)
    }

    private fun descendants(view: View): Sequence<View> = sequence {
        yield(view)
        if (view is ViewGroup) {
            for (index in 0 until view.childCount) {
                yieldAll(descendants(view.getChildAt(index)))
            }
        }
    }

    private fun flatten(node: SemanticsNode): List<SemanticsNode> =
        listOf(node) + node.children.flatMap(::flatten)

    private fun node(nodes: List<SemanticsNode>, tag: String): SemanticsNode =
        nodes.single { it.testTag() == tag }

    private fun SemanticsNode.testTag(): String? =
        if (config.contains(SemanticsProperties.TestTag)) config[SemanticsProperties.TestTag] else null

    private fun SemanticsNode.selected(): Boolean =
        config.contains(SemanticsProperties.Selected) && config[SemanticsProperties.Selected]

    private fun SemanticsNode.click(): Boolean =
        config[SemanticsActions.OnClick].action?.invoke() == true

    private fun snapshot() = UiSnapshot(
        phase = CompanionPhase.CONNECTED,
        projection = ParticipantProjection(
            scenarioTitle = "The Synthetic Artifact",
            gameplayLanguage = "en",
            assignedCharacter = "Curator",
            privateObjective = "Synthetic private objective",
            clues = emptyList(),
            scene = ProjectedScene("Arrival", "Synthetic public narrative"),
            votingPhase = ParticipantVotingPhase.OPEN,
            voteTargets = listOf(
                ProjectedVoteTarget("character-curator", "Curator"),
                ProjectedVoteTarget("character-collector", "Collector"),
            ),
            ownVoteRecorded = false,
            votesCast = 0,
            publicOutcome = null,
        ),
    )

    private data object EmptyCredentialStore : ResumeCredentialStore {
        override fun load(): StoredResumeCredential? = null
        override fun save(credential: StoredResumeCredential) = Unit
        override fun delete() = Unit
    }
}
