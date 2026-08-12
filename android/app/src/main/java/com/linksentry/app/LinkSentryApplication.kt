package com.linksentry.app

import android.app.Application
import com.google.firebase.FirebaseApp

class LinkSentryApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
