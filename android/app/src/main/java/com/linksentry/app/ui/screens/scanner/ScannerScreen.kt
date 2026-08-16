@file:OptIn(
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.linksentry.app.ui.screens.scanner

import android.Manifest
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraControl
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.linksentry.app.data.api.ApiClient
import com.linksentry.app.data.model.EmbeddedUrlResult
import com.linksentry.app.data.model.MessageScanRequest
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.model.UrlScanRequest
import com.linksentry.app.data.preferences.AppPreferences
import com.linksentry.app.data.repository.ScanRepository
import com.linksentry.app.ui.components.CyberBadge
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.components.CyberTopBar
import com.linksentry.app.ui.components.ScanDetailBottomSheet
import com.linksentry.app.ui.components.ThreatMeter
import com.linksentry.app.ui.theme.*
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

data class ScannerResultUi(
    val verdict: String,
    val riskScore: Int,
    val confidence: Double,
    val domain: String?,
    val modelVersion: String,
    val indicators: List<String>,
    val messageRisk: Int? = null,
    val embeddedUrls: List<EmbeddedUrlResult>? = null,
    val isNonUrlQr: Boolean = false,
    val qrType: String = ""
)

@Composable
fun ScannerScreen(
    userId: String,
    scanRepository: ScanRepository,
    initialVector: String = "url",
    initialInput: String = ""
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current

    val clipboardEnabled by AppPreferences.clipboardDetectionFlow.collectAsState()
    val cloudSyncEnabled by AppPreferences.cloudSyncFlow.collectAsState()

    var selectedVector by remember { mutableStateOf(initialVector) }
    var inputPayload by remember { mutableStateOf(initialInput) }
    var isScanning by remember { mutableStateOf(false) }
    var threatResult by remember { mutableStateOf<ScannerResultUi?>(null) }
    var scanError by remember { mutableStateOf<String?>(null) }

    // Clipboard Detection
    var clipboardContent by remember { mutableStateOf<String?>(null) }
    var dismissedClipboardContent by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(clipboardEnabled) {
        if (clipboardEnabled) {
            val clipText = clipboardManager.getText()?.text?.trim()
            if (!clipText.isNullOrBlank() && clipText != dismissedClipboardContent) {
                clipboardContent = clipText
            }
        } else {
            clipboardContent = null
        }
    }

    // QR Camera & State Controls
    var isCameraArmed by remember { mutableStateOf(true) }
    var isTorchOn by remember { mutableStateOf(false) }
    var selectedScanRecordForDetail by remember { mutableStateOf<ScanRecord?>(null) }

    // Real-time recent scans from Firestore
    val userScans: List<ScanRecord> by scanRepository.getScansFlow(userId).collectAsState(initial = emptyList())
    val recentScans: List<ScanRecord> = userScans.take(5)

    // Camera Permission
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
        if (!isGranted) {
            Toast.makeText(context, "Camera permission needed for QR code scanning", Toast.LENGTH_SHORT).show()
        }
    }

    // Gallery picker
    val qrGalleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            isScanning = true
            scanError = null
            threatResult = null
            coroutineScope.launch {
                try {
                    val inputImage = InputImage.fromFilePath(context, uri)
                    val scanner = BarcodeScanning.getClient()
                    scanner.process(inputImage)
                        .addOnSuccessListener { barcodes ->
                            if (barcodes.isNotEmpty()) {
                                val firstBarcode = barcodes.first()
                                val rawValue = firstBarcode.rawValue ?: ""
                                if (rawValue.isNotBlank()) {
                                    inputPayload = rawValue
                                    isCameraArmed = false
                                    processBarcodePayload(
                                        firstBarcode, rawValue, "qr", userId, scanRepository, cloudSyncEnabled,
                                        onSuccess = { res ->
                                            threatResult = res
                                            isScanning = false
                                        },
                                        onError = { err ->
                                            scanError = err
                                            isScanning = false
                                        }
                                    )
                                } else {
                                    isScanning = false
                                    scanError = "QR code contained empty content."
                                }
                            } else {
                                isScanning = false
                                scanError = "No QR code detected in the selected image."
                            }
                        }
                        .addOnFailureListener { e ->
                            isScanning = false
                            scanError = "Failed to decode QR image: ${e.localizedMessage ?: "Unknown error"}"
                        }
                } catch (e: Exception) {
                    isScanning = false
                    scanError = "Image processing error: ${e.localizedMessage ?: "Failed to open image"}"
                }
            }
        }
    }

    // Unified scan execution handler
    val executeScan: (String, String) -> Unit = { payload, vector ->
        if (payload.isNotBlank()) {
            focusManager.clearFocus()
            isScanning = true
            scanError = null
            threatResult = null

            coroutineScope.launch {
                try {
                    val activeUid = userId.ifBlank {
                        com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
                    }
                    val uidPresent = activeUid.isNotBlank()

                    when (vector) {
                        "url", "qr" -> {
                            android.util.Log.d("LinkSentryTrace", "SCAN_API_REQUEST endpoint=/api/scan/url baseUrl=${ApiClient.getBaseUrl()} uidPresent=$uidPresent")
                            val response = ApiClient.service.scanUrl(UrlScanRequest(url = payload.trim()))

                            if (response.isSuccessful && response.body() != null) {
                                val body = response.body()!!
                                android.util.Log.d("LinkSentryTrace", "SCAN_API_RESPONSE endpoint=/api/scan/url status=${response.code()} success=true uidPresent=$uidPresent")

                                val result = ScannerResultUi(
                                    verdict = body.verdict,
                                    riskScore = body.riskScore,
                                    confidence = body.confidence,
                                    domain = body.domain,
                                    modelVersion = body.modelVersion ?: "V3.3",
                                    indicators = body.indicators ?: emptyList()
                                )
                                threatResult = result

                                if (cloudSyncEnabled) {
                                    val record = ScanRecord(
                                        id = "",
                                        userId = activeUid,
                                        input = payload.trim(),
                                        url = payload.trim(),
                                        type = vector,
                                        verdict = body.verdict,
                                        riskScore = body.riskScore,
                                        domain = body.domain ?: "",
                                        confidence = body.confidence,
                                        indicators = body.indicators ?: emptyList(),
                                        engine = body.engine ?: "LinkSentry V3.3 URL ML Engine",
                                        modelVersion = body.modelVersion ?: "V3.3",
                                        source = "android"
                                    )
                                    scanRepository.saveScan(activeUid, record)
                                }
                            } else {
                                android.util.Log.e("LinkSentryTrace", "SCAN_API_FAILURE endpoint=/api/scan/url status=${response.code()} success=false uidPresent=$uidPresent")
                                scanError = "Analysis server error (${response.code()}). Please verify server status."
                            }
                        }

                        "message" -> {
                            android.util.Log.d("LinkSentryTrace", "SCAN_API_REQUEST endpoint=/api/scan/message baseUrl=${ApiClient.getBaseUrl()} uidPresent=$uidPresent")
                            val response = ApiClient.service.scanMessage(MessageScanRequest(message = payload.trim()))

                            if (response.isSuccessful && response.body() != null) {
                                val body = response.body()!!
                                android.util.Log.d("LinkSentryTrace", "SCAN_API_RESPONSE endpoint=/api/scan/message status=${response.code()} success=true uidPresent=$uidPresent")

                                val result = ScannerResultUi(
                                    verdict = body.verdict,
                                    riskScore = body.riskScore,
                                    confidence = body.confidence,
                                    domain = null,
                                    modelVersion = "V3.3",
                                    indicators = body.indicators ?: emptyList(),
                                    messageRisk = body.messageRisk,
                                    embeddedUrls = body.embeddedUrls
                                )
                                threatResult = result

                                if (cloudSyncEnabled) {
                                    val record = ScanRecord(
                                        id = "",
                                        userId = activeUid,
                                        input = payload.trim(),
                                        url = "",
                                        type = "message",
                                        verdict = body.verdict,
                                        riskScore = body.riskScore,
                                        domain = "",
                                        confidence = body.confidence,
                                        indicators = body.indicators ?: emptyList(),
                                        engine = body.engine ?: "LinkSentry Multi-Signal Message Threat Engine V3.3",
                                        modelVersion = "V3.3",
                                        source = "android"
                                    )
                                    scanRepository.saveScan(activeUid, record)
                                }
                            } else {
                                android.util.Log.e("LinkSentryTrace", "SCAN_API_FAILURE endpoint=/api/scan/message status=${response.code()} success=false uidPresent=$uidPresent")
                                scanError = "Analysis server error (${response.code()})"
                            }
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("LinkSentryTrace", "SCAN_API_FAILURE endpoint=/api/scan Exception=${e.localizedMessage}")
                    scanError = "Cannot connect to analysis server: ${e.localizedMessage ?: "Network failed"}"
                } finally {
                    isScanning = false
                }
            }
        }
    }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "Scan",
                subtitle = "Threat protection"
            )
        },
        containerColor = colors.background
    ) { padding ->
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            val isNarrow = maxWidth < 360.dp
            val horizontalPadding = if (isNarrow) 12.dp else 16.dp

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .align(Alignment.TopCenter)
                    .widthIn(max = 640.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = horizontalPadding),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Spacer(modifier = Modifier.height(2.dp))

                // Clipboard Detected Banner
                if (!clipboardContent.isNullOrBlank() && clipboardContent != dismissedClipboardContent) {
                    CyberCard(
                        borderColor = colors.brandAccent.copy(alpha = 0.35f),
                        backgroundColor = colors.surfaceLight
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.ContentPaste,
                                    contentDescription = null,
                                    tint = colors.brandAccent,
                                    modifier = Modifier.size(18.dp)
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Copied text detected",
                                        color = colors.textPrimary,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "Check with LinkSentry",
                                        color = colors.textSecondary,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Button(
                                    onClick = {
                                        val payload = clipboardContent ?: ""
                                        inputPayload = payload
                                        val isUrl = payload.startsWith("http://", ignoreCase = true) ||
                                                payload.startsWith("https://", ignoreCase = true) ||
                                                (payload.contains(".") && !payload.contains(" "))
                                        selectedVector = if (isUrl) "url" else "message"
                                        dismissedClipboardContent = payload
                                        clipboardContent = null
                                        executeScan(payload, selectedVector)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = colors.brandAccent, contentColor = Color.White),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    modifier = Modifier.height(32.dp)
                                ) {
                                    Text("Analyze", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }
                                IconButton(
                                    onClick = {
                                        dismissedClipboardContent = clipboardContent
                                        clipboardContent = null
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Filled.Close, contentDescription = "Dismiss", tint = colors.textMuted, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }

                // Vector Selector Tabs
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    VectorTabButton(
                        title = "Link",
                        icon = Icons.Filled.Language,
                        isSelected = selectedVector == "url",
                        onClick = {
                            selectedVector = "url"
                            threatResult = null
                            scanError = null
                            inputPayload = ""
                        },
                        modifier = Modifier.weight(1f)
                    )
                    VectorTabButton(
                        title = "QR Code",
                        icon = Icons.Filled.QrCodeScanner,
                        isSelected = selectedVector == "qr",
                        onClick = {
                            selectedVector = "qr"
                            threatResult = null
                            scanError = null
                            inputPayload = ""
                            isCameraArmed = true
                            if (!hasCameraPermission) {
                                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                    VectorTabButton(
                        title = "Message",
                        icon = Icons.AutoMirrored.Filled.Chat,
                        isSelected = selectedVector == "message",
                        onClick = {
                            selectedVector = "message"
                            threatResult = null
                            scanError = null
                            inputPayload = ""
                        },
                        modifier = Modifier.weight(1f)
                    )
                }

                // Scanner Input Area
                when (selectedVector) {
                    "url" -> {
                        CyberCard {
                            Text(
                                text = "Scan web link",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Enter any link or domain to detect phishing and deceptive websites.",
                                color = colors.textSecondary,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = inputPayload,
                                onValueChange = { inputPayload = it },
                                placeholder = { Text("https://example.com/login", color = colors.textMuted, fontSize = 13.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                leadingIcon = {
                                    Icon(Icons.Filled.Language, contentDescription = null, tint = colors.brandAccent, modifier = Modifier.size(18.dp))
                                },
                                trailingIcon = {
                                    if (inputPayload.isNotEmpty()) {
                                        IconButton(onClick = { inputPayload = "" }) {
                                            Icon(Icons.Filled.Close, contentDescription = "Clear", tint = colors.textMuted, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                },
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Uri,
                                    imeAction = ImeAction.Done
                                ),
                                keyboardActions = KeyboardActions(
                                    onDone = { executeScan(inputPayload, "url") }
                                ),
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = colors.brandAccent,
                                    unfocusedBorderColor = colors.borderSubtle,
                                    focusedTextColor = colors.textPrimary,
                                    unfocusedTextColor = colors.textPrimary,
                                    focusedContainerColor = colors.surfaceLight.copy(alpha = 0.5f),
                                    unfocusedContainerColor = colors.surfaceLight.copy(alpha = 0.5f)
                                )
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            Button(
                                onClick = { executeScan(inputPayload, "url") },
                                enabled = !isScanning && inputPayload.isNotBlank(),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 46.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colors.brandAccent,
                                    contentColor = Color.White
                                ),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (isScanning) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Analyzing...", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                } else {
                                    Text("Analyze Link", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    "qr" -> {
                        CyberCard {
                            Text(
                                text = "Scan QR code",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Point camera at a QR code or upload an image from your gallery.",
                                color = colors.textSecondary,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            if (hasCameraPermission) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(260.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(Color.Black)
                                        .border(1.dp, colors.borderSubtle, RoundedCornerShape(14.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CameraQrScannerView(
                                        isArmed = isCameraArmed && !isScanning,
                                        isTorchOn = isTorchOn,
                                        onBarcodeDetected = { barcode ->
                                            if (isCameraArmed && !isScanning) {
                                                val raw = barcode.rawValue ?: ""
                                                if (raw.isNotBlank()) {
                                                    isCameraArmed = false
                                                    inputPayload = raw
                                                    isScanning = true
                                                    scanError = null
                                                    threatResult = null

                                                    processBarcodePayload(
                                                        barcode = barcode,
                                                        rawValue = raw,
                                                        vector = "qr",
                                                        userId = userId,
                                                        scanRepository = scanRepository,
                                                        cloudSyncEnabled = cloudSyncEnabled,
                                                        onSuccess = { res ->
                                                            threatResult = res
                                                            isScanning = false
                                                        },
                                                        onError = { err ->
                                                            scanError = err
                                                            isScanning = false
                                                        }
                                                    )
                                                }
                                            }
                                        }
                                    )

                                    // Commercial QR Scanner Overlay (Corner brackets, scanning line, and guidance pill)
                                    if (isCameraArmed && !isScanning) {
                                        QrScannerOverlay(accentColor = colors.brandAccent)
                                        Box(
                                            modifier = Modifier
                                                .align(Alignment.BottomCenter)
                                                .padding(bottom = 16.dp)
                                        ) {
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = Color.Black.copy(alpha = 0.65f),
                                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.15f))
                                            ) {
                                                Text(
                                                    text = "Align QR code inside frame",
                                                    color = Color.White,
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Medium,
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                                )
                                            }
                                        }
                                    }

                                    // Top Controls (Flashlight)
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .padding(12.dp)
                                    ) {
                                        Surface(
                                            shape = CircleShape,
                                            color = Color.Black.copy(alpha = 0.5f),
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clickable { isTorchOn = !isTorchOn }
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Icon(
                                                    imageVector = if (isTorchOn) Icons.Filled.FlashOn else Icons.Filled.FlashOff,
                                                    contentDescription = "Flashlight",
                                                    tint = if (isTorchOn) colors.brandAccent else Color.White,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                        }
                                    }

                                    // Re-arm state once scanned
                                    if (!isCameraArmed && threatResult != null) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .background(Color.Black.copy(alpha = 0.7f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Button(
                                                onClick = {
                                                    isCameraArmed = true
                                                    threatResult = null
                                                    scanError = null
                                                    inputPayload = ""
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = colors.brandAccent, contentColor = Color.White),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text("Scan another QR", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                                            }
                                        }
                                    }
                                }
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(160.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(colors.surfaceLight),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(32.dp))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("Camera permission required", color = colors.textPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Button(
                                            onClick = { cameraPermissionLauncher.launch(Manifest.permission.CAMERA) },
                                            colors = ButtonDefaults.buttonColors(containerColor = colors.brandAccent, contentColor = Color.White),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text("Grant Permission", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedButton(
                                onClick = { qrGalleryLauncher.launch("image/*") },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 46.dp),
                                shape = RoundedCornerShape(10.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, colors.borderSubtle),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.textPrimary)
                            ) {
                                Icon(Icons.Filled.PhotoLibrary, contentDescription = null, tint = colors.brandAccent, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Scan from gallery", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }

                    "message" -> {
                        CyberCard {
                            Text(
                                text = "Scan text message",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Paste suspicious SMS or chat messages to analyze social engineering and phishing links.",
                                color = colors.textSecondary,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = inputPayload,
                                onValueChange = { inputPayload = it },
                                placeholder = { Text("Paste message content here...", color = colors.textMuted, fontSize = 13.sp) },
                                minLines = 3,
                                maxLines = 6,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = colors.brandAccent,
                                    unfocusedBorderColor = colors.borderSubtle,
                                    focusedTextColor = colors.textPrimary,
                                    unfocusedTextColor = colors.textPrimary,
                                    focusedContainerColor = colors.surfaceLight.copy(alpha = 0.5f),
                                    unfocusedContainerColor = colors.surfaceLight.copy(alpha = 0.5f)
                                )
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            Button(
                                onClick = { executeScan(inputPayload, "message") },
                                enabled = !isScanning && inputPayload.isNotBlank(),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 46.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colors.brandAccent,
                                    contentColor = Color.White
                                ),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (isScanning) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Analyzing message...", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                } else {
                                    Text("Analyze Message", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }

                // Scan Error Message with Retry
                if (scanError != null) {
                    CyberCard(
                        borderColor = colors.phishing.copy(alpha = 0.4f),
                        backgroundColor = colors.phishing.copy(alpha = 0.08f)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = colors.phishing, modifier = Modifier.size(18.dp))
                                Text(text = scanError ?: "", color = colors.phishing, fontSize = 12.sp)
                            }
                            if (inputPayload.isNotBlank()) {
                                Spacer(modifier = Modifier.width(6.dp))
                                TextButton(
                                    onClick = { executeScan(inputPayload, selectedVector) },
                                    colors = ButtonDefaults.textButtonColors(contentColor = colors.brandAccent)
                                ) {
                                    Text("Retry", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }

                // Threat Result Card
                threatResult?.let { result ->
                    CyberCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Analysis results",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                            CyberBadge(verdict = result.verdict)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        ThreatMeter(riskScore = result.riskScore)

                        if (result.domain != null) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Domain:", color = colors.textSecondary, fontSize = 12.sp)
                                Text(result.domain, color = colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            }
                        }

                        if (!result.embeddedUrls.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Embedded links:", color = colors.textSecondary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            Spacer(modifier = Modifier.height(4.dp))
                            result.embeddedUrls.forEach { emb ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = emb.domain ?: emb.url,
                                        color = colors.textPrimary,
                                        fontSize = 11.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f)
                                    )
                                    CyberBadge(verdict = emb.verdict)
                                }
                            }
                        }

                        if (result.indicators.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Indicators:", color = colors.textSecondary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            Spacer(modifier = Modifier.height(4.dp))
                            result.indicators.forEach { ind ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Filled.Warning, contentDescription = null, tint = colors.suspicious, modifier = Modifier.size(13.dp))
                                    Text(ind, color = colors.textPrimary, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }

                // Recent Scans List
                if (recentScans.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Recent scans",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary
                    )
                    recentScans.forEach { scan ->
                        RecentScanMiniCard(
                            scan = scan,
                            onClick = { selectedScanRecordForDetail = scan }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    selectedScanRecordForDetail?.let { record ->
        ScanDetailBottomSheet(
            scan = record,
            onDismiss = { selectedScanRecordForDetail = null }
        )
    }
}

@Composable
private fun QrScannerOverlay(accentColor: Color) {
    val infiniteTransition = rememberInfiniteTransition(label = "LaserTransition")
    val laserFraction by infiniteTransition.animateFloat(
        initialValue = 0.1f,
        targetValue = 0.9f,
        animationSpec = infiniteRepeatable(
            animation = tween(1800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "LaserPosition"
    )

    Canvas(modifier = Modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height
        val boxSize = minOf(width, height) * 0.65f
        val left = (width - boxSize) / 2f
        val top = (height - boxSize) / 2f
        val right = left + boxSize
        val bottom = top + boxSize
        val cornerLen = 28f

        // 4 Corner Brackets
        val strokeWidth = 3.5f

        // Top-Left
        drawLine(accentColor, Offset(left, top), Offset(left + cornerLen, top), strokeWidth)
        drawLine(accentColor, Offset(left, top), Offset(left, top + cornerLen), strokeWidth)

        // Top-Right
        drawLine(accentColor, Offset(right, top), Offset(right - cornerLen, top), strokeWidth)
        drawLine(accentColor, Offset(right, top), Offset(right, top + cornerLen), strokeWidth)

        // Bottom-Left
        drawLine(accentColor, Offset(left, bottom), Offset(left + cornerLen, bottom), strokeWidth)
        drawLine(accentColor, Offset(left, bottom), Offset(left, bottom - cornerLen), strokeWidth)

        // Bottom-Right
        drawLine(accentColor, Offset(right, bottom), Offset(right - cornerLen, bottom), strokeWidth)
        drawLine(accentColor, Offset(right, bottom), Offset(right, bottom - cornerLen), strokeWidth)

        // Laser scan line
        val laserY = top + boxSize * laserFraction
        drawLine(
            color = accentColor.copy(alpha = 0.85f),
            start = Offset(left + 10f, laserY),
            end = Offset(right - 10f, laserY),
            strokeWidth = 2f
        )
    }
}

private fun processBarcodePayload(
    barcode: Barcode,
    rawValue: String,
    vector: String,
    userId: String,
    scanRepository: ScanRepository,
    cloudSyncEnabled: Boolean,
    onSuccess: (ScannerResultUi) -> Unit,
    onError: (String) -> Unit
) {
    val trimmed = rawValue.trim()
    val isUrl = barcode.valueType == Barcode.TYPE_URL ||
            trimmed.startsWith("http://", ignoreCase = true) ||
            trimmed.startsWith("https://", ignoreCase = true) ||
            (trimmed.contains(".") && !trimmed.contains(" ") && !trimmed.startsWith("wifi:", ignoreCase = true) && !trimmed.startsWith("mailto:", ignoreCase = true) && !trimmed.startsWith("tel:", ignoreCase = true))

    val activeUid = userId.ifBlank {
        com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
    }
    val uidPresent = activeUid.isNotBlank()

    if (isUrl) {
        val targetUrl = if (!trimmed.startsWith("http://", ignoreCase = true) && !trimmed.startsWith("https://", ignoreCase = true)) {
            "https://$trimmed"
        } else {
            trimmed
        }

        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
            try {
                android.util.Log.d("LinkSentryTrace", "SCAN_API_REQUEST endpoint=/api/scan/url baseUrl=${ApiClient.getBaseUrl()} uidPresent=$uidPresent")
                val response = ApiClient.service.scanUrl(UrlScanRequest(url = targetUrl))

                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    android.util.Log.d("LinkSentryTrace", "SCAN_API_RESPONSE endpoint=/api/scan/url status=${response.code()} success=true uidPresent=$uidPresent")

                    val result = ScannerResultUi(
                        verdict = body.verdict,
                        riskScore = body.riskScore,
                        confidence = body.confidence,
                        domain = body.domain,
                        modelVersion = body.modelVersion ?: "V3.3",
                        indicators = body.indicators ?: emptyList()
                    )

                    if (cloudSyncEnabled) {
                        val record = ScanRecord(
                            id = "",
                            userId = activeUid,
                            input = trimmed,
                            url = targetUrl,
                            type = vector,
                            verdict = body.verdict,
                            riskScore = body.riskScore,
                            domain = body.domain ?: "",
                            confidence = body.confidence,
                            indicators = body.indicators ?: emptyList(),
                            engine = body.engine ?: "LinkSentry V3.3 URL ML Engine",
                            modelVersion = body.modelVersion ?: "V3.3",
                            source = "android"
                        )
                        scanRepository.saveScan(activeUid, record)
                    }

                    kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                        onSuccess(result)
                    }
                } else {
                    android.util.Log.e("LinkSentryTrace", "SCAN_API_FAILURE endpoint=/api/scan/url status=${response.code()} success=false uidPresent=$uidPresent")
                    kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                        onError("Threat engine error (Code ${response.code()}).")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("LinkSentryTrace", "SCAN_API_FAILURE endpoint=/api/scan/url Exception=${e.localizedMessage}")
                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                    onError("Can't reach server: ${e.localizedMessage ?: "Network connection failed"}")
                }
            }
        }
    } else {
        val qrTypeLabel = when (barcode.valueType) {
            Barcode.TYPE_WIFI -> "Wi-Fi Network Configuration"
            Barcode.TYPE_CONTACT_INFO -> "vCard Contact Card"
            Barcode.TYPE_SMS -> "SMS Dispatch Direct"
            Barcode.TYPE_GEO -> "Geographic Coordinates"
            else -> "Plain Text Data"
        }

        val result = ScannerResultUi(
            verdict = "safe",
            riskScore = 0,
            confidence = 1.0,
            domain = null,
            modelVersion = "V3.3",
            indicators = listOf("Non-URL optical payload recognized ($qrTypeLabel). No external network risk detected."),
            isNonUrlQr = true,
            qrType = qrTypeLabel
        )

        if (cloudSyncEnabled) {
            val record = ScanRecord(
                id = "",
                userId = activeUid,
                input = rawValue.trim(),
                url = rawValue.trim(),
                type = "qr",
                verdict = "safe",
                riskScore = 0,
                domain = "",
                confidence = 1.0,
                indicators = listOf("Non-URL optical payload recognized ($qrTypeLabel)."),
                engine = "LinkSentry Non-URL Barcode Classifier",
                modelVersion = "V3.3",
                source = "android"
            )
            kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                scanRepository.saveScan(activeUid, record)
            }
        }
        onSuccess(result)
    }
}

@Composable
private fun RecentScanMiniCard(
    scan: ScanRecord,
    onClick: () -> Unit
) {
    val colors = LocalAppColors.current
    CyberCard(
        modifier = Modifier.clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                val icon = when (scan.type.lowercase()) {
                    "qr" -> Icons.Filled.QrCodeScanner
                    "message" -> Icons.AutoMirrored.Filled.Chat
                    else -> Icons.Filled.Language
                }
                Box(
                    modifier = Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(colors.surfaceLight),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = scan.type,
                        tint = colors.brandAccent,
                        modifier = Modifier.size(15.dp)
                    )
                }
                Column {
                    Text(
                        text = if (scan.domain.isNotBlank()) scan.domain else scan.input.take(30),
                        color = colors.textPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = scan.formattedDate,
                        color = colors.textMuted,
                        fontSize = 10.sp
                    )
                }
            }

            CyberBadge(
                verdict = scan.verdict
            )
        }
    }
}

@Composable
private fun VectorTabButton(
    title: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = if (isSelected) colors.brandAccent.copy(alpha = 0.15f) else colors.surface,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) colors.brandAccent.copy(alpha = 0.4f) else colors.borderSubtle
        ),
        modifier = modifier
            .defaultMinSize(minHeight = 42.dp)
            .heightIn(min = 42.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 2.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = if (isSelected) colors.brandAccent else colors.textSecondary,
                modifier = Modifier.size(13.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
                text = title,
                color = if (isSelected) colors.brandAccent else colors.textSecondary,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun CameraQrScannerView(
    isArmed: Boolean,
    isTorchOn: Boolean,
    onBarcodeDetected: (Barcode) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    var cameraControl by remember { mutableStateOf<CameraControl?>(null) }

    LaunchedEffect(isTorchOn) {
        try {
            cameraControl?.enableTorch(isTorchOn)
        } catch (_: Exception) {}
    }

    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

                val scanner = BarcodeScanning.getClient()
                val imageAnalysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()

                imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                    if (!isArmed) {
                        imageProxy.close()
                        return@setAnalyzer
                    }

                    val mediaImage = imageProxy.image
                    if (mediaImage != null) {
                        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                        scanner.process(image)
                            .addOnSuccessListener { barcodes ->
                                if (isArmed && barcodes.isNotEmpty()) {
                                    val first = barcodes.first()
                                    onBarcodeDetected(first)
                                }
                            }
                            .addOnCompleteListener {
                                imageProxy.close()
                            }
                    } else {
                        imageProxy.close()
                    }
                }

                try {
                    cameraProvider.unbindAll()
                    val camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        imageAnalysis
                    )
                    cameraControl = camera.cameraControl
                    camera.cameraControl.enableTorch(isTorchOn)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }, ContextCompat.getMainExecutor(ctx))

            previewView
        },
        modifier = Modifier.fillMaxSize()
    )
}
