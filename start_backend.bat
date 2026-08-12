@echo off
REM LinkSentry Backend Startup Batch Wrapper
REM Invokes start_backend.ps1 using Windows PowerShell

set SCRIPT_DIR=%~dp0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start_backend.ps1"
