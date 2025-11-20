# Node.js process'lerini kapat
Write-Host "Node.js process'lerini kapatılıyor..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name expo -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# node_modules ve cache'leri temizle
Write-Host "node_modules temizleniyor..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}

Write-Host ".expo temizleniyor..." -ForegroundColor Yellow
if (Test-Path ".expo") {
    Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
}

Write-Host "Lock dosyaları temizleniyor..." -ForegroundColor Yellow
if (Test-Path "yarn.lock") {
    Remove-Item -Force yarn.lock -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
}

# Cache'leri temizle
Write-Host "npm cache temizleniyor..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null

Write-Host "yarn cache temizleniyor..." -ForegroundColor Yellow
yarn cache clean 2>&1 | Out-Null

Write-Host "Paketler yükleniyor (yarn)..." -ForegroundColor Green
yarn install

Write-Host "Tamamlandı! Şimdi 'npx expo start --clear' çalıştırın." -ForegroundColor Green

