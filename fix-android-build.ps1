# Android Build Fix Script
# Bu script Android build sorunlarını düzeltir ve Java versiyonunu kontrol eder

Write-Host "🔧 Android Build Fix Başlatılıyor..." -ForegroundColor Cyan

# Java versiyonunu kontrol et
Write-Host "`n📋 Java versiyonu kontrol ediliyor..." -ForegroundColor Yellow
$javaVersion = java -version 2>&1 | Select-String "version"
if ($javaVersion) {
    Write-Host "✅ Java bulundu: $javaVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Java bulunamadı! Lütfen Java 17 veya üzeri yükleyin." -ForegroundColor Red
    Write-Host "💡 Java yükleme: https://adoptium.net/" -ForegroundColor Yellow
    exit 1
}

# Node modules kontrolü
Write-Host "`n📦 Node modules kontrol ediliyor..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules mevcut" -ForegroundColor Green
} else {
    Write-Host "⚠️ node_modules bulunamadı, yükleniyor..." -ForegroundColor Yellow
    npm install
}

# expo-build-properties kontrolü
Write-Host "`n🔍 expo-build-properties kontrol ediliyor..." -ForegroundColor Yellow
if (Test-Path "node_modules\expo-build-properties") {
    Write-Host "✅ expo-build-properties yüklü" -ForegroundColor Green
} else {
    Write-Host "⚠️ expo-build-properties bulunamadı, yükleniyor..." -ForegroundColor Yellow
    npm install expo-build-properties@~1.0.9 --save
}

# Android gradle cache temizleme
Write-Host "`n🧹 Android Gradle cache temizleniyor..." -ForegroundColor Yellow
if (Test-Path "android\.gradle") {
    Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
    Write-Host "✅ Gradle cache temizlendi" -ForegroundColor Green
}

if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
    Write-Host "✅ Build klasörü temizlendi" -ForegroundColor Green
}

# Expo prebuild (gerekirse)
Write-Host "`n🔄 Expo prebuild çalıştırılıyor..." -ForegroundColor Yellow
npx expo prebuild --platform android --clean

Write-Host "`n✅ Android Build Fix tamamlandı!" -ForegroundColor Green
Write-Host "`n📱 Şimdi şu komutla test edebilirsiniz:" -ForegroundColor Cyan
Write-Host "   npx expo run:android" -ForegroundColor White

