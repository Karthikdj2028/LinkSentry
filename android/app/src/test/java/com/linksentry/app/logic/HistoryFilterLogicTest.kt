package com.linksentry.app.logic

import com.linksentry.app.data.model.ScanRecord
import org.junit.Assert.assertEquals
import org.junit.Test

class HistoryFilterLogicTest {

    private val sampleScans = listOf(
        ScanRecord(id = "1", input = "https://safe-domain.org", domain = "safe-domain.org", url = "https://safe-domain.org", verdict = "safe", riskScore = 10, type = "url"),
        ScanRecord(id = "2", input = "https://paypal-security-alert.net", domain = "paypal-security-alert.net", url = "https://paypal-security-alert.net", verdict = "phishing", riskScore = 95, type = "url"),
        ScanRecord(id = "3", input = "https://suspicious-promo.xyz", domain = "suspicious-promo.xyz", url = "https://suspicious-promo.xyz", verdict = "suspicious", riskScore = 55, type = "qr"),
        ScanRecord(id = "4", input = "Your account is locked. Verify at http://bank.com", domain = "", url = "", verdict = "phishing", riskScore = 88, type = "message")
    )

    private fun applyFilter(scans: List<ScanRecord>, query: String, filter: String): List<ScanRecord> {
        return scans.filter { scan ->
            val matchesSearch = query.isBlank() ||
                    scan.input.contains(query, ignoreCase = true) ||
                    scan.domain.contains(query, ignoreCase = true) ||
                    scan.url.contains(query, ignoreCase = true)

            val matchesFilter = when (filter.lowercase()) {
                "all" -> true
                "phishing" -> scan.verdict.lowercase() == "phishing"
                "suspicious" -> scan.verdict.lowercase() == "suspicious"
                "safe" -> scan.verdict.lowercase() == "safe"
                "url" -> scan.type.lowercase() == "url"
                "qr" -> scan.type.lowercase() == "qr"
                "message" -> scan.type.lowercase() == "message"
                else -> true
            }

            matchesSearch && matchesFilter
        }
    }

    @Test
    fun testFilterAll() {
        val filtered = applyFilter(sampleScans, "", "all")
        assertEquals(4, filtered.size)
    }

    @Test
    fun testFilterPhishing() {
        val filtered = applyFilter(sampleScans, "", "phishing")
        assertEquals(2, filtered.size)
    }

    @Test
    fun testFilterByVectorQr() {
        val filtered = applyFilter(sampleScans, "", "qr")
        assertEquals(1, filtered.size)
        assertEquals("3", filtered[0].id)
    }

    @Test
    fun testFilterBySearchQuery() {
        val filtered = applyFilter(sampleScans, "paypal", "all")
        assertEquals(1, filtered.size)
        assertEquals("2", filtered[0].id)
    }
}
