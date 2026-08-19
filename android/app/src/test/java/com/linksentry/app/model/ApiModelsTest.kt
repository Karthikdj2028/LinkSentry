package com.linksentry.app.model

import com.google.gson.Gson
import com.linksentry.app.data.model.DomainVerificationResponse
import com.linksentry.app.data.model.HealthResponse
import com.linksentry.app.data.model.MessageScanRequest
import com.linksentry.app.data.model.MessageScanResponse
import com.linksentry.app.data.model.ThreatAnalysisResponse
import com.linksentry.app.data.model.UrlScanRequest
import com.linksentry.app.data.model.UrlScanResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiModelsTest {

    private val gson = Gson()

    @Test
    fun testHealthResponseSerialization() {
        val json = """{"status":"healthy","service":"linksentry-api","version":"0.5.0"}"""
        val response = gson.fromJson(json, HealthResponse::class.java)

        assertEquals("healthy", response.status)
        assertEquals("linksentry-api", response.service)
        assertEquals("0.5.0", response.version)
    }

    @Test
    fun testUrlScanRequestSerialization() {
        val req = UrlScanRequest(url = "https://example.com")
        val json = gson.toJson(req)
        assertTrue(json.contains("https://example.com"))
    }

    @Test
    fun testUrlScanResponseV34FullSerialization() {
        val json = """
            {
                "verdict": "phishing",
                "risk_score": 92,
                "confidence": 0.94,
                "url": "https://secure-login-attempt.net",
                "domain": "secure-login-attempt.net",
                "indicators": ["Lookalike domain", "Urgent keywords"],
                "engine": "LinkSentry V3.4 ML + Reachability Engine",
                "model_version": "V3.4",
                "impersonated_domain": "paypal.com",
                "typosquat_domain": "paypa1.com",
                "potential_brand": "PayPal",
                "decision_scores": {
                    "benign": -0.9821,
                    "malware": -1.3320,
                    "phishing": 1.4520,
                    "defacement": -3.2011
                },
                "threat_analysis": {
                    "verdict": "phishing",
                    "risk_score": 92,
                    "ml_prediction": "phishing",
                    "confidence": 0.94
                },
                "domain_verification": {
                    "status": "reachable",
                    "dns_resolved": true,
                    "dns_status": "NOERROR",
                    "resolved_ips": ["93.184.216.34"],
                    "http_reachable": true,
                    "https_reachable": true,
                    "http_status": 200,
                    "final_url": "https://secure-login-attempt.net/login",
                    "redirect_count": 1,
                    "response_time_ms": 145,
                    "tls_valid": true,
                    "error": null
                }
            }
        """.trimIndent()

        val response = gson.fromJson(json, UrlScanResponse::class.java)
        assertEquals("phishing", response.verdict)
        assertEquals(92, response.riskScore)
        assertEquals(0.94, response.confidence, 0.001)
        assertEquals("secure-login-attempt.net", response.domain)
        assertEquals("V3.4", response.modelVersion)
        assertEquals("paypal.com", response.impersonatedDomain)
        assertEquals("paypa1.com", response.typosquatDomain)
        assertEquals("PayPal", response.potentialBrand)

        // Decision scores
        assertNotNull(response.decisionScores)
        assertEquals(1.4520, response.decisionScores?.get("phishing") ?: 0.0, 0.001)
        assertEquals(-0.9821, response.decisionScores?.get("benign") ?: 0.0, 0.001)

        // Threat analysis
        assertNotNull(response.threatAnalysis)
        assertEquals("phishing", response.threatAnalysis?.verdict)
        assertEquals(92, response.threatAnalysis?.riskScore)

        // Domain verification
        assertNotNull(response.domainVerification)
        val verif = response.domainVerification!!
        assertEquals("reachable", verif.status)
        assertEquals(true, verif.dnsResolved)
        assertEquals("NOERROR", verif.dnsStatus)
        assertEquals(1, verif.resolvedIps?.size)
        assertEquals("93.184.216.34", verif.resolvedIps?.first())
        assertEquals(true, verif.httpReachable)
        assertEquals(200, verif.httpStatus)
        assertEquals(145, verif.responseTimeMs)
        assertEquals(true, verif.tlsValid)
        assertNull(verif.error)
    }

    @Test
    fun testDomainVerificationNxdomainDeserialization() {
        val json = """
            {
                "status": "non_existent",
                "dns_resolved": false,
                "dns_status": "NXDOMAIN",
                "resolved_ips": [],
                "http_reachable": false,
                "https_reachable": false,
                "http_status": null,
                "error": "Domain does not exist in public DNS."
            }
        """.trimIndent()

        val verif = gson.fromJson(json, DomainVerificationResponse::class.java)
        assertEquals("non_existent", verif.status)
        assertFalse(verif.dnsResolved ?: true)
        assertEquals("NXDOMAIN", verif.dnsStatus)
        assertTrue(verif.resolvedIps?.isEmpty() == true)
        assertFalse(verif.httpReachable ?: true)
        assertEquals("Domain does not exist in public DNS.", verif.error)
    }

    @Test
    fun testDomainVerificationHttpStatus404And500() {
        val json404 = """
            {
                "status": "reachable",
                "dns_resolved": true,
                "http_reachable": true,
                "http_status": 404,
                "response_time_ms": 95
            }
        """.trimIndent()

        val verif404 = gson.fromJson(json404, DomainVerificationResponse::class.java)
        assertEquals("reachable", verif404.status)
        assertEquals(404, verif404.httpStatus)
        assertTrue(verif404.httpReachable ?: false)

        val json500 = """
            {
                "status": "reachable",
                "dns_resolved": true,
                "http_reachable": true,
                "http_status": 500,
                "response_time_ms": 110
            }
        """.trimIndent()

        val verif500 = gson.fromJson(json500, DomainVerificationResponse::class.java)
        assertEquals(500, verif500.httpStatus)
        assertTrue(verif500.httpReachable ?: false)
    }

    @Test
    fun testUrlScanResponseBackwardCompatibilityMissingV34Fields() {
        val legacyJson = """
            {
                "verdict": "safe",
                "risk_score": 0,
                "confidence": 0.99,
                "url": "https://google.com",
                "domain": "google.com",
                "indicators": ["Safe domain"]
            }
        """.trimIndent()

        val response = gson.fromJson(legacyJson, UrlScanResponse::class.java)
        assertEquals("safe", response.verdict)
        assertEquals(0, response.riskScore)
        assertNull(response.domainVerification)
        assertNull(response.threatAnalysis)
        assertNull(response.decisionScores)
        assertNull(response.impersonatedDomain)
    }

    @Test
    fun testMessageScanResponseSerialization() {
        val json = """
            {
                "verdict": "suspicious",
                "risk_score": 65,
                "confidence": 0.88,
                "message": "Urgent: Verify your banking credentials",
                "indicators": ["Financial urgent lure"],
                "engine": "LinkSentry Smishing Heuristic Engine"
            }
        """.trimIndent()

        val response = gson.fromJson(json, MessageScanResponse::class.java)
        assertEquals("suspicious", response.verdict)
        assertEquals(65, response.riskScore)
        assertEquals(0.88, response.confidence, 0.001)
        assertEquals("LinkSentry Smishing Heuristic Engine", response.engine)
    }

    @Test
    fun testUrlScanResponseV34TyposquattingSignalMapping() {
        val jsonFixture = """
            {
                "verdict": "suspicious",
                "risk_score": 60,
                "confidence": 0.9878,
                "url": "https://www.ggle.com/search?q=whatsapp+web",
                "domain": "ggle.com",
                "indicators": [
                    "Domain verified reachable (HTTP 200)",
                    "HTTPS / TLS transport layer active",
                    "typosquatting_brand",
                    "Observed domain resembles protected brand (google): google.com"
                ],
                "engine": "LinkSentry V3.4 ML + Reachability Engine",
                "threat_analysis": {
                    "verdict": "suspicious",
                    "risk_score": 60,
                    "ml_prediction": "benign",
                    "confidence": 0.9878
                },
                "domain_verification": {
                    "status": "reachable",
                    "dns_resolved": true,
                    "dns_status": "Resolved (76.223.54.146, 13.248.169.48)",
                    "resolved_ips": ["76.223.54.146", "13.248.169.48"],
                    "http_reachable": true,
                    "https_reachable": true,
                    "http_status": 200,
                    "final_url": "https://www.ggle.com/search?q=whatsapp+web",
                    "redirect_count": 0,
                    "response_time_ms": 2423,
                    "tls_valid": true,
                    "error": null
                },
                "ml_prediction": "benign",
                "model_prediction": "benign",
                "trusted_domain": false,
                "trust_override": false,
                "rule_override": false,
                "impersonated_domain": null,
                "typosquat_domain": "google.com",
                "potential_brand": "google",
                "suspicious_signals": ["typosquatting_brand"],
                "decision_scores": {
                    "benign": 2.440208,
                    "defacement": -4.037403,
                    "malware": -3.267446,
                    "phishing": -2.454384
                },
                "model_version": "V3.4"
            }
        """.trimIndent()

        val response = gson.fromJson(jsonFixture, UrlScanResponse::class.java)

        assertEquals("suspicious", response.verdict)
        assertEquals(60, response.riskScore)
        assertEquals(0.9878, response.confidence, 0.0001)
        assertEquals("ggle.com", response.domain)
        assertEquals("LinkSentry V3.4 ML + Reachability Engine", response.engine)
        assertEquals("V3.4", response.modelVersion)
        assertEquals("google.com", response.typosquatDomain)
        assertEquals("google", response.potentialBrand)
        assertNull(response.impersonatedDomain)

        // Decision scores
        assertNotNull(response.decisionScores)
        assertEquals(2.440208, response.decisionScores?.get("benign") ?: 0.0, 0.0001)
        assertEquals(-2.454384, response.decisionScores?.get("phishing") ?: 0.0, 0.0001)

        // Domain verification
        assertNotNull(response.domainVerification)
        val verif = response.domainVerification!!
        assertEquals("reachable", verif.status)
        assertTrue(verif.dnsResolved == true)
        assertEquals(200, verif.httpStatus)
        assertTrue(verif.tlsValid == true)
        assertEquals(2, verif.resolvedIps?.size)
        assertEquals("76.223.54.146", verif.resolvedIps?.get(0))
        assertEquals("13.248.169.48", verif.resolvedIps?.get(1))
    }

    @Test
    fun testUrlScanResponsePotentialBrandWithoutTyposquat() {
        val json = """
            {
                "verdict": "suspicious",
                "risk_score": 45,
                "confidence": 0.85,
                "url": "https://auth-portal-update.org",
                "domain": "auth-portal-update.org",
                "potential_brand": "Microsoft",
                "engine": "LinkSentry V3.4 ML + Reachability Engine",
                "model_version": "V3.4"
            }
        """.trimIndent()

        val response = gson.fromJson(json, UrlScanResponse::class.java)
        assertEquals("Microsoft", response.potentialBrand)
        assertNull(response.typosquatDomain)
        assertNull(response.impersonatedDomain)
        assertNull(response.domainVerification)
    }
}
