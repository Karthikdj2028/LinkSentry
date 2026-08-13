@file:OptIn(
    androidx.camera.core.ExperimentalGetImage::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.linksentry.app.ui.screens.scanner

import android.Manifest
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
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
import com.linksentry.app.data.repository.ScanRepository
import com.linksentry.app.ui.components.CyberBadge
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.components.CyberTopBar
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
    initialVector: String = "url"
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    var selectedVector by remember { mutableStateOf(initialVector) }
    var inputPayload by remember { mutableStateOf("") }
    var isScanning by remember { mutableStateOf(false) }
    var threatResult by remember { mutableStateOf<ScannerResultUi?>(null) }
    var scanError by remember { mutableStateOf<String?>(null) }

    // QR Camera & State Controls
    var isCameraArmed by remember { mutableStateOf(true) }
    var lastScannedTimestamp by remember { mutableLongStateOf(0L) }
    var selectedScanRecordForDetail by remember { mutableStateOf<ScanRecord?>(null) }

    // Real-time recent scans from Firestore
    val userScans: List<ScanRecord> by scanRepository.getScansFlow(userId).collectAsState(initial = emptyList())
    val recentScans: List<ScanRecord> = userScans.take(5)

    // Camera Permission for QR Vector
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
            Toast.makeText(context, "Camera permission needed for live optical scanning", Toast.LENGTH_SHORT).show()
        }
    }

    // Modern Photo/Document Picker for QR gallery decoding
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
                                    // Process decoded barcode
                                    processBarcodePayload(firstBarcode, rawValue, "qr", userId, scanRepository,
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
                                    scanError = "QR code contained empty or unreadable content."
                                }
                            } else {
                                isScanning = false
                                scanError = "No QR code detected in the selected image. Please try another image."
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
                    when (vector) {
                        "url", "qr" -> {
                            val response = ApiClient.service.scanUrl(UrlScanRequest(url = payload.trim()))
                            if (response.isSuccessful && response.body() != null) {
                                val body = response.body()!!
                                val result = ScannerResultUi(
                                    verdict = body.verdict,
                                    riskScore = body.riskScore,
                                    confidence = body.confidence,
                                    domain = body.domain,
                                    modelVersion = body.modelVersion ?: "V3.3",
                                    indicators = body.indicators ?: emptyList()
                                )
                                threatResult = result

                                // Sync to Cloud Firestore
                                val record = ScanRecord(
                                    id = "",
                                    userId = userId,
                                    input = payload.trim(),
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
                                scanRepository.saveScan(userId, record)
                            } else {
                                scanError = "API Error ${response.code()}: ${response.message()}"
                            }
                        }
                        "message" -> {
                            val response = ApiClient.service.scanMessage(MessageScanRequest(message = payload.trim()))
                            if (response.isSuccessful && response.body() != null) {
                                val body = response.body()!!
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

                                // Sync to Cloud Firestore
                                val record = ScanRecord(
                                    id = "",
                                    userId = userId,
                                    input = payload.trim(),
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
                                scanRepository.saveScan(userId, record)
                            } else {
                                scanError = "API Error ${response.code()}: ${response.message()}"
                            }
                        }
                    }
                } catch (e: Exception) {
                    scanError = "Network Connection Failed: ${e.localizedMessage ?: "Unknown"}"
                } finally {
                    isScanning = false
                }
            }
        }
    }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "LinkSentry Multi-Vector",
                subtitle = "DETECTION RADAR"
            )
        },
        containerColor = CyberDarkBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 14.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            // Subtab Switcher
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                VectorTabButton(
                    title = "URL",
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
                    title = "SMS",
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

            // Vector Scanner Card
            when (selectedVector) {
                "url" -> {
                    CyberCard {
                        Text(
                            text = "URL THREAT DETONATION",
                            style = MaterialTheme.typography.labelSmall,
                            color = CyberCyan
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Analyze URLs for typosquatting, deceptive login portals, and phishing kits.",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = inputPayload,
                            onValueChange = { inputPayload = it },
                            placeholder = { Text("https://suspicious-domain.com/login", color = TextMuted, fontSize = 12.sp) },
                            singleLine = true,
                            leadingIcon = {
                                Icon(Icons.Filled.Language, contentDescription = "URL", tint = CyberCyan, modifier = Modifier.size(18.dp))
                            },
                            trailingIcon = {
                                if (inputPayload.isNotEmpty()) {
                                    IconButton(onClick = { inputPayload = "" }) {
                                        Icon(Icons.Filled.Close, contentDescription = "Clear", tint = TextMuted, modifier = Modifier.size(18.dp))
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
                                focusedBorderColor = CyberCyan,
                                unfocusedBorderColor = CyberBorder,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = { executeScan(inputPayload, "url") },
                            enabled = !isScanning && inputPayload.isNotBlank(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = CyberCyan,
                                contentColor = CyberDarkBg
                            ),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            if (isScanning) {
                                CircularProgressIndicator(color = CyberDarkBg, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Filled.Shield, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("DETONATE & SCAN", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }

                "qr" -> {
                    CyberCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "OPTICAL QR RADAR",
                                style = MaterialTheme.typography.labelSmall,
                                color = CyberCyan
                            )
                            if (isScanning) {
                                CyberBadge(text = "ANALYZING", color = CyberCyan)
                            } else if (!isCameraArmed) {
                                CyberBadge(text = "SCANNED", color = CyberAmber)
                            } else {
                                CyberBadge(text = "READY", color = CyberEmerald)
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Point camera or upload a QR image to extract payload and evaluate threat risk.",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Camera Viewfinder or Permission Request
                        if (hasCameraPermission && isCameraArmed) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(1.dp, CyberCyan.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                            ) {
                                CameraQrScannerView(
                                    isArmed = isCameraArmed,
                                    onBarcodeDetected = { barcode ->
                                        val now = System.currentTimeMillis()
                                        if (isCameraArmed && now - lastScannedTimestamp > 1500L) {
                                            lastScannedTimestamp = now
                                            isCameraArmed = false
                                            val raw = barcode.rawValue ?: ""
                                            inputPayload = raw
                                            isScanning = true
                                            scanError = null
                                            threatResult = null

                                            processBarcodePayload(barcode, raw, "qr", userId, scanRepository,
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
                                )
                            }
                        } else if (!hasCameraPermission) {
                            CyberCard(borderColor = CyberAmber.copy(alpha = 0.3f)) {
                                Text(
                                    text = "Camera access is needed for live scanning.",
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Button(
                                    onClick = { cameraPermissionLauncher.launch(Manifest.permission.CAMERA) },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberDarkBg),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Filled.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Grant Camera Permission", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Action Buttons: Scan Again / Upload from Gallery
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (!isCameraArmed || threatResult != null) {
                                Button(
                                    onClick = {
                                        isCameraArmed = true
                                        threatResult = null
                                        scanError = null
                                        inputPayload = ""
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(42.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberDarkBg),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("SCAN AGAIN", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }

                            OutlinedButton(
                                onClick = { qrGalleryLauncher.launch("image/*") },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(42.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = CyberCyan),
                                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(CyberCyan)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Filled.PhotoLibrary, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("UPLOAD IMAGE", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                            }
                        }

                        if (inputPayload.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Payload: $inputPayload",
                                color = TextSecondary,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                "message" -> {
                    CyberCard {
                        Text(
                            text = "SMS / SMISHING DETECTOR",
                            style = MaterialTheme.typography.labelSmall,
                            color = CyberCyan
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Analyze SMS alerts for loan smishing, urgency pressure, and embedded link threats.",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = inputPayload,
                            onValueChange = { inputPayload = it },
                            placeholder = { Text("Paste SMS or message content...", color = TextMuted, fontSize = 12.sp) },
                            minLines = 3,
                            maxLines = 5,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = { executeScan(inputPayload, "message") }),
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = CyberCyan,
                                unfocusedBorderColor = CyberBorder,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = { executeScan(inputPayload, "message") },
                            enabled = !isScanning && inputPayload.isNotBlank(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberDarkBg),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            if (isScanning) {
                                CircularProgressIndicator(color = CyberDarkBg, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Filled.Shield, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("ANALYZE SMS PAYLOAD", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // Error Display
            scanError?.let { error ->
                CyberCard(borderColor = CyberRed.copy(alpha = 0.5f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Filled.ErrorOutline, contentDescription = "Error", tint = CyberRed, modifier = Modifier.size(20.dp))
                        Text(
                            text = error,
                            color = CyberRedLight,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }

            // Threat Result Card
            threatResult?.let { result ->
                val verdictColor = when (result.verdict.lowercase()) {
                    "safe" -> CyberEmerald
                    "suspicious" -> CyberAmber
                    else -> CyberRed
                }

                CyberCard(borderColor = verdictColor.copy(alpha = 0.6f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "THREAT EVALUATION RESULT",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextMuted
                            )
                            Text(
                                text = result.verdict.uppercase(),
                                color = verdictColor,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        CyberBadge(
                            text = "${(result.confidence * 100).toInt()}% CONFIDENCE",
                            color = verdictColor
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    ThreatMeter(
                        riskScore = result.riskScore,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Multi-Signal Breakdown if available
                    if (result.messageRisk != null || (result.embeddedUrls != null && result.embeddedUrls.isNotEmpty())) {
                        Text(
                            text = "MULTI-SIGNAL EVIDENCE BREAKDOWN",
                            style = MaterialTheme.typography.labelSmall,
                            color = CyberCyan
                        )
                        Spacer(modifier = Modifier.height(6.dp))

                        result.messageRisk?.let { msgRisk ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Message Heuristic Risk:", color = TextSecondary, fontSize = 11.sp)
                                Text("$msgRisk / 100", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        result.embeddedUrls?.forEach { emb ->
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Embedded: ${emb.domain ?: emb.url}",
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                                val embColor = if (emb.verdict.lowercase() == "safe") CyberEmerald else if (emb.verdict.lowercase() == "suspicious") CyberAmber else CyberRed
                                CyberBadge(text = "${emb.verdict.uppercase()} (${emb.riskScore})", color = embColor)
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Indicators
                    if (result.indicators.isNotEmpty()) {
                        Text(
                            text = "OBSERVED RISK INDICATORS",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextMuted
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        result.indicators.forEach { indicator ->
                            Row(
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.padding(vertical = 2.dp)
                            ) {
                                Text("•", color = verdictColor, fontSize = 12.sp)
                                Text(
                                    text = indicator,
                                    color = TextPrimary,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Engine: LinkSentry V3.3",
                            color = TextMuted,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace
                        )
                        Text(
                            text = "Synced to Cloud",
                            color = CyberEmerald,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }

            // Recent Scans Section
            if (recentScans.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "RECENT SCANS (REAL-TIME)",
                        style = MaterialTheme.typography.labelSmall,
                        color = CyberCyan
                    )
                    Text(
                        text = "${userScans.size} TOTAL",
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                recentScans.forEach { scan ->
                    RecentScanMiniCard(
                        scan = scan,
                        onClick = { selectedScanRecordForDetail = scan }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    // Detail Modal Sheet for Recent Scan Record
    selectedScanRecordForDetail?.let { record ->
        ModalBottomSheet(
            onDismissRequest = { selectedScanRecordForDetail = null },
            containerColor = CyberSurface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "SCAN AUDIT DETAIL",
                        color = CyberCyan,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    CyberBadge(verdict = record.verdict)
                }

                Text(
                    text = "Payload: ${record.input.ifEmpty { record.url }}",
                    color = TextPrimary,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )

                ThreatMeter(riskScore = record.riskScore, modifier = Modifier.fillMaxWidth())

                if (record.indicators.isNotEmpty()) {
                    Text("Risk Indicators:", color = TextMuted, fontSize = 11.sp)
                    record.indicators.forEach { ind ->
                        Text("• $ind", color = TextSecondary, fontSize = 11.sp)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Vector: ${record.type.uppercase()}", color = TextMuted, fontSize = 10.sp)
                    Text(record.formattedDate, color = TextMuted, fontSize = 10.sp)
                }

                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }
}

private fun processBarcodePayload(
    barcode: Barcode,
    rawValue: String,
    vector: String,
    userId: String,
    scanRepository: ScanRepository,
    onSuccess: (ScannerResultUi) -> Unit,
    onError: (String) -> Unit
) {
    val isUrl = barcode.valueType == Barcode.TYPE_URL ||
            rawValue.startsWith("http://", ignoreCase = true) ||
            rawValue.startsWith("https://", ignoreCase = true)

    if (isUrl) {
        // Send to FastAPI V3.3 Threat Engine
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
            try {
                val response = ApiClient.service.scanUrl(UrlScanRequest(url = rawValue.trim()))
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    val result = ScannerResultUi(
                        verdict = body.verdict,
                        riskScore = body.riskScore,
                        confidence = body.confidence,
                        domain = body.domain,
                        modelVersion = body.modelVersion ?: "V3.3",
                        indicators = body.indicators ?: emptyList()
                    )

                    // Sync to Cloud Firestore
                    val record = ScanRecord(
                        id = "",
                        userId = userId,
                        input = rawValue.trim(),
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
                    scanRepository.saveScan(userId, record)
                    kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                        onSuccess(result)
                    }
                } else {
                    kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                        onError("API Error ${response.code()}: ${response.message()}")
                    }
                }
            } catch (e: Exception) {
                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                    onError("Network Connection Failed: ${e.localizedMessage ?: "Unknown"}")
                }
            }
        }
    } else {
        // Non-URL QR Format Handling (Wi-Fi, vCard, SMS, Plain Text)
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

        // Save Non-URL scan record to Firestore
        val record = ScanRecord(
            id = "",
            userId = userId,
            input = rawValue.trim(),
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
            scanRepository.saveScan(userId, record)
        }
        onSuccess(result)
    }
}

@Composable
fun RecentScanMiniCard(
    scan: ScanRecord,
    onClick: () -> Unit
) {
    CyberCard(
        borderColor = CyberBorderSubtle,
        modifier = Modifier.clickable { onClick() }
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
                val icon = when (scan.type) {
                    "qr" -> Icons.Filled.QrCode
                    "message" -> Icons.AutoMirrored.Filled.Chat
                    else -> Icons.Filled.Language
                }
                Icon(
                    imageVector = icon,
                    contentDescription = scan.type,
                    tint = CyberCyan,
                    modifier = Modifier.size(16.dp)
                )
                Column {
                    Text(
                        text = if (scan.domain.isNotBlank()) scan.domain else scan.input.take(30),
                        color = TextPrimary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = scan.formattedDate,
                        color = TextMuted,
                        fontSize = 9.sp
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
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (isSelected) CyberCyan else CyberSurface)
            .border(1.dp, if (isSelected) CyberCyan else CyberBorderSubtle, RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(vertical = 8.dp, horizontal = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = if (isSelected) CyberDarkBg else TextSecondary,
                modifier = Modifier.size(14.dp)
            )
            Text(
                text = title,
                color = if (isSelected) CyberDarkBg else TextSecondary,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

@Composable
fun CameraQrScannerView(
    isArmed: Boolean,
    onBarcodeDetected: (Barcode) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

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
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        imageAnalysis
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }, ContextCompat.getMainExecutor(ctx))

            previewView
        },
        modifier = Modifier.fillMaxSize()
    )
}
