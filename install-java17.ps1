# Java 17 Installation Guide Script
# This script helps install Java 17 for Android builds

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Java 17 Installation Guide" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Current Java Version:" -ForegroundColor Yellow
try {
    $javaOutput = java -version 2>&1 | Select-String "version"
    Write-Host $javaOutput -ForegroundColor White
} catch {
    Write-Host "Java not found" -ForegroundColor Red
}
Write-Host ""

Write-Host "PROBLEM: Java 8 is installed but Android build requires Java 17!" -ForegroundColor Red
Write-Host ""

Write-Host "Solution Options:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Adoptium (Eclipse Temurin) - RECOMMENDED" -ForegroundColor Cyan
Write-Host "   URL: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor White
Write-Host "   - Download Windows x64 JDK 17" -ForegroundColor Gray
Write-Host "   - Run .msi installer" -ForegroundColor Gray
Write-Host "   - Check 'Set JAVA_HOME variable' option" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Chocolatey (PowerShell Admin required):" -ForegroundColor Cyan
Write-Host "   choco install temurin17jdk -y" -ForegroundColor White
Write-Host ""

Write-Host "3. Scoop:" -ForegroundColor Cyan
Write-Host "   scoop bucket add java" -ForegroundColor White
Write-Host "   scoop install temurin17-jdk" -ForegroundColor White
Write-Host ""

Write-Host "After Installation:" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell" -ForegroundColor White
Write-Host "2. Check with: java -version (should show 17)" -ForegroundColor White
Write-Host "3. Try Android build again" -ForegroundColor White
Write-Host ""

Write-Host "JAVA_HOME Setup (if needed):" -ForegroundColor Yellow
Write-Host "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot" -ForegroundColor White
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Running as Administrator - Can install via Chocolatey" -ForegroundColor Green
    Write-Host ""
    Write-Host "Do you want to install Java 17 via Chocolatey? (Y/N)" -ForegroundColor Cyan
    $response = Read-Host
    
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host ""
        Write-Host "Checking for Chocolatey..." -ForegroundColor Yellow
        
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-Host "Chocolatey found. Installing Java 17..." -ForegroundColor Green
            Write-Host "Trying package: temurin17" -ForegroundColor Yellow
            
            # Try temurin17 first (Eclipse Temurin)
            choco install temurin17 -y --version=17.0.13
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host ""
                Write-Host "temurin17 not found. Trying alternatives..." -ForegroundColor Yellow
                Write-Host "Alternative packages:" -ForegroundColor Cyan
                Write-Host "  choco install adoptopenjdk17 -y" -ForegroundColor White
                Write-Host "  choco install corretto17jdk -y" -ForegroundColor White
                Write-Host ""
                Write-Host "Or install manually from: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Yellow
            } else {
                Write-Host ""
                Write-Host "Installation complete! Please restart PowerShell and check with: java -version" -ForegroundColor Green
            }
        } else {
            Write-Host "Chocolatey not found. Installing Chocolatey first..." -ForegroundColor Yellow
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
            
            Write-Host ""
            Write-Host "Chocolatey installed. Installing Java 17..." -ForegroundColor Green
            choco install temurin17 -y --version=17.0.13
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host ""
                Write-Host "Package not found. Please install manually from: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Yellow
            } else {
                Write-Host ""
                Write-Host "Installation complete! Please restart PowerShell and check with: java -version" -ForegroundColor Green
            }
        }
    } else {
        Write-Host ""
        Write-Host "Manual installation: Follow the steps above." -ForegroundColor Yellow
    }
} else {
    Write-Host "NOT running as Administrator." -ForegroundColor Yellow
    Write-Host "For automatic installation, run PowerShell as Administrator and run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or install manually:" -ForegroundColor Cyan
    Write-Host "1. Download from: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor White
    Write-Host "2. Run the installer" -ForegroundColor White
    Write-Host "3. Restart PowerShell" -ForegroundColor White
}

