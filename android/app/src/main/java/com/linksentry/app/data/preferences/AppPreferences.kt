package com.linksentry.app.data.preferences

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object AppPreferences {

    private const val PREFS_NAME = "linksentry_user_prefs"
    private const val KEY_THEME_MODE = "pref_theme_mode"
    private const val KEY_REALTIME_PROTECTION = "pref_realtime_protection"
    private const val KEY_CLOUD_SYNC = "pref_cloud_sync"
    private const val KEY_CLIPBOARD_DETECTION = "pref_clipboard_detection"
    private const val KEY_PUSH_NOTIFICATIONS = "pref_push_notifications"

    private var prefs: SharedPreferences? = null

    private val _themeModeFlow = MutableStateFlow("system")
    val themeModeFlow: StateFlow<String> = _themeModeFlow.asStateFlow()

    private val _realtimeProtectionFlow = MutableStateFlow(true)
    val realtimeProtectionFlow: StateFlow<Boolean> = _realtimeProtectionFlow.asStateFlow()

    private val _cloudSyncFlow = MutableStateFlow(true)
    val cloudSyncFlow: StateFlow<Boolean> = _cloudSyncFlow.asStateFlow()

    private val _clipboardDetectionFlow = MutableStateFlow(true)
    val clipboardDetectionFlow: StateFlow<Boolean> = _clipboardDetectionFlow.asStateFlow()

    private val _pushNotificationsFlow = MutableStateFlow(true)
    val pushNotificationsFlow: StateFlow<Boolean> = _pushNotificationsFlow.asStateFlow()

    fun init(context: Context) {
        val sp = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs = sp

        _themeModeFlow.value = sp.getString(KEY_THEME_MODE, "system") ?: "system"
        _realtimeProtectionFlow.value = sp.getBoolean(KEY_REALTIME_PROTECTION, true)
        _cloudSyncFlow.value = sp.getBoolean(KEY_CLOUD_SYNC, true)
        _clipboardDetectionFlow.value = sp.getBoolean(KEY_CLIPBOARD_DETECTION, true)
        _pushNotificationsFlow.value = sp.getBoolean(KEY_PUSH_NOTIFICATIONS, true)
    }

    fun setThemeMode(mode: String) {
        val valid = if (mode in listOf("system", "light", "dark")) mode else "system"
        _themeModeFlow.value = valid
        prefs?.edit()?.putString(KEY_THEME_MODE, valid)?.apply()
    }

    fun setRealtimeProtection(enabled: Boolean) {
        _realtimeProtectionFlow.value = enabled
        prefs?.edit()?.putBoolean(KEY_REALTIME_PROTECTION, enabled)?.apply()
    }

    fun setCloudSync(enabled: Boolean) {
        _cloudSyncFlow.value = enabled
        prefs?.edit()?.putBoolean(KEY_CLOUD_SYNC, enabled)?.apply()
    }

    fun setClipboardDetection(enabled: Boolean) {
        _clipboardDetectionFlow.value = enabled
        prefs?.edit()?.putBoolean(KEY_CLIPBOARD_DETECTION, enabled)?.apply()
    }

    fun setPushNotifications(enabled: Boolean) {
        _pushNotificationsFlow.value = enabled
        prefs?.edit()?.putBoolean(KEY_PUSH_NOTIFICATIONS, enabled)?.apply()
    }
}
