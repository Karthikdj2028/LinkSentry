package com.linksentry.app.ui.screens.profile

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import com.linksentry.app.data.preferences.AppPreferences
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
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    val user = authRepository.currentUser

    // Preferences state
    val themeMode by AppPreferences.themeModeFlow.collectAsState()
    val realtimeProtection by AppPreferences.realtimeProtectionFlow.collectAsState()
    val cloudSync by AppPreferences.cloudSyncFlow.collectAsState()
    val clipboardDetection by AppPreferences.clipboardDetectionFlow.collectAsState()

    var apiUrlInput by remember { mutableStateOf(ApiClient.getBaseUrl()) }
    var isProbing by remember { mutableStateOf(false) }
    var probeResult by remember { mutableStateOf<com.linksentry.app.data.api.BackendProbeResult?>(null) }
    var showDevDiagnostics by rememberSaveable { mutableStateOf(false) }
    var showAccountDetails by rememberSaveable { mutableStateOf(false) }
    var showHelpAndSupport by rememberSaveable { mutableStateOf(false) }
    var showFeedbackSheet by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        isProbing = true
        probeResult = ApiClient.probeDetailedHealth()
        isProbing = false
    }

    val handleSaveAndProbe = {
        focusManager.clearFocus()
        val normResult = ApiClient.validateAndNormalizeUrl(apiUrlInput)
        if (normResult.isFailure) {
            val err = normResult.exceptionOrNull()?.message ?: "Invalid backend URL"
            Toast.makeText(context, err, Toast.LENGTH_SHORT).show()
        } else {
            val normalized = normResult.getOrThrow()
            apiUrlInput = normalized
            ApiClient.setBaseUrl(normalized)
            isProbing = true
            probeResult = null

            coroutineScope.launch {
                val result = ApiClient.probeDetailedHealth()
                probeResult = result
                isProbing = false
                Toast.makeText(
                    context,
                    if (result.isSuccess) "Backend verified: ${result.modelVersion ?: "Online"}" else "Saved, but probe failed",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "Profile",
                subtitle = "Account & settings"
            )
        },
        containerColor = colors.background
    ) { padding ->
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            val isNarrow = maxWidth < 360.dp
            val horizontalPadding = if (isNarrow) 12.dp else 16.dp

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .align(Alignment.TopCenter)
                    .widthIn(max = 640.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = horizontalPadding),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Spacer(modifier = Modifier.height(2.dp))

                // 1. User Profile Header Card
                CyberCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(colors.brandAccent.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = user?.email?.take(2)?.uppercase() ?: "LS",
                                color = colors.brandAccent,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = user?.email ?: "User Account",
                                color = colors.textPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                CyberBadge(verdict = "safe")
                                Text(
                                    text = "v0.5.0",
                                    color = colors.textMuted,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { showAccountDetails = !showAccountDetails }
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (showAccountDetails) "Hide Account UID" else "View Account UID",
                            color = colors.brandAccent,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Icon(
                            imageVector = if (showAccountDetails) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = null,
                            tint = colors.brandAccent,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    AnimatedVisibility(visible = showAccountDetails) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "User ID: ${user?.uid ?: "N/A"}",
                                    color = colors.textSecondary,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = "Copy",
                                    color = colors.brandAccent,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.clickable {
                                        clipboardManager.setText(AnnotatedString(user?.uid ?: ""))
                                        Toast.makeText(context, "User ID copied", Toast.LENGTH_SHORT).show()
                                    }
                                )
                            }
                        }
                    }
                }

                // 2. Appearance / Theme Selector
                CyberCard {
                    Text(
                        text = "Appearance",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ThemeOptionButton(
                            label = "System",
                            icon = Icons.Filled.SettingsBrightness,
                            isSelected = themeMode == "system",
                            onClick = { AppPreferences.setThemeMode("system") },
                            modifier = Modifier.weight(1f)
                        )
                        ThemeOptionButton(
                            label = "Light",
                            icon = Icons.Filled.LightMode,
                            isSelected = themeMode == "light",
                            onClick = { AppPreferences.setThemeMode("light") },
                            modifier = Modifier.weight(1f)
                        )
                        ThemeOptionButton(
                            label = "Dark",
                            icon = Icons.Filled.DarkMode,
                            isSelected = themeMode == "dark",
                            onClick = { AppPreferences.setThemeMode("dark") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // 3. Security Preferences (Real Interactive Switches)
                CyberCard {
                    Text(
                        text = "Security preferences",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    PreferenceSwitchRow(
                        icon = Icons.Filled.Shield,
                        title = "Real-time threat detection",
                        subtitle = "Active AI multi-vector scanner",
                        isChecked = realtimeProtection,
                        onCheckedChange = { AppPreferences.setRealtimeProtection(it) }
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    PreferenceSwitchRow(
                        icon = Icons.Filled.CloudDone,
                        title = "Cloud synchronization",
                        subtitle = "Save scan records to Cloud Firestore",
                        isChecked = cloudSync,
                        onCheckedChange = { AppPreferences.setCloudSync(it) }
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    PreferenceSwitchRow(
                        icon = Icons.Filled.ContentPaste,
                        title = "Clipboard link detection",
                        subtitle = "Alert on copied links & text",
                        isChecked = clipboardDetection,
                        onCheckedChange = { AppPreferences.setClipboardDetection(it) }
                    )

                    val pushNotifications by AppPreferences.pushNotificationsFlow.collectAsState()

                    Spacer(modifier = Modifier.height(14.dp))

                    PreferenceSwitchRow(
                        icon = Icons.Filled.NotificationsActive,
                        title = "Push notifications",
                        subtitle = "Threat alerts & security digests",
                        isChecked = pushNotifications,
                        onCheckedChange = { AppPreferences.setPushNotifications(it) }
                    )
                }

                // 4. Help & Support Section
                CyberCard {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showHelpAndSupport = !showHelpAndSupport }
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Filled.Info, contentDescription = null, tint = colors.brandAccent, modifier = Modifier.size(18.dp))
                            Text(
                                text = "Help & Support",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textPrimary
                            )
                        }
                        Icon(
                            imageVector = if (showHelpAndSupport) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = null,
                            tint = colors.brandAccent,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    AnimatedVisibility(visible = showHelpAndSupport) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            HelpTopicItem(
                                title = "How LinkSentry Works",
                                description = "LinkSentry uses a dual-engine architecture combining rule heuristics and a LinearSVC machine learning model to detect phishing URLs, malicious QR codes, and smishing texts in milliseconds."
                            )

                            HelpTopicItem(
                                title = "QR Code Scanning",
                                description = "The optical scanner decodes QR payloads locally on-device. Standard URLs are analyzed for phishing risks, while Wi-Fi, vCard, and text payloads are inspected without sending personal data externally."
                            )

                            HelpTopicItem(
                                title = "URL & Link Analysis",
                                description = "LinkSentry checks domain reputations, punycode spoofing, IP-based URLs, suspicious subdomains, and deceptive brand impersonation."
                            )

                            HelpTopicItem(
                                title = "Threat Verdicts",
                                description = "• Safe (0–29): Low risk, legitimate destination.\n• Suspicious (30–69): Caution advised, unusual patterns found.\n• Phishing (70–100): High risk, malicious indicators detected."
                            )

                            Spacer(modifier = Modifier.height(4.dp))

                            // Contact Support Button (Full-width responsive)
                            OutlinedButton(
                                onClick = {
                                    val intent = android.content.Intent(android.content.Intent.ACTION_SENDTO).apply {
                                        data = android.net.Uri.parse("mailto:support@linksentry.security")
                                        putExtra(android.content.Intent.EXTRA_SUBJECT, "LinkSentry Support Request")
                                    }
                                    try {
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "No email app found (support@linksentry.security)", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 44.dp),
                                shape = RoundedCornerShape(10.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, colors.borderSubtle),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.textPrimary)
                            ) {
                                Icon(Icons.Filled.Email, contentDescription = null, tint = colors.brandAccent, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Contact Support Team", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold)
                            }

                            // Feedback / Bug Report Button (Full-width responsive)
                            Button(
                                onClick = { showFeedbackSheet = true },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 44.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colors.brandAccent,
                                    contentColor = Color.White
                                ),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Filled.RateReview, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Send Feedback / Bug Report", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }

                if (showFeedbackSheet) {
                    com.linksentry.app.ui.components.FeedbackBottomSheet(
                        onDismiss = { showFeedbackSheet = false },
                        onSubmitFeedback = { category, message, payload ->
                            showFeedbackSheet = false
                            Toast.makeText(context, "Thank you! Your $category has been submitted.", Toast.LENGTH_SHORT).show()
                        }
                    )
                }

                // 5. Developer & Diagnostics (Collapsed by Default)
                CyberCard {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showDevDiagnostics = !showDevDiagnostics }
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Filled.Code, contentDescription = null, tint = colors.brandAccent, modifier = Modifier.size(18.dp))
                            Text(
                                text = "Advanced & Diagnostics",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textPrimary
                            )
                        }
                        Icon(
                            imageVector = if (showDevDiagnostics) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = null,
                            tint = colors.brandAccent,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    AnimatedVisibility(visible = showDevDiagnostics) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "Backend API Endpoint",
                                fontSize = 12.sp,
                                color = colors.textSecondary,
                                fontWeight = FontWeight.Medium
                            )

                            OutlinedTextField(
                                value = apiUrlInput,
                                onValueChange = { apiUrlInput = it },
                                singleLine = true,
                                shape = RoundedCornerShape(10.dp),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { handleSaveAndProbe() }),
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = colors.brandAccent,
                                    unfocusedBorderColor = colors.borderSubtle,
                                    focusedTextColor = colors.textPrimary,
                                    unfocusedTextColor = colors.textPrimary,
                                    focusedContainerColor = colors.surfaceLight.copy(alpha = 0.5f),
                                    unfocusedContainerColor = colors.surfaceLight.copy(alpha = 0.5f)
                                )
                            )

                            // Environment Info & Presets
                            val currentBase = ApiClient.getBaseUrl()
                            val envLabel = when {
                                currentBase == ApiClient.DEFAULT_LAN_BASE_URL -> "DEV LAN (Local V3.4)"
                                currentBase == ApiClient.EMULATOR_BASE_URL -> "ANDROID EMULATOR"
                                currentBase == ApiClient.PRODUCTION_BASE_URL -> "PRODUCTION CLOUD (Render)"
                                else -> "CUSTOM ENDPOINT"
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Active Target:", fontSize = 11.sp, color = colors.textSecondary)
                                Text(
                                    text = envLabel,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (envLabel.contains("V3.4") || envLabel.contains("EMULATOR")) colors.brandAccent else colors.textPrimary
                                )
                            }

                            // Quick Presets
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                PresetButton(
                                    label = "Dev LAN (V3.4)",
                                    onClick = {
                                        apiUrlInput = ApiClient.DEFAULT_LAN_BASE_URL
                                        handleSaveAndProbe()
                                    },
                                    modifier = Modifier.weight(1.1f)
                                )
                                PresetButton(
                                    label = "Emulator",
                                    onClick = {
                                        apiUrlInput = ApiClient.EMULATOR_BASE_URL
                                        handleSaveAndProbe()
                                    },
                                    modifier = Modifier.weight(0.9f)
                                )
                                PresetButton(
                                    label = "Production",
                                    onClick = {
                                        apiUrlInput = ApiClient.PRODUCTION_BASE_URL
                                        handleSaveAndProbe()
                                    },
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            // Test & Status Button
                            Button(
                                onClick = { handleSaveAndProbe() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(42.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = colors.brandAccent, contentColor = Color.White),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                if (isProbing) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Probing Endpoint...", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                } else {
                                    Text("Update & Test Backend", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }

                            // Detailed Probe Result Card
                            probeResult?.let { res ->
                                val statusColor = if (res.isSuccess) {
                                    if (res.isLegacyV33) colors.suspicious else colors.safe
                                } else {
                                    colors.phishing
                                }
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(statusColor.copy(alpha = 0.08f))
                                        .border(1.dp, statusColor.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                                        .padding(10.dp)
                                ) {
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(8.dp)
                                                    .clip(CircleShape)
                                                    .background(statusColor)
                                            )
                                            Text(
                                                text = if (res.isSuccess) {
                                                    if (res.isLegacyV33) "LEGACY BACKEND — V3.3" else "LINK SENTRY V3.4 BACKEND ONLINE"
                                                } else {
                                                    "BACKEND UNREACHABLE"
                                                },
                                                color = statusColor,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.5.sp
                                            )
                                        }

                                        if (res.isSuccess) {
                                            Text(
                                                text = "Model: ${res.modelVersion ?: "V3.4"} • Latency: ${res.latencyMs}ms • Engine: ${res.engine ?: "LinkSentry Engine"}",
                                                color = colors.textSecondary,
                                                fontSize = 11.sp
                                            )
                                        } else {
                                            Text(
                                                text = res.errorMessage ?: "Unable to connect to host",
                                                color = colors.phishing,
                                                fontSize = 11.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 6. Sign Out Button
                Button(
                    onClick = {
                        authRepository.signOut()
                        onSignOut()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.surface,
                        contentColor = colors.phishing
                    ),
                    border = BorderStroke(1.dp, colors.phishing.copy(alpha = 0.35f)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                        contentDescription = "Sign Out",
                        tint = colors.phishing,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Sign Out", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun ThemeOptionButton(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = if (isSelected) colors.brandAccent.copy(alpha = 0.15f) else colors.surfaceLight,
        border = BorderStroke(
            1.dp,
            if (isSelected) colors.brandAccent.copy(alpha = 0.5f) else colors.borderSubtle
        ),
        modifier = modifier.height(42.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isSelected) colors.brandAccent else colors.textSecondary,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = label,
                fontSize = 11.5.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                color = if (isSelected) colors.brandAccent else colors.textPrimary,
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

@Composable
private fun PreferenceSwitchRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    isChecked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onCheckedChange(!isChecked) }
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.weight(1f)
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.surfaceLight),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = colors.brandAccent, modifier = Modifier.size(17.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, color = colors.textPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                Text(text = subtitle, color = colors.textSecondary, fontSize = 11.sp, lineHeight = 15.sp)
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        Switch(
            checked = isChecked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = colors.brandAccent,
                uncheckedThumbColor = colors.textSecondary,
                uncheckedTrackColor = colors.surfaceLight
            )
        )
    }
}

@Composable
private fun PresetButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = colors.surfaceLight,
        border = BorderStroke(1.dp, colors.borderSubtle),
        modifier = modifier.height(36.dp)
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                color = colors.textPrimary,
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun HelpTopicItem(
    title: String,
    description: String
) {
    val colors = LocalAppColors.current
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = colors.surfaceLight.copy(alpha = 0.6f),
        border = BorderStroke(1.dp, colors.borderSubtle),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.textPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = description,
                fontSize = 11.5.sp,
                color = colors.textSecondary,
                lineHeight = 16.sp
            )
        }
    }
}
