# Interaktif Android Build ve Google Play Submit Scripti
# Bu script her adimda kullaniciya sorar

# UTF-8 encoding ayarla
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "Interaktif Android Google Play Yukleme" -ForegroundColor Cyan
Write-Host ""

# 1. Versiyon artirma
$bumpVersion = Read-Host "Versiyonu artirmak istiyor musunuz? (E/H)"
if ($bumpVersion -eq "E" -or $bumpVersion -eq "e") {
    Write-Host "Versiyon artiriliyor..." -ForegroundColor Yellow
    node scripts/bump-version.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Versiyon artirma basarisiz!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Versiyon basariyla artirildi" -ForegroundColor Green
    Write-Host ""
}

# 2. Versiyon bilgilerini goster
Start-Sleep -Seconds 1
$jsonContent = Get-Content app.json -Raw -Encoding UTF8
$appJson = $jsonContent | ConvertFrom-Json
$version = $appJson.expo.version
$versionCode = $appJson.expo.android.versionCode

Write-Host "Mevcut Versiyon Bilgileri:" -ForegroundColor Cyan
Write-Host "   Version: $version" -ForegroundColor White
Write-Host "   Android Version Code: $versionCode" -ForegroundColor White
Write-Host ""

# 3. Build yapma
$build = Read-Host "Android build yapmak istiyor musunuz? (E/H)"
if ($build -eq "E" -or $build -eq "e") {
    Write-Host "Android Production Build baslatiliyor..." -ForegroundColor Yellow
    Write-Host "   Bu islem birkac dakika surebilir..." -ForegroundColor Gray
    Write-Host ""

    npx eas build --platform android --profile production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build basarisiz!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build basariyla tamamlandi" -ForegroundColor Green
    Write-Host ""
}

# 4. Google Play Service Account Key kontrolu
if (-not (Test-Path "google-play-service-account.json")) {
    Write-Host "UYARI: google-play-service-account.json dosyasi bulunamadi!" -ForegroundColor Yellow
    Write-Host "Google Play Console'dan service account key indirip proje kokune koyun." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# 5. Submit etme
$submit = Read-Host "Google Play'e submit etmek istiyor musunuz? (E/H)"
if ($submit -eq "E" -or $submit -eq "e") {
    Write-Host "Google Play'e submit ediliyor..." -ForegroundColor Yellow
    Write-Host ""

    npx eas submit --platform android --profile production --latest
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
}

