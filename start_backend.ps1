# LinkSentry Backend Startup Script
# Ensures execution with D:\LinkSentry\.venv\Scripts\python.exe
# Handles port 8000 process management safely and idempotently.

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path $SCRIPT_DIR "backend"
$VENV_PYTHON = "D:\LinkSentry\.venv\Scripts\python.exe"

if (-not (Test-Path $VENV_PYTHON)) {
    Write-Error "[LinkSentry] Virtual environment Python interpreter not found at: $VENV_PYTHON"
    exit 1
}

Write-Host "[LinkSentry] Checking port 8000 availability..." -ForegroundColor Cyan

# Check if port 8000 is active
$conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue

if ($conn) {
    $occupiedPid = $conn.OwningProcess | Select-Object -First 1
    Write-Host "[LinkSentry] Port 8000 is occupied by PID: $occupiedPid. Probing health endpoint..." -ForegroundColor Yellow

    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
        if ($health.service -eq "LinkSentry API" -and $health.status -eq "ok") {
            Write-Host "[LinkSentry] Backend is already running and healthy (Version: $($health.version))." -ForegroundColor Green
            exit 0
        }
    } catch {
        Write-Host "[LinkSentry] Health check failed. Investigating occupying process..." -ForegroundColor Yellow
    }

    # If health check did not pass, inspect process before terminating
    $proc = Get-Process -Id $occupiedPid -ErrorAction SilentlyContinue
    if ($proc) {
        $procName = $proc.ProcessName.ToLower()
        if ($procName -like "*python*" -or $procName -like "*uvicorn*") {
            Write-Host "[LinkSentry] Terminating stale LinkSentry Uvicorn process (PID: $occupiedPid, Name: $($proc.ProcessName))..." -ForegroundColor Yellow
            Stop-Process -Id $occupiedPid -Force
            Start-Sleep -Seconds 1
        } else {
            Write-Error "[LinkSentry] Port 8000 is occupied by non-Python process: $($proc.ProcessName) (PID: $occupiedPid). Aborting startup to avoid conflict."
            exit 1
        }
    }
}

Write-Host "[LinkSentry] Starting LinkSentry FastAPI backend on 0.0.0.0:8000..." -ForegroundColor Green
Set-Location -Path $BACKEND_DIR

& $VENV_PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000
