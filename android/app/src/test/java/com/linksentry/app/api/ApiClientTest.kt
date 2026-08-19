package com.linksentry.app.api

import com.linksentry.app.data.api.ApiClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiClientTest {

    @Test
    fun testBaseUrlConfigurationAndSanitization() {
        // Test URL without protocol
        val sanitizedNoProto = ApiClient.sanitizeUrl("192.168.137.254:8000")
        assertEquals("http://192.168.137.254:8000/", sanitizedNoProto)

        // Test URL without trailing slash
        val sanitizedNoSlash = ApiClient.sanitizeUrl("http://192.168.137.254:8000")
        assertEquals("http://192.168.137.254:8000/", sanitizedNoSlash)

        // Test HTTPS URL
        val sanitizedHttps = ApiClient.sanitizeUrl("https://threat-api.linksentry.security")
        assertEquals("https://threat-api.linksentry.security/", sanitizedHttps)

        // Test setting base URL
        ApiClient.setBaseUrl("http://192.168.137.254:8000", persist = false)
        assertEquals("http://192.168.137.254:8000/", ApiClient.getBaseUrl())

        // Test emulator preset
        ApiClient.setBaseUrl(ApiClient.EMULATOR_BASE_URL, persist = false)
        assertEquals("http://10.0.2.2:8000/", ApiClient.getBaseUrl())
        assertNotNull(ApiClient.service)
    }

    @Test
    fun testPresetsConstants() {
        assertEquals("http://10.0.2.2:8000/", ApiClient.EMULATOR_BASE_URL)
        assertEquals("http://127.0.0.1:8000/", ApiClient.DEFAULT_LAN_BASE_URL)
        assertEquals("https://linksentry-api.onrender.com/", ApiClient.PRODUCTION_BASE_URL)
    }

    @Test
    fun testDefaultBaseUrlDetermination() {
        val defaultUrl = ApiClient.getDefaultBaseUrl()
        assertTrue(
            defaultUrl == ApiClient.DEFAULT_LAN_BASE_URL ||
            defaultUrl == ApiClient.EMULATOR_BASE_URL ||
            defaultUrl == ApiClient.PRODUCTION_BASE_URL
        )
    }
}
