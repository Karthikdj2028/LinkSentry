package com.linksentry.app.data.repository

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.preferences.LocalScanManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class ScanRepository(private val db: FirebaseFirestore = FirebaseFirestore.getInstance()) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val _scansState = MutableStateFlow<List<ScanRecord>>(emptyList())
    val scansState: StateFlow<List<ScanRecord>> = _scansState.asStateFlow()

    @Volatile
    private var activeListenerRegistration: ListenerRegistration? = null
    @Volatile
    private var activeUid: String? = null

    private var remoteScans = emptyList<ScanRecord>()
    private var localScans = LocalScanManager.localScansFlow.value

    init {
        // Continuously observe local scans
        scope.launch {
            LocalScanManager.localScansFlow.collect { updatedLocal ->
                localScans = updatedLocal
                recalculateAndEmit()
            }
        }
    }

    /**
     * Initializes and maintains a single stable Firestore listener for the user.
     * Prevents listener destruction / recreation on screen recomposition or tab switches.
     */
    @Synchronized
    fun startSync(userId: String) {
        val currentAuthUid = FirebaseAuth.getInstance().currentUser?.uid ?: ""
        val targetUid = userId.ifBlank { currentAuthUid }

        if (targetUid.isNotBlank() && targetUid == activeUid && activeListenerRegistration != null) {
            return
        }

        if (targetUid.isBlank()) {
            if (currentAuthUid.isBlank()) {
                // Only clear if user is genuinely logged out
                if (activeListenerRegistration != null) {
                    activeListenerRegistration?.remove()
                    activeListenerRegistration = null
                }
                activeUid = ""
                remoteScans = emptyList()
                recalculateAndEmit()
            } else {
                startSync(currentAuthUid)
            }
            return
        }

        // Clean up previous registration if switching users
        if (activeListenerRegistration != null) {
            activeListenerRegistration?.remove()
            activeListenerRegistration = null
        }

        activeUid = targetUid

        activeListenerRegistration = db.collection("users")
            .document(targetUid)
            .collection("scans")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w("ScanRepository", "Firestore stream offline/error, retaining last state: ${error.message}")
                    recalculateAndEmit()
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val docs = snapshot.documents.mapNotNull { doc ->
                        try {
                            doc.toObject(ScanRecord::class.java)?.apply {
                                id = doc.id
                            }
                        } catch (e: Exception) {
                            Log.e("ScanRepository", "Deserialization error for doc ${doc.id}: ${e.localizedMessage}")
                            null
                        }
                    }
                    remoteScans = docs
                    recalculateAndEmit()
                }
            }
    }

    private fun recalculateAndEmit() {
        val map = LinkedHashMap<String, ScanRecord>()
        remoteScans.forEach { if (it.id.isNotBlank()) map[it.id] = it }
        localScans.forEach { scan ->
            if (scan.id.isNotBlank() && !map.containsKey(scan.id)) {
                map[scan.id] = scan
            }
        }
        val merged = map.values.sortedByDescending { it.createdAt?.seconds ?: 0L }
        _scansState.value = merged
    }

    /**
     * Backward-compatible Flow entrypoint returning the stable, application-wide scansState.
     */
    fun getScansFlow(userId: String): Flow<List<ScanRecord>> {
        startSync(userId)
        return scansState
    }

    /**
     * Persists a scan record locally and optionally to Firestore if Cloud Sync is active.
     */
    suspend fun saveScan(userId: String, scanRecord: ScanRecord, cloudSyncEnabled: Boolean = true): Result<String> {
        return try {
            val targetUid = userId.ifBlank {
                FirebaseAuth.getInstance().currentUser?.uid ?: ""
            }

            scanRecord.userId = targetUid
            scanRecord.source = "android"

            // 1. Save to local storage engine
            val localId = LocalScanManager.saveLocalScan(scanRecord)

            // 2. Save to Cloud Firestore if authenticated and sync enabled
            if (cloudSyncEnabled && targetUid.isNotBlank()) {
                val docRef = db.collection("users")
                    .document(targetUid)
                    .collection("scans")
                    .add(scanRecord)
                    .await()

                scanRecord.id = docRef.id
                LocalScanManager.saveLocalScan(scanRecord)
                Result.success(docRef.id)
            } else {
                Result.success(localId)
            }
        } catch (e: Exception) {
            Log.e("ScanRepository", "Save scan exception: ${e.localizedMessage}")
            Result.failure(e)
        }
    }

    /**
     * Deletes a scan record from local storage and Firestore.
     */
    suspend fun deleteScan(userId: String, scanId: String): Result<Unit> {
        return try {
            if (scanId.isBlank()) throw Exception("Scan ID required.")
            LocalScanManager.deleteLocalScan(scanId)

            val targetUid = userId.ifBlank {
                FirebaseAuth.getInstance().currentUser?.uid ?: ""
            }

            if (targetUid.isNotBlank() && !scanId.startsWith("local_")) {
                db.collection("users")
                    .document(targetUid)
                    .collection("scans")
                    .document(scanId)
                    .delete()
                    .await()
            }

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("ScanRepository", "Delete scan exception: ${e.localizedMessage}")
            Result.failure(e)
        }
    }
}
