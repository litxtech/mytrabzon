# Token Kontrol Script'i
# Token'ın anon mu authenticated mi olduğunu kontrol eder

param(
    [string]$Token = ""
)

Write-Host "`n🔍 Token Kontrol Script'i" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

if ([string]::IsNullOrWhiteSpace($Token)) {
    $Token = Read-Host "Token'ı yapıştırın"
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host "`n❌ Token girilmedi!" -ForegroundColor Red
    exit
}

# Bearer prefix kontrolü
if ($Token.StartsWith("Bearer ")) {
    $Token = $Token.Replace("Bearer ", "").Trim()
}

Write-Host "`n📋 Token Analizi" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

# Token'ı decode et
try {
    $tokenParts = $Token.Split('.')
    
    if ($tokenParts.Length -ne 3) {
        Write-Host "`n❌ Geçersiz token formatı!" -ForegroundColor Red
        Write-Host "Token 3 bölümden oluşmalı (JWT formatı)" -ForegroundColor Yellow
        exit
    }
    
    # Payload'ı decode et
    $payloadBase64 = $tokenParts[1]
    
    # Base64 padding ekle (gerekirse)
    $mod = $payloadBase64.Length % 4
    if ($mod -gt 0) {
        $payloadBase64 += "=" * (4 - $mod)
    }
    
    $payloadBytes = [System.Convert]::FromBase64String($payloadBase64)
    $payloadJson = [System.Text.Encoding]::UTF8.GetString($payloadBytes)
    $tokenData = $payloadJson | ConvertFrom-Json
    
    Write-Host "`n✅ Token başarıyla decode edildi!" -ForegroundColor Green
    Write-Host "`n📊 Token Bilgileri:" -ForegroundColor Cyan
    Write-Host "  Issuer: $($tokenData.iss)" -ForegroundColor Gray
    Write-Host "  Project Ref: $($tokenData.ref)" -ForegroundColor Gray
    
    # Role kontrolü
    $role = $tokenData.role
    if ($role -eq "anon") {
        Write-Host "`n⚠️  ROLE: $role" -ForegroundColor Red
        Write-Host "`n❌ Bu bir ANON token!" -ForegroundColor Red
        Write-Host "Protected endpoint'ler için çalışmaz!" -ForegroundColor Yellow
        Write-Host "`n💡 Çözüm:" -ForegroundColor Cyan
        Write-Host "  1. Supabase Dashboard → Authentication → Users" -ForegroundColor Gray
        Write-Host "  2. support@litxtech.com → Access Token kopyala" -ForegroundColor Gray
        Write-Host "  3. Token'da 'role': 'authenticated' olmalı" -ForegroundColor Gray
    }
    elseif ($role -eq "authenticated") {
        Write-Host "`n✅ ROLE: $role" -ForegroundColor Green
        Write-Host "`n✅ Bu bir AUTHENTICATED token!" -ForegroundColor Green
        Write-Host "Protected endpoint'ler için çalışır!" -ForegroundColor Green
        
        if ($tokenData.sub) {
            Write-Host "`n👤 User ID: $($tokenData.sub)" -ForegroundColor Cyan
            if ($tokenData.sub -eq "98542f02-11f8-4ccd-b38d-4dd42066daa7") {
                Write-Host "✅ Doğru kullanıcı token'ı!" -ForegroundColor Green
            }
            else {
                Write-Host "⚠️  Farklı kullanıcı token'ı" -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host "`n⚠️  ROLE: $role" -ForegroundColor Yellow
        Write-Host "Bilinmeyen role tipi" -ForegroundColor Yellow
    }
    
    # Expiry kontrolü
    if ($tokenData.exp) {
        $expiryDate = [DateTimeOffset]::FromUnixTimeSeconds($tokenData.exp).DateTime
        $now = Get-Date
        if ($expiryDate -lt $now) {
            Write-Host "`n❌ Token süresi dolmuş!" -ForegroundColor Red
            Write-Host "Expiry: $expiryDate" -ForegroundColor Yellow
        }
        else {
            Write-Host "`n✅ Token geçerli" -ForegroundColor Green
            Write-Host "Expiry: $expiryDate" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n📄 Full Token Data:" -ForegroundColor Cyan
    $tokenData | ConvertTo-Json -Depth 10 | Write-Host
    
}
catch {
    Write-Host "`n❌ Token decode edilemedi: $_" -ForegroundColor Red
    Write-Host "Token formatı yanlış olabilir" -ForegroundColor Yellow
}

Write-Host "`n"

