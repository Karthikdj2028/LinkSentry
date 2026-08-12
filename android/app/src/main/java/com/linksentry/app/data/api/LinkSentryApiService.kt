package com.linksentry.app.data.api

import com.linksentry.app.data.model.HealthResponse
import com.linksentry.app.data.model.MessageScanRequest
import com.linksentry.app.data.model.MessageScanResponse
import com.linksentry.app.data.model.UrlScanRequest
import com.linksentry.app.data.model.UrlScanResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface LinkSentryApiService {

    @GET("api/health")
    suspend fun getHealth(): Response<HealthResponse>

    @POST("api/scan/url")
    suspend fun scanUrl(@Body request: UrlScanRequest): Response<UrlScanResponse>

    @POST("api/scan/message")
    suspend fun scanMessage(@Body request: MessageScanRequest): Response<MessageScanResponse>
}
