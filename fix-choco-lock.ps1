# Fix Chocolatey Lock File Issue
# Run PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Chocolatey Lock File Fix" -ForegroundColor Cyan
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

# Stop Chocolatey processes
Write-Host "Stopping Chocolatey processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.Path -like "*chocolatey*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove lock files
$lockPath = "C:\ProgramData\chocolatey\lib\b15f6a0b4887f5441348471dad20e30534334204"
if (Test-Path $lockPath) {
    Write-Host "Removing lock file: $lockPath" -ForegroundColor Yellow
    Remove-Item -Path $lockPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Lock file removed" -ForegroundColor Green
} else {
    Write-Host "Lock file not found (may already be removed)" -ForegroundColor Yellow
}

# Clean Chocolatey cache
Write-Host ""
Write-Host "Cleaning Chocolatey cache..." -ForegroundColor Yellow
if (Get-Command choco -ErrorAction SilentlyContinue) {
    choco cache remove --expired -y
    Write-Host "Cache cleaned" -ForegroundColor Green
}

# Try to remove lib-bad directory if it exists
$libBadPath = "C:\ProgramData\chocolatey\lib-bad"
if (Test-Path $libBadPath) {
    Write-Host ""
    Write-Host "Removing lib-bad directory..." -ForegroundColor Yellow
    Remove-Item -Path $libBadPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "lib-bad directory removed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Lock file issue fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "Now try installing Java 17 again:" -ForegroundColor Cyan
Write-Host "  choco install temurin17 -y" -ForegroundColor White
Write-Host ""
Write-Host "Or use manual installation (recommended):" -ForegroundColor Yellow
Write-Host "  Download from: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor White

