package com.linksentry.app.ui.screens.history

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
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
import com.linksentry.app.ui.components.ScanDetailBottomSheet
import com.linksentry.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    userId: String,
    scanRepository: ScanRepository
) {
    val colors = LocalAppColors.current
    val cloudSyncEnabled by com.linksentry.app.data.preferences.AppPreferences.cloudSyncFlow.collectAsState()
    val scans by scanRepository.getScansFlow(userId).collectAsState(initial = scanRepository.scansState.value)
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
                title = "History",
                subtitle = "${filteredScans.size} scan records"
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
                    .padding(horizontal = horizontalPadding)
            ) {
                Spacer(modifier = Modifier.height(10.dp))

                // Cloud Sync OFF Banner Notice
                if (!cloudSyncEnabled) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = colors.brandAccent.copy(alpha = 0.08f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.brandAccent.copy(alpha = 0.2f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.CloudOff,
                                contentDescription = null,
                                tint = colors.brandAccent,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = "Cloud sync is off — scans remain stored locally on this device.",
                                fontSize = 12.sp,
                                color = colors.textPrimary,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // Full-width Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search links, domains, messages...", color = colors.textMuted, fontSize = 13.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    leadingIcon = {
                        Icon(Icons.Filled.Search, contentDescription = "Search", tint = colors.brandAccent, modifier = Modifier.size(18.dp))
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Filled.Close, contentDescription = "Clear", tint = colors.textMuted, modifier = Modifier.size(18.dp))
                            }
                        }
                    },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                    modifier = Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = 52.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.brandAccent,
                        unfocusedBorderColor = colors.borderSubtle,
                        focusedTextColor = colors.textPrimary,
                        unfocusedTextColor = colors.textPrimary,
                        focusedContainerColor = colors.surface,
                        unfocusedContainerColor = colors.surface
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Horizontally Scrollable Filter Chips Row
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    contentPadding = PaddingValues(horizontal = 2.dp)
                ) {
                    item {
                        FilterChipItem(
                            title = "All",
                            count = scans.size,
                            isSelected = selectedFilter == "all",
                            onClick = { selectedFilter = "all" }
                        )
                    }
                    item {
                        FilterChipItem(
                            title = "Phishing",
                            count = scans.count { it.verdict.lowercase() == "phishing" },
                            isSelected = selectedFilter == "phishing",
                            onClick = { selectedFilter = "phishing" }
                        )
                    }
                    item {
                        FilterChipItem(
                            title = "Suspicious",
                            count = scans.count { it.verdict.lowercase() == "suspicious" },
                            isSelected = selectedFilter == "suspicious",
                            onClick = { selectedFilter = "suspicious" }
                        )
                    }
                    item {
                        FilterChipItem(
                            title = "Safe",
                            count = scans.count { it.verdict.lowercase() == "safe" },
                            isSelected = selectedFilter == "safe",
                            onClick = { selectedFilter = "safe" }
                        )
                    }
                    item {
                        FilterChipItem(
                            title = "Links",
                            count = scans.count { it.type.lowercase() == "url" },
                            isSelected = selectedFilter == "url",
                            onClick = { selectedFilter = "url" }
                        )
                    }
                    item {
                        FilterChipItem(
                            title = "QR",
                            count = scans.count { it.type.lowercase() == "qr" },
                            isSelected = selectedFilter == "qr",
                            onClick = { selectedFilter = "qr" }
                        )
                    }
                    item {
                        FilterChipItem(
                            title = "SMS",
                            count = scans.count { it.type.lowercase() == "message" },
                            isSelected = selectedFilter == "message",
                            onClick = { selectedFilter = "message" }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

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
                                contentDescription = null,
                                tint = colors.textMuted,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "No scans match your search",
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textPrimary,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Try clearing the search query or changing filters.",
                                color = colors.textSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .imePadding(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 20.dp)
                    ) {
                        items(
                            filteredScans,
                            key = { it.id.ifBlank { "${it.createdAt?.seconds ?: 0L}_${it.input.hashCode()}" } }
                        ) { scan ->
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
    }

    selectedScanForDetail?.let { detailScan ->
        ScanDetailBottomSheet(
            scan = detailScan,
            onDismiss = { selectedScanForDetail = null }
        )
    }

    scanToDelete?.let { scan ->
        AlertDialog(
            onDismissRequest = { scanToDelete = null },
            title = { Text("Delete scan record?", color = colors.textPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "This record will be permanently deleted from your account.",
                    color = colors.textSecondary,
                    fontSize = 13.sp
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
                    colors = ButtonDefaults.buttonColors(containerColor = colors.phishing),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Delete", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { scanToDelete = null }) {
                    Text("Cancel", color = colors.textSecondary, fontSize = 12.sp)
                }
            },
            containerColor = colors.surface
        )
    }
}

@Composable
private fun FilterChipItem(
    title: String,
    count: Int,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) colors.brandAccent.copy(alpha = 0.15f) else colors.surface,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) colors.brandAccent.copy(alpha = 0.4f) else colors.borderSubtle
        ),
        modifier = modifier.height(34.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                text = "$title ($count)",
                color = if (isSelected) colors.brandAccent else colors.textSecondary,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

@Composable
private fun HistoryRecordCard(
    scan: ScanRecord,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val colors = LocalAppColors.current
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
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(colors.surfaceLight),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when (scan.type.lowercase()) {
                        "qr" -> Icons.Filled.QrCodeScanner
                        "message" -> Icons.AutoMirrored.Filled.Chat
                        else -> Icons.Filled.Language
                    },
                    contentDescription = scan.type,
                    tint = colors.brandAccent,
                    modifier = Modifier.size(16.dp)
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (scan.domain.isNotBlank()) scan.domain else scan.input.ifEmpty { scan.url },
                    color = colors.textPrimary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = when (scan.type.lowercase()) {
                            "url" -> "Link"
                            "qr" -> "QR Code"
                            "message" -> "SMS"
                            else -> scan.type.replaceFirstChar { it.uppercase() }
                        },
                        color = colors.textSecondary,
                        fontSize = 11.sp
                    )
                    Text(
                        text = "•",
                        color = colors.textMuted,
                        fontSize = 10.sp
                    )
                    Text(
                        text = scan.formattedDate,
                        color = colors.textMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                CyberBadge(verdict = scan.verdict)
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.DeleteOutline,
                        contentDescription = "Delete",
                        tint = colors.textMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
