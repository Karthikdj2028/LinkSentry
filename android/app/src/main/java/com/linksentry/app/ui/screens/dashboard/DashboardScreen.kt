package com.linksentry.app.ui.screens.dashboard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.repository.ScanRepository
import com.linksentry.app.ui.components.CyberBadge
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.components.CyberTopBar
import com.linksentry.app.ui.components.ScanDetailBottomSheet
import com.linksentry.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun DashboardScreen(
    userId: String,
    scanRepository: ScanRepository,
    onNavigateToScanner: (String) -> Unit
) {
    val colors = LocalAppColors.current
    val cloudSyncEnabled by com.linksentry.app.data.preferences.AppPreferences.cloudSyncFlow.collectAsState()
    val scans by scanRepository.getScansFlow(userId).collectAsState(initial = scanRepository.scansState.value)
    var selectedScanForDetail by remember { mutableStateOf<ScanRecord?>(null) }
    var isOnline by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val probe = com.linksentry.app.data.api.ApiClient.probeHealth()
        isOnline = probe.isSuccess
    }

    val totalScans = scans.size
    val safeCount = scans.count { it.verdict.lowercase() == "safe" }
    val suspiciousCount = scans.count { it.verdict.lowercase() == "suspicious" }
    val phishingCount = scans.count { it.verdict.lowercase() == "phishing" }
    val safetyRate = if (totalScans > 0) (safeCount * 100) / totalScans else 100
    val avgRisk = if (totalScans > 0) scans.sumOf { it.riskScore } / totalScans else 0

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "LinkSentry",
                subtitle = "Threat protection",
                statusText = if (isOnline) "Protected" else "Offline",
                isOnline = isOnline
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
            ) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = horizontalPadding),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(top = 12.dp, bottom = 24.dp)
                ) {
                    // Cloud Sync OFF Banner Notice
                    if (!cloudSyncEnabled) {
                        item {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = colors.brandAccent.copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, colors.brandAccent.copy(alpha = 0.2f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.CloudOff,
                                        contentDescription = null,
                                        tint = colors.brandAccent,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        text = "Cloud sync is off — scans remain stored locally on this device.",
                                        fontSize = 12.sp,
                                        color = colors.textPrimary,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }

                    // 1. Primary Protection Status Card
                    item {
                        CyberCard {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Protection status",
                                    fontSize = 13.sp,
                                    color = colors.textSecondary,
                                    fontWeight = FontWeight.Medium
                                )
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = colors.brandAccent.copy(alpha = 0.12f),
                                    border = BorderStroke(1.dp, colors.brandAccent.copy(alpha = 0.25f))
                                ) {
                                    Text(
                                        text = "$totalScans total",
                                        fontSize = 11.sp,
                                        color = colors.brandAccent,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                                        maxLines = 1,
                                        softWrap = false
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                verticalAlignment = Alignment.Bottom,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(
                                    text = "$safetyRate%",
                                    fontSize = 36.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (safetyRate >= 80) colors.safe else colors.suspicious,
                                    lineHeight = 36.sp
                                )
                                Text(
                                    text = if (safetyRate >= 80) "Protected" else "Threats flagged",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = colors.textPrimary,
                                    modifier = Modifier.padding(bottom = 3.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            Text(
                                text = "Real-time AI threat analysis is active across links, QR codes, and messages.",
                                color = colors.textSecondary,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                        }
                    }

                    // 2. 2x2 Metric Grid (Adaptive & Content-First)
                    item {
                        Text(
                            text = "Threat activity",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.textPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            ModernMetricCard(
                                label = "Phishing",
                                value = phishingCount.toString(),
                                color = colors.phishing,
                                icon = Icons.Filled.Dangerous,
                                modifier = Modifier.weight(1f)
                            )
                            ModernMetricCard(
                                label = "Suspicious",
                                value = suspiciousCount.toString(),
                                color = colors.suspicious,
                                icon = Icons.Filled.Warning,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            ModernMetricCard(
                                label = "Safe",
                                value = safeCount.toString(),
                                color = colors.safe,
                                icon = Icons.Filled.CheckCircle,
                                modifier = Modifier.weight(1f)
                            )
                            ModernMetricCard(
                                label = "Avg. Risk",
                                value = "$avgRisk / 100",
                                color = if (avgRisk >= 50) colors.phishing else colors.brandAccent,
                                icon = Icons.Filled.Speed,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // 3. Real Security Analytics (Firestore Derived Timeline & Threat Distribution)
                    item {
                        CyberCard {
                            Text(
                                text = "Security analytics",
                                fontSize = 13.sp,
                                color = colors.textSecondary,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(10.dp))

                            // Threat Distribution Bar
                            if (totalScans > 0) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(8.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(colors.surfaceLight)
                                ) {
                                    if (safeCount > 0) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxHeight()
                                                .weight(safeCount.toFloat())
                                                .background(colors.safe)
                                        )
                                    }
                                    if (suspiciousCount > 0) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxHeight()
                                                .weight(suspiciousCount.toFloat())
                                                .background(colors.suspicious)
                                        )
                                    }
                                    if (phishingCount > 0) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxHeight()
                                                .weight(phishingCount.toFloat())
                                                .background(colors.phishing)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    DistributionLabel(label = "Safe", count = safeCount, color = colors.safe)
                                    DistributionLabel(label = "Suspicious", count = suspiciousCount, color = colors.suspicious)
                                    DistributionLabel(label = "Phishing", count = phishingCount, color = colors.phishing)
                                }
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp))
                                        .background(colors.surfaceLight)
                                )
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // 7-Day Activity Chart
                            Text(
                                text = "Activity timeline (Last 7 days)",
                                fontSize = 12.sp,
                                color = colors.textSecondary,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            WeeklyActivityChart(scans = scans)
                        }
                    }

                    // 4. Quick Scan Actions (Vertical Icon-over-label, Never Clipped)
                    item {
                        Text(
                            text = "Quick scan",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.textPrimary
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            AdaptiveQuickScanButton(
                                label = "Link",
                                icon = Icons.Filled.Language,
                                onClick = { onNavigateToScanner("url") },
                                modifier = Modifier.weight(1f)
                            )
                            AdaptiveQuickScanButton(
                                label = "QR Code",
                                icon = Icons.Filled.QrCodeScanner,
                                onClick = { onNavigateToScanner("qr") },
                                modifier = Modifier.weight(1f)
                            )
                            AdaptiveQuickScanButton(
                                label = "Message",
                                icon = Icons.AutoMirrored.Filled.Chat,
                                onClick = { onNavigateToScanner("message") },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // 5. Recent Activity Section
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Recent activity",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textPrimary
                            )
                            if (scans.isNotEmpty()) {
                                Text(
                                    text = "Tap to inspect",
                                    fontSize = 12.sp,
                                    color = colors.textMuted
                                )
                            }
                        }
                    }

                    if (scans.isEmpty()) {
                        item {
                            CyberCard {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 24.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            imageVector = Icons.Filled.Shield,
                                            contentDescription = null,
                                            tint = colors.textMuted,
                                            modifier = Modifier.size(32.dp)
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = "No scans yet",
                                            fontWeight = FontWeight.SemiBold,
                                            color = colors.textPrimary,
                                            fontSize = 14.sp
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "Scan a link, QR code, or text message above.",
                                            color = colors.textSecondary,
                                            fontSize = 12.sp
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        items(scans.take(6)) { scan ->
                            CleanRecentScanItem(
                                scan = scan,
                                onClick = { selectedScanForDetail = scan }
                            )
                        }
                    }
                }
            }
        }
    }

    selectedScanForDetail?.let { detailScan ->
        ScanDetailBottomSheet(
            scan = detailScan,
            onDismiss = { selectedScanForDetail = null }
        )
    }
}

@Composable
private fun DistributionLabel(
    label: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = modifier
    ) {
        Box(
            modifier = Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(color)
        )
        Text(
            text = "$label: $count",
            fontSize = 11.sp,
            color = colors.textSecondary,
            maxLines = 1,
            softWrap = false
        )
    }
}

@Composable
private fun WeeklyActivityChart(scans: List<ScanRecord>) {
    val colors = LocalAppColors.current
    val days = remember(scans) {
        val cal = Calendar.getInstance()
        val dayFormat = SimpleDateFormat("EEE", Locale.US)
        val dayKeyFormat = SimpleDateFormat("yyyyMMdd", Locale.US)

        val past7Days = (6 downTo 0).map { offset ->
            val c = Calendar.getInstance()
            c.add(Calendar.DAY_OF_YEAR, -offset)
            val dayName = dayFormat.format(c.time)
            val key = dayKeyFormat.format(c.time)
            Triple(dayName, key, 0)
        }.toMutableList()

        scans.forEach { scan ->
            val scanDate = scan.createdAt?.toDate() ?: Date()
            val scanKey = dayKeyFormat.format(scanDate)
            val idx = past7Days.indexOfFirst { it.second == scanKey }
            if (idx != -1) {
                val current = past7Days[idx]
                past7Days[idx] = Triple(current.first, current.second, current.third + 1)
            }
        }
        past7Days
    }

    val maxCount = maxOf(days.maxOfOrNull { it.third } ?: 1, 1)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(84.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom
    ) {
        days.forEach { (dayName, _, count) ->
            val barFraction = if (maxCount > 0) (count.toFloat() / maxCount).coerceIn(0.12f, 1f) else 0.12f

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Bottom,
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = if (count > 0) count.toString() else "",
                    fontSize = 10.sp,
                    color = colors.brandAccent,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.height(16.dp),
                    maxLines = 1,
                    softWrap = false
                )

                Spacer(modifier = Modifier.height(2.dp))

                Box(
                    modifier = Modifier
                        .width(18.dp)
                        .height(38.dp)
                        .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                        .background(colors.surfaceLight),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .fillMaxHeight(fraction = barFraction)
                            .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                            .background(if (count > 0) colors.brandAccent else colors.borderSubtle)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = dayName,
                    fontSize = 10.sp,
                    color = colors.textSecondary,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun ModernMetricCard(
    label: String,
    value: String,
    color: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    CyberCard(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                fontSize = 12.sp,
                color = colors.textSecondary,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = color,
                modifier = Modifier.size(15.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = value,
            fontSize = 19.sp,
            fontWeight = FontWeight.Bold,
            color = color,
            maxLines = 1,
            softWrap = false
        )
    }
}

@Composable
private fun AdaptiveQuickScanButton(
    label: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, colors.borderSubtle),
        modifier = modifier
            .defaultMinSize(minHeight = 64.dp)
            .heightIn(min = 64.dp)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 10.dp, horizontal = 2.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = colors.brandAccent,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = label,
                fontSize = 11.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.textPrimary,
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun CleanRecentScanItem(
    scan: ScanRecord,
    onClick: () -> Unit
) {
    val colors = LocalAppColors.current
    CyberCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(colors.surfaceLight),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when (scan.type.lowercase()) {
                        "qr" -> Icons.Filled.QrCodeScanner
                        "message" -> Icons.AutoMirrored.Filled.Chat
                        else -> Icons.Filled.Language
                    },
                    contentDescription = scan.type,
                    tint = colors.brandAccent,
                    modifier = Modifier.size(16.dp)
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (scan.domain.isNotBlank()) scan.domain else scan.input.ifEmpty { scan.url },
                    color = colors.textPrimary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = when (scan.type.lowercase()) {
                            "url" -> "Link"
                            "qr" -> "QR"
                            "message" -> "SMS"
                            else -> scan.type.replaceFirstChar { it.uppercase() }
                        },
                        color = colors.textSecondary,
                        fontSize = 11.sp
                    )
                    Text(
                        text = "•",
                        color = colors.textMuted,
                        fontSize = 10.sp
                    )
                    Text(
                        text = scan.formattedDate,
                        color = colors.textMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            CyberBadge(verdict = scan.verdict)
        }
    }
}
