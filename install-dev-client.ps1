# expo-dev-client Yükleme Script'i
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "expo-dev-client Yükleniyor..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --legacy-peer-deps ile yükle (React 19 conflict'i için)
Write-Host "[1/2] expo-dev-client yükleniyor (--legacy-peer-deps)..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Paketler başarıyla yüklendi" -ForegroundColor Green
} else {
    Write-Host "✗ Yükleme hatası!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "[2/2] Özet:" -ForegroundColor Cyan
Write-Host "  • expo-dev-client: ~6.0.18" -ForegroundColor White
Write-Host "  • React: 19.1.0 (lucide-react-native conflict'i --legacy-peer-deps ile çözüldü)" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Kurulum tamamlandı!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Şimdi development build oluşturabilirsiniz:" -ForegroundColor Yellow
Write-Host "  eas build --profile development --platform ios" -ForegroundColor White
Write-Host "  VEYA" -ForegroundColor Gray
Write-Host "  eas build --profile development --platform android" -ForegroundColor White
Write-Host ""

