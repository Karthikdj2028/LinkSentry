package com.linksentry.app.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    // Default fallback to ngrok or Android emulator localhost
    private var currentBaseUrl = "https://curler-another-haven.ngrok-free.dev/"

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
        currentBaseUrl = newUrl
        retrofit = buildRetrofit(newUrl)
    }

    fun getBaseUrl(): String = currentBaseUrl

    val service: LinkSentryApiService
        get() = retrofit.create(LinkSentryApiService::class.java)
}
