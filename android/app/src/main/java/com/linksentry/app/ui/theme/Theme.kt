package com.linksentry.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = CyberCyan,
    onPrimary = CyberDarkBg,
    primaryContainer = CyberSurfaceLight,
    onPrimaryContainer = TextPrimary,
    secondary = CyberEmerald,
    onSecondary = CyberDarkBg,
    background = CyberDarkBg,
    onBackground = TextPrimary,
    surface = CyberSurface,
    onSurface = TextPrimary,
    surfaceVariant = CyberSurfaceLight,
    onSurfaceVariant = TextSecondary,
    error = CyberRed,
    onError = TextPrimary
)

@Composable
fun LinkSentryTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
