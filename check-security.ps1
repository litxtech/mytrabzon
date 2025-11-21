# Security Check Script
# Güvenlik açıklarını kontrol eder ve düzeltir

Write-Host "🔒 Güvenlik Kontrolü Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# npm audit çalıştır
Write-Host "📋 npm audit çalıştırılıyor..." -ForegroundColor Yellow
npm audit

Write-Host ""
Write-Host "🔧 Güvenlik açıklarını düzeltmek için:" -ForegroundColor Cyan
Write-Host "   npm audit fix" -ForegroundColor White
Write-Host ""

# expo-doctor çalıştır
Write-Host "🏥 Expo Doctor çalıştırılıyor..." -ForegroundColor Yellow
npx -y expo-doctor

Write-Host ""
Write-Host "✅ Kontrol tamamlandı!" -ForegroundColor Green

