package com.linksentry.app.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.repository.ScanRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class DashboardUiState(
    val scans: List<ScanRecord> = emptyList(),
    val totalScans: Int = 0,
    val safeCount: Int = 0,
    val suspiciousCount: Int = 0,
    val phishingCount: Int = 0,
    val safetyRate: Int = 100,
    val avgRiskScore: Int = 0,
    val urlScansCount: Int = 0,
    val qrScansCount: Int = 0,
    val messageScansCount: Int = 0,
    val isLoading: Boolean = true
)

class DashboardViewModel(
    private val scanRepository: ScanRepository = ScanRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private var currentUserId: String = ""

    fun initialize(userId: String) {
        if (currentUserId == userId) return
        currentUserId = userId

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            scanRepository.getScansFlow(userId).collectLatest { scanList ->
                val total = scanList.size
                val safe = scanList.count { it.verdict.lowercase() == "safe" }
                val suspicious = scanList.count { it.verdict.lowercase() == "suspicious" }
                val phishing = scanList.count { it.verdict.lowercase() == "phishing" }
                val rate = if (total > 0) (safe * 100) / total else 100
                val avg = if (total > 0) scanList.sumOf { it.riskScore } / total else 0

                _uiState.value = DashboardUiState(
                    scans = scanList,
                    totalScans = total,
                    safeCount = safe,
                    suspiciousCount = suspicious,
                    phishingCount = phishing,
                    safetyRate = rate,
                    avgRiskScore = avg,
                    urlScansCount = scanList.count { it.type.lowercase() == "url" },
                    qrScansCount = scanList.count { it.type.lowercase() == "qr" },
                    messageScansCount = scanList.count { it.type.lowercase() == "message" },
                    isLoading = false
                )
            }
        }
    }
}
