package com.linksentry.app.ui.screens.scanner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.linksentry.app.data.api.ApiClient
import com.linksentry.app.data.model.MessageScanRequest
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.model.UrlScanRequest
import com.linksentry.app.data.repository.ScanRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ScannerUiState(
    val activeVector: String = "url", // "url" | "qr" | "message"
    val urlInput: String = "",
    val messageInput: String = "",
    val scannedQrContent: String? = null,
    val isScanning: Boolean = false,
    val scanResult: ScanRecord? = null,
    val errorMessage: String? = null
)

class ScannerViewModel(
    private val scanRepository: ScanRepository = ScanRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScannerUiState())
    val uiState: StateFlow<ScannerUiState> = _uiState.asStateFlow()

    fun setVector(vector: String) {
        _uiState.value = _uiState.value.copy(activeVector = vector, errorMessage = null)
    }

    fun onUrlInputChanged(input: String) {
        _uiState.value = _uiState.value.copy(urlInput = input, errorMessage = null)
    }

    fun onMessageInputChanged(input: String) {
        _uiState.value = _uiState.value.copy(messageInput = input, errorMessage = null)
    }

    fun clearResult() {
        _uiState.value = _uiState.value.copy(scanResult = null, errorMessage = null)
    }

    fun scanUrl(userId: String, url: String) {
        val trimmed = url.trim()
        if (trimmed.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please enter a valid URL target.")
            return
        }

        _uiState.value = _uiState.value.copy(isScanning = true, errorMessage = null)

        viewModelScope.launch {
            try {
                val response = ApiClient.service.scanUrl(UrlScanRequest(trimmed))
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    val record = ScanRecord(
                        userId = userId,
                        type = "url",
                        input = trimmed,
                        url = body.url,
                        domain = body.domain ?: "",
                        verdict = body.verdict.lowercase(),
                        riskScore = body.riskScore,
                        confidence = body.confidence,
                        indicators = body.indicators ?: emptyList(),
                        engine = body.engine ?: "LinkSentry V3.4 URL ML Engine",
                        modelVersion = body.modelVersion ?: "V3.4",
                        source = "android"
                    )
                    _uiState.value = _uiState.value.copy(isScanning = false, scanResult = record)
                    scanRepository.saveScan(userId, record)
                } else {
                    _uiState.value = _uiState.value.copy(
                        isScanning = false,
                        errorMessage = "Threat engine error (Code ${response.code()}). Please check backend status."
                    )
                }
            } catch (e: Exception) {
                val currentBase = ApiClient.getBaseUrl()
                val msg = if (currentBase.contains("192.168.") || currentBase.contains("10.0.2.2")) {
                    "Development V3.4 backend unavailable: ${e.localizedMessage ?: "Connection failed"}. Verify development server is running at $currentBase."
                } else {
                    "Unable to connect to threat detection engine: ${e.localizedMessage ?: "Network error"}"
                }
                _uiState.value = _uiState.value.copy(
                    isScanning = false,
                    errorMessage = msg
                )
            }
        }
    }

    fun scanMessage(userId: String, messageText: String) {
        val trimmed = messageText.trim()
        if (trimmed.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please paste message content to analyze.")
            return
        }

        _uiState.value = _uiState.value.copy(isScanning = true, errorMessage = null)

        viewModelScope.launch {
            try {
                val response = ApiClient.service.scanMessage(MessageScanRequest(trimmed))
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    val record = ScanRecord(
                        userId = userId,
                        type = "message",
                        input = trimmed,
                        verdict = body.verdict.lowercase(),
                        riskScore = body.riskScore,
                        confidence = body.confidence,
                        indicators = body.indicators ?: emptyList(),
                        engine = body.engine ?: "LinkSentry Smishing Heuristic Engine",
                        modelVersion = "V3.4",
                        source = "android"
                    )
                    _uiState.value = _uiState.value.copy(isScanning = false, scanResult = record)
                    scanRepository.saveScan(userId, record)
                } else {
                    _uiState.value = _uiState.value.copy(
                        isScanning = false,
                        errorMessage = "Analysis error (Code ${response.code()})."
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isScanning = false,
                    errorMessage = "Backend connection failed: ${e.localizedMessage}"
                )
            }
        }
    }

    fun scanDecodedQr(userId: String, qrRawValue: String) {
        val trimmed = qrRawValue.trim()
        _uiState.value = _uiState.value.copy(
            scannedQrContent = trimmed,
            isScanning = true,
            errorMessage = null
        )

        viewModelScope.launch {
            try {
                // If it looks like a URL, detonate through URL ML engine
                val isUrl = trimmed.startsWith("http://", ignoreCase = true) ||
                        trimmed.startsWith("https://", ignoreCase = true) ||
                        trimmed.contains(".")

                if (isUrl) {
                    val targetUrl = if (!trimmed.startsWith("http://", ignoreCase = true) && !trimmed.startsWith("https://", ignoreCase = true)) {
                        "https://$trimmed"
                    } else {
                        trimmed
                    }

                    val response = ApiClient.service.scanUrl(UrlScanRequest(targetUrl))
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        val record = ScanRecord(
                            userId = userId,
                            type = "qr",
                            input = trimmed,
                            url = body.url,
                            domain = body.domain ?: "",
                            verdict = body.verdict.lowercase(),
                            riskScore = body.riskScore,
                            confidence = body.confidence,
                            indicators = body.indicators ?: emptyList(),
                            engine = body.engine ?: "LinkSentry QR/URL ML Engine",
                            modelVersion = body.modelVersion ?: "V3.4",
                            source = "android"
                        )
                        _uiState.value = _uiState.value.copy(isScanning = false, scanResult = record)
                        scanRepository.saveScan(userId, record)
                    } else {
                        _uiState.value = _uiState.value.copy(
                            isScanning = false,
                            errorMessage = "Engine error analyzing QR link (${response.code()})."
                        )
                    }
                } else {
                    // Non-URL QR code (text, vCard, payload)
                    val record = ScanRecord(
                        userId = userId,
                        type = "qr",
                        input = trimmed,
                        verdict = "safe",
                        riskScore = 10,
                        confidence = 0.85,
                        indicators = listOf("Non-URL QR payload detected (Text/Data)"),
                        engine = "LinkSentry QR Payload Analyzer",
                        modelVersion = "V3.4",
                        source = "android"
                    )
                    _uiState.value = _uiState.value.copy(isScanning = false, scanResult = record)
                    scanRepository.saveScan(userId, record)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isScanning = false,
                    errorMessage = "Failed to detonate QR code: ${e.localizedMessage}"
                )
            }
        }
    }
}
