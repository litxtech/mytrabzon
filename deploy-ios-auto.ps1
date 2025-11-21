# Otomatik iOS Build ve App Store Submit Scripti
# Bu script versiyonu artirir, build yapar ve App Store'a submit eder

# UTF-8 encoding ayarla
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "Otomatik iOS App Store Yukleme Baslatiliyor..." -ForegroundColor Cyan
Write-Host ""

# 1. Versiyonu Artir
Write-Host "Versiyon artiriliyor..." -ForegroundColor Yellow
node scripts/bump-version.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Versiyon artirma basarisiz!" -ForegroundColor Red
    exit 1
}
Write-Host "Versiyon basariyla artirildi" -ForegroundColor Green
Write-Host ""

# 2. Yeni versiyon bilgilerini oku (yeniden oku, cunku bump-version.js degistirdi)
Start-Sleep -Seconds 2  # Dosyanin yazilmasini bekle
$jsonContent = Get-Content app.json -Raw -Encoding UTF8
$appJson = $jsonContent | ConvertFrom-Json

# Nested property'lere dogru sekilde eris (PowerShell syntax)
$version = $appJson.expo.version
$iosConfig = $appJson.expo.ios
$buildNumber = $iosConfig.buildNumber

# Alternatif yontem: Eger yukaridaki calismazsa
if ([string]::IsNullOrEmpty($buildNumber)) {
    $buildNumber = $appJson.'expo'.'ios'.'buildNumber'
}

Write-Host "Yeni Versiyon Bilgileri:" -ForegroundColor Cyan
Write-Host "   Version: $version" -ForegroundColor White
Write-Host "   iOS Build Number: $buildNumber" -ForegroundColor White
Write-Host ""

# Build number kontrolu
if ([string]::IsNullOrEmpty($buildNumber) -or $buildNumber -eq "") {
    Write-Host "UYARI: Build number bulunamadi! Script durduruluyor." -ForegroundColor Yellow
    Write-Host "Debug: expo.ios objesi:" -ForegroundColor Gray
    Write-Host "$($appJson.expo.ios | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
    Write-Host "Debug: buildNumber degeri: '$buildNumber'" -ForegroundColor Gray
    Write-Host "Manuel kontrol icin app.json dosyasini kontrol edin." -ForegroundColor Yellow
    exit 1
}

# 3. Build yap
Write-Host "iOS Production Build baslatiliyor..." -ForegroundColor Yellow
Write-Host "   Bu islem birkac dakika surebilir..." -ForegroundColor Gray
Write-Host ""

npx eas build --platform ios --profile production --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build basarisiz!" -ForegroundColor Red
    exit 1
}
Write-Host "Build basariyla tamamlandi" -ForegroundColor Green
Write-Host ""

# 4. App Store'a Submit Et
Write-Host "App Store'a submit ediliyor..." -ForegroundColor Yellow
Write-Host ""

npx eas submit --platform ios --profile production --latest --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Host "Submit basarisiz!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Basariyla tamamlandi!" -ForegroundColor Green
Write-Host "Version: $version (Build: $buildNumber)" -ForegroundColor Cyan
Write-Host "Uygulama App Store'a basariyla yuklendi!" -ForegroundColor Green
Write-Host ""
Write-Host "App Store Connect'te inceleme icin bekleyin:" -ForegroundColor Yellow
Write-Host "   https://appstoreconnect.apple.com" -ForegroundColor Cyan
Write-Host ""
