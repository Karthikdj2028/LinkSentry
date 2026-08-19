package com.linksentry.app.data.model

import com.google.gson.annotations.SerializedName

data class HealthResponse(
    @SerializedName("status") val status: String,
    @SerializedName("service") val service: String,
    @SerializedName("version") val version: String,
    @SerializedName("model_version") val modelVersion: String? = null,
    @SerializedName("engine") val engine: String? = null
)

data class UrlScanRequest(
    @SerializedName("url") val url: String
)

data class ThreatAnalysisResponse(
    @SerializedName("verdict") val verdict: String? = null,
    @SerializedName("risk_score") val riskScore: Int? = null,
    @SerializedName("ml_prediction") val mlPrediction: String? = null,
    @SerializedName("confidence") val confidence: Double? = null
)

data class DomainVerificationResponse(
    @SerializedName("status") val status: String? = null,
    @SerializedName("dns_resolved") val dnsResolved: Boolean? = null,
    @SerializedName("dns_status") val dnsStatus: String? = null,
    @SerializedName("resolved_ips") val resolvedIps: List<String>? = null,
    @SerializedName("http_reachable") val httpReachable: Boolean? = null,
    @SerializedName("https_reachable") val httpsReachable: Boolean? = null,
    @SerializedName("http_status") val httpStatus: Int? = null,
    @SerializedName("final_url") val finalUrl: String? = null,
    @SerializedName("redirect_count") val redirectCount: Int? = null,
    @SerializedName("response_time_ms") val responseTimeMs: Int? = null,
    @SerializedName("tls_valid") val tlsValid: Boolean? = null,
    @SerializedName("error") val error: String? = null
)

data class UrlScanResponse(
    @SerializedName("verdict") val verdict: String,
    @SerializedName("risk_score") val riskScore: Int,
    @SerializedName("confidence") val confidence: Double,
    @SerializedName("url") val url: String,
    @SerializedName("domain") val domain: String?,
    @SerializedName("indicators") val indicators: List<String>?,
    @SerializedName("engine") val engine: String?,
    @SerializedName("model_version") val modelVersion: String?,
    @SerializedName("ml_prediction") val mlPrediction: String?,
    @SerializedName("model_prediction") val modelPrediction: String?,
    @SerializedName("trusted_domain") val trustedDomain: Boolean?,
    @SerializedName("trust_override") val trustOverride: Boolean?,
    @SerializedName("rule_override") val ruleOverride: Boolean?,
    @SerializedName("impersonated_domain") val impersonatedDomain: String?,
    @SerializedName("typosquat_domain") val typosquatDomain: String?,
    @SerializedName("potential_brand") val potentialBrand: String? = null,
    @SerializedName("suspicious_signals") val suspiciousSignals: List<String>?,
    @SerializedName("decision_scores") val decisionScores: Map<String, Double>?,
    @SerializedName("threat_analysis") val threatAnalysis: ThreatAnalysisResponse? = null,
    @SerializedName("domain_verification") val domainVerification: DomainVerificationResponse? = null
)

data class MessageScanRequest(
    @SerializedName("message") val message: String
)

data class EmbeddedUrlResult(
    @SerializedName("url") val url: String,
    @SerializedName("domain") val domain: String?,
    @SerializedName("verdict") val verdict: String,
    @SerializedName("risk_score") val riskScore: Int,
    @SerializedName("confidence") val confidence: Double,
    @SerializedName("indicators") val indicators: List<String>?,
    @SerializedName("engine") val engine: String?
)

data class MessageScanResponse(
    @SerializedName("verdict") val verdict: String,
    @SerializedName("risk_score") val riskScore: Int,
    @SerializedName("confidence") val confidence: Double,
    @SerializedName("message") val message: String,
    @SerializedName("indicators") val indicators: List<String>?,
    @SerializedName("message_risk") val messageRisk: Int? = null,
    @SerializedName("embedded_urls") val embeddedUrls: List<EmbeddedUrlResult>? = null,
    @SerializedName("engine") val engine: String?
)
