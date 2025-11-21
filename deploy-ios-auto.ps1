# Otomatik iOS Build ve App Store Submit Scripti
# Bu script versiyonu artirir, build yapar ve App Store'a submit eder

Write-Host "🚀 Otomatik iOS App Store Yukleme Baslatiliyor..." -ForegroundColor Cyan
Write-Host ""

# 1. Versiyonu Artir
Write-Host "📝 Versiyon artiriliyor..." -ForegroundColor Yellow
node scripts/bump-version.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Versiyon artirma basarisiz!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Versiyon basariyla artirildi" -ForegroundColor Green
Write-Host ""

# 2. Yeni versiyon bilgilerini oku
$appJson = Get-Content app.json | ConvertFrom-Json
$version = $appJson.expo.version
$buildNumber = $appJson.expo.ios.buildNumber

Write-Host "📱 Yeni Versiyon Bilgileri:" -ForegroundColor Cyan
Write-Host "   Version: $version" -ForegroundColor White
Write-Host "   iOS Build Number: $buildNumber" -ForegroundColor White
Write-Host ""

# 3. Build yap
Write-Host "🔨 iOS Production Build baslatiliyor..." -ForegroundColor Yellow
Write-Host "   Bu islem birkac dakika surebilir..." -ForegroundColor Gray
Write-Host ""

npx eas build --platform ios --profile production --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build basarisiz!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build basariyla tamamlandi" -ForegroundColor Green
Write-Host ""

# 4. App Store'a Submit Et
Write-Host "📤 App Store'a submit ediliyor..." -ForegroundColor Yellow
Write-Host ""

npx eas submit --platform ios --profile production --latest --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Submit basarisiz!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Basariyla tamamlandi!" -ForegroundColor Green
Write-Host "📱 Version: $version (Build: $buildNumber)" -ForegroundColor Cyan
Write-Host "🎉 Uygulama App Store'a basariyla yuklendi!" -ForegroundColor Green
Write-Host ""
Write-Host '💡 App Store Connect''te inceleme icin bekleyin:' -ForegroundColor Yellow
Write-Host "   https://appstoreconnect.apple.com" -ForegroundColor Cyan
Write-Host ""
