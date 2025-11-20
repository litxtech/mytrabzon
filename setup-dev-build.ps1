# Development Build Kurulum Script'i
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Development Build Kurulumu" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. expo-dev-client'ı --legacy-peer-deps ile yükle
Write-Host "[1/3] expo-dev-client yükleniyor (--legacy-peer-deps)..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Paketler başarıyla yüklendi" -ForegroundColor Green
} else {
    Write-Host "✗ Yükleme hatası! Tekrar deneyin..." -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Expo config'i kontrol et
Write-Host "[2/3] Expo config kontrol ediliyor..." -ForegroundColor Yellow
npx expo config --type public > $null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Expo config geçerli" -ForegroundColor Green
} else {
    Write-Host "⚠ Expo config hatası var ama devam ediyoruz..." -ForegroundColor Yellow
}
Write-Host ""

# 3. Özet
Write-Host "[3/3] Özet:" -ForegroundColor Cyan
Write-Host "  • expo-dev-client: ~6.0.18" -ForegroundColor White
Write-Host "  • react-native-reanimated: ~3.16.1" -ForegroundColor White
Write-Host "  • @gorhom/bottom-sheet: ^4.6.1" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Kurulum tamamlandı!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Şimdi development build oluşturabilirsiniz:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Android için:" -ForegroundColor White
Write-Host "  eas build --profile development --platform android" -ForegroundColor Cyan
Write-Host ""
Write-Host "iOS için:" -ForegroundColor White
Write-Host "  eas build --profile development --platform ios" -ForegroundColor Cyan
Write-Host ""
Write-Host "VEYA lokal build (daha hızlı):" -ForegroundColor White
Write-Host '  npx expo run:android' -ForegroundColor Cyan
Write-Host '  npx expo run:ios' -ForegroundColor Cyan
Write-Host ""

