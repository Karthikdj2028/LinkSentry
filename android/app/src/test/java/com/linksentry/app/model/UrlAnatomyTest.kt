package com.linksentry.app.model

import com.linksentry.app.ui.components.parseUrlAnatomyNative
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UrlAnatomyTest {

    @Test
    fun testParseStandardUrl() {
        val url = "https://www.example.com/search?q=test#top"
        val segments = parseUrlAnatomyNative(url)

        assertEquals(7, segments.size)
        assertEquals("Scheme", segments[0].type)
        assertEquals("https://", segments[0].value)
        assertFalse(segments[0].isSuspicious)

        assertEquals("Subdomain", segments[1].type)
        assertEquals("www.", segments[1].value)

        assertEquals("Registered Domain", segments[2].type)
        assertEquals("example", segments[2].value)

        assertEquals("TLD", segments[3].type)
        assertEquals(".com", segments[3].value)

        assertEquals("Path", segments[4].type)
        assertEquals("/search", segments[4].value)

        assertEquals("Query", segments[5].type)
        assertEquals("?q=test", segments[5].value)

        assertEquals("Fragment", segments[6].type)
        assertEquals("#top", segments[6].value)
    }

    @Test
    fun testParseMultiPartTldCoUk() {
        val url = "https://login.bank.co.uk/dashboard"
        val segments = parseUrlAnatomyNative(url)

        val domainSeg = segments.find { it.type == "Registered Domain" }
        assertNotNull(domainSeg)
        assertEquals("bank", domainSeg?.value)

        val tldSeg = segments.find { it.type == "TLD" }
        assertNotNull(tldSeg)
        assertEquals(".co.uk", tldSeg?.value)

        val subSeg = segments.find { it.type == "Subdomain" }
        assertNotNull(subSeg)
        assertEquals("login.", subSeg?.value)
    }

    @Test
    fun testParseMultiPartTldComAu() {
        val url = "https://checkout.retailer.com.au/pay"
        val segments = parseUrlAnatomyNative(url)

        val domainSeg = segments.find { it.type == "Registered Domain" }
        assertNotNull(domainSeg)
        assertEquals("retailer", domainSeg?.value)

        val tldSeg = segments.find { it.type == "TLD" }
        assertNotNull(tldSeg)
        assertEquals(".com.au", tldSeg?.value)
    }

    @Test
    fun testHttpSchemeFlaggedSuspicious() {
        val url = "http://unencrypted-site.org/login"
        val segments = parseUrlAnatomyNative(url)

        val schemeSeg = segments.find { it.type == "Scheme" }
        assertNotNull(schemeSeg)
        assertEquals("http://", schemeSeg?.value)
        assertTrue(schemeSeg?.isSuspicious == true)
    }

    @Test
    fun testPathWithLoginKeywordFlaggedSuspicious() {
        val url = "https://secure-verify.net/account/login"
        val segments = parseUrlAnatomyNative(url)

        val pathSeg = segments.find { it.type == "Path" }
        assertNotNull(pathSeg)
        assertTrue(pathSeg?.isSuspicious == true)
    }

    @Test
    fun testTyposquatIndicatorFlagsDomainSegment() {
        val url = "https://paypa1-security.xyz"
        val indicators = listOf("Observed domain resembles protected brand (PayPal): paypa1.com")
        val segments = parseUrlAnatomyNative(url, indicators)

        val domainSeg = segments.find { it.type == "Registered Domain" }
        assertNotNull(domainSeg)
        assertTrue(domainSeg?.isSuspicious == true)

        val tldSeg = segments.find { it.type == "TLD" }
        assertNotNull(tldSeg)
        assertTrue(tldSeg?.isSuspicious == true) // .xyz is flagged as suspicious TLD
    }
}
