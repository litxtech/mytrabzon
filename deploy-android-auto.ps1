# Otomatik Android Build ve Google Play Submit Scripti
# Bu script versiyonu artirir, build yapar ve Google Play'e submit eder

# UTF-8 encoding ayarla
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "Otomatik Android Google Play Yukleme Baslatiliyor..." -ForegroundColor Cyan
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

# Nested property'lere dogru sekilde eris
$version = $appJson.expo.version
$versionCode = $appJson.expo.android.versionCode

Write-Host "Yeni Versiyon Bilgileri:" -ForegroundColor Cyan
Write-Host "   Version: $version" -ForegroundColor White
Write-Host "   Android Version Code: $versionCode" -ForegroundColor White
Write-Host ""

# Version code kontrolu
if ([string]::IsNullOrEmpty($versionCode) -or $versionCode -eq "") {
    Write-Host "UYARI: Version code bulunamadi! Script durduruluyor." -ForegroundColor Yellow
    Write-Host "Debug: appJson.expo.android = $($appJson.expo.android | ConvertTo-Json)" -ForegroundColor Gray
    exit 1
}

# 3. Google Play Service Account Key kontrolu
if (-not (Test-Path "google-play-service-account.json")) {
    Write-Host "UYARI: google-play-service-account.json dosyasi bulunamadi!" -ForegroundColor Yellow
    Write-Host "Google Play Console'dan service account key indirip proje kokune koyun." -ForegroundColor Yellow
    Write-Host "Script build yapacak ama submit edemeyecek." -ForegroundColor Yellow
    Write-Host ""
    $skipSubmit = $true
} else {
    $skipSubmit = $false
}

# 4. Build yap
Write-Host "Android Production Build baslatiliyor..." -ForegroundColor Yellow
Write-Host "   Bu islem birkac dakika surebilir..." -ForegroundColor Gray
Write-Host ""

npx eas build --platform android --profile production --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build basarisiz!" -ForegroundColor Red
    exit 1
}
Write-Host "Build basariyla tamamlandi" -ForegroundColor Green
Write-Host ""

# 5. Google Play'e Submit Et (eğer service account key varsa)
if (-not $skipSubmit) {
    Write-Host "Google Play'e submit ediliyor..." -ForegroundColor Yellow
    Write-Host ""

    npx eas submit --platform android --profile production --latest --non-interactive
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Submit basarisiz!" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Basariyla tamamlandi!" -ForegroundColor Green
    Write-Host "Version: $version (Version Code: $versionCode)" -ForegroundColor Cyan
    Write-Host "Uygulama Google Play'e basariyla yuklendi!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Google Play Console'da inceleme icin bekleyin:" -ForegroundColor Yellow
    Write-Host "   https://play.google.com/console" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Build basariyla tamamlandi!" -ForegroundColor Green
    Write-Host "Version: $version (Version Code: $versionCode)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Manuel submit icin:" -ForegroundColor Yellow
    Write-Host "   npx eas submit --platform android --profile production --latest" -ForegroundColor Cyan
    Write-Host ""
}

