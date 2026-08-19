package com.linksentry.app.data.api

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import com.linksentry.app.data.model.HealthResponse
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

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

    const val PRODUCTION_BASE_URL = "https://linksentry-api.onrender.com/"
    const val DEFAULT_LAN_BASE_URL = "http://127.0.0.1:8000/"
    const val EMULATOR_BASE_URL = "http://10.0.2.2:8000/"
    private const val PREFS_NAME = "linksentry_prefs"
    private const val KEY_BASE_URL = "base_url"

    private var sharedPreferences: SharedPreferences? = null

    fun getDefaultBaseUrl(): String {
        val isDebug = try {
            com.linksentry.app.BuildConfig.DEBUG
        } catch (_: Throwable) {
            true
        }
        return when {
            isEmulator() -> EMULATOR_BASE_URL
            isDebug -> DEFAULT_LAN_BASE_URL
            else -> PRODUCTION_BASE_URL
        }
    }

    // Determine initial base URL based on environment (safely handled for JVM tests and Android runtime)
    private var currentBaseUrl: String = getDefaultBaseUrl()

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
        .build()

    private var retrofit: Retrofit = buildRetrofit(currentBaseUrl)

    /**
     * Initializes preferences and loads any saved base URL.
     */
    fun init(context: Context) {
        sharedPreferences = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedUrl = sharedPreferences?.getString(KEY_BASE_URL, null)
        if (!savedUrl.isNullOrBlank()) {
            if (savedUrl.contains("192.168.29.123") || savedUrl.contains("192.168.137.238")) {
                setBaseUrl(DEFAULT_LAN_BASE_URL, persist = true)
            } else {
                setBaseUrl(savedUrl, persist = false)
            }
        } else {
            setBaseUrl(getDefaultBaseUrl(), persist = false)
        }
    }

    private fun buildRetrofit(url: String): Retrofit {
        val safeUrl = sanitizeUrl(url)
        return Retrofit.Builder()
            .baseUrl(safeUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun sanitizeUrl(url: String): String {
        var clean = url.trim()
        if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
            clean = "http://$clean"
        }
        if (!clean.endsWith("/")) {
            clean = "$clean/"
        }
        return clean
    }

    fun setBaseUrl(newUrl: String, persist: Boolean = true) {
        val clean = sanitizeUrl(newUrl)
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
     * Health probe returning simple Result<HealthResponse> for backward compatibility.
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
                BackendProbeResult(
                    isSuccess = false,
                    httpStatus = response.code(),
                    latencyMs = latency,
                    errorMessage = "HTTP Error ${response.code()}: ${response.message()}"
                )
            }
        } catch (e: ConnectException) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = "Connection Refused. Verify FastAPI is running on 0.0.0.0:8000 and Windows Firewall permits inbound port 8000."
            )
        } catch (e: SocketTimeoutException) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = "Connection Timed Out (15s). Ensure phone and PC are on the same Wi-Fi network with client isolation disabled."
            )
        } catch (e: UnknownHostException) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = "Host Unresolved. Check host IP / domain name."
            )
        } catch (e: Exception) {
            val latency = System.currentTimeMillis() - startTime
            BackendProbeResult(
                isSuccess = false,
                latencyMs = latency,
                errorMessage = e.localizedMessage ?: "Unknown network error during probe."
            )
        }
    }

    /**
     * Accurate, null-safe emulator detection heuristic.
     */
    fun isEmulator(): Boolean {
        return try {
            val fingerprint = Build.FINGERPRINT ?: ""
            val model = Build.MODEL ?: ""
            val manufacturer = Build.MANUFACTURER ?: ""
            val brand = Build.BRAND ?: ""
            val device = Build.DEVICE ?: ""
            val product = Build.PRODUCT ?: ""
            val hardware = Build.HARDWARE ?: ""

            (fingerprint.startsWith("generic")
                    || fingerprint.startsWith("unknown")
                    || model.contains("google_sdk")
                    || model.contains("Emulator")
                    || model.contains("Android SDK built for x86")
                    || manufacturer.contains("Genymotion")
                    || (brand.startsWith("generic") && device.startsWith("generic"))
                    || product == "google_sdk"
                    || hardware.contains("goldfish")
                    || hardware.contains("ranchu"))
        } catch (e: Throwable) {
            false
        }
    }
}
