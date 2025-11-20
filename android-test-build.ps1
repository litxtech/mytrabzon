# Android Test Build ve Yükleme Script'i
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android Test Build ve Yükleme" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Bağlı cihazları kontrol et
Write-Host "[1/4] Android cihazları kontrol ediliyor..." -ForegroundColor Yellow
$devices = adb devices | Select-String -Pattern "device$"
if ($devices) {
    Write-Host "✓ Bağlı cihazlar bulundu:" -ForegroundColor Green
    $devices | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor White }
} else {
    Write-Host "⚠ Hiçbir Android cihaz bağlı değil!" -ForegroundColor Yellow
    Write-Host "  USB debugging açık mı kontrol edin." -ForegroundColor White
    Write-Host "  'adb devices' komutu ile kontrol edebilirsiniz." -ForegroundColor White
}
Write-Host ""

# 2. Gradle clean
Write-Host "[2/4] Gradle clean yapılıyor..." -ForegroundColor Yellow
Set-Location android
./gradlew clean
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Clean başarılı" -ForegroundColor Green
} else {
    Write-Host "✗ Clean hatası!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host ""

# 3. Debug APK build
Write-Host "[3/4] Debug APK oluşturuluyor..." -ForegroundColor Yellow
./gradlew assembleDebug
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build başarılı" -ForegroundColor Green
    $apkPath = "app/build/outputs/apk/debug/app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "  APK: $apkPath" -ForegroundColor White
    }
} else {
    Write-Host "✗ Build hatası!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host ""

# 4. Cihaza yükleme
Write-Host "[4/4] Cihaza yükleniyor..." -ForegroundColor Yellow
if ($devices) {
    adb install -r app/build/outputs/apk/debug/app-debug.apk
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Yükleme başarılı!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Uygulamayı başlatmak için:" -ForegroundColor Yellow
        Write-Host "  adb shell am start -n com.litxtech.mytrabzon/.MainActivity" -ForegroundColor Cyan
    } else {
        Write-Host "✗ Yükleme hatası!" -ForegroundColor Red
        Write-Host "  Manuel yükleme için:" -ForegroundColor Yellow
        Write-Host "  adb install -r app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠ Cihaz bulunamadı, APK hazır:" -ForegroundColor Yellow
    Write-Host "  $apkPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Manuel yükleme için:" -ForegroundColor Yellow
    Write-Host "  adb install -r app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Cyan
}
Write-Host ""

Set-Location ..
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ İşlem tamamlandı!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

