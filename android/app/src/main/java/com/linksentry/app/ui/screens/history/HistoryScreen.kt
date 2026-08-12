package com.linksentry.app.ui.screens.history

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.model.ScanRecord
import com.linksentry.app.data.repository.ScanRepository
import com.linksentry.app.ui.components.CyberBadge
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.components.CyberTopBar
import com.linksentry.app.ui.screens.scanner.ScanResultDisplay
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
    var inspectingScan by remember { mutableStateOf<ScanRecord?>(null) }
    var scanToDelete by remember { mutableStateOf<ScanRecord?>(null) }

    val coroutineScope = rememberCoroutineScope()

    val filteredScans = scans.filter { scan ->
        val matchesSearch = searchQuery.isBlank() ||
                scan.input.contains(searchQuery, ignoreCase = true) ||
                scan.domain.contains(searchQuery, ignoreCase = true) ||
                scan.url.contains(searchQuery, ignoreCase = true)

        val matchesFilter = when (selectedFilter) {
            "all" -> true
            "phishing" -> scan.verdict.lowercase() == "phishing"
            "suspicious" -> scan.verdict.lowercase() == "suspicious"
            "safe" -> scan.verdict.lowercase() == "safe"
            "url" -> scan.type == "url"
            "qr" -> scan.type == "qr"
            "message" -> scan.type == "message"
            else -> true
        }

        matchesSearch && matchesFilter
    }

    Scaffold(
        topBar = {
            CyberTopBar(
                title = "Audit History",
                subtitle = "FIRESTORE SCAN LOGS"
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

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search logs by domain, URL, or keyword...", color = TextMuted) },
                singleLine = true,
                leadingIcon = {
                    Icon(Icons.Filled.Search, contentDescription = "Search", tint = CyberCyan)
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
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

            Spacer(modifier = Modifier.height(10.dp))

            // Filter Chips Row
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                val filters = listOf(
                    "all" to "All Logs",
                    "phishing" to "Phishing",
                    "suspicious" to "Suspicious",
                    "safe" to "Safe",
                    "url" to "URLs",
                    "qr" to "QR Codes",
                    "message" to "SMS"
                )

                items(filters) { (key, label) ->
                    val isSelected = selectedFilter == key
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(if (isSelected) CyberCyan else CyberSurface)
                            .border(1.dp, if (isSelected) CyberCyan else CyberBorderSubtle, RoundedCornerShape(20.dp))
                            .clickable { selectedFilter = key }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = label,
                            color = if (isSelected) CyberDarkBg else TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (filteredScans.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 60.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Filled.History, contentDescription = "Empty", tint = TextMuted, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("No Audit Records Found", fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Scans performed on Web or Android will appear here.", color = TextMuted, fontSize = 12.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 20.dp)
                ) {
                    items(filteredScans, key = { it.id }) { scan ->
                        HistoryItemCard(
                            scan = scan,
                            onClick = { inspectingScan = scan },
                            onDelete = { scanToDelete = scan }
                        )
                    }
                }
            }
        }

        // Details Modal Sheet
        if (inspectingScan != null) {
            ModalBottomSheet(
                onDismissRequest = { inspectingScan = null },
                containerColor = CyberSurface
            ) {
                Column(
                    modifier = Modifier
                        .padding(20.dp)
                        .padding(bottom = 30.dp)
                ) {
                    ScanResultDisplay(record = inspectingScan!!)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { inspectingScan = null },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = CyberSurfaceLight)
                    ) {
                        Text("Close Inspection", color = TextPrimary)
                    }
                }
            }
        }

        // Confirm Delete Dialog
        if (scanToDelete != null) {
            AlertDialog(
                onDismissRequest = { scanToDelete = null },
                title = { Text("Delete Audit Record?", color = TextPrimary) },
                text = { Text("This will permanently remove this record from your Firestore threat database.", color = TextSecondary) },
                confirmButton = {
                    Button(
                        onClick = {
                            val id = scanToDelete?.id ?: ""
                            scanToDelete = null
                            coroutineScope.launch {
                                scanRepository.deleteScan(userId, id)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CyberRed)
                    ) {
                        Text("Delete", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { scanToDelete = null }) {
                        Text("Cancel", color = TextSecondary)
                    }
                },
                containerColor = CyberSurface
            )
        }
    }
}

@Composable
fun HistoryItemCard(
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
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = scan.type.uppercase(),
                        color = CyberCyan,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                    Text("•", color = TextMuted, fontSize = 10.sp)
                    Text(
                        text = scan.formattedDate,
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    if (scan.source.isNotBlank()) {
                        Text("•", color = TextMuted, fontSize = 10.sp)
                        Text(
                            text = scan.source.uppercase(),
                            color = CyberEmerald,
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (scan.domain.isNotBlank()) scan.domain else scan.input,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    maxLines = 1
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CyberBadge(verdict = scan.verdict)
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.DeleteOutline,
                        contentDescription = "Delete",
                        tint = TextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
