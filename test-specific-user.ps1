# Belirli Kullanıcı İçin Test Script'i
# support@litxtech.com - User UID: 98542f02-11f8-4ccd-b38d-4dd42066daa7

$USER_EMAIL = "support@litxtech.com"
$USER_UID = "98542f02-11f8-4ccd-b38d-4dd42066daa7"
$BASE_URL = "https://xcvcplwimicylaxghiak.supabase.co/functions/v1"

Write-Host "`n🧪 Belirli Kullanıcı Test Script'i" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
Write-Host "Email: $USER_EMAIL" -ForegroundColor Cyan
Write-Host "UID: $USER_UID" -ForegroundColor Cyan

# Token'ı dosyadan oku (eğer varsa)
$tokenFile = "user-token.txt"
if (Test-Path $tokenFile) {
    $TOKEN = Get-Content $tokenFile -Raw | ForEach-Object { $_.Trim() }
    Write-Host "`n✅ Token dosyadan okundu" -ForegroundColor Green
}
else {
    Write-Host "`n📋 TOKEN ALMA REHBERİ" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    Write-Host "1. Supabase Dashboard → Authentication → Users" -ForegroundColor Gray
    Write-Host "2. support@litxtech.com kullanıcısını bulun" -ForegroundColor Gray
    Write-Host "3. Kullanıcıya tıklayın" -ForegroundColor Gray
    Write-Host "4. 'Access Token' veya 'JWT Token' kopyalayın" -ForegroundColor Gray
    Write-Host "5. Aşağıya yapıştırın" -ForegroundColor Gray
    Write-Host "`n💡 Detaylı açıklama için: TOKEN_NEDIR.md dosyasını okuyun" -ForegroundColor Yellow
    Write-Host "`n"
    $TOKEN = Read-Host "Token'ı buraya yapıştırın (veya Enter'a basıp get-user-token.ps1 çalıştırın)"
    
    if ([string]::IsNullOrWhiteSpace($TOKEN)) {
        Write-Host "`n💡 Alternatif: get-user-token.ps1 script'ini çalıştırabilirsiniz" -ForegroundColor Cyan
        Write-Host "   .\get-user-token.ps1" -ForegroundColor Green
        exit
    }
}

if ([string]::IsNullOrWhiteSpace($TOKEN)) {
    Write-Host "`n❌ Token girilmedi!" -ForegroundColor Red
    exit
}

# Token kontrolü
if ($TOKEN.StartsWith("Bearer ")) {
    $TOKEN = $TOKEN.Replace("Bearer ", "").Trim()
}

Write-Host "`n✅ Token hazır" -ForegroundColor Green
Write-Host "Token (ilk 30 karakter): $($TOKEN.Substring(0, [Math]::Min(30, $TOKEN.Length)))..." -ForegroundColor Gray

# Token tipini kontrol et
try {
    $tokenParts = $TOKEN.Split('.')
    if ($tokenParts.Length -eq 3) {
        $payload = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($tokenParts[1] + "=="))
        $tokenData = $payload | ConvertFrom-Json
        Write-Host "Token Role: $($tokenData.role)" -ForegroundColor $(if ($tokenData.role -eq "anon") { "Red" } else { "Green" })
        Write-Host "Token User ID: $($tokenData.sub)" -ForegroundColor Gray
        if ($tokenData.sub -ne $USER_UID) {
            Write-Host "⚠️  UYARI: Token'ın User ID'si eşleşmiyor!" -ForegroundColor Yellow
            Write-Host "   Beklenen: $USER_UID" -ForegroundColor Gray
            Write-Host "   Token'da: $($tokenData.sub)" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "Token decode edilemedi" -ForegroundColor Gray
}

Write-Host "`n🚀 Test başlatılıyor..." -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta

# Test Chat Get Rooms
Write-Host "`n🧪 Testing chat-get-rooms..." -ForegroundColor Cyan
$url = "$BASE_URL/chat-get-rooms/api/trpc/getRooms"
$body = @{
    limit = 10
    offset = 0
} | ConvertTo-Json

$headers = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"
$headers.Add("Authorization", "Bearer $TOKEN")
$headers.Add("Content-Type", "application/json")

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "✅ Success! (${duration}ms)" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Yellow
        }
        catch {
            Write-Host "Response okunamadı" -ForegroundColor Yellow
        }
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

# Test KYC Get
Write-Host "`n🧪 Testing kyc-get..." -ForegroundColor Cyan
$url = "$BASE_URL/kyc-get/api/trpc/get"
$body = "{}"

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "✅ Success! (${duration}ms)" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
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
}

Write-Host "`n✅ Test tamamlandı!" -ForegroundColor Green
Write-Host "`n"

