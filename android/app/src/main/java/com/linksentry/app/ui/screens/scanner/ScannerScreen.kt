package com.linksentry.app.ui.screens.scanner

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.linksentry.app.data.api.ApiClient
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

@Composable
fun ScannerScreen(
    initialVector: String = "url",
    userId: String,
    scanRepository: ScanRepository
) {
    var selectedVector by remember { mutableStateOf(initialVector) }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "LinkSentry Hub",
                subtitle = "MULTI-VECTOR DETECTION ENGINE"
            )
        },
        containerColor = CyberDarkBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            // Subtab Switcher
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(CyberSurface)
                    .border(1.dp, CyberBorderSubtle, RoundedCornerShape(10.dp))
                    .padding(4.dp)
            ) {
                VectorTabButton(
                    title = "URL Link",
                    icon = Icons.Filled.Language,
                    isSelected = selectedVector == "url",
                    onClick = { selectedVector = "url" },
                    modifier = Modifier.weight(1f)
                )
                VectorTabButton(
                    title = "QR Quishing",
                    icon = Icons.Filled.QrCodeScanner,
                    isSelected = selectedVector == "qr",
                    onClick = { selectedVector = "qr" },
                    modifier = Modifier.weight(1f)
                )
                VectorTabButton(
                    title = "SMS Text",
                    icon = Icons.Filled.Chat,
                    isSelected = selectedVector == "message",
                    onClick = { selectedVector = "message" },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Box(modifier = Modifier.fillMaxSize()) {
                when (selectedVector) {
                    "url" -> UrlScannerView(userId = userId, scanRepository = scanRepository)
                    "qr" -> QrScannerView(userId = userId, scanRepository = scanRepository)
                    "message" -> MessageScannerView(userId = userId, scanRepository = scanRepository)
                }
            }
        }
    }
}

@Composable
fun VectorTabButton(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (isSelected) CyberCyan else Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = if (isSelected) CyberDarkBg else TextMuted,
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = title,
                color = if (isSelected) CyberDarkBg else TextSecondary,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun UrlScannerView(
    userId: String,
    scanRepository: ScanRepository
) {
    var urlInput by remember { mutableStateOf("") }
    var isScanning by remember { mutableStateOf(false) }
    var activeResult by remember { mutableStateOf<ScanRecord?>(null) }
    var scanError by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    val runScan = {
        if (urlInput.isNotBlank()) {
            focusManager.clearFocus()
            isScanning = true
            scanError = null
            coroutineScope.launch {
                try {
                    val response = ApiClient.service.scanUrl(UrlScanRequest(urlInput.trim()))
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        val record = ScanRecord(
                            userId = userId,
                            type = "url",
                            input = urlInput.trim(),
                            url = body.url,
                            domain = body.domain ?: "",
                            verdict = body.verdict.lowercase(),
                            riskScore = body.riskScore,
                            confidence = body.confidence,
                            indicators = body.indicators ?: emptyList(),
                            engine = body.engine ?: "LinkSentry V3.3 URL ML Engine",
                            modelVersion = body.modelVersion ?: "V3.3",
                            source = "android"
                        )
                        activeResult = record
                        // Persist to Cloud Firestore
                        scanRepository.saveScan(userId, record)
                    } else {
                        scanError = "Threat engine returned error code: ${response.code()}"
                    }
                } catch (e: Exception) {
                    scanError = "Failed to connect to backend engine: ${e.localizedMessage}"
                } finally {
                    isScanning = false
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
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
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(14.dp))

            OutlinedTextField(
                value = urlInput,
                onValueChange = { urlInput = it },
                placeholder = { Text("https://suspicious-domain.com/login", color = TextMuted) },
                singleLine = true,
                leadingIcon = {
                    Icon(Icons.Filled.Language, contentDescription = "URL", tint = CyberCyan)
                },
                trailingIcon = {
                    if (urlInput.isNotEmpty()) {
                        IconButton(onClick = { urlInput = "" }) {
                            Icon(Icons.Filled.Close, contentDescription = "Clear", tint = TextMuted)
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyberCyan,
                    unfocusedBorderColor = CyberBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                )
            )

            if (scanError != null) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = scanError ?: "",
                    color = CyberRed,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = { runScan() },
                enabled = !isScanning && urlInput.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CyberCyan),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isScanning) {
                    CircularProgressIndicator(color = CyberDarkBg, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text(
                        text = "DETONATE & SCAN URL",
                        fontWeight = FontWeight.Bold,
                        color = CyberDarkBg,
                        fontSize = 13.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        // Result Card
        if (activeResult != null) {
            ScanResultDisplay(record = activeResult!!)
        }
    }
}

@Composable
fun MessageScannerView(
    userId: String,
    scanRepository: ScanRepository
) {
    var messageText by remember { mutableStateOf("") }
    var isScanning by remember { mutableStateOf(false) }
    var activeResult by remember { mutableStateOf<ScanRecord?>(null) }
    var scanError by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    val runScan = {
        if (messageText.isNotBlank()) {
            focusManager.clearFocus()
            isScanning = true
            scanError = null
            coroutineScope.launch {
                try {
                    val response = ApiClient.service.scanMessage(MessageScanRequest(messageText.trim()))
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        val record = ScanRecord(
                            userId = userId,
                            type = "message",
                            input = messageText.trim(),
                            verdict = body.verdict.lowercase(),
                            riskScore = body.riskScore,
                            confidence = body.confidence,
                            indicators = body.indicators ?: emptyList(),
                            engine = body.engine ?: "LinkSentry Smishing Heuristic Engine",
                            modelVersion = "v1.0",
                            source = "android"
                        )
                        activeResult = record
                        scanRepository.saveScan(userId, record)
                    } else {
                        scanError = "Threat engine returned error code: ${response.code()}"
                    }
                } catch (e: Exception) {
                    scanError = "Failed to connect: ${e.localizedMessage}"
                } finally {
                    isScanning = false
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        CyberCard {
            Text(
                text = "SMS & EMAIL SMISHING ANALYZER",
                style = MaterialTheme.typography.labelSmall,
                color = CyberCyan
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Inspect text messages, SMS alerts, and emails for social engineering lures.",
                color = TextSecondary,
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(14.dp))

            OutlinedTextField(
                value = messageText,
                onValueChange = { messageText = it },
                placeholder = { Text("Paste suspicious message body here...", color = TextMuted) },
                minLines = 4,
                maxLines = 8,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyberCyan,
                    unfocusedBorderColor = CyberBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                )
            )

            if (scanError != null) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = scanError ?: "",
                    color = CyberRed,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = { runScan() },
                enabled = !isScanning && messageText.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CyberCyan),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isScanning) {
                    CircularProgressIndicator(color = CyberDarkBg, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text(
                        text = "ANALYZE MESSAGE CONTENT",
                        fontWeight = FontWeight.Bold,
                        color = CyberDarkBg,
                        fontSize = 13.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        if (activeResult != null) {
            ScanResultDisplay(record = activeResult!!)
        }
    }
}

@Composable
fun QrScannerView(
    userId: String,
    scanRepository: ScanRepository
) {
    val context = LocalContext.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    var scannedCode by remember { mutableStateOf<String?>(null) }
    var isAnalyzing by remember { mutableStateOf(false) }
    var activeResult by remember { mutableStateOf<ScanRecord?>(null) }
    var scanError by remember { mutableStateOf<String?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }

    val coroutineScope = rememberCoroutineScope()

    val analyzeUrl = { url: String ->
        isAnalyzing = true
        scanError = null
        coroutineScope.launch {
            try {
                val response = ApiClient.service.scanUrl(UrlScanRequest(url))
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    val record = ScanRecord(
                        userId = userId,
                        type = "qr",
                        input = url,
                        url = body.url,
                        domain = body.domain ?: "",
                        verdict = body.verdict.lowercase(),
                        riskScore = body.riskScore,
                        confidence = body.confidence,
                        indicators = body.indicators ?: emptyList(),
                        engine = body.engine ?: "LinkSentry QR/URL ML Engine",
                        modelVersion = body.modelVersion ?: "V3.3",
                        source = "android"
                    )
                    activeResult = record
                    scanRepository.saveScan(userId, record)
                } else {
                    scanError = "Engine failed: ${response.code()}"
                }
            } catch (e: Exception) {
                scanError = e.localizedMessage
            } finally {
                isAnalyzing = false
            }
        }
    }

    // Gallery Image Picker Fallback
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val image = InputImage.fromFilePath(context, uri)
                val scanner = BarcodeScanning.getClient()
                scanner.process(image)
                    .addOnSuccessListener { barcodes ->
                        val firstBarcode = barcodes.firstOrNull()?.rawValue
                        if (!firstBarcode.isNullOrBlank()) {
                            scannedCode = firstBarcode
                            analyzeUrl(firstBarcode)
                        } else {
                            scanError = "No valid QR code detected in the selected image."
                        }
                    }
                    .addOnFailureListener { e ->
                        scanError = "QR decoding error: ${e.localizedMessage}"
                    }
            } catch (e: Exception) {
                scanError = "Failed to load image: ${e.localizedMessage}"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        CyberCard {
            Text(
                text = "QR CODE / QUISHING DETONATOR",
                style = MaterialTheme.typography.labelSmall,
                color = CyberCyan
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Detect rogue QR code stickers, redirected payments, and malicious drops.",
                color = TextSecondary,
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(14.dp))

            if (hasCameraPermission) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(240.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.Black)
                        .border(2.dp, CyberCyan, RoundedCornerShape(12.dp))
                ) {
                    AndroidView(
                        factory = { ctx ->
                            val previewView = PreviewView(ctx)
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                            val cameraExecutor = Executors.newSingleThreadExecutor()

                            cameraProviderFuture.addListener({
                                val cameraProvider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also {
                                    it.surfaceProvider = previewView.surfaceProvider
                                }

                                val barcodeScanner = BarcodeScanning.getClient()
                                val imageAnalysis = ImageAnalysis.Builder()
                                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                    .build()

                                imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                                    val mediaImage = imageProxy.image
                                    if (mediaImage != null) {
                                        val image = InputImage.fromMediaImage(
                                            mediaImage,
                                            imageProxy.imageInfo.rotationDegrees
                                        )
                                        barcodeScanner.process(image)
                                            .addOnSuccessListener { barcodes ->
                                                val qr = barcodes.firstOrNull { it.format == Barcode.FORMAT_QR_CODE }?.rawValue
                                                if (!qr.isNullOrBlank() && qr != scannedCode && !isAnalyzing) {
                                                    scannedCode = qr
                                                    analyzeUrl(qr)
                                                }
                                            }
                                            .addOnCompleteListener {
                                                imageProxy.close()
                                            }
                                    } else {
                                        imageProxy.close()
                                    }
                                }

                                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                                try {
                                    cameraProvider.unbindAll()
                                    cameraProvider.bindToLifecycle(
                                        ctx as androidx.lifecycle.LifecycleOwner,
                                        cameraSelector,
                                        preview,
                                        imageAnalysis
                                    )
                                } catch (exc: Exception) {
                                    scanError = "Camera init error: ${exc.localizedMessage}"
                                }
                            }, ContextCompat.getMainExecutor(ctx))

                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(CyberSurfaceLight),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Filled.CameraAlt, contentDescription = "Camera", tint = CyberCyan, modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                            colors = ButtonDefaults.buttonColors(containerColor = CyberCyan)
                        ) {
                            Text("Enable Camera Scanner", color = CyberDarkBg, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Gallery Upload Button
            OutlinedButton(
                onClick = { galleryLauncher.launch("image/*") },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = CyberCyan),
                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(CyberCyan))
            ) {
                Icon(Icons.Filled.PhotoLibrary, contentDescription = "Gallery", modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Select QR Image from Gallery", fontWeight = FontWeight.SemiBold)
            }

            if (scannedCode != null) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "Decoded: $scannedCode",
                    color = CyberCyan,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    maxLines = 2
                )
            }

            if (scanError != null) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = scanError ?: "",
                    color = CyberRed,
                    fontSize = 12.sp
                )
            }
        }

        if (activeResult != null) {
            ScanResultDisplay(record = activeResult!!)
        }
    }
}

@Composable
fun ScanResultDisplay(record: ScanRecord) {
    CyberCard(
        borderColor = when (record.verdict.lowercase()) {
            "phishing" -> CyberRed
            "suspicious" -> CyberAmber
            else -> CyberEmerald
        }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "THREAT VERDICT",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = record.verdict.uppercase(),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    color = when (record.verdict.lowercase()) {
                        "phishing" -> CyberRed
                        "suspicious" -> CyberAmber
                        else -> CyberEmerald
                    }
                )
            }
            CyberBadge(verdict = record.verdict)
        }

        Spacer(modifier = Modifier.height(16.dp))

        ThreatMeter(riskScore = record.riskScore)

        Spacer(modifier = Modifier.height(14.dp))

        // Confidence & Engine row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text("ENGINE CONFIDENCE", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                Text(
                    text = "${(record.confidence * 100).toInt()}%",
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("MODEL VERSION", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                Text(
                    text = record.modelVersion,
                    color = CyberCyan,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        if (record.indicators.isNotEmpty()) {
            Spacer(modifier = Modifier.height(14.dp))
            Text("DETECTED THREAT INDICATORS", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            Spacer(modifier = Modifier.height(6.dp))
            record.indicators.forEach { indicator ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(vertical = 2.dp)
                ) {
                    Text("⚠️", fontSize = 12.sp)
                    Text(indicator, color = CyberRedLight, fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Synchronized to Firestore notice
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(6.dp))
                .background(CyberSurfaceLight)
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(Icons.Filled.CloudDone, contentDescription = "Cloud", tint = CyberEmerald, modifier = Modifier.size(16.dp))
            Text(
                text = "Synchronized to Cloud Firestore",
                color = TextSecondary,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}
