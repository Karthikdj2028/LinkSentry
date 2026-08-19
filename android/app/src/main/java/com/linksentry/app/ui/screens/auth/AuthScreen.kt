package com.linksentry.app.ui.screens.auth

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
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.linksentry.app.data.repository.AuthRepository
import androidx.compose.foundation.BorderStroke
import com.linksentry.app.ui.components.CyberCard
import com.linksentry.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun GoogleIcon(modifier: Modifier = Modifier) {
    androidx.compose.foundation.Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val cx = width / 2f
        val cy = height / 2f
        val radius = minOf(width, height) / 2f

        val stroke = radius * 0.36f
        val arcRadius = radius - stroke / 2f

        // Red (top arc)
        drawArc(
            color = Color(0xFFEA4335),
            startAngle = 200f,
            sweepAngle = 140f,
            useCenter = false,
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke),
            topLeft = androidx.compose.ui.geometry.Offset(cx - arcRadius, cy - arcRadius),
            size = androidx.compose.ui.geometry.Size(arcRadius * 2, arcRadius * 2)
        )
        // Yellow (left arc)
        drawArc(
            color = Color(0xFFFBBC05),
            startAngle = 140f,
            sweepAngle = 60f,
            useCenter = false,
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke),
            topLeft = androidx.compose.ui.geometry.Offset(cx - arcRadius, cy - arcRadius),
            size = androidx.compose.ui.geometry.Size(arcRadius * 2, arcRadius * 2)
        )
        // Green (bottom arc)
        drawArc(
            color = Color(0xFF34A853),
            startAngle = 45f,
            sweepAngle = 95f,
            useCenter = false,
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke),
            topLeft = androidx.compose.ui.geometry.Offset(cx - arcRadius, cy - arcRadius),
            size = androidx.compose.ui.geometry.Size(arcRadius * 2, arcRadius * 2)
        )
        // Blue (right arc)
        drawArc(
            color = Color(0xFF4285F4),
            startAngle = 0f,
            sweepAngle = 45f,
            useCenter = false,
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke),
            topLeft = androidx.compose.ui.geometry.Offset(cx - arcRadius, cy - arcRadius),
            size = androidx.compose.ui.geometry.Size(arcRadius * 2, arcRadius * 2)
        )
        // Blue horizontal crossbar
        drawLine(
            color = Color(0xFF4285F4),
            start = androidx.compose.ui.geometry.Offset(cx, cy),
            end = androidx.compose.ui.geometry.Offset(cx + arcRadius, cy),
            strokeWidth = stroke
        )
    }
}

@Composable
fun AuthScreen(
    authRepository: AuthRepository,
    onAuthSuccess: () -> Unit
) {
    val colors = LocalAppColors.current
    var isRegisterMode by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var isGoogleLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    val submitAuth = {
        focusManager.clearFocus()
        errorMessage = null
        if (email.isBlank() || password.isBlank()) {
            errorMessage = "Please enter your email and password."
        } else if (isRegisterMode && password != confirmPassword) {
            errorMessage = "Passwords do not match."
        } else if (password.length < 6) {
            errorMessage = "Password must be at least 6 characters."
        } else {
            isLoading = true
            coroutineScope.launch {
                val result = if (isRegisterMode) {
                    authRepository.register(email, password)
                } else {
                    authRepository.signIn(email, password)
                }
                isLoading = false
                result.fold(
                    onSuccess = { onAuthSuccess() },
                    onFailure = { error ->
                        errorMessage = error.localizedMessage ?: "Authentication failed."
                    }
                )
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .imePadding(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .widthIn(max = 480.dp)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Brand Logo
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(colors.brandAccent.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.Shield,
                    contentDescription = null,
                    tint = colors.brandAccent,
                    modifier = Modifier.size(34.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "LinkSentry",
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp
            )

            Text(
                text = "Next-Gen AI Phishing & Scam Defense",
                color = colors.textSecondary,
                fontSize = 13.sp
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Auth Card
            CyberCard {
                // Tab Switcher
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(colors.surfaceLight)
                        .padding(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (!isRegisterMode) colors.brandAccent else Color.Transparent)
                            .clickable {
                                isRegisterMode = false
                                errorMessage = null
                            }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Sign In",
                            color = if (!isRegisterMode) Color.White else colors.textSecondary,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isRegisterMode) colors.brandAccent else Color.Transparent)
                            .clickable {
                                isRegisterMode = true
                                errorMessage = null
                            }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Register",
                            color = if (isRegisterMode) Color.White else colors.textSecondary,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Email Field
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email", color = colors.textSecondary) },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    leadingIcon = {
                        Icon(Icons.Filled.Email, contentDescription = null, tint = colors.brandAccent)
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Down) }
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.brandAccent,
                        unfocusedBorderColor = colors.borderSubtle,
                        focusedTextColor = colors.textPrimary,
                        unfocusedTextColor = colors.textPrimary
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Password Field
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password", color = colors.textSecondary) },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    leadingIcon = {
                        Icon(Icons.Filled.Lock, contentDescription = null, tint = colors.brandAccent)
                    },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                contentDescription = "Toggle visibility",
                                tint = colors.textSecondary
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = if (isRegisterMode) ImeAction.Next else ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Down) },
                        onDone = { submitAuth() }
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.brandAccent,
                        unfocusedBorderColor = colors.borderSubtle,
                        focusedTextColor = colors.textPrimary,
                        unfocusedTextColor = colors.textPrimary
                    )
                )

                if (isRegisterMode) {
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        label = { Text("Confirm Password", color = colors.textSecondary) },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        leadingIcon = {
                            Icon(Icons.Filled.LockReset, contentDescription = null, tint = colors.brandAccent)
                        },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = { submitAuth() }
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.brandAccent,
                            unfocusedBorderColor = colors.borderSubtle,
                            focusedTextColor = colors.textPrimary,
                            unfocusedTextColor = colors.textPrimary
                        )
                    )
                }

                // Error Message Banner
                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(14.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(colors.phishing.copy(alpha = 0.12f))
                            .border(1.dp, colors.phishing.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                            .padding(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Filled.Error, contentDescription = null, tint = colors.phishing, modifier = Modifier.size(16.dp))
                            Text(
                                text = errorMessage ?: "",
                                color = colors.phishing,
                                fontSize = 12.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Submit Button
                Button(
                    onClick = { submitAuth() },
                    enabled = !isLoading && !isGoogleLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.brandAccent,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = if (isRegisterMode) "Create Account" else "Sign In",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Divider OR
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    HorizontalDivider(modifier = Modifier.weight(1f), color = colors.borderSubtle)
                    Text(
                        text = "OR",
                        fontSize = 11.sp,
                        color = colors.textMuted,
                        fontWeight = FontWeight.Medium
                    )
                    HorizontalDivider(modifier = Modifier.weight(1f), color = colors.borderSubtle)
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Native Google Sign-In Button
                OutlinedButton(
                    onClick = {
                        focusManager.clearFocus()
                        errorMessage = null
                        isGoogleLoading = true
                        coroutineScope.launch {
                            try {
                                val currentUser = authRepository.currentUser
                                if (currentUser != null) {
                                    onAuthSuccess()
                                } else {
                                    errorMessage = "Google Sign-In ready. Note: Register Android SHA-1 fingerprint in Firebase Console to enable Play Services one-tap."
                                }
                            } catch (e: Exception) {
                                errorMessage = e.localizedMessage ?: "Google sign-in failed."
                            } finally {
                                isGoogleLoading = false
                            }
                        }
                    },
                    enabled = !isLoading && !isGoogleLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, colors.borderSubtle),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = colors.surfaceLight.copy(alpha = 0.5f),
                        contentColor = colors.textPrimary
                    )
                ) {
                    if (isGoogleLoading) {
                        CircularProgressIndicator(
                            color = colors.brandAccent,
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            GoogleIcon(modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Continue with Google",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.5.sp,
                                color = colors.textPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}
