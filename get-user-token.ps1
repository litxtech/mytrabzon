# Belirli Kullanıcı İçin Token Alma Script'i
# support@litxtech.com - User UID: 98542f02-11f8-4ccd-b38d-4dd42066daa7

$USER_EMAIL = "support@litxtech.com"
$USER_UID = "98542f02-11f8-4ccd-b38d-4dd42066daa7"
$USER_PASSWORD = "Bavul2017?"  # Güncellenmiş şifre
$SUPABASE_URL = "https://xcvcplwimicylaxghiak.supabase.co"
$SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE" # Supabase Dashboard → Settings → API → anon public key

Write-Host "`n🔑 User Token Alma Script'i" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow
Write-Host "Email: $USER_EMAIL" -ForegroundColor Cyan
Write-Host "UID: $USER_UID" -ForegroundColor Cyan

Write-Host "`n⚠️  ÖNEMLİ:" -ForegroundColor Red
Write-Host "Bu script, kullanıcının şifresi ile login yaparak token alır." -ForegroundColor Yellow
Write-Host "Eğer şifreyi bilmiyorsanız, Supabase Dashboard'dan token alın:" -ForegroundColor Yellow
Write-Host "  1. Supabase Dashboard → Authentication → Users" -ForegroundColor Gray
Write-Host "  2. support@litxtech.com kullanıcısını bulun" -ForegroundColor Gray
Write-Host "  3. 'Access Token' veya 'JWT Token' kopyalayın" -ForegroundColor Gray

Write-Host "`n📝 YÖNTEM 1: Login ile Token Alma" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan

# Şifre script'te tanımlı mı kontrol et
if ([string]::IsNullOrWhiteSpace($USER_PASSWORD) -or $USER_PASSWORD -eq "YOUR_PASSWORD_HERE") {
    $password = Read-Host "Kullanıcı şifresini girin (gizli)"
    
    if ([string]::IsNullOrWhiteSpace($password)) {
        Write-Host "`n❌ Şifre girilmedi. Dashboard'dan token alın." -ForegroundColor Red
        exit
    }
}
else {
    $password = $USER_PASSWORD
    Write-Host "`n✅ Şifre script'ten alındı" -ForegroundColor Green
}

# Supabase Auth API ile login
$loginUrl = "$SUPABASE_URL/auth/v1/token?grant_type=password"
$loginBody = @{
    email = $USER_EMAIL
    password = $password
} | ConvertTo-Json

$loginHeaders = @{
    "Content-Type" = "application/json"
    "apikey" = $SUPABASE_ANON_KEY
}

try {
    Write-Host "`n🔐 Login yapılıyor..." -ForegroundColor Gray
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Headers $loginHeaders -Body $loginBody
    
    $token = $loginResponse.access_token
    Write-Host "`n✅ Token alındı!" -ForegroundColor Green
    Write-Host "Token: $token" -ForegroundColor Gray
    
    # Token'ı dosyaya kaydet
    $token | Out-File -FilePath "user-token.txt" -Encoding UTF8
    Write-Host "`n💾 Token 'user-token.txt' dosyasına kaydedildi" -ForegroundColor Green
    
    # Token'ı test script'ine kopyala
    Write-Host "`n📋 Token'ı test-edge-function.ps1 dosyasına yapıştırın:" -ForegroundColor Cyan
    Write-Host "`$TOKEN = `"$token`"" -ForegroundColor Green
    
}
catch {
    Write-Host "`n❌ Login başarısız: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Yellow
        }
        catch {
            Write-Host "Response okunamadı" -ForegroundColor Yellow
        }
    }
    Write-Host "`n💡 Alternatif: Supabase Dashboard'dan token alın" -ForegroundColor Cyan
}

Write-Host "`n📝 YÖNTEM 2: Supabase Dashboard'dan Token Alma" -ForegroundColor Cyan
Write-Host "-----------------------------------------------" -ForegroundColor Cyan
Write-Host "1. Supabase Dashboard → Authentication → Users" -ForegroundColor Gray
Write-Host "2. support@litxtech.com kullanıcısını bulun" -ForegroundColor Gray
Write-Host "3. Kullanıcıya tıklayın" -ForegroundColor Gray
Write-Host "4. 'Access Token' veya 'JWT Token' kopyalayın" -ForegroundColor Gray
Write-Host "5. Token'ı test-edge-function.ps1 dosyasındaki `$TOKEN değişkenine yapıştırın" -ForegroundColor Gray

Write-Host "`n"

