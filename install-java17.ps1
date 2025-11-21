# Java 17 Installation Guide Script
# Bu script Java 17 yükleme rehberi sağlar

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Java 17 Yükleme Rehberi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Mevcut Java Versiyonu:" -ForegroundColor Yellow
java -version 2>&1 | Select-String "version"
Write-Host ""

Write-Host "SORUN: Java 8 yüklü ama Android build için Java 17 gerekiyor!" -ForegroundColor Red
Write-Host ""

Write-Host "Çözüm Seçenekleri:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Adoptium (Eclipse Temurin) - ÖNERİLEN" -ForegroundColor Cyan
Write-Host "   URL: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor White
Write-Host "   - Windows x64 JDK 17 indirin" -ForegroundColor Gray
Write-Host "   - .msi installer'ı çalıştırın" -ForegroundColor Gray
Write-Host "   - 'Set JAVA_HOME variable' seçeneğini işaretleyin" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Chocolatey ile (PowerShell Admin olarak):" -ForegroundColor Cyan
Write-Host "   choco install temurin17jdk" -ForegroundColor White
Write-Host ""

Write-Host "3. Scoop ile:" -ForegroundColor Cyan
Write-Host "   scoop bucket add java" -ForegroundColor White
Write-Host "   scoop install temurin17-jdk" -ForegroundColor White
Write-Host ""

Write-Host "Yükleme Sonrası:" -ForegroundColor Yellow
Write-Host "1. PowerShell'i kapatıp yeniden açın" -ForegroundColor White
Write-Host "2. java -version komutuyla kontrol edin (17 görünmeli)" -ForegroundColor White
Write-Host "3. Android build'i tekrar deneyin" -ForegroundColor White
Write-Host ""

Write-Host "JAVA_HOME Ayarlama (Gerekirse):" -ForegroundColor Yellow
Write-Host "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot" -ForegroundColor White
Write-Host ""

Write-Host "Hızlı Yükleme için Chocolatey kullanmak ister misiniz? (Y/N)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "Chocolatey kontrol ediliyor..." -ForegroundColor Yellow
    
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "Chocolatey bulundu. Java 17 yükleniyor..." -ForegroundColor Green
        choco install temurin17jdk -y
        Write-Host ""
        Write-Host "Yükleme tamamlandı! PowerShell'i yeniden başlatın ve java -version ile kontrol edin." -ForegroundColor Green
    } else {
        Write-Host "Chocolatey bulunamadı. Önce Chocolatey'yi yükleyin:" -ForegroundColor Red
        Write-Host "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "Manuel yükleme için yukarıdaki adımları takip edin." -ForegroundColor Yellow
}

