package com.linksentry.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.api.ApiClient
import com.linksentry.app.data.repository.AuthRepository
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.components.CyberTopBar
import com.linksentry.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    authRepository: AuthRepository,
    onSignOut: () -> Unit
) {
    val user = authRepository.currentUser
    val clipboardManager = LocalClipboardManager.current
    val coroutineScope = rememberCoroutineScope()

    var apiUrlInput by remember { mutableStateOf(ApiClient.getBaseUrl()) }
    var backendHealthStatus by remember { mutableStateOf<String?>("Checking...") }
    var showUrlSaveNotice by remember { mutableStateOf(false) }

    val testHealth = {
        coroutineScope.launch {
            try {
                val res = ApiClient.service.getHealth()
                if (res.isSuccessful && res.body() != null) {
                    backendHealthStatus = "ONLINE (v${res.body()!!.version})"
                } else {
                    backendHealthStatus = "OFFLINE (${res.code()})"
                }
            } catch (e: Exception) {
                backendHealthStatus = "UNREACHABLE"
            }
        }
    }

    LaunchedEffect(Unit) {
        testHealth()
    }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "Analyst Profile",
                subtitle = "IDENTITY & ENGINE CONFIGURATION"
            )
        },
        containerColor = CyberDarkBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // User Identity Card
            CyberCard {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(CyberCyan.copy(alpha = 0.15f))
                            .border(2.dp, CyberCyan, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (user?.email?.take(2) ?: "LS").uppercase(),
                            color = CyberCyan,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    }

                    Column {
                        Text(
                            text = user?.email ?: "Analyst",
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "FIREBASE AUTHENTICATED",
                            color = CyberEmerald,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Firebase UID Display (matches Web)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(CyberSurfaceLight)
                        .padding(12.dp)
                ) {
                    Text(
                        text = "FIREBASE USER ID (UID)",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = user?.uid ?: "N/A",
                            color = CyberCyan,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            maxLines = 1,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = {
                                if (user?.uid != null) {
                                    clipboardManager.setText(AnnotatedString(user.uid))
                                }
                            },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(Icons.Filled.ContentCopy, contentDescription = "Copy UID", tint = CyberCyan, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }

            // Backend Endpoint Configuration Card
            CyberCard {
                Text(
                    text = "THREAT BACKEND ENDPOINT",
                    style = MaterialTheme.typography.labelSmall,
                    color = CyberCyan
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Configure FastAPI backend host (Emulator: 10.0.2.2:8000, Device: LAN / ngrok).",
                    color = TextSecondary,
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = apiUrlInput,
                    onValueChange = { apiUrlInput = it },
                    label = { Text("Base API URL", color = TextSecondary) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CyberCyan,
                        unfocusedBorderColor = CyberBorder,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("Status:", color = TextMuted, fontSize = 11.sp)
                        Text(
                            text = backendHealthStatus ?: "Unknown",
                            color = if (backendHealthStatus?.startsWith("ONLINE") == true) CyberEmerald else CyberRed,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Button(
                        onClick = {
                            ApiClient.setBaseUrl(apiUrlInput.trim())
                            showUrlSaveNotice = true
                            testHealth()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CyberCyan),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text("Save & Probe", color = CyberDarkBg, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }

            // Sign Out Button
            Button(
                onClick = {
                    authRepository.signOut()
                    onSignOut()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CyberSurfaceLight),
                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(CyberRed.copy(alpha = 0.5f))),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Filled.Logout, contentDescription = "Logout", tint = CyberRed, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out of LinkSentry", color = CyberRed, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
