package com.linksentry.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.ui.theme.*

@Composable
fun CyberTopBar(
    title: String,
    subtitle: String? = null,
    showLogo: Boolean = true
) {
    Surface(
        color = CyberSurface,
        modifier = Modifier
            .fillMaxWidth()
            .border(width = 1.dp, color = CyberBorderSubtle)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (showLogo) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(CyberCyan.copy(alpha = 0.15f))
                            .border(1.dp, CyberCyan.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Security,
                            contentDescription = "Shield",
                            tint = CyberCyan,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "LINK",
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "SENTRY",
                            color = CyberCyan,
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp
                        )
                    }
                    if (subtitle != null) {
                        Text(
                            text = subtitle,
                            color = TextSecondary,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }

            // Real-time protection status indicator
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(CyberEmerald.copy(alpha = 0.1f))
                    .border(1.dp, CyberEmerald.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(CyberEmerald)
                )
                Text(
                    text = "ACTIVE",
                    color = CyberEmerald,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}

@Composable
fun CyberBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    val items = listOf(
        NavigationItem("dashboard", "Dashboard", Icons.Filled.Dashboard, Icons.Outlined.Dashboard),
        NavigationItem("scanner", "Scanner", Icons.Filled.Radar, Icons.Outlined.Radar),
        NavigationItem("history", "History", Icons.Filled.History, Icons.Outlined.History),
        NavigationItem("profile", "Profile", Icons.Filled.Person, Icons.Outlined.Person)
    )

    NavigationBar(
        containerColor = CyberSurface,
        tonalElevation = 8.dp,
        modifier = Modifier.border(1.dp, CyberBorderSubtle)
    ) {
        items.forEach { item ->
            val isSelected = currentRoute == item.route
            NavigationBarItem(
                selected = isSelected,
                onClick = { onNavigate(item.route) },
                icon = {
                    Icon(
                        imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                        contentDescription = item.title,
                        tint = if (isSelected) CyberCyan else TextMuted
                    )
                },
                label = {
                    Text(
                        text = item.title,
                        color = if (isSelected) CyberCyan else TextMuted,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = CyberCyan.copy(alpha = 0.12f)
                )
            )
        }
    }
}

data class NavigationItem(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

@Composable
fun CyberCard(
    modifier: Modifier = Modifier,
    borderColor: Color = CyberBorderSubtle,
    backgroundColor: Color = CyberSurface,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(12.dp)),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            content = content
        )
    }
}

@Composable
fun CyberBadge(
    verdict: String,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor, borderColor, icon) = when (verdict.lowercase()) {
        "safe" -> Quadruple(CyberEmerald.copy(alpha = 0.15f), CyberEmerald, CyberEmerald.copy(alpha = 0.4f), Icons.Filled.CheckCircle)
        "suspicious" -> Quadruple(CyberAmber.copy(alpha = 0.15f), CyberAmber, CyberAmber.copy(alpha = 0.4f), Icons.Filled.Warning)
        "phishing" -> Quadruple(CyberRed.copy(alpha = 0.15f), CyberRed, CyberRed.copy(alpha = 0.4f), Icons.Filled.Dangerous)
        else -> Quadruple(CyberCyan.copy(alpha = 0.15f), CyberCyan, CyberCyan.copy(alpha = 0.4f), Icons.Filled.Info)
    }

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = verdict,
            tint = textColor,
            modifier = Modifier.size(16.dp)
        )
        Text(
            text = verdict.uppercase(),
            color = textColor,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace
        )
    }
}

data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)

@Composable
fun ThreatMeter(
    riskScore: Int,
    modifier: Modifier = Modifier
) {
    val animatedProgress by animateFloatAsState(
        targetValue = riskScore / 100f,
        animationSpec = tween(durationMillis = 800),
        label = "riskProgress"
    )

    val color = when {
        riskScore >= 70 -> CyberRed
        riskScore >= 40 -> CyberAmber
        else -> CyberEmerald
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "THREAT RISK SCORE",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary
            )
            Text(
                text = "$riskScore / 100",
                style = MaterialTheme.typography.labelSmall,
                color = color,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        LinearProgressIndicator(
            progress = { animatedProgress },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = color,
            trackColor = CyberSurfaceLight
        )
    }
}
