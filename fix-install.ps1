# Fix Installation Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MyTrabzon - Paket Yükleme Script'i" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Node.js process'lerini kapat
Write-Host "[1/5] Node.js process'lerini kapatılıyor..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name expo -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✓ Tamamlandı" -ForegroundColor Green
Write-Host ""

# 2. node_modules ve cache'leri temizle
Write-Host "[2/5] node_modules temizleniyor..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    Write-Host "✓ node_modules silindi" -ForegroundColor Green
} else {
    Write-Host "✓ node_modules zaten yok" -ForegroundColor Green
}

Write-Host "[2/5] .expo temizleniyor..." -ForegroundColor Yellow
if (Test-Path ".expo") {
    Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
    Write-Host "✓ .expo silindi" -ForegroundColor Green
} else {
    Write-Host "✓ .expo zaten yok" -ForegroundColor Green
}

Write-Host "[2/5] Lock dosyaları temizleniyor..." -ForegroundColor Yellow
if (Test-Path "yarn.lock") {
    Remove-Item -Force yarn.lock -ErrorAction SilentlyContinue
    Write-Host "✓ yarn.lock silindi" -ForegroundColor Green
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
    Write-Host "✓ package-lock.json silindi" -ForegroundColor Green
}
Write-Host ""

# 3. Cache'leri temizle
Write-Host "[3/5] npm cache temizleniyor..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "✓ npm cache temizlendi" -ForegroundColor Green

Write-Host "[3/5] yarn cache temizleniyor..." -ForegroundColor Yellow
yarn cache clean 2>&1 | Out-Null
Write-Host "✓ yarn cache temizlendi" -ForegroundColor Green
Write-Host ""

# 4. Paketleri yükle
Write-Host "[4/5] Paketler yükleniyor (yarn install)..." -ForegroundColor Yellow
Write-Host "Bu işlem birkaç dakika sürebilir..." -ForegroundColor Gray
yarn install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Paketler başarıyla yüklendi" -ForegroundColor Green
} else {
    Write-Host "✗ Paket yükleme hatası! npm install --legacy-peer-deps deneyin" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. Özet
Write-Host "[5/5] Özet:" -ForegroundColor Cyan
Write-Host "  • @gorhom/bottom-sheet: 4.6.1" -ForegroundColor White
Write-Host "  • react-native-reanimated: 3.16.1" -ForegroundColor White
Write-Host "  • react-native-worklets: Kaldırıldı" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Kurulum tamamlandı!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Şimdi şu komutu çalıştırın:" -ForegroundColor Yellow
Write-Host "  npx expo start --clear" -ForegroundColor White
Write-Host ""

