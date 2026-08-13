package com.linksentry.app.ui.screens.profile

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.api.ApiClient
import com.linksentry.app.data.repository.AuthRepository
import com.linksentry.app.ui.components.CyberBadge
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.components.CyberTopBar
import com.linksentry.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    authRepository: AuthRepository,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    val user = authRepository.currentUser
    val isPhysical = !ApiClient.isEmulator()

    var apiUrlInput by remember { mutableStateOf(ApiClient.getBaseUrl()) }
    var isProbing by remember { mutableStateOf(false) }
    var probeStatus by remember { mutableStateOf<String?>(null) }
    var probeSuccess by remember { mutableStateOf<Boolean?>(null) }
    var showAccountDetails by remember { mutableStateOf(false) }
    var showDevDiagnostics by remember { mutableStateOf(false) }

    // Probe initial connectivity on load
    LaunchedEffect(Unit) {
        isProbing = true
        val result = ApiClient.probeHealth()
        probeSuccess = result.isSuccess
        probeStatus = if (result.isSuccess) {
            "ONLINE – ${result.getOrNull()}"
        } else {
            result.exceptionOrNull()?.localizedMessage ?: "Unreachable"
        }
        isProbing = false
    }

    val handleSaveAndProbe = {
        focusManager.clearFocus()
        val sanitized = ApiClient.sanitizeUrl(apiUrlInput)
        apiUrlInput = sanitized
        ApiClient.setBaseUrl(sanitized)
        isProbing = true
        probeStatus = null
        probeSuccess = null

        coroutineScope.launch {
            val result = ApiClient.probeHealth()
            probeSuccess = result.isSuccess
            probeStatus = if (result.isSuccess) {
                "ONLINE – ${result.getOrNull()}"
            } else {
                result.exceptionOrNull()?.localizedMessage ?: "Unreachable"
            }
            isProbing = false
            Toast.makeText(
                context,
                if (result.isSuccess) "Endpoint Verified & Saved" else "Saved, but backend unreachable",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "LinkSentry Profile",
                subtitle = "IDENTITY & ENGINE CONFIGURATION"
            )
        },
        containerColor = CyberDarkBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .padding(horizontal = 14.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(modifier = Modifier.height(6.dp))

            // 1. PRIMARY USER ACCOUNT SECTION
            CyberCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(CyberCyan.copy(alpha = 0.15f))
                            .border(2.dp, CyberCyan, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = user?.email?.take(2)?.uppercase() ?: "LS",
                            color = CyberCyan,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = user?.email ?: "Security Operator",
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            CyberBadge(text = "ACTIVE / SECURED", color = CyberEmerald)
                            Text(
                                text = "v0.5.0",
                                color = TextMuted,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Expandable Advanced Account Details (Account ID / UID)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .clickable { showAccountDetails = !showAccountDetails }
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (showAccountDetails) "Hide Account Details" else "View Advanced Account Details",
                        color = CyberCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Icon(
                        imageVector = if (showAccountDetails) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                        contentDescription = null,
                        tint = CyberCyan,
                        modifier = Modifier.size(18.dp)
                    )
                }

                AnimatedVisibility(visible = showAccountDetails) {
                    Column {
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(CyberSurfaceLight)
                                .padding(10.dp)
                        ) {
                            Column {
                                Text(
                                    text = "FIREBASE USER ID (UID)",
                                    fontSize = 9.sp,
                                    color = TextSecondary,
                                    fontFamily = FontFamily.Monospace
                                )
                                Spacer(modifier = Modifier.height(3.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = user?.uid ?: "N/A",
                                        color = CyberCyan,
                                        fontSize = 11.sp,
                                        fontFamily = FontFamily.Monospace,
                                        modifier = Modifier.weight(1f),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Icon(
                                        imageVector = Icons.Filled.ContentCopy,
                                        contentDescription = "Copy UID",
                                        tint = TextMuted,
                                        modifier = Modifier
                                            .size(16.dp)
                                            .clickable {
                                                user?.uid?.let {
                                                    clipboardManager.setText(AnnotatedString(it))
                                                    Toast.makeText(context, "UID copied to clipboard", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Sign Out Action Button
                OutlinedButton(
                    onClick = {
                        authRepository.signOut()
                        onSignOut()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(42.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = CyberRed),
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(CyberRed.copy(alpha = 0.6f))),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                        contentDescription = "Sign Out",
                        tint = CyberRed,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("SIGN OUT OF SESSION", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }
            }

            // 2. ADVANCED DEVELOPER DIAGNOSTICS & ENGINE SETTINGS (COLLAPSIBLE / DISTINCT)
            CyberCard(
                borderColor = CyberCyan.copy(alpha = 0.35f),
                backgroundColor = CyberSurface
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showDevDiagnostics = !showDevDiagnostics },
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "DEVELOPER DIAGNOSTICS & API",
                            style = MaterialTheme.typography.labelSmall,
                            color = CyberCyan
                        )
                        Text(
                            text = "FastAPI endpoints, hardware runtime & LAN discovery",
                            color = TextMuted,
                            fontSize = 10.sp
                        )
                    }
                    Icon(
                        imageVector = if (showDevDiagnostics) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                        contentDescription = null,
                        tint = CyberCyan,
                        modifier = Modifier.size(20.dp)
                    )
                }

                AnimatedVisibility(visible = showDevDiagnostics) {
                    Column {
                        Spacer(modifier = Modifier.height(10.dp))

                        // Hardware Runtime Banner
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Client Hardware Runtime:",
                                color = TextSecondary,
                                fontSize = 11.sp
                            )
                            CyberBadge(
                                text = if (isPhysical) "PHYSICAL DEVICE" else "ANDROID EMULATOR",
                                color = if (isPhysical) CyberCyan else CyberAmber
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Base API URL Input
                        Text(
                            text = "FASTAPI BACKEND URL",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))

                        OutlinedTextField(
                            value = apiUrlInput,
                            onValueChange = { apiUrlInput = it },
                            placeholder = { Text("http://<PC-LAN-IP>:8000", color = TextMuted, fontSize = 12.sp) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Uri,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = { handleSaveAndProbe() }
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = CyberCyan,
                                unfocusedBorderColor = CyberBorder,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // Quick Presets (PC LAN vs 10.0.2.2 Emulator Only)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            PresetButton(
                                label = "PC LAN (192.168.29.123)",
                                onClick = {
                                    apiUrlInput = "http://192.168.29.123:8000"
                                    handleSaveAndProbe()
                                },
                                modifier = Modifier.weight(1f)
                            )

                            if (!isPhysical) {
                                PresetButton(
                                    label = "10.0.2.2 [EMU ONLY]",
                                    onClick = {
                                        apiUrlInput = "http://10.0.2.2:8000"
                                        handleSaveAndProbe()
                                    },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Probe Diagnostic Status
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Live Health Probe:",
                                color = TextSecondary,
                                fontSize = 11.sp
                            )
                            if (isProbing) {
                                CircularProgressIndicator(color = CyberCyan, modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                            } else {
                                CyberBadge(
                                    text = if (probeSuccess == true) "HEALTH OK" else "PROBE FAILED",
                                    color = if (probeSuccess == true) CyberEmerald else CyberRed
                                )
                            }
                        }

                        probeStatus?.let { status ->
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = status,
                                color = if (probeSuccess == true) CyberEmerald else CyberRedLight,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Button(
                            onClick = { handleSaveAndProbe() },
                            enabled = !isProbing,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(40.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberDarkBg),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Filled.NetworkCheck, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("SAVE & TEST CONNECTIVITY", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun PresetButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(CyberSurfaceLight)
            .border(1.dp, CyberBorderSubtle, RoundedCornerShape(6.dp))
            .clickable { onClick() }
            .padding(vertical = 6.dp, horizontal = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = CyberCyan,
            fontSize = 9.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            softWrap = false
        )
    }
}
