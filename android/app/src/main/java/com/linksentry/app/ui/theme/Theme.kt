package com.linksentry.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

private val DarkColorScheme = darkColorScheme(
    primary = CyberCyan,
    onPrimary = CyberDarkBg,
    primaryContainer = CyberDarkSurfaceLight,
    onPrimaryContainer = TextDarkPrimary,
    secondary = CyberEmerald,
    onSecondary = CyberDarkBg,
    background = CyberDarkBg,
    onBackground = TextDarkPrimary,
    surface = CyberDarkSurface,
    onSurface = TextDarkPrimary,
    surfaceVariant = CyberDarkSurfaceLight,
    onSurfaceVariant = TextDarkSecondary,
    error = CyberRed,
    onError = TextDarkPrimary
)

private val LightColorScheme = lightColorScheme(
    primary = CyberCyanLight,
    onPrimary = CyberLightSurface,
    primaryContainer = CyberLightSurfaceLight,
    onPrimaryContainer = TextLightPrimary,
    secondary = CyberEmeraldDark,
    onSecondary = CyberLightSurface,
    background = CyberLightBg,
    onBackground = TextLightPrimary,
    surface = CyberLightSurface,
    onSurface = TextLightPrimary,
    surfaceVariant = CyberLightSurfaceLight,
    onSurfaceVariant = TextLightSecondary,
    error = CyberRedDark,
    onError = CyberLightSurface
)

@Composable
fun LinkSentryTheme(
    themeMode: String = "system",
    content: @Composable () -> Unit
) {
    val systemInDark = isSystemInDarkTheme()
    val isDark = when (themeMode) {
        "light" -> false
        "dark" -> true
        else -> systemInDark
    }

    val colorScheme = if (isDark) DarkColorScheme else LightColorScheme

    val appColors = if (isDark) {
        LinkSentryColors(
            isDark = true,
            background = CyberDarkBg,
            surface = CyberDarkSurface,
            surfaceLight = CyberDarkSurfaceLight,
            border = CyberDarkBorder,
            borderSubtle = CyberDarkBorderSubtle,
            textPrimary = TextDarkPrimary,
            textSecondary = TextDarkSecondary,
            textMuted = TextDarkMuted,
            brandAccent = CyberCyan,
            safe = CyberEmerald,
            suspicious = CyberAmber,
            phishing = CyberRed
        )
    } else {
        LinkSentryColors(
            isDark = false,
            background = CyberLightBg,
            surface = CyberLightSurface,
            surfaceLight = CyberLightSurfaceLight,
            border = CyberLightBorder,
            borderSubtle = CyberLightBorderSubtle,
            textPrimary = TextLightPrimary,
            textSecondary = TextLightSecondary,
            textMuted = TextLightMuted,
            brandAccent = CyberCyanLight,
            safe = CyberEmeraldDark,
            suspicious = CyberAmberDark,
            phishing = CyberRedDark
        )
    }

    val view = androidx.compose.ui.platform.LocalView.current
    if (!view.isInEditMode) {
        androidx.compose.runtime.SideEffect {
            val window = (view.context as? android.app.Activity)?.window
            if (window != null) {
                val insetsController = androidx.core.view.WindowCompat.getInsetsController(window, view)
                insetsController.isAppearanceLightStatusBars = !isDark
                insetsController.isAppearanceLightNavigationBars = !isDark
            }
        }
    }

    CompositionLocalProvider(LocalAppColors provides appColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
