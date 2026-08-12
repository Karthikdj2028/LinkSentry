package com.linksentry.app.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.linksentry.app.data.model.ScanRecord
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class ScanRepository(private val db: FirebaseFirestore = FirebaseFirestore.getInstance()) {

    /**
     * Real-time listener for the authenticated user's scan history collection.
     * Path: users/{userId}/scans
     */
    fun getScansFlow(userId: String): Flow<List<ScanRecord>> = callbackFlow {
        if (userId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val registration = db.collection("users")
            .document(userId)
            .collection("scans")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val scans = snapshot.documents.mapNotNull { doc ->
                        doc.toObject(ScanRecord::class.java)?.apply {
                            id = doc.id
                        }
                    }
                    trySend(scans)
                }
            }

        awaitClose { registration.remove() }
    }

    /**
     * Persists a scan record to the user's Firestore scan history.
     */
    suspend fun saveScan(userId: String, scanRecord: ScanRecord): Result<String> {
        return try {
            if (userId.isBlank()) throw Exception("User ID is required to save scan.")
            scanRecord.userId = userId
            scanRecord.source = "android"

            val docRef = db.collection("users")
                .document(userId)
                .collection("scans")
                .add(scanRecord)
                .await()

            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Deletes a scan record from the user's Firestore scan history.
     */
    suspend fun deleteScan(userId: String, scanId: String): Result<Unit> {
        return try {
            if (userId.isBlank() || scanId.isBlank()) throw Exception("User ID and Scan ID are required.")
            db.collection("users")
                .document(userId)
                .collection("scans")
                .document(scanId)
                .delete()
                .await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
