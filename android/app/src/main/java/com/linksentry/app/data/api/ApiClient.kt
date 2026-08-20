package com.linksentry.app.data.api

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.linksentry.app.data.model.HealthResponse
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLException

data class BackendProbeResult(
    val isSuccess: Boolean,
    val httpStatus: Int? = null,
    val latencyMs: Long = 0,
    val service: String? = null,
    val version: String? = null,
    val modelVersion: String? = null,
    val engine: String? = null,
    val isLegacyV33: Boolean = false,
    val rawStatusText: String? = null,
    val errorMessage: String? = null
)

object ApiClient {

    private const val TAG = "LinkSentryApi"

    // Authoritative Production Cloud Backend URL
    const val PRODUCTION_BASE_URL = "https://linksentry-api.onrender.com/"
    const val DEFAULT_LAN_BASE_URL = "http://127.0.0.1:8000/"
    const val EMULATOR_BASE_URL = "http://10.0.2.2:8000/"

    private const val PREFS_NAME = "linksentry_prefs"
    private const val KEY_BASE_URL = "base_url"

    private var sharedPreferences: SharedPreferences? = null

    /**
     * Authoritative default base URL for Android.
     * Always points to the live production Render backend.
     */
    fun getDefaultBaseUrl(): String = PRODUCTION_BASE_URL

    private var currentBaseUrl: String = PRODUCTION_BASE_URL

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = try {
            if (com.linksentry.app.BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.BASIC
            }
        } catch (_: Throwable) {
            HttpLoggingInterceptor.Level.BASIC
        }
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private var retrofit: Retrofit = buildRetrofit(currentBaseUrl)

    /**
     * Initializes preferences and sanitizes any saved base URL.
     * Cleans up stale legacy dev IP addresses or malformed non-HTTPS Render URLs.
     */
    fun init(context: Context) {
        sharedPreferences = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedUrl = sharedPreferences?.getString(KEY_BASE_URL, null)

        if (!savedUrl.isNullOrBlank()) {
            val trimmed = savedUrl.trim()
            // Reset obsolete LAN IPs, localhost, or unencrypted Render URLs back to authoritative Production URL
            if (trimmed.contains("192.168.") ||
                trimmed.contains("10.0.2.2") ||
                trimmed.contains("127.0.0.1") ||
                trimmed.contains("localhost") ||
                trimmed.startsWith("http://linksentry-api.onrender.com")
            ) {
                Log.w(TAG, "Resetting legacy/stale local backend URL ($trimmed) to production cloud: $PRODUCTION_BASE_URL")
                setBaseUrl(PRODUCTION_BASE_URL, persist = true)
            } else {
                val normalized = normalizeUrl(trimmed)
                setBaseUrl(normalized, persist = false)
            }
        } else {
            setBaseUrl(PRODUCTION_BASE_URL, persist = false)
        }
    }

    private fun buildRetrofit(url: String): Retrofit {
        val safeUrl = normalizeUrl(url)
        try {
            Log.i(TAG, "LinkSentry API base URL configured: $safeUrl")
        } catch (_: Throwable) {}

        return Retrofit.Builder()
            .baseUrl(safeUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    /**
     * Normalizes a user or configuration input URL into a valid Retrofit base URL.
     * - Trims whitespace and hidden characters.
     * - Prepends https:// if scheme is omitted (e.g., linksentry-api.onrender.com -> https://linksentry-api.onrender.com/).
     * - Upgrades onrender.com domains to HTTPS.
     * - Ensures exactly one trailing slash.
     */
    fun normalizeUrl(url: String): String {
        var clean = url.trim()
        if (clean.isBlank()) {
            return PRODUCTION_BASE_URL
        }

        // Strip surrounding quotes or unexpected punctuation
        clean = clean.removePrefix("\"").removeSuffix("\"").removePrefix("'").removeSuffix("'").trim()

        // Handle missing protocol
        if (!clean.startsWith("http://", ignoreCase = true) && !clean.startsWith("https://", ignoreCase = true)) {
            clean = "https://$clean"
        }

        // Render endpoints must always be HTTPS
        if (clean.startsWith("http://", ignoreCase = true) && clean.contains("onrender.com", ignoreCase = true)) {
            clean = "https://" + clean.substringAfter("http://")
        }

        // Normalize trailing slashes to exactly one
        clean = clean.trimEnd('/') + "/"

        return clean
    }

    /**
     * Validates and normalizes an input URL. Returns Result.success or Result.failure with human-readable error.
     */
    fun validateAndNormalizeUrl(url: String): Result<String> {
        val trimmed = url.trim()
        if (trimmed.isBlank()) {
            return Result.failure(IllegalArgumentException("Backend URL cannot be empty."))
        }

        val normalized = normalizeUrl(trimmed)
        val httpUrl = normalized.toHttpUrlOrNull()
        if (httpUrl == null || httpUrl.host.isBlank()) {
            return Result.failure(IllegalArgumentException("Invalid URL structure: '$trimmed'"))
        }

        return Result.success(normalized)
    }

    /**
     * Legacy alias for normalizeUrl to preserve backward compatibility.
     */
    fun sanitizeUrl(url: String): String = normalizeUrl(url)

    /**
     * Updates active base URL and optionally persists to SharedPreferences.
     */
    fun setBaseUrl(newUrl: String, persist: Boolean = true) {
        val clean = normalizeUrl(newUrl)
        currentBaseUrl = clean
        retrofit = buildRetrofit(currentBaseUrl)

        if (persist) {
            sharedPreferences?.edit()?.putString(KEY_BASE_URL, clean)?.apply()
        }
    }

    fun getBaseUrl(): String = currentBaseUrl

    val service: LinkSentryApiService
        get() = retrofit.create(LinkSentryApiService::class.java)

    /**
     * Health probe returning simple Result<HealthResponse> for quick status updates.
     */
    suspend fun probeHealth(): Result<HealthResponse> {
        val detailed = probeDetailedHealth()
        return if (detailed.isSuccess) {
            Result.success(
                HealthResponse(
                    status = detailed.rawStatusText ?: "ok",
                    service = detailed.service ?: "LinkSentry API",
                    version = detailed.version ?: "0.5.0",
                    modelVersion = detailed.modelVersion,
                    engine = detailed.engine
                )
            )
        } else {
            Result.failure(Exception(detailed.errorMessage ?: "Probe failed"))
        }
    }

    /**
     * Detailed health probe with latency and model version classification.
     * Calls GET /api/health against currentBaseUrl.
     */
    suspend fun probeDetailedHealth(): BackendProbeResult {
        val startTime = System.currentTimeMillis()
        return try {
            val response = service.getHealth()
            val latency = System.currentTimeMillis() - startTime
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val isLegacy = body.modelVersion == "V3.3" || (body.modelVersion == null && currentBaseUrl.contains("onrender.com"))
                BackendProbeResult(
                    isSuccess = true,
                    httpStatus = response.code(),
                    latencyMs = latency,
                    service = body.service,
                    version = body.version,
                    modelVersion = body.modelVersion ?: if (isLegacy) "V3.3 (Legacy)" else "V3.4",
                    engine = body.engine ?: if (isLegacy) "LinkSentry V3.3 LinearSVC" else "LinkSentry V3.4 Engine",
                    isLegacyV33 = isLegacy,
                    rawStatusText = body.status
                )
            } else {
                val code = response.code()
                val errorMsg = when (code) {
                    404 -> "HTTP 404: Endpoint /api/health not found on target host ($currentBaseUrl)."
                    502, 503 -> "HTTP $code: Render service is currently starting or waking up. Please retry in 15 seconds."
                    else -> "HTTP Error $code: ${response.message()}"
                }
                BackendProbeResult(
                    isSuccess = false,
                    httpStatus = code,
                    latencyMs = latency,
                    errorMessage = errorMsg
                )
            }
        } catch (e: ConnectException) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = "Connection refused at $currentBaseUrl. Please verify the backend service is running."
            )
        } catch (e: SocketTimeoutException) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = "Connection timed out (15s). The Render service may be waking up from cold start or network is slow."
            )
        } catch (e: UnknownHostException) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = "Unable to resolve host '${e.message ?: "linksentry-api.onrender.com"}'. Please check device internet connection and DNS settings."
            )
        } catch (e: SSLException) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = "SSL/TLS handshake failed with $currentBaseUrl: ${e.localizedMessage}"
            )
        } catch (e: Exception) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = e.localizedMessage ?: "Unknown network error during backend probe."
            )
        }
    }
}
