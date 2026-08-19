package com.linksentry.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.linksentry.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val email: String = "",
    val pass: String = "",
    val confirmPass: String = "",
    val isRegisterMode: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false
)

class AuthViewModel(private val authRepository: AuthRepository = AuthRepository()) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun onEmailChanged(email: String) {
        _uiState.value = _uiState.value.copy(email = email, errorMessage = null)
    }

    fun onPasswordChanged(pass: String) {
        _uiState.value = _uiState.value.copy(pass = pass, errorMessage = null)
    }

    fun onConfirmPasswordChanged(confirm: String) {
        _uiState.value = _uiState.value.copy(confirmPass = confirm, errorMessage = null)
    }

    fun toggleMode(isRegister: Boolean) {
        _uiState.value = _uiState.value.copy(isRegisterMode = isRegister, errorMessage = null)
    }

    fun submit() {
        val state = _uiState.value
        val email = state.email.trim()
        val pass = state.pass

        if (email.isBlank() || pass.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please enter both email and password.")
            return
        }
        if (state.isRegisterMode && pass != state.confirmPass) {
            _uiState.value = state.copy(errorMessage = "Passwords do not match.")
            return
        }
        if (pass.length < 6) {
            _uiState.value = state.copy(errorMessage = "Password must be at least 6 characters.")
            return
        }

        _uiState.value = state.copy(isLoading = true, errorMessage = null)

        viewModelScope.launch {
            val result = if (state.isRegisterMode) {
                authRepository.register(email, pass)
            } else {
                authRepository.signIn(email, pass)
            }

            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
                },
                onFailure = { err ->
                    val userFriendlyMsg = mapFirebaseErrorMessage(err.message ?: "")
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = userFriendlyMsg)
                }
            )
        }
    }

    fun signInWithGoogle(idToken: String) {
        if (idToken.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Invalid Google authentication token.")
            return
        }
        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            val result = authRepository.signInWithGoogleCredential(idToken)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
                },
                onFailure = { err ->
                    val userFriendlyMsg = mapFirebaseErrorMessage(err.message ?: "")
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = userFriendlyMsg)
                }
            )
        }
    }

    fun setGoogleError(message: String) {
        _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = message)
    }

    private fun mapFirebaseErrorMessage(raw: String): String {
        return when {
            raw.contains("INVALID_LOGIN_CREDENTIALS", ignoreCase = true) || raw.contains("wrong-password", ignoreCase = true) || raw.contains("user-not-found", ignoreCase = true) ->
                "Invalid email or password. Please verify your credentials."
            raw.contains("EMAIL_EXISTS", ignoreCase = true) || raw.contains("email-already-in-use", ignoreCase = true) ->
                "An account with this email already exists. Please sign in instead."
            raw.contains("WEAK_PASSWORD", ignoreCase = true) || raw.contains("weak-password", ignoreCase = true) ->
                "Password is too weak. Please use at least 6 characters."
            raw.contains("INVALID_EMAIL", ignoreCase = true) || raw.contains("invalid-email", ignoreCase = true) ->
                "Please enter a valid email address format (e.g., analyst@domain.com)."
            raw.contains("USER_DISABLED", ignoreCase = true) ->
                "This account has been disabled. Please contact your SOC administrator."
            raw.contains("NETWORK_ERROR", ignoreCase = true) || raw.contains("network-request-failed", ignoreCase = true) ->
                "Network connection failed. Please check your internet connection."
            else -> raw.ifBlank { "Authentication failed. Please try again." }
        }
    }
}
