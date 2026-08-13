package com.linksentry.app.model

import com.google.gson.Gson
import com.linksentry.app.data.model.HealthResponse
import com.linksentry.app.data.model.MessageScanRequest
import com.linksentry.app.data.model.MessageScanResponse
import com.linksentry.app.data.model.UrlScanRequest
import com.linksentry.app.data.model.UrlScanResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
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
    fun testUrlScanResponseSerialization() {
        val json = """
            {
                "verdict": "phishing",
                "risk_score": 92,
                "confidence": 0.94,
                "url": "https://secure-login-attempt.net",
                "domain": "secure-login-attempt.net",
                "indicators": ["Lookalike domain", "Urgent keywords"],
                "engine": "LinkSentry V3.3 URL ML Engine",
                "model_version": "V3.3"
            }
        """.trimIndent()

        val response = gson.fromJson(json, UrlScanResponse::class.java)
        assertEquals("phishing", response.verdict)
        assertEquals(92, response.riskScore)
        assertEquals(0.94, response.confidence, 0.001)
        assertEquals("secure-login-attempt.net", response.domain)
        assertNotNull(response.indicators)
        assertEquals(2, response.indicators?.size)
        assertEquals("V3.3", response.modelVersion)
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
}
