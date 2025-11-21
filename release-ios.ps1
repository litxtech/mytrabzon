# Hizli iOS Release Scripti
# Sadece en son build'i App Store'a submit eder (yeni build yapmaz)

# UTF-8 encoding ayarla
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 Hizli iOS App Store Submit" -ForegroundColor Cyan
Write-Host ""

# Mevcut versiyon bilgilerini goster
$appJson = Get-Content app.json | ConvertFrom-Json
$version = $appJson.expo.version
$buildNumber = $appJson.expo.ios.buildNumber

Write-Host "📱 Versiyon Bilgileri:" -ForegroundColor Cyan
Write-Host "   Version: $version" -ForegroundColor White
Write-Host "   iOS Build Number: $buildNumber" -ForegroundColor White
Write-Host ""

Write-Host "📤 En son build App Store'a submit ediliyor..." -ForegroundColor Yellow
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

