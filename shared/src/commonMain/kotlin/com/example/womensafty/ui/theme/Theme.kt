package com.example.womensafty.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Safety-First Color Palette
val CrimsonPrimary = Color(0xFFE11D48)       // Emergency red
val CrimsonDark = Color(0xFFBE123C)
val NavyDark = Color(0xFF0C1017)            // Deep protective background
val SurfaceDark = Color(0xFF161C26)         // Elevated surface
val SurfaceLight = Color(0xFFFFFFFF)
val TextDarkPrimary = Color(0xFFF1F5F9)
val TextDarkSecondary = Color(0xFF94A3B8)
val TextLightPrimary = Color(0xFF0F172A)
val TextLightSecondary = Color(0xFF64748B)

val AlertCritical = Color(0xFFE11D48)
val AlertMedium = Color(0xFFF59E0B)
val AlertSafe = Color(0xFF10B981)
val AccentBlue = Color(0xFF38BDF8)
val WarningAmber = Color(0xFFF59E0B)

private val DarkColorScheme = darkColorScheme(
    primary = CrimsonPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF4C0519),
    onPrimaryContainer = Color(0xFFFFE4E6),
    secondary = AccentBlue,
    onSecondary = Color(0xFF082F49),
    background = NavyDark,
    onBackground = TextDarkPrimary,
    surface = SurfaceDark,
    onSurface = TextDarkPrimary,
    surfaceVariant = Color(0xFF1E293B),
    onSurfaceVariant = TextDarkSecondary,
    error = AlertCritical,
    onError = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = CrimsonPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFE4E6),
    onPrimaryContainer = Color(0xFF881337),
    secondary = Color(0xFF0284C7),
    onSecondary = Color.White,
    background = Color(0xFFF8FAFC),
    onBackground = TextLightPrimary,
    surface = SurfaceLight,
    onSurface = TextLightPrimary,
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = TextLightSecondary,
    error = AlertCritical,
    onError = Color.White
)

@Composable
fun WomenSafetyTheme(
    darkTheme: Boolean = true, // Default to protective high-contrast dark theme
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
