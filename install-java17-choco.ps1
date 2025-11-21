# Java 17 Installation via Chocolatey (Correct Package Names)
# Run PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Java 17 Installation via Chocolatey" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Running as Administrator - OK" -ForegroundColor Green
Write-Host ""

# Check Chocolatey
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Chocolatey not found. Installing..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

Write-Host "Chocolatey found. Searching for Java 17 packages..." -ForegroundColor Yellow
Write-Host ""

# Try different package names
$packages = @(
    "temurin17",
    "adoptopenjdk17",
    "corretto17jdk",
    "openjdk17",
    "microsoft-openjdk17"
)

Write-Host "Available Java 17 packages:" -ForegroundColor Cyan
foreach ($pkg in $packages) {
    Write-Host "  - $pkg" -ForegroundColor White
}
Write-Host ""

Write-Host "Trying to install: temurin17 (Eclipse Temurin - Recommended)" -ForegroundColor Yellow
Write-Host ""

try {
    choco install temurin17 -y --version=17.0.13
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS: Java 17 installed!" -ForegroundColor Green
        Write-Host "Please restart PowerShell and check with: java -version" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "temurin17 not found, trying alternatives..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Alternative: Install manually from Adoptium" -ForegroundColor Cyan
Write-Host "URL: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor White
Write-Host ""
Write-Host "Or try these Chocolatey packages manually:" -ForegroundColor Yellow
Write-Host "  choco install adoptopenjdk17 -y" -ForegroundColor White
Write-Host "  choco install corretto17jdk -y" -ForegroundColor White
Write-Host "  choco install openjdk17 -y" -ForegroundColor White

