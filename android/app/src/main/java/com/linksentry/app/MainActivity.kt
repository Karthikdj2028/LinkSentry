package com.linksentry.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.linksentry.app.data.preferences.AppPreferences
import com.linksentry.app.data.repository.AuthRepository
import com.linksentry.app.data.repository.ScanRepository
import com.linksentry.app.ui.components.CyberBottomBar
import com.linksentry.app.ui.screens.auth.AuthScreen
import com.linksentry.app.ui.screens.dashboard.DashboardScreen
import com.linksentry.app.ui.screens.history.HistoryScreen
import com.linksentry.app.ui.screens.profile.ProfileScreen
import com.linksentry.app.ui.screens.scanner.ScannerScreen
import com.linksentry.app.ui.screens.splash.SplashScreen
import com.linksentry.app.ui.theme.LinkSentryTheme
import com.linksentry.app.ui.theme.LocalAppColors

class MainActivity : ComponentActivity() {

    private val authRepository = AuthRepository()
    private val scanRepository = ScanRepository()
    private val incomingTextPayload = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        handleIncomingIntent(intent)

        setContent {
            val themeMode by AppPreferences.themeModeFlow.collectAsState()

            LinkSentryTheme(themeMode = themeMode) {
                val colors = LocalAppColors.current
                val navController = rememberNavController()
                val currentUser by authRepository.authStateFlow.collectAsState(initial = authRepository.currentUser)
                val activePayload by incomingTextPayload

                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val rawRoute = navBackStackEntry?.destination?.route ?: "splash"
                val currentBaseRoute = rawRoute.substringBefore("?")

                val isAuthenticated = currentUser != null
                val isMainDestination = isAuthenticated && currentBaseRoute in listOf("dashboard", "scanner", "history", "profile")

                // Pre-start scan sync at Activity level as soon as user is authenticated
                LaunchedEffect(currentUser) {
                    currentUser?.uid?.let { uid ->
                        if (uid.isNotBlank()) {
                            scanRepository.startSync(uid)
                        }
                    }
                }

                // Handle incoming shared / processed text (cold start & warm resume)
                LaunchedEffect(activePayload, isAuthenticated) {
                    val rawText = activePayload
                    if (isAuthenticated && !rawText.isNullOrBlank()) {
                        val isUrl = rawText.startsWith("http://", ignoreCase = true) ||
                                rawText.startsWith("https://", ignoreCase = true) ||
                                (rawText.contains(".") && !rawText.contains(" "))
                        val vec = if (isUrl) "url" else "message"
                        val encoded = android.net.Uri.encode(rawText)
                        navController.navigate("scanner?vector=$vec&input=$encoded") {
                            launchSingleTop = true
                        }
                        incomingTextPayload.value = null
                    }
                }

                Scaffold(
                    containerColor = colors.background,
                    contentWindowInsets = WindowInsets(0, 0, 0, 0),
                    bottomBar = {
                        if (isMainDestination) {
                            CyberBottomBar(
                                currentRoute = currentBaseRoute,
                                onNavigate = { targetRoute ->
                                    if (currentBaseRoute != targetRoute) {
                                        navController.navigate(targetRoute) {
                                            popUpTo(navController.graph.findStartDestination().id) {
                                                saveState = true
                                            }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(colors.background)
                            .padding(innerPadding)
                    ) {
                        NavHost(
                            navController = navController,
                            startDestination = "splash"
                        ) {
                            composable("splash") {
                                SplashScreen(
                                    onSplashComplete = {
                                        if (isAuthenticated) {
                                            navController.navigate("dashboard") {
                                                popUpTo("splash") { inclusive = true }
                                            }
                                        } else {
                                            navController.navigate("auth") {
                                                popUpTo("splash") { inclusive = true }
                                            }
                                        }
                                    }
                                )
                            }

                            composable("auth") {
                                AuthScreen(
                                    authRepository = authRepository,
                                    onAuthSuccess = {
                                        navController.navigate("dashboard") {
                                            popUpTo("auth") { inclusive = true }
                                        }
                                    }
                                )
                            }

                            composable("dashboard") {
                                val uid = currentUser?.uid ?: ""
                                DashboardScreen(
                                    userId = uid,
                                    scanRepository = scanRepository,
                                    onNavigateToScanner = { vector ->
                                        navController.navigate("scanner?vector=$vector") {
                                            launchSingleTop = true
                                        }
                                    }
                                )
                            }

                            composable("scanner") {
                                val uid = currentUser?.uid ?: ""
                                ScannerScreen(
                                    initialVector = "url",
                                    initialInput = activePayload ?: "",
                                    userId = uid,
                                    scanRepository = scanRepository
                                )
                            }

                            composable("scanner?vector={vector}") { backStackEntry ->
                                val vector = backStackEntry.arguments?.getString("vector") ?: "url"
                                val input = backStackEntry.arguments?.getString("input") ?: (activePayload ?: "")
                                val uid = currentUser?.uid ?: ""
                                ScannerScreen(
                                    initialVector = vector,
                                    initialInput = input,
                                    userId = uid,
                                    scanRepository = scanRepository
                                )
                            }

                            composable("scanner?vector={vector}&input={input}") { backStackEntry ->
                                val vector = backStackEntry.arguments?.getString("vector") ?: "url"
                                val input = backStackEntry.arguments?.getString("input") ?: (activePayload ?: "")
                                val uid = currentUser?.uid ?: ""
                                ScannerScreen(
                                    initialVector = vector,
                                    initialInput = input,
                                    userId = uid,
                                    scanRepository = scanRepository
                                )
                            }

                            composable("history") {
                                val uid = currentUser?.uid ?: ""
                                HistoryScreen(
                                    userId = uid,
                                    scanRepository = scanRepository
                                )
                            }

                            composable("profile") {
                                ProfileScreen(
                                    authRepository = authRepository,
                                    onSignOut = {
                                        navController.navigate("auth") {
                                            popUpTo(0) { inclusive = true }
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingIntent(intent)
    }

    private fun handleIncomingIntent(intent: Intent?) {
        if (intent == null) return

        // 1. Handle ACTION_PROCESS_TEXT (Text Selection Context Menu)
        if (intent.action == Intent.ACTION_PROCESS_TEXT && intent.type == "text/plain") {
            val processed = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()
            if (!processed.isNullOrBlank()) {
                incomingTextPayload.value = processed.trim()
                return
            }
        }

        // 2. Handle ACTION_SEND (Share Target)
        if (intent.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            val text = intent.getStringExtra(Intent.EXTRA_TEXT)
                ?: intent.getStringExtra(Intent.EXTRA_SUBJECT)
            if (!text.isNullOrBlank()) {
                incomingTextPayload.value = text.trim()
            }
        }
    }
}
