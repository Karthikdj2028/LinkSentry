package com.linksentry.app.data.preferences

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.linksentry.app.data.model.ScanRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

object LocalScanManager {

    private const val PREFS_NAME = "linksentry_local_scans_v1"
    private const val KEY_SCANS_JSON = "scans_json"

    private var prefs: SharedPreferences? = null
    private val gson = Gson()

    private val _localScansState = MutableStateFlow<List<ScanRecord>>(emptyList())
    val localScansFlow: StateFlow<List<ScanRecord>> = _localScansState.asStateFlow()

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        loadScans()
    }

    private fun loadScans() {
        val jsonStr = prefs?.getString(KEY_SCANS_JSON, "[]") ?: "[]"
        try {
            val type = object : TypeToken<List<ScanRecord>>() {}.type
            val list: List<ScanRecord> = gson.fromJson(jsonStr, type) ?: emptyList()
            _localScansState.value = list
        } catch (e: Exception) {
            _localScansState.value = emptyList()
        }
    }

    fun saveLocalScan(scan: ScanRecord): String {
        val current = _localScansState.value.toMutableList()
        val assignedId = if (scan.id.isBlank()) "local_${UUID.randomUUID()}" else scan.id
        scan.id = assignedId

        val index = current.indexOfFirst { it.id == assignedId }
        if (index != -1) {
            current[index] = scan
        } else {
            current.add(0, scan)
        }

        _localScansState.value = current
        saveToPrefs(current)
        return assignedId
    }

    fun deleteLocalScan(scanId: String) {
        if (scanId.isBlank()) return
        val current = _localScansState.value.filterNot { it.id == scanId }
        _localScansState.value = current
        saveToPrefs(current)
    }

    private fun saveToPrefs(list: List<ScanRecord>) {
        try {
            val jsonStr = gson.toJson(list)
            prefs?.edit()?.putString(KEY_SCANS_JSON, jsonStr)?.apply()
        } catch (e: Exception) {
            android.util.Log.e("LocalScanManager", "Failed to save local scans", e)
        }
    }
}
