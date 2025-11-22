# 8081 Port'unu Kullanan Process'i Kapatma Script'i
Write-Host "8081 portunu kullanan process araniyor..." -ForegroundColor Yellow

# 8081 portunu kullanan process'i bul
$process = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "8081 portunu kullanan process bulundu: PID $process" -ForegroundColor Cyan
    
    # Process bilgisini göster
    $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "Process adi: $($processInfo.ProcessName)" -ForegroundColor White
        Write-Host "Process yolu: $($processInfo.Path)" -ForegroundColor Gray
    }
    
    # Process'i kapat
    Write-Host ""
    Write-Host "Process kapatiliyor..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 2
    
    # Kontrol et
    $stillRunning = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
    if (-not $stillRunning) {
        Write-Host "✓ 8081 portu serbest bırakıldı!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Port hala kullanımda, tekrar deneyin veya manuel kapatın" -ForegroundColor Yellow
    }
} else {
    Write-Host "8081 portunu kullanan process bulunamadi (port zaten bos olabilir)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Expo server'ı başlatmak için:" -ForegroundColor Cyan
Write-Host "  npm run start:android" -ForegroundColor White

