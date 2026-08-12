package com.linksentry.app.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.repository.ScanRepository
import com.linksentry.app.ui.components.CyberBadge
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.components.CyberTopBar
import com.linksentry.app.ui.theme.*

@Composable
fun DashboardScreen(
    userId: String,
    scanRepository: ScanRepository,
    onNavigateToScanner: (String) -> Unit
) {
    val scans by scanRepository.getScansFlow(userId).collectAsState(initial = emptyList())

    val totalScans = scans.size
    val safeCount = scans.count { it.verdict.lowercase() == "safe" }
    val suspiciousCount = scans.count { it.verdict.lowercase() == "suspicious" }
    val phishingCount = scans.count { it.verdict.lowercase() == "phishing" }
    val threatCount = suspiciousCount + phishingCount
    val safetyRate = if (totalScans > 0) (safeCount * 100) / totalScans else 100
    val avgRisk = if (totalScans > 0) scans.sumOf { it.riskScore } / totalScans else 0

    val urlScans = scans.count { it.type == "url" }
    val qrScans = scans.count { it.type == "qr" }
    val messageScans = scans.count { it.type == "message" }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "LinkSentry SOC",
                subtitle = "LIVE TELEMETRY CLUSTER"
            )
        },
        containerColor = CyberDarkBg
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            // Hero Telemetry Card
            item {
                CyberCard(
                    borderColor = CyberCyan.copy(alpha = 0.4f),
                    backgroundColor = CyberSurfaceLight
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "FLEET DEFENSE HEALTH",
                                style = MaterialTheme.typography.labelSmall,
                                color = CyberCyan
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "$safetyRate% Clean",
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Black,
                                color = if (safetyRate >= 80) CyberEmerald else CyberAmber
                            )
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(CyberCyan.copy(alpha = 0.15f))
                                .border(1.dp, CyberCyan.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "$totalScans Total Scans",
                                color = CyberCyan,
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // 2x2 Metric Grid
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricMiniCard(
                        title = "Phishing Neutralized",
                        value = phishingCount.toString(),
                        color = CyberRed,
                        icon = Icons.Filled.Dangerous,
                        modifier = Modifier.weight(1f)
                    )
                    MetricMiniCard(
                        title = "Suspicious Flagged",
                        value = suspiciousCount.toString(),
                        color = CyberAmber,
                        icon = Icons.Filled.Warning,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricMiniCard(
                        title = "Safe Assets",
                        value = safeCount.toString(),
                        color = CyberEmerald,
                        icon = Icons.Filled.CheckCircle,
                        modifier = Modifier.weight(1f)
                    )
                    MetricMiniCard(
                        title = "Avg Threat Score",
                        value = "$avgRisk/100",
                        color = if (avgRisk >= 50) CyberRed else CyberCyan,
                        icon = Icons.Filled.Speed,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Vector Launchers
            item {
                Text(
                    text = "DEFENSE RADARS",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    VectorLaunchCard(
                        title = "URL Scanner",
                        count = "$urlScans Scans",
                        icon = Icons.Filled.Language,
                        onClick = { onNavigateToScanner("url") },
                        modifier = Modifier.weight(1f)
                    )
                    VectorLaunchCard(
                        title = "QR Quishing",
                        count = "$qrScans Scans",
                        icon = Icons.Filled.QrCodeScanner,
                        onClick = { onNavigateToScanner("qr") },
                        modifier = Modifier.weight(1f)
                    )
                    VectorLaunchCard(
                        title = "SMS Smishing",
                        count = "$messageScans Scans",
                        icon = Icons.Filled.Chat,
                        onClick = { onNavigateToScanner("message") },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Recent Threats / Activity
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "RECENT INVESTIGATION LOGS",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                    Text(
                        text = "Cloud Synchronized",
                        color = CyberEmerald,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
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
                                    imageVector = Icons.Filled.Radar,
                                    contentDescription = "Radar",
                                    tint = CyberCyan,
                                    modifier = Modifier.size(36.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "No Scans Recorded Yet",
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "Launch a scanner below to initiate telemetry.",
                                    color = TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
            } else {
                items(scans.take(5)) { scan ->
                    RecentScanRow(scan = scan)
                }
            }
        }
    }
}

@Composable
fun MetricMiniCard(
    title: String,
    value: String,
    color: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    CyberCard(
        modifier = modifier,
        borderColor = color.copy(alpha = 0.3f)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = title,
                fontSize = 11.sp,
                color = TextSecondary
            )
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = color,
                modifier = Modifier.size(16.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = value,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = color,
            fontFamily = FontFamily.Monospace
        )
    }
}

@Composable
fun VectorLaunchCard(
    title: String,
    count: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(CyberSurface)
            .border(1.dp, CyberBorderSubtle, RoundedCornerShape(10.dp))
            .clickable { onClick() }
            .padding(12.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = CyberCyan,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Text(
                text = count,
                fontSize = 10.sp,
                color = TextMuted,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}

@Composable
fun RecentScanRow(scan: ScanRecord) {
    CyberCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = scan.type.uppercase(),
                        color = CyberCyan,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "•",
                        color = TextMuted,
                        fontSize = 10.sp
                    )
                    Text(
                        text = scan.formattedDate,
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (scan.domain.isNotBlank()) scan.domain else scan.input,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    maxLines = 1
                )
            }
            CyberBadge(verdict = scan.verdict)
        }
    }
}
