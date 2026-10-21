package com.example.womensafty

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.womensafty.model.NavTab
import com.example.womensafty.state.AppState
import com.example.womensafty.ui.components.*
import com.example.womensafty.ui.screens.*
import com.example.womensafty.ui.theme.WomenSafetyTheme

@Composable
fun App(
    providedAppState: AppState? = null,
    onTriggerUpdate: ((apkUrl: String, versionName: String) -> Unit)? = null
) {
    val scope = rememberCoroutineScope()
    val appState = providedAppState ?: remember { AppState(scope) }

    WomenSafetyTheme(darkTheme = appState.isDarkTheme) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Global Demo Mode Warning Banner
                    DemoModeBanner(isDemo = appState.isDemoMode)

                    if (!appState.isAuthenticated) {
                        // Auth Flow
                        when (appState.currentScreen) {
                            "WELCOME" -> WelcomeScreen(
                                onNavigateLogin = { appState.currentScreen = "LOGIN" },
                                onNavigateRegister = { appState.currentScreen = "REGISTER" }
                            )
                            "REGISTER" -> RegisterScreen(
                                appState = appState,
                                onRegisterSuccess = { appState.currentScreen = "MAIN" },
                                onNavigateLogin = { appState.currentScreen = "LOGIN" }
                            )
                            else -> LoginScreen(
                                appState = appState,
                                onLoginSuccess = { appState.currentScreen = "MAIN" },
                                onNavigateRegister = { appState.currentScreen = "REGISTER" }
                            )
                        }
                    } else if (appState.isEmergencyActive) {
                        // High-Priority Emergency Active Screen
                        EmergencyStatusScreen(
                            appState = appState,
                            onCancelEmergency = {
                                appState.cancelActiveEmergency("User confirmed safe")
                            }
                        )
                    } else {
                        // Main Application Header
                        TopAppHeader(
                            onToggleTheme = { appState.isDarkTheme = !appState.isDarkTheme },
                            isDark = appState.isDarkTheme
                        )

                        // Screen Content Area
                        Box(modifier = Modifier.weight(1f)) {
                            when (appState.currentTab) {
                                NavTab.HOME -> HomeScreen(appState = appState)
                                NavTab.MAP -> SafeRouteScreen(appState = appState)
                                NavTab.ALERTS -> AlertHistoryScreen(appState = appState)
                                NavTab.CONTACTS -> TrustedContactsScreen(appState = appState)
                                NavTab.PROFILE -> ProfileAndSettingsScreen(appState = appState)
                            }
                        }

                        // Bottom Navigation Bar
                        BottomNavigationBar(
                            currentTab = appState.currentTab,
                            onTabSelected = { appState.currentTab = it }
                        )
                    }
                }

                // Modal Countdown Overlay on top of all views if active
                if (appState.isCountingDown) {
                    CountdownOverlay(
                        remainingSeconds = appState.countdownRemaining,
                        onCancel = { appState.cancelCountdown() },
                        onSendImmediately = { appState.triggerSos(immediate = true) }
                    )
                }

                // Disguised Fake Incoming Call Overlay on top of all views
                if (appState.isFakeCallActive) {
                    FakeCallOverlay(appState = appState)
                }

                // In-App Auto-Update Notification Dialog
                if (appState.showUpdateDialog && appState.availableUpdate != null) {
                    AppUpdateDialog(
                        updateInfo = appState.availableUpdate!!,
                        onDismiss = { appState.dismissUpdateDialog() },
                        onStartUpdate = { apkUrl ->
                            appState.isDownloadingUpdate = true
                            appState.updateStatusMessage = "Starting download from GitHub Releases..."
                            onTriggerUpdate?.invoke(apkUrl, appState.availableUpdate!!.latestVersionName)
                        },
                        isDownloading = appState.isDownloadingUpdate,
                        statusMessage = appState.updateStatusMessage
                    )
                }
            }
        }
    }
}

@Composable
fun TopAppHeader(
    onToggleTheme: () -> Unit,
    isDark: Boolean,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .background(Color(0xFFE11D48), androidx.compose.foundation.shape.CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "🛡️", fontSize = 16.sp)
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "ShaktiSense",
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp
                    )
                    Text(
                        text = "Explainable Multimodal Safety Framework",
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            IconButton(onClick = onToggleTheme) {
                Text(text = if (isDark) "☀️" else "🌙", fontSize = 16.sp)
            }
        }
    }
}