package com.linksentry.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.model.DomainVerificationResponse
import com.linksentry.app.ui.screens.scanner.ScannerResultUi
import com.linksentry.app.ui.theme.LocalAppColors
import java.net.URI
import java.util.Locale

/**
 * Converts snake_case and backend heuristic identifiers into human-readable text.
 */
fun formatIndicator(raw: String): String {
    val trimmed = raw.trim()
    return when {
        trimmed.equals("typosquatting_brand", ignoreCase = true) -> "Typosquatting brand detected"
        trimmed.equals("domain_verified_reachable_http_200", ignoreCase = true) -> "Domain verified reachable (HTTP 200)"
        trimmed.equals("https_tls_active", ignoreCase = true) -> "HTTPS / TLS transport layer active"
        trimmed.equals("trusted_domain", ignoreCase = true) -> "Trusted domain recognized by LinkSentry trusted-domain layer"
        trimmed.equals("nxdomain_host_not_found", ignoreCase = true) -> "Domain lookup failed (NXDOMAIN)"
        trimmed.equals("unreachable_host", ignoreCase = true) -> "Host unreachable or connection timed out"
        trimmed.equals("high_risk_phishing_lure", ignoreCase = true) -> "High-risk credential lure keywords detected"
        trimmed.contains("_") && !trimmed.contains(" ") -> {
            trimmed.replace("_", " ").replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.US) else it.toString() }
        }
        else -> trimmed
    }
}

/**
 * Multi-Stage Scan Pipeline Progress Card (V3.4)
 */
@Composable
fun ScanPipelineProgressCard(
    currentStageIndex: Int,
    targetUrl: String? = null,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    val stages = listOf(
        "Parsing URL structure & syntax",
        "Evaluating domain & brand signals",
        "Verifying DNS & reachability",
        "Synthesizing V3.4 decision fusion"
    )

    CyberCard(modifier = modifier) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                color = colors.brandAccent,
                strokeWidth = 2.dp
            )
            Text(
                text = "Active Scan Analysis",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary
            )
        }

        if (!targetUrl.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.surfaceLight.copy(alpha = 0.6f))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "INSPECTING TARGET",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 0.5.sp,
                    color = colors.textMuted
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = targetUrl,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    color = colors.brandAccent,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            stages.forEachIndexed { idx, stageName ->
                val isActive = idx == currentStageIndex
                val isCompleted = idx < currentStageIndex
                val textColor = if (isActive) colors.brandAccent else if (isCompleted) colors.safe else colors.textMuted

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (isActive) colors.brandAccent.copy(alpha = 0.15f) else if (isCompleted) colors.safe.copy(alpha = 0.12f) else colors.surfaceLight,
                        border = BorderStroke(1.dp, if (isActive) colors.brandAccent.copy(alpha = 0.4f) else colors.borderSubtle)
                    ) {
                        Text(
                            text = if (isCompleted) "✓" else "0${idx + 1}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = textColor,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                        )
                    }
                    Text(
                        text = stageName,
                        fontSize = 11.sp,
                        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (isActive) colors.textPrimary else colors.textSecondary,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Active Phase: ${stages.getOrElse(currentStageIndex) { "Completing Analysis" }}",
            fontSize = 10.sp,
            color = colors.textMuted,
            fontFamily = FontFamily.Monospace
        )
    }
}

/**
 * Final Security Verdict Card (V2.1 Parity)
 * Highlights Multi-Signal Fusion engine decision, threat risk index, and indicators.
 */
@Composable
fun FinalSecurityVerdictCard(
    result: ScannerResultUi,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    val normalizedVerdict = result.verdict.lowercase(Locale.US)

    val verdictDescription = when (normalizedVerdict) {
        "safe" -> "SAFE: Domain is verified reachable and no malicious indicators were detected by the LinkSentry decision-fusion engine."
        "suspicious" -> "WARNING: Suspicious characteristics, brand lookalikes, or coercive lures were detected. Exercise extreme caution."
        "phishing" -> "CRITICAL THREAT: High-confidence phishing attack detected. Do not enter credentials or download attachments."
        "non_existent" -> "DOMAIN NOT FOUND: DNS lookup failed (NXDOMAIN). The domain does not currently exist on public name servers."
        "unreachable" -> "UNREACHABLE: Target server did not respond or connection timed out."
        "invalid" -> "INVALID: The target URL format is invalid or malformed."
        else -> "Analysis complete. Review threat indicators and verification signals below."
    }

    CyberCard(modifier = modifier) {
        // 1. Header: FINAL SECURITY VERDICT & MULTI-SIGNAL FUSION TAG (Adaptive Stacked Layout)
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            if (maxWidth < 380.dp) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "FINAL SECURITY VERDICT",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp,
                        color = colors.textMuted
                    )
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = colors.brandAccent.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, colors.brandAccent.copy(alpha = 0.35f))
                    ) {
                        Text(
                            text = "MULTI-SIGNAL FUSION",
                            color = colors.brandAccent,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            maxLines = 1,
                            softWrap = false,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "FINAL SECURITY VERDICT",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp,
                        color = colors.textMuted
                    )
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = colors.brandAccent.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, colors.brandAccent.copy(alpha = 0.35f))
                    ) {
                        Text(
                            text = "MULTI-SIGNAL FUSION",
                            color = colors.brandAccent,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            maxLines = 1,
                            softWrap = false,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // 2. Verdict Badge & Confidence
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            CyberBadge(verdict = result.verdict)
            Text(
                text = "Confidence: ${(result.confidence * 100).toInt()}%",
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = colors.textSecondary
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 3. Verdict Description
        Text(
            text = verdictDescription,
            color = colors.textPrimary,
            fontSize = 12.sp,
            lineHeight = 16.sp
        )

        Spacer(modifier = Modifier.height(6.dp))

        // 4. Fusion Engine Note
        Text(
            text = "Determined by LinkSentry's multi-signal fusion engine combining ML heuristics, DNS, TLS, reachability, reputation, and brand-impersonation signals.",
            color = colors.textMuted,
            fontSize = 10.sp,
            lineHeight = 14.sp
        )

        Spacer(modifier = Modifier.height(12.dp))

        // 5. Threat Score Meter
        ThreatMeter(riskScore = result.riskScore)

        // 6. Registrable Domain & Embedded URLs
        if (!result.domain.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(10.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.surfaceLight.copy(alpha = 0.5f))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text("Registrable Domain", color = colors.textMuted, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = result.domain,
                    color = colors.textPrimary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        if (!result.embeddedUrls.isNullOrEmpty()) {
            Spacer(modifier = Modifier.height(10.dp))
            Text("Embedded Links (${result.embeddedUrls.size}):", color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(4.dp))
            result.embeddedUrls.forEach { emb ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = emb.domain ?: emb.url,
                        color = colors.textPrimary,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    CyberBadge(verdict = emb.verdict)
                }
            }
        }

        // 7. Human-Readable Observed Risk Indicators
        if (result.indicators.isNotEmpty()) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Observed Risk Indicators",
                color = colors.textSecondary,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                result.indicators.forEach { ind ->
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Warning,
                            contentDescription = null,
                            tint = colors.suspicious,
                            modifier = Modifier
                                .size(13.dp)
                                .padding(top = 2.dp)
                        )
                        Text(
                            text = formatIndicator(ind),
                            color = colors.textPrimary,
                            fontSize = 11.sp,
                            lineHeight = 15.sp,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

/**
 * Domain Verification Status Card (V3.4)
 * Displays real DNS resolution, HTTP reachability, status code, TLS validation, and latency.
 */
@Composable
fun DomainVerificationCard(
    verification: DomainVerificationResponse,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    var showIps by remember { mutableStateOf(false) }

    val status = verification.status?.lowercase(Locale.US) ?: "unknown"
    val dnsResolved = verification.dnsResolved ?: (status != "non_existent" && status != "invalid")
    val isDnsOk = dnsResolved && status != "non_existent"
    val isReachable = verification.httpReachable == true || status == "reachable"
    val tlsValid = verification.tlsValid

    CyberCard(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Icon(
                    imageVector = Icons.Filled.Dns,
                    contentDescription = null,
                    tint = colors.brandAccent,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "Domain Existence & Reachability",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.width(6.dp))

            // Overall Status Pill (compact, nowrap)
            val (pillColor, pillText) = when (status) {
                "reachable" -> Pair(colors.safe, "Reachable")
                "unreachable" -> Pair(colors.suspicious, "Unreachable")
                "non_existent" -> Pair(colors.phishing, "NXDOMAIN")
                "invalid" -> Pair(colors.phishing, "Invalid URL")
                else -> Pair(colors.textMuted, "Verified")
            }
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = pillColor.copy(alpha = 0.12f),
                border = BorderStroke(1.dp, pillColor.copy(alpha = 0.35f))
            ) {
                Text(
                    text = pillText,
                    color = pillColor,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    softWrap = false,
                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 2x2 Grid of verification signals
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                VerificationMetricPill(
                    label = "DNS",
                    value = if (isDnsOk) "Resolved" else "Not Found",
                    isPositive = isDnsOk,
                    modifier = Modifier.weight(1f)
                )
                VerificationMetricPill(
                    label = "Reachability",
                    value = if (isReachable) "Reachable" else "Unreachable",
                    isPositive = isReachable,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val tlsLabel = when (tlsValid) {
                    true -> "TLS Valid"
                    false -> "TLS Invalid"
                    null -> if (verification.httpsReachable == true) "TLS Valid" else "Not Verified"
                }
                VerificationMetricPill(
                    label = "HTTPS / TLS",
                    value = tlsLabel,
                    isPositive = tlsValid == true || (tlsValid == null && verification.httpsReachable == true),
                    modifier = Modifier.weight(1f)
                )

                val httpStatusText = verification.httpStatus?.let { code ->
                    when (code) {
                        200 -> "200 OK"
                        301 -> "301 Redirect"
                        302 -> "302 Redirect"
                        403 -> "403 Forbidden"
                        404 -> "404 Not Found"
                        500 -> "500 Error"
                        502, 503 -> "$code Service Down"
                        else -> "$code"
                    }
                } ?: if (isReachable) "Active" else "—"

                VerificationMetricPill(
                    label = "HTTP Status",
                    value = httpStatusText,
                    isPositive = isReachable,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Latency and Redirects row
        val latency = verification.responseTimeMs
        val redirects = verification.redirectCount
        if (latency != null || redirects != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (latency != null && latency > 0) {
                    Text(
                        text = "Response: ${latency}ms",
                        color = colors.textMuted,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
                if (redirects != null) {
                    Text(
                        text = "Redirects: $redirects",
                        color = colors.textMuted,
                        fontSize = 11.sp
                    )
                }
            }
        }

        // Expandable Resolved IPs
        val ips = verification.resolvedIps
        if (!ips.isNullOrEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(6.dp))
                    .clickable { showIps = !showIps }
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (showIps) "Hide resolved IP addresses" else "Show resolved IP addresses (${ips.size})",
                    fontSize = 11.sp,
                    color = colors.brandAccent,
                    fontWeight = FontWeight.Medium
                )
                Icon(
                    imageVector = if (showIps) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = null,
                    tint = colors.brandAccent,
                    modifier = Modifier.size(16.dp)
                )
            }

            AnimatedVisibility(visible = showIps) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    ips.forEach { ip ->
                        Text(
                            text = "• $ip",
                            fontSize = 11.sp,
                            color = colors.textSecondary,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun VerificationMetricPill(
    label: String,
    value: String,
    isPositive: Boolean,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    val tintColor = if (isPositive) colors.safe else colors.suspicious

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = colors.surfaceLight.copy(alpha = 0.5f),
        border = BorderStroke(1.dp, colors.borderSubtle),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)
        ) {
            Text(
                text = label,
                fontSize = 10.sp,
                color = colors.textMuted,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(2.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(tintColor)
                )
                Text(
                    text = value,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/**
 * Brand Impersonation & Typosquatting Evidence Card (V3.4)
 * Uses separate full-width blocks to guarantee domain strings never split character-by-character.
 */
@Composable
fun BrandEvidenceCard(
    impersonatedDomain: String?,
    typosquatDomain: String?,
    potentialBrand: String?,
    observedDomain: String?,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    if (impersonatedDomain.isNullOrBlank() && typosquatDomain.isNullOrBlank() && potentialBrand.isNullOrBlank()) return

    CyberCard(
        borderColor = colors.phishing.copy(alpha = 0.35f),
        backgroundColor = colors.phishing.copy(alpha = 0.06f),
        modifier = modifier
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Warning,
                contentDescription = null,
                tint = colors.phishing,
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = "Brand Impersonation Warning",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.phishing
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        val targetBrand = potentialBrand ?: impersonatedDomain ?: typosquatDomain ?: ""
        if (targetBrand.isNotBlank()) {
            Text(
                text = "This site appears to mimic $targetBrand to mislead visitors into submitting sensitive credentials.",
                color = colors.textPrimary,
                fontSize = 12.sp,
                lineHeight = 16.sp
            )
        }

        if (!observedDomain.isNullOrBlank() || !typosquatDomain.isNullOrBlank() || !impersonatedDomain.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(10.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!observedDomain.isNullOrBlank()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(colors.surfaceLight.copy(alpha = 0.5f))
                            .padding(horizontal = 10.dp, vertical = 7.dp)
                    ) {
                        Text(
                            text = "Scanned Domain",
                            color = colors.textMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 0.4.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = observedDomain,
                            color = colors.phishing,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 12.sp,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                val legitimateTarget = impersonatedDomain ?: typosquatDomain
                if (!legitimateTarget.isNullOrBlank()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(colors.surfaceLight.copy(alpha = 0.5f))
                            .padding(horizontal = 10.dp, vertical = 7.dp)
                    ) {
                        Text(
                            text = "Possible Legitimate Domain",
                            color = colors.textMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 0.4.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = legitimateTarget,
                            color = colors.safe,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 12.sp,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

/**
 * Collapsible LinearSVC Technical Decision Margins Card (V3.4 / V2.1 Parity)
 * Displays raw model hyperplane scores without fabricating probabilities.
 */
@Composable
fun TechnicalDecisionMarginsCard(
    decisionScores: Map<String, Double>?,
    engineName: String,
    modelVersion: String,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    var isExpanded by remember { mutableStateOf(false) }

    if (decisionScores.isNullOrEmpty()) return

    CyberCard(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(6.dp))
                .clickable { isExpanded = !isExpanded }
                .padding(vertical = 2.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Icon(
                    imageVector = Icons.Filled.Analytics,
                    contentDescription = null,
                    tint = colors.brandAccent,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "TECHNICAL ML DECISION MARGINS",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.width(6.dp))

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = colors.brandAccent.copy(alpha = 0.10f),
                border = BorderStroke(1.dp, colors.brandAccent.copy(alpha = 0.25f))
            ) {
                Text(
                    text = "ℹ Relative Margins",
                    color = colors.brandAccent,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FontFamily.Monospace,
                    maxLines = 1,
                    softWrap = false,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }

        AnimatedVisibility(visible = isExpanded) {
            Column(modifier = Modifier.padding(top = 10.dp)) {
                Text(
                    text = "These values are relative classifier decision margins, not probabilities. The final verdict combines ML evidence with domain, DNS, TLS, reachability, reputation, and brand-impersonation signals.",
                    fontSize = 11.sp,
                    color = colors.textSecondary,
                    lineHeight = 15.sp
                )

                Spacer(modifier = Modifier.height(10.dp))

                val classes = listOf("benign", "malware", "phishing", "defacement")
                classes.forEach { className ->
                    val score = decisionScores[className]
                    if (score != null) {
                        DecisionMarginBar(
                            label = className.uppercase(Locale.US),
                            score = score
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Engine: $engineName", color = colors.textMuted, fontSize = 10.sp)
                    Text("Model: $modelVersion", color = colors.textMuted, fontSize = 10.sp)
                }
            }
        }
    }
}

@Composable
private fun DecisionMarginBar(
    label: String,
    score: Double
) {
    val colors = LocalAppColors.current
    val isPositive = score >= 0
    val barColor = when (label.lowercase(Locale.US)) {
        "benign" -> if (isPositive) colors.safe else colors.textMuted
        "phishing" -> if (isPositive) colors.phishing else colors.textMuted
        "malware" -> if (isPositive) colors.malware else colors.textMuted
        "defacement" -> if (isPositive) colors.defacement else colors.textMuted
        else -> colors.brandAccent
    }

    val formattedScore = String.format(Locale.US, "%+.4f", score)

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = colors.textPrimary
            )
            Text(
                text = formattedScore,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = barColor
            )
        }

        Spacer(modifier = Modifier.height(3.dp))

        // Normalized horizontal bar (-5.0 to +5.0)
        val normalized = ((score + 5.0) / 10.0).coerceIn(0.02, 1.0).toFloat()
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(5.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(colors.surfaceLight)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction = normalized)
                    .clip(RoundedCornerShape(3.dp))
                    .background(barColor)
            )
        }
    }
}

/**
 * Native Android Interactive URL Anatomy Breakdown (V3.4 / V2.1 Parity)
 */
data class UrlSegment(
    val type: String, // "Scheme", "Subdomain", "Domain", "TLD", "Path", "Query", "Fragment"
    val value: String,
    val explanation: String,
    val securityTip: String,
    val isSuspicious: Boolean = false,
    val categoryLabel: String = "URL Component",
    val whatIsIt: String = "",
    val whyItMatters: String = "",
    val whatLinkSentryChecks: String = ""
)

fun parseUrlAnatomyNative(rawUrl: String, indicators: List<String> = emptyList()): List<UrlSegment> {
    if (rawUrl.isBlank()) return emptyList()
    val fullUrl = if (!rawUrl.startsWith("http://", ignoreCase = true) && !rawUrl.startsWith("https://", ignoreCase = true)) {
        "https://$rawUrl"
    } else {
        rawUrl
    }

    val segments = mutableListOf<UrlSegment>()
    try {
        val uri = URI(fullUrl)
        val scheme = uri.scheme ?: "https"
        val isHttp = scheme.equals("http", ignoreCase = true)

        segments.add(
            UrlSegment(
                type = "Scheme",
                value = "$scheme://",
                explanation = "Specifies the communication protocol for transferring data.",
                securityTip = if (isHttp) "Warning: HTTP sends data in unencrypted plaintext." else "HTTPS encrypts transit, but does not guarantee the site is benign.",
                isSuspicious = isHttp,
                categoryLabel = "Network Protocol",
                whatIsIt = "Defines how data is transferred between your browser and the server.",
                whyItMatters = "Insecure HTTP exposes credentials to interception on local networks.",
                whatLinkSentryChecks = "Validates encryption state, TLS certificate status, and cipher strength."
            )
        )

        val host = uri.host ?: ""
        if (host.isNotBlank()) {
            val parts = host.split(".")
            val multiPartTlds = setOf("co.uk", "com.au", "co.in", "net.nz", "com.br", "org.uk", "gov.in", "edu.au")
            var tldLen = 1
            if (parts.size >= 2) {
                val candidate = "${parts[parts.size - 2]}.${parts.last()}".lowercase(Locale.US)
                if (multiPartTlds.contains(candidate)) {
                    tldLen = 2
                }
            }

            if (parts.size > tldLen) {
                val tldParts = parts.takeLast(tldLen)
                val tld = tldParts.joinToString(".")
                val domainName = parts[parts.size - tldLen - 1]
                val subdomains = parts.take(parts.size - tldLen - 1)

                if (subdomains.isNotEmpty()) {
                    val subValue = subdomains.joinToString(".")
                    val hasStacked = subdomains.size > 2
                    segments.add(
                        UrlSegment(
                            type = "Subdomain",
                            value = "$subValue.",
                            explanation = "A prefix specifying a section of the domain controlled by the owner.",
                            securityTip = if (hasStacked) "Caution: Attackers frequently stack brand names into subdomains." else "Always verify the main registered domain following the subdomain.",
                            isSuspicious = hasStacked,
                            categoryLabel = "Host Prefix",
                            whatIsIt = "A designated sub-section of the website managed by the domain owner.",
                            whyItMatters = "Phishing links frequently insert trusted names here e.g. login.microsoft.com.attacker.xyz.",
                            whatLinkSentryChecks = "Inspects for brand stacking, homoglyph character spoofing, and excessive depth."
                        )
                    )
                }

                val hasTyposquat = indicators.any { it.contains("resembles", ignoreCase = true) || it.contains("impersonation", ignoreCase = true) || it.contains("typosquat", ignoreCase = true) }
                segments.add(
                    UrlSegment(
                        type = "Registered Domain",
                        value = domainName,
                        explanation = "The unique brand identifier registered with a domain registrar.",
                        securityTip = "This determines who legally operates the website.",
                        isSuspicious = hasTyposquat,
                        categoryLabel = "Brand Identity",
                        whatIsIt = "The core registered name identifying the entity operating this web property.",
                        whyItMatters = "Attackers register typosquats like 'ggle.com' to deceive users.",
                        whatLinkSentryChecks = "Runs Levenshtein string distance and brand protection heuristics."
                    )
                )

                val isSuspiciousTld = setOf("xyz", "top", "work", "loan", "click", "buzz", "cfd").contains(tld.lowercase(Locale.US))
                segments.add(
                    UrlSegment(
                        type = "TLD",
                        value = ".$tld",
                        explanation = "The top-level domain suffix managing the namespace.",
                        securityTip = if (isSuspiciousTld) "This TLD is statistically common in short-lived phishing campaigns." else "Common TLD managed by official registry.",
                        isSuspicious = isSuspiciousTld,
                        categoryLabel = "Domain Extension",
                        whatIsIt = "The suffix at the end of the domain managed by registries.",
                        whyItMatters = "Cheap or disposable TLDs are heavily abused for short-lived disposable lures.",
                        whatLinkSentryChecks = "Cross-references TLD risk reputation tables and registrar history."
                    )
                )
            } else {
                segments.add(
                    UrlSegment(
                        type = "Host",
                        value = host,
                        explanation = "Target hostname.",
                        securityTip = "Direct host or IP address without standard domain hierarchy.",
                        categoryLabel = "Network Host",
                        whatIsIt = "Direct server endpoint address.",
                        whyItMatters = "Raw IP hosts bypass standard domain reputation systems.",
                        whatLinkSentryChecks = "Performs reverse DNS and IP reputation lookup."
                    )
                )
            }
        }

        val path = uri.path
        if (!path.isNullOrBlank() && path != "/") {
            val hasLogin = path.contains("login", ignoreCase = true) || path.contains("verify", ignoreCase = true)
            segments.add(
                UrlSegment(
                    type = "Path",
                    value = path,
                    explanation = "Specifies the specific page, directory, or endpoint on the server.",
                    securityTip = if (hasLogin) "Credential lure keywords detected in path." else "Standard server resource route.",
                    isSuspicious = hasLogin,
                    categoryLabel = "Resource Endpoint",
                    whatIsIt = "The hierarchical route pointing to a specific file or handler on the server.",
                    whyItMatters = "Attackers embed fake authentication screens under convincing path names.",
                    whatLinkSentryChecks = "Scans for login, credential capture, and password reset keyword patterns."
                )
            )
        }

        val query = uri.query
        if (!query.isNullOrBlank()) {
            segments.add(
                UrlSegment(
                    type = "Query",
                    value = "?$query",
                    explanation = "Key-value parameters passed to the application.",
                    securityTip = "Check for hidden redirect targets e.g. ?redirect_url=.",
                    categoryLabel = "Query Parameters",
                    whatIsIt = "Key-value pairs supplied to the web application.",
                    whyItMatters = "Open redirect attacks hide the final phishing destination inside parameters.",
                    whatLinkSentryChecks = "Analyzes parameter keys for nested URLs and redirection targets."
                )
            )
        }

        val fragment = uri.fragment
        if (!fragment.isNullOrBlank()) {
            segments.add(
                UrlSegment(
                    type = "Fragment",
                    value = "#$fragment",
                    explanation = "Client-side anchor referencing a section within the document.",
                    securityTip = "Processed directly by the client browser.",
                    categoryLabel = "Document Anchor",
                    whatIsIt = "An internal page anchor handled locally by the browser.",
                    whyItMatters = "Can be used to trigger client-side scripts or obfuscate target state.",
                    whatLinkSentryChecks = "Validates fragment syntax and client routing structures."
                )
            )
        }
    } catch (_: Exception) {
        segments.clear()
        segments.add(
            UrlSegment(
                type = "Raw Target",
                value = rawUrl,
                explanation = "Unparsed URL string.",
                securityTip = "Format contains non-standard URI syntax.",
                categoryLabel = "Raw String",
                whatIsIt = "Unparsed raw address input.",
                whyItMatters = "Non-standard syntax may indicate obfuscation.",
                whatLinkSentryChecks = "Applies defensive regex normalization."
            )
        )
    }
    return segments
}

@Composable
fun UrlAnatomyView(
    url: String,
    indicators: List<String> = emptyList(),
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    val segments = remember(url, indicators) { parseUrlAnatomyNative(url, indicators) }
    var selectedSegment by remember { mutableStateOf<UrlSegment?>(null) }

    if (segments.isEmpty()) return

    CyberCard(modifier = modifier) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.AccountTree,
                contentDescription = null,
                tint = colors.brandAccent,
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = "Interactive URL Anatomy",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.textPrimary
            )
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Tap any segment to inspect its structure and security significance.",
            fontSize = 11.sp,
            color = colors.textSecondary
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Horizontal Segment Chips (min 44dp touch target height)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            segments.forEach { segment ->
                val isSelected = selectedSegment?.type == segment.type
                val chipColor = if (segment.isSuspicious) colors.phishing else colors.brandAccent

                Surface(
                    onClick = { selectedSegment = if (isSelected) null else segment },
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) chipColor.copy(alpha = 0.20f) else colors.surfaceLight,
                    border = BorderStroke(1.dp, if (isSelected) chipColor else colors.borderSubtle),
                    modifier = Modifier.defaultMinSize(minHeight = 44.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Column {
                            Text(
                                text = segment.type.uppercase(Locale.US),
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (segment.isSuspicious) colors.phishing else colors.textMuted
                            )
                            Text(
                                text = segment.value,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                fontFamily = FontFamily.Monospace,
                                color = if (segment.isSuspicious) colors.phishing else colors.textPrimary
                            )
                        }
                        if (segment.isSuspicious) {
                            Icon(
                                imageVector = Icons.Filled.Warning,
                                contentDescription = null,
                                tint = colors.phishing,
                                modifier = Modifier.size(12.dp)
                            )
                        }
                    }
                }
            }
        }

        // Active Segment Detail Card (V2.1 Structured Q&A)
        selectedSegment?.let { seg ->
            Spacer(modifier = Modifier.height(10.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = colors.surfaceLight.copy(alpha = 0.7f),
                border = BorderStroke(1.dp, colors.borderSubtle),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${seg.categoryLabel.uppercase(Locale.US)}: ${seg.type}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (seg.isSuspicious) colors.phishing else colors.brandAccent
                        )
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = (if (seg.isSuspicious) colors.phishing else colors.safe).copy(alpha = 0.12f),
                            border = BorderStroke(1.dp, (if (seg.isSuspicious) colors.phishing else colors.safe).copy(alpha = 0.35f))
                        ) {
                            Text(
                                text = if (seg.isSuspicious) "SUSPICIOUS" else "VERIFIED",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (seg.isSuspicious) colors.phishing else colors.safe,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    if (seg.whatIsIt.isNotBlank()) {
                        Text("WHAT IS IT?", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, letterSpacing = 0.5.sp)
                        Text(seg.whatIsIt, fontSize = 11.sp, color = colors.textPrimary, lineHeight = 15.sp)
                        Spacer(modifier = Modifier.height(6.dp))
                    }

                    if (seg.whyItMatters.isNotBlank()) {
                        Text("WHY DOES IT MATTER?", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, letterSpacing = 0.5.sp)
                        Text(seg.whyItMatters, fontSize = 11.sp, color = colors.textPrimary, lineHeight = 15.sp)
                        Spacer(modifier = Modifier.height(6.dp))
                    }

                    if (seg.whatLinkSentryChecks.isNotBlank()) {
                        Text("WHAT LINKSENTRY CHECKS", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.brandAccent, letterSpacing = 0.5.sp)
                        Text(seg.whatLinkSentryChecks, fontSize = 11.sp, color = colors.textSecondary, lineHeight = 15.sp)
                    }
                }
            }
        }
    }
}

/**
 * Expandable Educational Security Knowledge Cards (V3.4)
 */
@Composable
fun UnderstandTheLinkCard(
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    var isExpanded by remember { mutableStateOf(false) }

    CyberCard(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(6.dp))
                .clickable { isExpanded = !isExpanded }
                .padding(vertical = 2.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.School,
                    contentDescription = null,
                    tint = colors.brandAccent,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "Understand This Link",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textPrimary
                )
            }
            Icon(
                imageVector = if (isExpanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = null,
                tint = colors.brandAccent,
                modifier = Modifier.size(18.dp)
            )
        }

        AnimatedVisibility(visible = isExpanded) {
            Column(
                modifier = Modifier.padding(top = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                EducationalTipItem(
                    title = "1. HTTPS ≠ Trusted",
                    desc = "HTTPS encrypts the connection. It does not prove that the website is legitimate. Over 80% of modern phishing websites use valid SSL/TLS certificates."
                )
                EducationalTipItem(
                    title = "2. Check the Registered Domain",
                    desc = "Attackers can hide behind convincing subdomains like 'login.microsoft.com.attacker.xyz'. The real owner is always the segment immediately before the TLD."
                )
                EducationalTipItem(
                    title = "3. Unreachable ≠ Malicious",
                    desc = "A dead, unreachable, or 404 website is not automatically a phishing site. LinkSentry separates domain existence verification from malicious intent classification."
                )
                EducationalTipItem(
                    title = "4. Lookalike Domains & Typosquatting",
                    desc = "Attackers substitute visually identical characters (such as 'paypa1.com' vs 'paypal.com') or register lookalike TLDs to impersonate trusted brands."
                )
            }
        }
    }
}

@Composable
private fun EducationalTipItem(
    title: String,
    desc: String
) {
    val colors = LocalAppColors.current
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = colors.surfaceLight.copy(alpha = 0.5f),
        border = BorderStroke(1.dp, colors.borderSubtle),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.brandAccent
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = desc,
                fontSize = 11.sp,
                color = colors.textSecondary,
                lineHeight = 15.sp
            )
        }
    }
}
