package com.linksentry.app.ui.screens.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onSplashComplete: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "RadarSweep")
    val sweepAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "SweepAngle"
    )

    LaunchedEffect(Unit) {
        delay(1200)
        onSplashComplete()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CyberDarkBg),
        contentAlignment = Alignment.Center
    ) {
        // Radar Circle Animation
        Canvas(modifier = Modifier.size(160.dp)) {
            val center = Offset(size.width / 2f, size.height / 2f)
            val radius = size.width / 2f

            drawCircle(
                color = CyberCyan.copy(alpha = 0.15f),
                radius = radius,
                center = center,
                style = Stroke(width = 1.5.dp.toPx())
            )
            drawCircle(
                color = CyberCyan.copy(alpha = 0.25f),
                radius = radius * 0.6f,
                center = center,
                style = Stroke(width = 1.dp.toPx())
            )
            drawCircle(
                color = CyberCyan.copy(alpha = 0.35f),
                radius = radius * 0.25f,
                center = center,
                style = Stroke(width = 1.dp.toPx())
            )

            // Crosshairs
            drawLine(
                color = CyberCyan.copy(alpha = 0.2f),
                start = Offset(center.x, 0f),
                end = Offset(center.x, size.height),
                strokeWidth = 1.dp.toPx()
            )
            drawLine(
                color = CyberCyan.copy(alpha = 0.2f),
                start = Offset(0f, center.y),
                end = Offset(size.width, center.y),
                strokeWidth = 1.dp.toPx()
            )

            // Sweep Arc
            drawArc(
                brush = Brush.sweepGradient(
                    listOf(Color.Transparent, CyberCyan.copy(alpha = 0.4f)),
                    center = center
                ),
                startAngle = sweepAngle - 45f,
                sweepAngle = 45f,
                useCenter = true
            )
        }

        // Center Brand Identity
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Shield,
                contentDescription = "LinkSentry Shield",
                tint = CyberCyan,
                modifier = Modifier.size(36.dp)
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "LINK",
                    color = TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "SENTRY",
                    color = CyberCyan,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "THREAT DEFENSE RADAR V3.3",
                color = CyberCyan.copy(alpha = 0.8f),
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}
