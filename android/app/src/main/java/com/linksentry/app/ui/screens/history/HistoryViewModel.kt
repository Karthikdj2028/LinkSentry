package com.linksentry.app.ui.screens.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.repository.ScanRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class HistoryUiState(
    val scans: List<ScanRecord> = emptyList(),
    val filteredScans: List<ScanRecord> = emptyList(),
    val searchQuery: String = "",
    val selectedFilter: String = "all", // "all" | "phishing" | "suspicious" | "safe" | "url" | "qr" | "message"
    val isLoading: Boolean = true,
    val selectedScanForInspection: ScanRecord? = null,
    val scanPendingDeletion: ScanRecord? = null,
    val errorMessage: String? = null
)

class HistoryViewModel(
    private val scanRepository: ScanRepository = ScanRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    private var currentUserId: String = ""

    fun initialize(userId: String) {
        if (currentUserId == userId) return
        currentUserId = userId

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            scanRepository.getScansFlow(userId).collectLatest { scanList ->
                val updated = _uiState.value.copy(
                    scans = scanList,
                    isLoading = false
                )
                _uiState.value = updated.copy(
                    filteredScans = applyFilters(scanList, updated.searchQuery, updated.selectedFilter)
                )
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        val state = _uiState.value
        _uiState.value = state.copy(
            searchQuery = query,
            filteredScans = applyFilters(state.scans, query, state.selectedFilter)
        )
    }

    fun onFilterSelected(filter: String) {
        val state = _uiState.value
        _uiState.value = state.copy(
            selectedFilter = filter,
            filteredScans = applyFilters(state.scans, state.searchQuery, filter)
        )
    }

    fun inspectScan(scan: ScanRecord?) {
        _uiState.value = _uiState.value.copy(selectedScanForInspection = scan)
    }

    fun requestDeleteScan(scan: ScanRecord?) {
        _uiState.value = _uiState.value.copy(scanPendingDeletion = scan)
    }

    fun confirmDeleteScan() {
        val scan = _uiState.value.scanPendingDeletion ?: return
        _uiState.value = _uiState.value.copy(scanPendingDeletion = null)

        viewModelScope.launch {
            scanRepository.deleteScan(currentUserId, scan.id)
        }
    }

    private fun applyFilters(scans: List<ScanRecord>, query: String, filter: String): List<ScanRecord> {
        return scans.filter { scan ->
            val matchesSearch = query.isBlank() ||
                    scan.input.contains(query, ignoreCase = true) ||
                    scan.domain.contains(query, ignoreCase = true) ||
                    scan.url.contains(query, ignoreCase = true)

            val matchesFilter = when (filter.lowercase()) {
                "all" -> true
                "phishing" -> scan.verdict.lowercase() == "phishing"
                "suspicious" -> scan.verdict.lowercase() == "suspicious"
                "safe" -> scan.verdict.lowercase() == "safe"
                "url" -> scan.type.lowercase() == "url"
                "qr" -> scan.type.lowercase() == "qr"
                "message" -> scan.type.lowercase() == "message"
                else -> true
            }

            matchesSearch && matchesFilter
        }
    }
}
