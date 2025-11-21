# Deploy verify-otp function only
Write-Host "verify-otp function deploy ediliyor..." -ForegroundColor Cyan

# .env dosyasini gecici olarak yeniden adlandir
if (Test-Path .env) {
    Write-Host ".env dosyasi yedekleniyor..." -ForegroundColor Yellow
    Move-Item -Path .env -Destination .env.backup -Force -ErrorAction SilentlyContinue
}

# Temiz .env olustur
Write-Host "Temiz .env dosyasi olusturuluyor..." -ForegroundColor Yellow
$envContent = @"
EXPO_PUBLIC_SUPABASE_URL=https://xcvcplwimicylaxghiak.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_jTpEPRL2oeGnsBcZSyoxPA_G2cG4ZM7
SUPABASE_URL=https://xcvcplwimicylaxghiak.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_fCBixfWc_DFUrkya0oJKeg_Ox3sCvXU
"@
[System.IO.File]::WriteAllText("$PWD\.env", $envContent, [System.Text.UTF8Encoding]::new($false))

# Deploy
supabase functions deploy verify-otp --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "verify-otp deploy basarili!" -ForegroundColor Green
} else {
    Write-Host "verify-otp deploy basarisiz!" -ForegroundColor Red
}

# Eski .env'i geri yukle
if (Test-Path .env.backup) {
    Write-Host "`nEski .env dosyasi geri yukleniyor..." -ForegroundColor Yellow
    Remove-Item .env -Force -ErrorAction SilentlyContinue
    Move-Item -Path .env.backup -Destination .env -Force
    Write-Host "UYARI: .env dosyasini UTF-8 olarak kaydetmeyi unutmayin!" -ForegroundColor Yellow
}

