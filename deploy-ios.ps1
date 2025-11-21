# Interaktif iOS Build ve App Store Submit Scripti
# Bu script kullanicidan onay alarak build yapar ve submit eder

Write-Host "🚀 iOS App Store Yukleme" -ForegroundColor Cyan
Write-Host ""

# Mevcut versiyon bilgilerini goster
$appJson = Get-Content app.json | ConvertFrom-Json
$currentVersion = $appJson.expo.version
$currentBuildNumber = $appJson.expo.ios.buildNumber

Write-Host "📱 Mevcut Versiyon Bilgileri:" -ForegroundColor Cyan
Write-Host "   Version: $currentVersion" -ForegroundColor White
Write-Host "   iOS Build Number: $currentBuildNumber" -ForegroundColor White
Write-Host ""

# Versiyon artirma secenegi
$bumpVersion = Read-Host "Versiyonu artirmak istiyor musunuz? (y/n)"
if ($bumpVersion -eq "y" -or $bumpVersion -eq "Y") {
    Write-Host ""
    Write-Host "📝 Versiyon artiriliyor..." -ForegroundColor Yellow
    node scripts/bump-version.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Versiyon artirma basarisiz!" -ForegroundColor Red
        exit 1
    }
    
    # Yeni versiyon bilgilerini oku
    $appJson = Get-Content app.json | ConvertFrom-Json
    $version = $appJson.expo.version
    $buildNumber = $appJson.expo.ios.buildNumber
    
    Write-Host "✅ Versiyon basariyla artirildi" -ForegroundColor Green
    Write-Host "   Yeni Version: $version" -ForegroundColor White
    Write-Host "   Yeni Build Number: $buildNumber" -ForegroundColor White
    Write-Host ""
} else {
    $version = $currentVersion
    $buildNumber = $currentBuildNumber
}

# Build yapma secenegi
$buildApp = Read-Host "Yeni build yapmak istiyor musunuz? (y/n)"
if ($buildApp -eq "y" -or $buildApp -eq "Y") {
    Write-Host ""
    Write-Host "🔨 iOS Production Build baslatiliyor..." -ForegroundColor Yellow
    Write-Host "   Bu islem birkac dakika surebilir..." -ForegroundColor Gray
    Write-Host ""
    
    npx eas build --platform ios --profile production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build basarisiz!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build basariyla tamamlandi" -ForegroundColor Green
    Write-Host ""
}

# Submit secenegi
$submitApp = Read-Host "App Store'a submit etmek istiyor musunuz? (y/n)"
if ($submitApp -eq "y" -or $submitApp -eq "Y") {
    Write-Host ""
    Write-Host "📤 App Store'a submit ediliyor..." -ForegroundColor Yellow
    Write-Host ""
    
    npx eas submit --platform ios --profile production --latest
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
} else {
    Write-Host ""
    Write-Host "ℹ️  Submit islemi atlandi" -ForegroundColor Yellow
    Write-Host ""
}

