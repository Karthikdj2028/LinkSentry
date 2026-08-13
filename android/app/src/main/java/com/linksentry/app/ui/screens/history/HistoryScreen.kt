package com.linksentry.app.ui.screens.history

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.repository.ScanRepository
import com.linksentry.app.ui.components.CyberBadge
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.components.CyberTopBar
import com.linksentry.app.ui.components.ThreatMeter
import com.linksentry.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    userId: String,
    scanRepository: ScanRepository
) {
    val scans by scanRepository.getScansFlow(userId).collectAsState(initial = emptyList())
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("all") }
    var selectedScanForDetail by remember { mutableStateOf<ScanRecord?>(null) }
    var scanToDelete by remember { mutableStateOf<ScanRecord?>(null) }

    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    val filteredScans = scans.filter { scan ->
        val matchesFilter = when (selectedFilter) {
            "phishing" -> scan.verdict.lowercase() == "phishing"
            "suspicious" -> scan.verdict.lowercase() == "suspicious"
            "safe" -> scan.verdict.lowercase() == "safe"
            "url" -> scan.type.lowercase() == "url"
            "qr" -> scan.type.lowercase() == "qr"
            "message" -> scan.type.lowercase() == "message"
            else -> true
        }
        val matchesSearch = if (searchQuery.isBlank()) true else {
            scan.input.contains(searchQuery, ignoreCase = true) ||
                    scan.domain.contains(searchQuery, ignoreCase = true) ||
                    scan.type.contains(searchQuery, ignoreCase = true)
        }
        matchesFilter && matchesSearch
    }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "LinkSentry Vault",
                subtitle = "FIRESTORE SCAN LOGS"
            )
        },
        containerColor = CyberDarkBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 14.dp)
        ) {
            Spacer(modifier = Modifier.height(10.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search by domain, URL, or keyword...", color = TextMuted, fontSize = 12.sp) },
                singleLine = true,
                leadingIcon = {
                    Icon(Icons.Filled.Search, contentDescription = "Search", tint = CyberCyan, modifier = Modifier.size(18.dp))
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Filled.Close, contentDescription = "Clear", tint = TextMuted, modifier = Modifier.size(18.dp))
                        }
                    }
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyberCyan,
                    unfocusedBorderColor = CyberBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                )
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Horizontally Scrollable Filter Row (All Logs | Phishing | Suspicious | Safe | URLs | QR | SMS)
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                contentPadding = PaddingValues(horizontal = 2.dp)
            ) {
                item {
                    FilterChipItem(
                        title = "All Logs",
                        isSelected = selectedFilter == "all",
                        count = scans.size,
                        onClick = { selectedFilter = "all" }
                    )
                }
                item {
                    FilterChipItem(
                        title = "Phishing",
                        isSelected = selectedFilter == "phishing",
                        count = scans.count { it.verdict.lowercase() == "phishing" },
                        onClick = { selectedFilter = "phishing" }
                    )
                }
                item {
                    FilterChipItem(
                        title = "Suspicious",
                        isSelected = selectedFilter == "suspicious",
                        count = scans.count { it.verdict.lowercase() == "suspicious" },
                        onClick = { selectedFilter = "suspicious" }
                    )
                }
                item {
                    FilterChipItem(
                        title = "Safe",
                        isSelected = selectedFilter == "safe",
                        count = scans.count { it.verdict.lowercase() == "safe" },
                        onClick = { selectedFilter = "safe" }
                    )
                }
                item {
                    FilterChipItem(
                        title = "URLs",
                        isSelected = selectedFilter == "url",
                        count = scans.count { it.type.lowercase() == "url" },
                        onClick = { selectedFilter = "url" }
                    )
                }
                item {
                    FilterChipItem(
                        title = "QR Codes",
                        isSelected = selectedFilter == "qr",
                        count = scans.count { it.type.lowercase() == "qr" },
                        onClick = { selectedFilter = "qr" }
                    )
                }
                item {
                    FilterChipItem(
                        title = "SMS",
                        isSelected = selectedFilter == "message",
                        count = scans.count { it.type.lowercase() == "message" },
                        onClick = { selectedFilter = "message" }
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (filteredScans.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Filled.SearchOff,
                            contentDescription = "No results",
                            tint = TextMuted,
                            modifier = Modifier.size(40.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "No Scans Match Query",
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary
                        )
                        Text(
                            text = "Try adjusting your search query or verdict filters.",
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .imePadding(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    items(filteredScans, key = { it.id.ifBlank { "${it.createdAt?.seconds ?: 0L}_${it.input.hashCode()}" } }) { scan ->
                        HistoryRecordCard(
                            scan = scan,
                            onClick = { selectedScanForDetail = scan },
                            onDelete = { scanToDelete = scan }
                        )
                    }
                }
            }
        }
    }

    // Detail Bottom Sheet
    selectedScanForDetail?.let { detailScan ->
        ModalBottomSheet(
            onDismissRequest = { selectedScanForDetail = null },
            containerColor = CyberSurface,
            scrimColor = Color.Black.copy(alpha = 0.6f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp)
                    .imePadding()
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "INCIDENT INSPECTION",
                        style = MaterialTheme.typography.labelSmall,
                        color = CyberCyan
                    )
                    CyberBadge(verdict = detailScan.verdict)
                }

                Spacer(modifier = Modifier.height(12.dp))

                ThreatMeter(riskScore = detailScan.riskScore)

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "TARGET ASSET PAYLOAD",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(CyberSurfaceLight)
                        .padding(10.dp)
                ) {
                    Text(
                        text = detailScan.input.ifEmpty { detailScan.url },
                        color = TextPrimary,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(text = "SCAN VECTOR", fontSize = 10.sp, color = TextSecondary)
                        Text(
                            text = detailScan.type.uppercase(),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = CyberCyan,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(text = "TIMESTAMP", fontSize = 10.sp, color = TextSecondary)
                        Text(
                            text = detailScan.formattedDate,
                            fontSize = 12.sp,
                            color = TextPrimary,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                if (detailScan.indicators.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "DETECTED THREAT INDICATORS",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        detailScan.indicators.forEach { indicator ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Warning,
                                    contentDescription = null,
                                    tint = CyberAmber,
                                    modifier = Modifier.size(13.dp)
                                )
                                Text(
                                    text = indicator,
                                    color = CyberRedLight,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    // Delete Confirmation Dialog
    scanToDelete?.let { scan ->
        AlertDialog(
            onDismissRequest = { scanToDelete = null },
            title = { Text("Delete Investigation Log?", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "This will remove the log from both local device and Cloud Firestore cluster.",
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            if (scan.id.isNotBlank()) {
                                scanRepository.deleteScan(userId, scan.id)
                            }
                            scanToDelete = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CyberRed)
                ) {
                    Text("DELETE", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }
            },
            dismissButton = {
                TextButton(onClick = { scanToDelete = null }) {
                    Text("CANCEL", color = TextSecondary, fontSize = 11.sp)
                }
            },
            containerColor = CyberSurface
        )
    }
}

@Composable
fun FilterChipItem(
    title: String,
    isSelected: Boolean,
    count: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (isSelected) CyberCyan else CyberSurface)
            .border(1.dp, if (isSelected) CyberCyan else CyberBorderSubtle, RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(vertical = 6.dp, horizontal = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "$title ($count)",
            color = if (isSelected) CyberDarkBg else TextSecondary,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            maxLines = 1,
            softWrap = false
        )
    }
}

@Composable
fun HistoryRecordCard(
    scan: ScanRecord,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    CyberCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(CyberCyan.copy(alpha = 0.15f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = scan.type.uppercase(),
                        color = CyberCyan,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Text(
                    text = scan.formattedDate,
                    color = TextMuted,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    maxLines = 1
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                CyberBadge(verdict = scan.verdict)
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Delete,
                        contentDescription = "Delete",
                        tint = TextMuted,
                        modifier = Modifier.size(15.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (scan.domain.isNotBlank()) scan.domain else scan.input,
            color = TextPrimary,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}
