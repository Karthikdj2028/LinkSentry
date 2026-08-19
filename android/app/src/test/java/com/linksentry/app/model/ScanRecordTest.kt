package com.linksentry.app.model

import com.linksentry.app.data.model.ScanRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class ScanRecordTest {

    @Test
    fun testScanRecordDefaultValues() {
        val record = ScanRecord()
        assertEquals("", record.id)
        assertEquals("", record.userId)
        assertEquals("url", record.type)
        assertEquals("safe", record.verdict)
        assertEquals(0, record.riskScore)
        assertEquals(0.0, record.confidence, 0.001)
        assertEquals("android", record.source)
        assertEquals("LinkSentry V3.4 URL ML Engine", record.engine)
        assertEquals("V3.4", record.modelVersion)
        assertNotNull(record.formattedDate)
    }

    @Test
    fun testScanRecordCustomProperties() {
        val record = ScanRecord(
            id = "test-scan-123",
            userId = "analyst-uid-456",
            type = "qr",
            input = "https://phish-target.com",
            url = "https://phish-target.com",
            domain = "phish-target.com",
            verdict = "phishing",
            riskScore = 95,
            confidence = 0.98,
            indicators = listOf("Typosquatting detected", "Suspicious TLD"),
            engine = "LinkSentry V3.4 URL ML Engine",
            modelVersion = "V3.4",
            source = "android"
        )

        assertEquals("test-scan-123", record.id)
        assertEquals("analyst-uid-456", record.userId)
        assertEquals("qr", record.type)
        assertEquals("phish-target.com", record.domain)
        assertEquals("phishing", record.verdict)
        assertEquals(95, record.riskScore)
        assertEquals(0.98, record.confidence, 0.001)
        assertEquals(2, record.indicators.size)
        assertEquals("android", record.source)
    }

    @Test
    fun testScanRecordHistoryInvariantNoDecisionScores() {
        val recordClass = ScanRecord::class.java
        val fields = recordClass.declaredFields.map { it.name }
        // Ensure raw LinearSVC decision scores and temporary telemetry are not stored
        org.junit.Assert.assertFalse("ScanRecord must not store decisionScores", fields.contains("decisionScores"))
        org.junit.Assert.assertFalse("ScanRecord must not store domainVerification", fields.contains("domainVerification"))
    }
}
