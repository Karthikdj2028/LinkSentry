package com.linksentry.app.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Base Brand Status Colors (High Contrast & Universal)
val CyberCyan = Color(0xFF06B6D4)
val CyberCyanLight = Color(0xFF0284C7)
val CyberEmerald = Color(0xFF10B981)
val CyberEmeraldDark = Color(0xFF059669)
val CyberAmber = Color(0xFFF59E0B)
val CyberAmberDark = Color(0xFFD97706)
val CyberRed = Color(0xFFEF4444)
val CyberRedDark = Color(0xFFDC2626)
val CyberPurple = Color(0xFF8B5CF6)
val CyberPurpleDark = Color(0xFF7C3AED)

// Dark Theme Surfaces & Text
val CyberDarkBg = Color(0xFF090D16)
val CyberDarkSurface = Color(0xFF0F172A)
val CyberDarkSurfaceLight = Color(0xFF1E293B)
val CyberDarkBorder = Color(0xFF334155)
val CyberDarkBorderSubtle = Color(0xFF1E293B)
val TextDarkPrimary = Color(0xFFF8FAFC)
val TextDarkSecondary = Color(0xFF94A3B8)
val TextDarkMuted = Color(0xFF64748B)

// Light Theme Surfaces & Text
val CyberLightBg = Color(0xFFF8FAFC)
val CyberLightSurface = Color(0xFFFFFFFF)
val CyberLightSurfaceLight = Color(0xFFF1F5F9)
val CyberLightBorder = Color(0xFFCBD5E1)
val CyberLightBorderSubtle = Color(0xFFE2E8F0)
val TextLightPrimary = Color(0xFF0F172A)
val TextLightSecondary = Color(0xFF475569)
val TextLightMuted = Color(0xFF94A3B8)

// Backward Compatibility Aliases
val CyberSurface = CyberDarkSurface
val CyberSurfaceLight = CyberDarkSurfaceLight
val CyberBorder = CyberDarkBorder
val CyberBorderSubtle = CyberDarkBorderSubtle
val TextPrimary = TextDarkPrimary
val TextSecondary = TextDarkSecondary
val TextMuted = TextDarkMuted

@Immutable
data class LinkSentryColors(
    val isDark: Boolean,
    val background: Color,
    val surface: Color,
    val surfaceLight: Color,
    val border: Color,
    val borderSubtle: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val brandAccent: Color,
    val safe: Color,
    val suspicious: Color,
    val phishing: Color,
    val malware: Color = CyberRedDark,
    val defacement: Color = CyberPurple,
    val info: Color = CyberCyan
)

val LocalAppColors = staticCompositionLocalOf {
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
        phishing = CyberRed,
        malware = CyberRedDark,
        defacement = CyberPurple,
        info = CyberCyan
    )
}
