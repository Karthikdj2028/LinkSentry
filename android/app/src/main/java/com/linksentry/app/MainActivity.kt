package com.linksentry.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.linksentry.app.data.repository.AuthRepository
import com.linksentry.app.data.repository.ScanRepository
import com.linksentry.app.ui.components.CyberBottomBar
import com.linksentry.app.ui.screens.auth.AuthScreen
import com.linksentry.app.ui.screens.dashboard.DashboardScreen
import com.linksentry.app.ui.screens.history.HistoryScreen
import com.linksentry.app.ui.screens.profile.ProfileScreen
import com.linksentry.app.ui.screens.scanner.ScannerScreen
import com.linksentry.app.ui.screens.splash.SplashScreen
import com.linksentry.app.ui.theme.CyberDarkBg
import com.linksentry.app.ui.theme.LinkSentryTheme

class MainActivity : ComponentActivity() {

    private val authRepository = AuthRepository()
    private val scanRepository = ScanRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            LinkSentryTheme {
                val navController = rememberNavController()
                val currentUser by authRepository.authStateFlow.collectAsState(initial = authRepository.currentUser)

                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route ?: "splash"

                val isAuthenticated = currentUser != null

                Scaffold(
                    containerColor = CyberDarkBg,
                    bottomBar = {
                        if (isAuthenticated && currentRoute in listOf("dashboard", "scanner", "history", "profile")) {
                            CyberBottomBar(
                                currentRoute = currentRoute,
                                onNavigate = { route ->
                                    navController.navigate(route) {
                                        popUpTo("dashboard") { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        NavHost(
                            navController = navController,
                            startDestination = "splash"
                        ) {
                            composable("splash") {
                                SplashScreen(
                                    onSplashComplete = {
                                        val dest = if (isAuthenticated) "dashboard" else "auth"
                                        navController.navigate(dest) {
                                            popUpTo("splash") { inclusive = true }
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
                                        navController.navigate("scanner?vector=$vector")
                                    }
                                )
                            }

                            composable("scanner") {
                                val uid = currentUser?.uid ?: ""
                                ScannerScreen(
                                    initialVector = "url",
                                    userId = uid,
                                    scanRepository = scanRepository
                                )
                            }

                            composable("scanner?vector={vector}") { backStackEntry ->
                                val vector = backStackEntry.arguments?.getString("vector") ?: "url"
                                val uid = currentUser?.uid ?: ""
                                ScannerScreen(
                                    initialVector = vector,
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
}
