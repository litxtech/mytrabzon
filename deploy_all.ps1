# Tum Degisiklikleri Deploy Et
Write-Host "Deploy baslatiyor..." -ForegroundColor Green

# 1. Supabase Edge Function Deploy
Write-Host "Supabase Edge Function (trpc) deploy ediliyor..." -ForegroundColor Yellow
try {
    supabase functions deploy trpc --no-verify-jwt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Edge Function basariyla deploy edildi!" -ForegroundColor Green
    } else {
        Write-Host "Edge Function deploy hatasi! (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host "Lutfen Docker'in calistigindan emin olun." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Edge Function deploy hatasi: $_" -ForegroundColor Red
}

# 2. Expo Cache Temizligi ve Baslatma
Write-Host "Expo cache temizleniyor..." -ForegroundColor Yellow
Write-Host "Expo uygulamasi baslatiliyor..." -ForegroundColor Cyan
Write-Host "QR kodu ile uygulamayi tekrar test edin." -ForegroundColor Cyan
Write-Host ""

npx expo start --clear

