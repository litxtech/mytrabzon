# Android Debug Bridge (ADB) Setup Script
# Bu script ADB'yi yükler ve PATH'e ekler

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android Debug Bridge (ADB) Kurulumu" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ADB kontrolü
Write-Host "ADB kontrol ediliyor..." -ForegroundColor Yellow
$adbPath = Get-Command adb -ErrorAction SilentlyContinue

if ($adbPath) {
    Write-Host "✅ ADB zaten yüklü: $($adbPath.Source)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Bağlı cihazları kontrol ediyor..." -ForegroundColor Yellow
    adb devices
    exit 0
}

Write-Host "❌ ADB bulunamadı!" -ForegroundColor Red
Write-Host ""

Write-Host "Yükleme Seçenekleri:" -ForegroundColor Green
Write-Host ""

Write-Host "1. Android Studio ile (ÖNERİLEN - Tam SDK)" -ForegroundColor Cyan
Write-Host "   - Android Studio'yu indirin: https://developer.android.com/studio" -ForegroundColor White
Write-Host "   - Android Studio'yu açın" -ForegroundColor White
Write-Host "   - Tools > SDK Manager" -ForegroundColor White
Write-Host "   - SDK Tools sekmesi" -ForegroundColor White
Write-Host "   - 'Android SDK Platform-Tools' işaretleyin" -ForegroundColor White
Write-Host "   - Apply > OK" -ForegroundColor White
Write-Host ""

Write-Host "2. Standalone Platform Tools (Sadece ADB)" -ForegroundColor Cyan
Write-Host "   URL: https://developer.android.com/tools/releases/platform-tools" -ForegroundColor White
Write-Host "   - Windows için ZIP indirin" -ForegroundColor White
Write-Host "   - C:\platform-tools klasörüne çıkarın" -ForegroundColor White
Write-Host ""

Write-Host "3. Chocolatey ile (PowerShell Admin olarak):" -ForegroundColor Cyan
Write-Host "   choco install adb" -ForegroundColor White
Write-Host ""

Write-Host "4. Scoop ile:" -ForegroundColor Cyan
Write-Host "   scoop bucket add extras" -ForegroundColor White
Write-Host "   scoop install adb" -ForegroundColor White
Write-Host ""

# Chocolatey kontrolü
Write-Host "Chocolatey ile hızlı yükleme yapmak ister misiniz? (Y/N)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "Chocolatey kontrol ediliyor..." -ForegroundColor Yellow
    
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "Chocolatey bulundu. ADB yükleniyor..." -ForegroundColor Green
        choco install adb -y
        
        Write-Host ""
        Write-Host "✅ ADB yüklendi! PowerShell'i yeniden başlatın." -ForegroundColor Green
        Write-Host ""
        Write-Host "Yeniden başlattıktan sonra şu komutla test edin:" -ForegroundColor Yellow
        Write-Host "   adb devices" -ForegroundColor White
    } else {
        Write-Host "Chocolatey bulunamadı. Önce Chocolatey'yi yükleyin:" -ForegroundColor Red
        Write-Host "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "Manuel yükleme için yukarıdaki adımları takip edin." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "PATH'e ekleme (Manuel yükleme sonrası):" -ForegroundColor Yellow
    Write-Host "1. System Properties > Environment Variables" -ForegroundColor White
    Write-Host "2. Path değişkenine ekleyin:" -ForegroundColor White
    Write-Host "   C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools" -ForegroundColor Gray
    Write-Host "   VEYA" -ForegroundColor Gray
    Write-Host "   C:\platform-tools" -ForegroundColor Gray
    Write-Host "3. PowerShell'i yeniden başlatın" -ForegroundColor White
}

Write-Host ""
Write-Host "ADB yüklendikten sonra:" -ForegroundColor Green
Write-Host "1. Android cihazınızı USB ile bağlayın" -ForegroundColor White
Write-Host "2. Cihazda 'USB Debugging' açık olmalı" -ForegroundColor White
Write-Host "3. 'adb devices' komutuyla kontrol edin" -ForegroundColor White
Write-Host ""

