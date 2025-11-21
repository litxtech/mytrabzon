# Supabase ve Expo Duzeltme Scripti
Write-Host "Sistem duzeltme baslatiliyor..." -ForegroundColor Green

# 1. Edge Function Deploy
Write-Host "Supabase Edge Function (trpc) deploy ediliyor..." -ForegroundColor Yellow
supabase functions deploy trpc --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "Edge Function basariyla guncellendi." -ForegroundColor Green
} else {
    Write-Host "Edge Function deploy hatasi! Lutfen Docker'in calistigindan emin olun." -ForegroundColor Red
}

# 2. Expo Cache Temizligi ve Baslatma
Write-Host "Expo cache temizleniyor ve baslatiliyor..." -ForegroundColor Yellow
Write-Host "Lutfen acilan QR kodu ile uygulamayi tekrar test edin." -ForegroundColor Cyan

npx expo start --clear
