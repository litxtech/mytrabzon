# QR Kod Test Kurulum Scripti
# Bu script .env dosyasini olusturur ve QR kod test icin hazirlar

Write-Host "QR Kod Test Kurulumu Baslatiliyor..." -ForegroundColor Cyan
Write-Host ""

# .env dosyasi olustur
Write-Host ".env dosyasi olusturuluyor..." -ForegroundColor Yellow

$envContent = @"
EXPO_PUBLIC_SUPABASE_URL=https://xcvcplwimicylaxghiak.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_jTpEPRL2oeGnsBcZSyoxPA_G2cG4ZM7
EXPO_PUBLIC_AGORA_APP_ID=d1e34b20cd2b4da69418f360039d254d
EXPO_PUBLIC_AGORA_CERTIFICATE=d0c65c85891f40c680764c5cf0523433
EXPO_PUBLIC_APP_NAME=MyTrabzon
"@

$envContent | Out-File -FilePath .env -Encoding utf8 -NoNewline

Write-Host "[OK] .env dosyasi olusturuldu!" -ForegroundColor Green
Write-Host ""

# .gitignore kontrolu
if (Test-Path .gitignore) {
    $gitignoreContent = Get-Content .gitignore -Raw
    if ($gitignoreContent -notmatch "\.env") {
        Write-Host "[UYARI] .gitignore'a .env ekleniyor..." -ForegroundColor Yellow
        Add-Content -Path .gitignore -Value "`n# Environment variables`n.env"
        Write-Host "[OK] .env .gitignore'a eklendi!" -ForegroundColor Green
    } else {
        Write-Host "[OK] .env zaten .gitignore'da" -ForegroundColor Green
    }
} else {
    Write-Host "[UYARI] .gitignore dosyasi bulunamadi, olusturuluyor..." -ForegroundColor Yellow
    ".env`nnode_modules`n.expo`n" | Out-File -FilePath .gitignore -Encoding utf8
    Write-Host "[OK] .gitignore olusturuldu!" -ForegroundColor Green
}

Write-Host ""
Write-Host "[OK] Kurulum Tamamlandi!" -ForegroundColor Green
Write-Host ""
Write-Host "QR Kod ile test etmek icin:" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor White
Write-Host ""
Write-Host "Detayli bilgi icin QR_KOD_TEST.md dosyasina bakin" -ForegroundColor Yellow
Write-Host ""

