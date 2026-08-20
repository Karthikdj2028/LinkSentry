package com.linksentry.app.api

import com.linksentry.app.data.api.ApiClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiClientTest {

    @Test
    fun testProductionBaseUrlIsAuthoritative() {
        assertEquals("https://linksentry-api.onrender.com/", ApiClient.PRODUCTION_BASE_URL)
        assertEquals(ApiClient.PRODUCTION_BASE_URL, ApiClient.getDefaultBaseUrl())
    }

    @Test
    fun testUrlNormalizationRules() {
        // 1. Hostname only -> prepends https:// and appends trailing /
        assertEquals(
            "https://linksentry-api.onrender.com/",
            ApiClient.normalizeUrl("linksentry-api.onrender.com")
        )

        // 2. HTTPS URL without trailing slash -> appends /
        assertEquals(
            "https://linksentry-api.onrender.com/",
            ApiClient.normalizeUrl("https://linksentry-api.onrender.com")
        )

        // 3. HTTP onrender.com URL -> upgraded to https://
        assertEquals(
            "https://linksentry-api.onrender.com/",
            ApiClient.normalizeUrl("http://linksentry-api.onrender.com/")
        )

        // 4. Local LAN URL with http -> preserved with trailing /
        assertEquals(
            "http://192.168.1.100:8000/",
            ApiClient.normalizeUrl("http://192.168.1.100:8000")
        )

        // 5. Blank/empty input -> returns authoritative production URL
        assertEquals(
            ApiClient.PRODUCTION_BASE_URL,
            ApiClient.normalizeUrl("   ")
        )

        // 6. Quoted input -> cleaned
        assertEquals(
            "https://linksentry-api.onrender.com/",
            ApiClient.normalizeUrl("\"https://linksentry-api.onrender.com\"")
        )
    }

    @Test
    fun testValidateAndNormalizeUrl() {
        val valid = ApiClient.validateAndNormalizeUrl("linksentry-api.onrender.com")
        assertTrue(valid.isSuccess)
        assertEquals("https://linksentry-api.onrender.com/", valid.getOrNull())

        val empty = ApiClient.validateAndNormalizeUrl("   ")
        assertTrue(empty.isFailure)
    }

    @Test
    fun testSetAndGetBaseUrl() {
        ApiClient.setBaseUrl("linksentry-api.onrender.com", persist = false)
        assertEquals("https://linksentry-api.onrender.com/", ApiClient.getBaseUrl())
        assertNotNull(ApiClient.service)

        // Reset to production
        ApiClient.setBaseUrl(ApiClient.PRODUCTION_BASE_URL, persist = false)
        assertEquals("https://linksentry-api.onrender.com/", ApiClient.getBaseUrl())
    }

    @Test
    fun testPresetsConstants() {
        assertEquals("http://10.0.2.2:8000/", ApiClient.EMULATOR_BASE_URL)
        assertEquals("http://127.0.0.1:8000/", ApiClient.DEFAULT_LAN_BASE_URL)
        assertEquals("https://linksentry-api.onrender.com/", ApiClient.PRODUCTION_BASE_URL)
    }
}
