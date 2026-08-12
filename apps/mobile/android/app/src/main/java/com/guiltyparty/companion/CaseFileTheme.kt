package com.guiltyparty.companion

import android.content.Context
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

enum class AppAppearance(val persistedValue: String) {
    SYSTEM("system"),
    LIGHT("light"),
    DARK("dark");

    companion object {
        fun load(context: Context): AppAppearance {
            val value = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getString(APPEARANCE_KEY, SYSTEM.persistedValue)
            return entries.firstOrNull { it.persistedValue == value } ?: SYSTEM
        }

        fun save(context: Context, appearance: AppAppearance) {
            context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(APPEARANCE_KEY, appearance.persistedValue)
                .apply()
        }

        private const val PREFERENCES_NAME = "display-preferences"
        private const val APPEARANCE_KEY = "appearance"
    }
}

private val LightCaseColors = lightColorScheme(
    primary = Color(0xFF6E1F42),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFF4E8DC),
    onPrimaryContainer = Color(0xFF241A20),
    secondary = Color(0xFF675A60),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFECE2E5),
    onSecondaryContainer = Color(0xFF241A20),
    tertiary = Color(0xFF795016),
    onTertiary = Color(0xFFFFFFFF),
    background = Color(0xFFF7F1E8),
    onBackground = Color(0xFF241A20),
    surface = Color(0xFFFFFDFC),
    onSurface = Color(0xFF241A20),
    surfaceVariant = Color(0xFFF4E8DC),
    onSurfaceVariant = Color(0xFF675A60),
    outline = Color(0xFF8C7C82),
    error = Color(0xFF8C1D36),
    onError = Color.White,
)

private val DarkCaseColors = darkColorScheme(
    primary = Color(0xFFD68AB0),
    onPrimary = Color(0xFF3D0B25),
    primaryContainer = Color(0xFF3A2532),
    onPrimaryContainer = Color(0xFFF6EDE6),
    secondary = Color(0xFFC7B7BC),
    onSecondary = Color(0xFF2C2028),
    secondaryContainer = Color(0xFF352932),
    onSecondaryContainer = Color(0xFFF6EDE6),
    tertiary = Color(0xFFE0BC72),
    onTertiary = Color(0xFF382800),
    background = Color(0xFF171117),
    onBackground = Color(0xFFF6EDE6),
    surface = Color(0xFF211922),
    onSurface = Color(0xFFF6EDE6),
    surfaceVariant = Color(0xFF2C2028),
    onSurfaceVariant = Color(0xFFC7B7BC),
    outline = Color(0xFF8B747E),
    error = Color(0xFFFFB2BD),
    onError = Color(0xFF561121),
)

private val CaseTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 48.sp,
        lineHeight = 54.sp,
    ),
    displaySmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 36.sp,
        lineHeight = 42.sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 32.sp,
        lineHeight = 38.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 27.sp,
        lineHeight = 33.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
    ),
)

@Composable
fun GuiltyPartyTheme(
    appearance: AppAppearance = AppAppearance.SYSTEM,
    content: @Composable () -> Unit,
) {
    val dark = when (appearance) {
        AppAppearance.SYSTEM -> isSystemInDarkTheme()
        AppAppearance.LIGHT -> false
        AppAppearance.DARK -> true
    }
    MaterialTheme(
        colorScheme = if (dark) DarkCaseColors else LightCaseColors,
        typography = CaseTypography,
        content = content,
    )
}
