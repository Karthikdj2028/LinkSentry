package com.linksentry.app.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    // Default to Android emulator host loopback (10.0.2.2 -> host 127.0.0.1:8000)
    // Can be changed dynamically at runtime in the Profile screen to a LAN IP or custom domain.
    private var currentBaseUrl = "http://10.0.2.2:8000/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    private var retrofit: Retrofit = buildRetrofit(currentBaseUrl)

    private fun buildRetrofit(url: String): Retrofit {
        val safeUrl = if (url.endsWith("/")) url else "$url/"
        return Retrofit.Builder()
            .baseUrl(safeUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun setBaseUrl(newUrl: String) {
        val trimmed = newUrl.trim()
        if (trimmed.isNotBlank()) {
            currentBaseUrl = if (trimmed.endsWith("/")) trimmed else "$trimmed/"
            retrofit = buildRetrofit(currentBaseUrl)
        }
    }

    fun getBaseUrl(): String = currentBaseUrl

    val service: LinkSentryApiService
        get() = retrofit.create(LinkSentryApiService::class.java)
}
