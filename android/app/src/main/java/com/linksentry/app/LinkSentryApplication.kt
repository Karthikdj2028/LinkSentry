package com.linksentry.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.linksentry.app.data.api.ApiClient

class LinkSentryApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        ApiClient.init(this)
        com.linksentry.app.data.preferences.AppPreferences.init(this)
        com.linksentry.app.data.preferences.LocalScanManager.init(this)
    }
}
