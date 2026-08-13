package com.linksentry.app.ui.components

import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.ui.theme.*

@Composable
fun CyberCard(
    modifier: Modifier = Modifier,
    borderColor: Color = CyberBorderSubtle,
    backgroundColor: Color = CyberSurface,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(listOf(borderColor, borderColor.copy(alpha = 0.3f)))
        )
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            content = content
        )
    }
}

@Composable
fun CyberBadge(
    verdict: String,
    modifier: Modifier = Modifier
) {
    val (color, label, icon) = when (verdict.lowercase()) {
        "safe" -> Triple(CyberEmerald, "SAFE", Icons.Filled.CheckCircle)
        "suspicious" -> Triple(CyberAmber, "SUSPICIOUS", Icons.Filled.Warning)
        "phishing" -> Triple(CyberRed, "PHISHING", Icons.Filled.Dangerous)
        else -> Triple(TextSecondary, verdict.uppercase(), Icons.Filled.HelpOutline)
    }

    Surface(
        shape = RoundedCornerShape(6.dp),
        color = color.copy(alpha = 0.15f),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(listOf(color.copy(alpha = 0.5f), color.copy(alpha = 0.2f)))
        ),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = color,
                modifier = Modifier.size(11.dp)
            )
            Text(
                text = label,
                color = color,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

@Composable
fun CyberBadge(
    text: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = color.copy(alpha = 0.15f),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(listOf(color.copy(alpha = 0.5f), color.copy(alpha = 0.2f)))
        ),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = text,
                color = color,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

@Composable
fun ThreatMeter(
    riskScore: Int,
    modifier: Modifier = Modifier
) {
    val animatedScore by animateIntAsState(
        targetValue = riskScore,
        animationSpec = tween(durationMillis = 800),
        label = "RiskScoreAnimation"
    )

    val (color, levelText) = when {
        animatedScore >= 70 -> Pair(CyberRed, "CRITICAL RISK")
        animatedScore >= 30 -> Pair(CyberAmber, "ELEVATED RISK")
        else -> Pair(CyberEmerald, "LOW RISK")
    }

    Column(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Text(
                    text = "THREAT RISK SCORE:",
                    fontSize = 10.sp,
                    color = TextSecondary,
                    fontFamily = FontFamily.Monospace,
                    maxLines = 1,
                    softWrap = false
                )
                Text(
                    text = levelText,
                    fontSize = 10.sp,
                    color = color,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    maxLines = 1,
                    softWrap = false
                )
            }

            Spacer(modifier = Modifier.width(6.dp))

            Text(
                text = "$animatedScore / 100",
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                color = color,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
                softWrap = false
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Progress Bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(CyberDarkBg)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction = (animatedScore / 100f).coerceIn(0f, 1f))
                    .clip(RoundedCornerShape(3.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(CyberEmerald, CyberAmber, CyberRed)
                        )
                    )
            )
        }
    }
}

@Composable
fun CyberTopBar(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(CyberDarkBg)
            .border(1.dp, CyberBorderSubtle)
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(CyberCyan.copy(alpha = 0.15f))
                        .border(1.dp, CyberCyan, RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.Shield,
                        contentDescription = "LinkSentry Logo",
                        tint = CyberCyan,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Column {
                    Text(
                        text = title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = subtitle,
                        fontSize = 9.sp,
                        color = CyberCyan,
                        fontFamily = FontFamily.Monospace,
                        letterSpacing = 1.sp
                    )
                }
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(CyberEmerald.copy(alpha = 0.15f))
                    .border(1.dp, CyberEmerald.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(5.dp)
                            .clip(CircleShape)
                            .background(CyberEmerald)
                    )
                    Text(
                        text = "V3.3 ACTIVE",
                        color = CyberEmerald,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}

@Composable
fun CyberBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    NavigationBar(
        containerColor = CyberDarkBg,
        contentColor = TextPrimary,
        tonalElevation = 0.dp,
        modifier = Modifier.border(1.dp, CyberBorderSubtle)
    ) {
        val navItems = listOf(
            Triple("dashboard", "Overview", Icons.Filled.Dashboard),
            Triple("scanner", "Scanner", Icons.Filled.Radar),
            Triple("history", "Vault", Icons.Filled.Folder),
            Triple("profile", "Profile", Icons.Filled.Person)
        )

        navItems.forEach { (route, label, icon) ->
            val isSelected = currentRoute == route
            NavigationBarItem(
                selected = isSelected,
                onClick = { onNavigate(route) },
                icon = {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        modifier = Modifier.size(20.dp),
                        tint = if (isSelected) CyberCyan else TextSecondary
                    )
                },
                label = {
                    Text(
                        text = label,
                        fontSize = 10.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) CyberCyan else TextSecondary
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = CyberCyan.copy(alpha = 0.15f)
                )
            )
        }
    }
}
