package com.guiltyparty.companion

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.SideEffect

class MainActivity : ComponentActivity() {
    private lateinit var controller: CompanionController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        controller = CompanionController(applicationContext)
        setContent {
            val snapshot = controller.snapshot
            SideEffect {
                if (snapshot.hasActiveSession) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    setRecentsScreenshotEnabled(false)
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    setRecentsScreenshotEnabled(true)
                }
            }
            GuiltyPartyTheme {
                CompanionApp(controller)
            }
        }
    }

    override fun onStart() {
        super.onStart()
        if (::controller.isInitialized) controller.setAppActive(true)
    }

    override fun onStop() {
        if (::controller.isInitialized) controller.setAppActive(false)
        super.onStop()
    }

    override fun onDestroy() {
        if (::controller.isInitialized) controller.dispose()
        super.onDestroy()
    }
}
