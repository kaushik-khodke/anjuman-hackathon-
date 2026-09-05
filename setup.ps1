# ==============================================================================
# MyHealthChain -- Unified One-Command Automated Setup Script (Windows PowerShell)
# ==============================================================================

Write-Host "[*] Starting MyHealthChain Automated Environment Setup..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"

# 1. Check Prerequisites
Write-Host "`n[*] Checking System Prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[X] Python is required but not installed." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[X] Node.js is required but not installed." -ForegroundColor Red
    exit 1
}

$pyVer = python --version
$nodeVer = node --version
Write-Host "[+] Prerequisites detected: $pyVer | Node $nodeVer" -ForegroundColor Green

# 2. Environment Configuration Check
Write-Host "`n[*] Validating Environment File (.env)..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot ".env"
$envExamplePath = Join-Path $PSScriptRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath -Destination $envPath
        Write-Host "[+] Created .env from .env.example" -ForegroundColor Green
    } else {
        Write-Host "[!] .env file missing. Please create .env with required keys." -ForegroundColor Yellow
    }
} else {
    Write-Host "[+] Environment file .env exists." -ForegroundColor Green
}

# 3. Setup Python Backend Virtual Environment
Write-Host "`n[*] Setting up Backend Virtual Environment and Installing Dependencies..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
Set-Location $backendPath

if (-not (Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "[+] Created Python virtual environment (.venv)" -ForegroundColor Green
}

$venvPython = Join-Path $backendPath ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    & $venvPython -m pip install --upgrade pip --quiet
    & $venvPython -m pip install -r requirements.txt --quiet
} else {
    python -m pip install -r requirements.txt --quiet
}
Write-Host "[+] Backend dependencies installed successfully." -ForegroundColor Green
Set-Location $PSScriptRoot

# 4. Setup Frontend npm Dependencies
Write-Host "`n[*] Installing Frontend Dependencies..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendPath
cmd.exe /c npm install --quiet
Write-Host "[+] Frontend dependencies installed successfully." -ForegroundColor Green
Set-Location $PSScriptRoot

Write-Host "`n=========================================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE! You are ready to start MyHealthChain." -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "To start all services, run:" -ForegroundColor Yellow
Write-Host "   .\start_all.ps1" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan
