# Java 11+ Kurulum Script'i
# Bu script Java 11+ yüklemenize yardımcı olur

Write-Host "☕ Java 11+ Kurulum Rehberi" -ForegroundColor Cyan
Write-Host ""

# Mevcut Java sürümünü kontrol et
Write-Host "🔍 Mevcut Java sürümü kontrol ediliyor..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "   Mevcut sürüm: $javaVersion" -ForegroundColor White
    
    if ($javaVersion -match "version ""1\.([0-9]+)") {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -ge 11) {
            Write-Host "   ✅ Java 11+ zaten yüklü!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📝 JAVA_HOME ayarlanması:" -ForegroundColor Cyan
            Write-Host "   JAVA_HOME şu anda: $env:JAVA_HOME" -ForegroundColor White
            exit 0
        } else {
            Write-Host "   ⚠️  Java 8 veya daha eski sürüm yüklü. Java 11+ gerekiyor." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ❌ Java yüklü değil." -ForegroundColor Red
}

Write-Host ""
Write-Host "📥 Java 11+ Yükleme Seçenekleri:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Chocolatey ile (Önerilen - Windows için):" -ForegroundColor Yellow
Write-Host "   choco install openjdk11" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  Manuel İndirme (Adoptium - Önerilen):" -ForegroundColor Yellow
Write-Host "   https://adoptium.net/temurin/releases/?version=11" -ForegroundColor Cyan
Write-Host "   - Windows x64 için JDK 11 indirin" -ForegroundColor White
Write-Host "   - Installer'ı çalıştırın" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣  Oracle JDK:" -ForegroundColor Yellow
Write-Host "   https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html" -ForegroundColor Cyan
Write-Host ""

# Chocolatey kontrolü
Write-Host "🔍 Chocolatey kontrol ediliyor..." -ForegroundColor Yellow
try {
    $chocoVersion = choco --version
    Write-Host "   ✅ Chocolatey yüklü (v$chocoVersion)" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Chocolatey ile yüklemek için:" -ForegroundColor Cyan
    Write-Host "   choco install openjdk11 -y" -ForegroundColor White
    Write-Host ""
    $installWithChoco = Read-Host "Chocolatey ile yüklemek ister misiniz? (Y/N)"
    
    if ($installWithChoco -eq "Y" -or $installWithChoco -eq "y") {
        Write-Host ""
        Write-Host "📦 Java 11 yükleniyor..." -ForegroundColor Cyan
        choco install openjdk11 -y
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Java 11 başarıyla yüklendi!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🔄 Yeni terminal açın veya şu komutu çalıştırın:" -ForegroundColor Yellow
            Write-Host "   refreshenv" -ForegroundColor White
            Write-Host ""
            Write-Host "📝 JAVA_HOME ayarlaması:" -ForegroundColor Cyan
            Write-Host "   JAVA_HOME genellikle şu konumda olur:" -ForegroundColor White
            Write-Host "   C:\Program Files\Eclipse Adoptium\jdk-11.x.x-hotspot" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host "❌ Yükleme başarısız oldu. Manuel yükleme yapın." -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   ⚠️  Chocolatey yüklü değil." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Chocolatey'yi yüklemek için:" -ForegroundColor Cyan
    Write-Host "   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "📝 JAVA_HOME Ayarlama (Yükleme Sonrası):" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Sistem Özellikleri > Gelişmiş > Ortam Değişkenleri" -ForegroundColor White
Write-Host "2. Sistem Değişkenleri altında 'Yeni' butonuna tıklayın" -ForegroundColor White
Write-Host "3. Değişken adı: JAVA_HOME" -ForegroundColor White
Write-Host "4. Değişken değeri: C:\Program Files\Eclipse Adoptium\jdk-11.x.x-hotspot" -ForegroundColor White
Write-Host "   (veya Java'nın yüklü olduğu klasör)" -ForegroundColor Gray
Write-Host "5. Tamam'a tıklayın" -ForegroundColor White
Write-Host ""
Write-Host "💡 Veya PowerShell'de (geçici olarak):" -ForegroundColor Cyan
Write-Host "   `$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-11.x.x-hotspot'" -ForegroundColor White
Write-Host ""

