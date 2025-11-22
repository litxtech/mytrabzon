# En son Android build'i Google Play'e submit et
# Build yapmadan sadece submit eder

# UTF-8 encoding ayarla
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "Android Google Play Submit (En Son Build)" -ForegroundColor Cyan
Write-Host ""

# Google Play Service Account Key kontrolu
if (-not (Test-Path "google-play-service-account.json")) {
    Write-Host "HATA: google-play-service-account.json dosyasi bulunamadi!" -ForegroundColor Red
    Write-Host "Google Play Console'dan service account key indirip proje kokune koyun." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Service Account Key Olusturma:" -ForegroundColor Cyan
    Write-Host "   1. Google Play Console'a gidin" -ForegroundColor White
    Write-Host "   2. Ayarlar > API erisimi > Service accounts" -ForegroundColor White
    Write-Host "   3. Service account olusturun ve JSON key indirin" -ForegroundColor White
    Write-Host "   4. Dosyayi 'google-play-service-account.json' olarak kaydedin" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Google Play'e submit ediliyor..." -ForegroundColor Yellow
Write-Host ""

npx eas submit --platform android --profile production --latest --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Host "Submit basarisiz!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Basariyla tamamlandi!" -ForegroundColor Green
Write-Host "Uygulama Google Play'e basariyla yuklendi!" -ForegroundColor Green
Write-Host ""
Write-Host "Google Play Console'da inceleme icin bekleyin:" -ForegroundColor Yellow
Write-Host "   https://play.google.com/console" -ForegroundColor Cyan
Write-Host ""

