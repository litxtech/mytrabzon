# Manual Java 17 Installation Guide
# This script opens the download page and provides instructions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Java 17 Manual Installation Guide" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "RECOMMENDED: Manual installation is more reliable than Chocolatey" -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Download Java 17" -ForegroundColor Yellow
Write-Host "Opening download page..." -ForegroundColor White
Start-Process "https://adoptium.net/temurin/releases/?version=17"

Write-Host ""
Write-Host "Step 2: Installation Instructions" -ForegroundColor Yellow
Write-Host "1. Click 'Windows x64' under JDK 17" -ForegroundColor White
Write-Host "2. Download the .msi installer" -ForegroundColor White
Write-Host "3. Run the installer" -ForegroundColor White
Write-Host "4. IMPORTANT: Check 'Set JAVA_HOME variable' option" -ForegroundColor Cyan
Write-Host "5. Complete the installation" -ForegroundColor White
Write-Host ""

Write-Host "Step 3: Verify Installation" -ForegroundColor Yellow
Write-Host "After installation, close and reopen PowerShell, then run:" -ForegroundColor White
Write-Host "  java -version" -ForegroundColor Cyan
Write-Host ""
Write-Host "You should see: openjdk version '17.x.x'" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Set JAVA_HOME (if not set automatically)" -ForegroundColor Yellow
Write-Host "If JAVA_HOME is not set, add it to Environment Variables:" -ForegroundColor White
Write-Host "1. System Properties > Environment Variables" -ForegroundColor Gray
Write-Host "2. Add new System Variable:" -ForegroundColor Gray
Write-Host "   Name: JAVA_HOME" -ForegroundColor Gray
Write-Host "   Value: C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot" -ForegroundColor Gray
Write-Host "3. Add to Path: %JAVA_HOME%\bin" -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

