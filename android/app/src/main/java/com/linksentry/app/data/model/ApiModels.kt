package com.linksentry.app.data.model

import com.google.gson.annotations.SerializedName

data class HealthResponse(
    @SerializedName("status") val status: String,
    @SerializedName("service") val service: String,
    @SerializedName("version") val version: String
)

data class UrlScanRequest(
    @SerializedName("url") val url: String
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
    @SerializedName("suspicious_signals") val suspiciousSignals: List<String>?,
    @SerializedName("decision_scores") val decisionScores: Map<String, Double>?
)

data class MessageScanRequest(
    @SerializedName("message") val message: String
)

data class MessageScanResponse(
    @SerializedName("verdict") val verdict: String,
    @SerializedName("risk_score") val riskScore: Int,
    @SerializedName("confidence") val confidence: Double,
    @SerializedName("message") val message: String,
    @SerializedName("indicators") val indicators: List<String>?,
    @SerializedName("engine") val engine: String?
)
