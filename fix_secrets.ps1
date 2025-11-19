# 1. Environment Variables Kontrol Scripti
# Bu script:
# 1. Supabase CLI ile mevcut secretları kontrol eder
# 2. Eksik olanları ekler
# 3. Yeni Edge Function deploy eder

Write-Host "Supabase Secrets Kontrolu Baslatiliyor..." -ForegroundColor Green

# .env dosyasından değerleri oku (basit parsing)
$envContent = Get-Content ".env" -ErrorAction SilentlyContinue
if ($null -eq $envContent) {
    Write-Host ".env dosyasi bulunamadi!" -ForegroundColor Red
} else {
    Write-Host ".env dosyasi okundu." -ForegroundColor Cyan
}

# Supabase Secrets Listele
Write-Host "`nMevcut Secrets:" -ForegroundColor Yellow
supabase secrets list

# URL ve KEY
$url = "https://xcvcplwimicylaxghiak.supabase.co"
$key = "sb_secret_fCBixfWc_DFUrkya0oJKeg_Ox3sCvXU"

Write-Host "SUPABASE_URL ayarlaniyor..." -ForegroundColor Cyan
supabase secrets set SUPABASE_URL=$url

Write-Host "SUPABASE_SERVICE_ROLE_KEY ayarlaniyor..." -ForegroundColor Cyan
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$key

# Deploy
Write-Host "`nEdge Function Deploy Ediliyor..." -ForegroundColor Green
supabase functions deploy trpc --no-verify-jwt

Write-Host "`nIslem Tamamlandi!" -ForegroundColor Green
