package com.linksentry.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.PropertyName
import com.google.firebase.firestore.ServerTimestamp
import java.util.Date

/**
 * ScanRecord matches the exact Cloud Firestore schema used across LinkSentry Web and Android.
 * Path: users/{userId}/scans/{scanId}
 */
data class ScanRecord(
    @DocumentId
    var id: String = "",

    @PropertyName("userId")
    var userId: String = "",

    @PropertyName("type")
    var type: String = "url", // "url" | "qr" | "message"

    @PropertyName("input")
    var input: String = "",

    @PropertyName("url")
    var url: String = "",

    @PropertyName("domain")
    var domain: String = "",

    @PropertyName("verdict")
    var verdict: String = "safe", // "safe" | "suspicious" | "phishing" | "invalid"

    @PropertyName("riskScore")
    var riskScore: Int = 0,

    @PropertyName("confidence")
    var confidence: Double = 0.0,

    @PropertyName("indicators")
    var indicators: List<String> = emptyList(),

    @PropertyName("engine")
    var engine: String = "LinkSentry V3.3 URL ML Engine",

    @PropertyName("modelVersion")
    var modelVersion: String = "V3.3",

    @PropertyName("source")
    var source: String = "android", // "web" | "android"

    @ServerTimestamp
    @PropertyName("createdAt")
    var createdAt: Timestamp? = null
) {
    val formattedDate: String
        get() {
            val date = createdAt?.toDate() ?: Date()
            val format = java.text.SimpleDateFormat("MMM dd, yyyy HH:mm", java.util.Locale.US)
            return format.format(date)
        }
}
