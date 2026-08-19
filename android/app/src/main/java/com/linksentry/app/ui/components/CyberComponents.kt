package com.linksentry.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.ui.theme.*

/**
 * Theme-aware Standard Modern Security Card Container
 */
@Composable
fun CyberCard(
    modifier: Modifier = Modifier,
    borderColor: Color? = null,
    backgroundColor: Color? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = LocalAppColors.current
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor ?: colors.surface),
        border = BorderStroke(1.dp, borderColor ?: colors.borderSubtle)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            content = content
        )
    }
}

/**
 * Clean Human-Readable Verdict Badge (Safe / Suspicious / Phishing)
 */
@Composable
fun CyberBadge(
    verdict: String,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    val (color, label, icon) = when (verdict.lowercase()) {
        "safe" -> Triple(colors.safe, "Safe", Icons.Filled.CheckCircle)
        "suspicious" -> Triple(colors.suspicious, "Suspicious", Icons.Filled.Warning)
        "phishing" -> Triple(colors.phishing, "Phishing", Icons.Filled.Dangerous)
        "malware" -> Triple(colors.malware, "Malware", Icons.Filled.BugReport)
        "defacement" -> Triple(colors.defacement, "Defacement", Icons.Filled.Brush)
        "unreachable" -> Triple(colors.suspicious, "Unreachable", Icons.Filled.CloudOff)
        "non_existent" -> Triple(colors.phishing, "NXDOMAIN", Icons.Filled.SearchOff)
        "invalid" -> Triple(colors.textSecondary, "Invalid", Icons.Filled.ErrorOutline)
        else -> Triple(colors.textSecondary, verdict.replaceFirstChar { it.uppercase() }, Icons.AutoMirrored.Filled.HelpOutline)
    }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = if (colors.isDark) 0.14f else 0.10f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.35f)),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = color,
                modifier = Modifier.size(13.dp)
            )
            Text(
                text = label,
                color = color,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

/**
 * Simple Tag Badge with Custom Color
 */
@Composable
fun CyberBadge(
    text: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = if (colors.isDark) 0.14f else 0.10f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.35f)),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = text,
                color = color,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

/**
 * Restrained, Smooth Threat Score Progress Meter
 */
@Composable
fun ThreatMeter(
    riskScore: Int,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    val animatedScore by animateIntAsState(
        targetValue = riskScore,
        animationSpec = tween(durationMillis = 600),
        label = "RiskScoreAnimation"
    )

    val (color, levelText) = when {
        animatedScore >= 70 -> Pair(colors.phishing, "High risk")
        animatedScore >= 30 -> Pair(colors.suspicious, "Moderate risk")
        else -> Pair(colors.safe, "Low risk")
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Text(
                    text = "Threat score",
                    fontSize = 12.sp,
                    color = colors.textSecondary,
                    maxLines = 1,
                    softWrap = false
                )
                Text(
                    text = "• $levelText",
                    fontSize = 12.sp,
                    color = color,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    softWrap = false
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Text(
                text = "$animatedScore / 100",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = color,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
                softWrap = false
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(colors.surfaceLight)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction = (animatedScore / 100f).coerceIn(0.02f, 1f))
                    .clip(RoundedCornerShape(3.dp))
                    .background(color)
            )
        }
    }
}

/**
 * Clean Adaptive Top App Bar (Restrained & Modern)
 */
@Composable
fun CyberTopBar(
    title: String,
    subtitle: String? = null,
    statusText: String = "Protected",
    isOnline: Boolean = true,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    Surface(
        color = colors.background,
        border = BorderStroke(1.dp, colors.borderSubtle.copy(alpha = 0.7f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f, fill = true)
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(colors.brandAccent.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.Shield,
                        contentDescription = null,
                        tint = colors.brandAccent,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Column(modifier = Modifier.weight(1f, fill = false)) {
                    Text(
                        text = title,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (!subtitle.isNullOrBlank()) {
                        Text(
                            text = subtitle,
                            fontSize = 11.sp,
                            color = colors.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = (if (isOnline) colors.safe else colors.suspicious).copy(alpha = 0.10f),
                border = BorderStroke(1.dp, (if (isOnline) colors.safe else colors.suspicious).copy(alpha = 0.25f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(if (isOnline) colors.safe else colors.suspicious)
                    )
                    Text(
                        text = statusText,
                        color = if (isOnline) colors.safe else colors.suspicious,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
        }
    }
}

/**
 * Persistent Icon-Only Main Bottom Navigation Bar
 * Features:
 * - Seamless integration with system navigation bar (no black strip)
 * - Icons ONLY (Home, Scanner, History, Profile)
 * - Minimum 48dp touch targets
 */
@Composable
fun CyberBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    val colors = LocalAppColors.current
    Surface(
        color = colors.surface,
        border = BorderStroke(1.dp, colors.borderSubtle),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .height(58.dp)
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val items = listOf(
                Triple("dashboard", Icons.Filled.Shield, "Home"),
                Triple("scanner", Icons.Filled.QrCodeScanner, "Scanner"),
                Triple("history", Icons.AutoMirrored.Filled.List, "History"),
                Triple("profile", Icons.Filled.Person, "Profile")
            )

            items.forEach { (route, icon, description) ->
                val isSelected = currentRoute == route
                val interactionSource = remember { MutableInteractionSource() }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                        .clickable(
                            interactionSource = interactionSource,
                            indication = null
                        ) {
                            onNavigate(route)
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isSelected) colors.brandAccent.copy(alpha = 0.15f) else Color.Transparent)
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = description,
                            tint = if (isSelected) colors.brandAccent else colors.textMuted,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Universal Production-Grade Incident Inspection Bottom Sheet
 * Content-first, calm, readable, and theme-adaptive.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanDetailBottomSheet(
    scan: ScanRecord,
    onDismiss: () -> Unit
) {
    val colors = LocalAppColors.current
    val clipboardManager = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    var showTechDetails by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surface,
        scrimColor = Color.Black.copy(alpha = 0.5f),
        dragHandle = { BottomSheetDefaults.DragHandle(color = colors.borderSubtle) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 6.dp)
                .navigationBarsPadding()
                .imePadding()
        ) {
            // Header: Type & Verdict
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Scan details",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
                CyberBadge(verdict = scan.verdict)
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Threat Meter
            ThreatMeter(riskScore = scan.riskScore)

            Spacer(modifier = Modifier.height(14.dp))

            // Payload Card
            CyberCard(
                borderColor = colors.borderSubtle,
                backgroundColor = colors.surfaceLight.copy(alpha = 0.5f)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Scanned payload",
                        fontSize = 11.sp,
                        color = colors.textSecondary,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = if (copied) "Copied ✓" else "Copy",
                        fontSize = 11.sp,
                        color = if (copied) colors.safe else colors.brandAccent,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable {
                            clipboardManager.setText(AnnotatedString(scan.input.ifEmpty { scan.url }))
                            copied = true
                        }
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = scan.input.ifEmpty { scan.url.ifEmpty { "N/A" } },
                    color = colors.textPrimary,
                    fontSize = 13.sp,
                    fontFamily = FontFamily.Monospace,
                    lineHeight = 17.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Summary Details
            CyberCard(
                borderColor = colors.borderSubtle,
                backgroundColor = colors.surface
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    DetailRow(
                        label = "Scan type",
                        value = when (scan.type.lowercase()) {
                            "url" -> "Web link"
                            "qr" -> "QR Code"
                            "message" -> "SMS text message"
                            else -> scan.type.replaceFirstChar { it.uppercase() }
                        }
                    )

                    if (scan.domain.isNotBlank()) {
                        DetailRow(
                            label = "Analyzed domain",
                            value = scan.domain
                        )
                    }

                    DetailRow(
                        label = "AI Confidence",
                        value = "${(scan.confidence * 100).toInt()}%"
                    )

                    DetailRow(
                        label = "Time",
                        value = scan.formattedDate
                    )
                }
            }

            // Why this was flagged / Indicators
            if (scan.indicators.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Why this was flagged",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textPrimary
                )
                Spacer(modifier = Modifier.height(6.dp))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    scan.indicators.forEach { indicator ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Warning,
                                contentDescription = null,
                                tint = colors.suspicious,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = indicator,
                                color = colors.textPrimary,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Collapsible Technical Diagnostics
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { showTechDetails = !showTechDetails }
                    .padding(vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (showTechDetails) "Hide technical details" else "Show technical details",
                    fontSize = 12.sp,
                    color = colors.brandAccent,
                    fontWeight = FontWeight.Medium
                )
                Icon(
                    imageVector = if (showTechDetails) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = null,
                    tint = colors.brandAccent,
                    modifier = Modifier.size(18.dp)
                )
            }

            AnimatedVisibility(visible = showTechDetails) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    DetailRow(label = "Detection engine", value = scan.engine)
                    DetailRow(label = "Model version", value = scan.modelVersion)
                    DetailRow(label = "Source client", value = scan.source.replaceFirstChar { it.uppercase() })
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Dismiss Button
            Button(
                onClick = onDismiss,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.surfaceLight,
                    contentColor = colors.textPrimary
                ),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Close", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }

            Spacer(modifier = Modifier.height(14.dp))
        }
    }
}

/**
 * Interactive Feedback and Bug Report Modal Bottom Sheet
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedbackBottomSheet(
    onDismiss: () -> Unit,
    onSubmitFeedback: (category: String, message: String, payload: String) -> Unit
) {
    val colors = LocalAppColors.current
    var selectedCategory by remember { mutableStateOf("Bug Report") }
    var feedbackText by remember { mutableStateOf("") }
    var payloadText by remember { mutableStateOf("") }
    val categories = listOf("Bug Report", "Threat False Positive", "Feature Request")

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surface,
        scrimColor = Color.Black.copy(alpha = 0.5f),
        dragHandle = { BottomSheetDefaults.DragHandle(color = colors.borderSubtle) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 6.dp)
                .navigationBarsPadding()
                .imePadding()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Feedback & Bug Report",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
                IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Filled.Close, contentDescription = "Close", tint = colors.textMuted, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "Feedback category",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = colors.textSecondary
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                categories.forEach { category ->
                    val isSelected = selectedCategory == category
                    Surface(
                        onClick = { selectedCategory = category },
                        shape = RoundedCornerShape(8.dp),
                        color = if (isSelected) colors.brandAccent.copy(alpha = 0.15f) else colors.surfaceLight,
                        border = BorderStroke(1.dp, if (isSelected) colors.brandAccent.copy(alpha = 0.5f) else colors.borderSubtle),
                        modifier = Modifier.defaultMinSize(minHeight = 38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                            Text(
                                text = category,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (isSelected) colors.brandAccent else colors.textPrimary,
                                maxLines = 1,
                                softWrap = false
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "Description",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = colors.textSecondary
            )

            Spacer(modifier = Modifier.height(6.dp))

            OutlinedTextField(
                value = feedbackText,
                onValueChange = { feedbackText = it },
                placeholder = { Text("Describe what happened or suggest an improvement...", color = colors.textMuted, fontSize = 12.sp) },
                minLines = 3,
                maxLines = 5,
                shape = RoundedCornerShape(10.dp),
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

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Target URL / Payload (Optional)",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = colors.textSecondary
            )

            Spacer(modifier = Modifier.height(6.dp))

            OutlinedTextField(
                value = payloadText,
                onValueChange = { payloadText = it },
                placeholder = { Text("https://example.com/suspicious-link", color = colors.textMuted, fontSize = 12.sp) },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
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

            Spacer(modifier = Modifier.height(18.dp))

            Button(
                onClick = {
                    if (feedbackText.isNotBlank()) {
                        onSubmitFeedback(selectedCategory, feedbackText.trim(), payloadText.trim())
                    }
                },
                enabled = feedbackText.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.brandAccent,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Submit Feedback", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }

            Spacer(modifier = Modifier.height(14.dp))
        }
    }
}

@Composable
private fun DetailRow(
    label: String,
    value: String
) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            color = colors.textSecondary,
            maxLines = 1,
            softWrap = false
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = value,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = colors.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
