# Edge Functions Test Script (PowerShell)
# Windows için hazırlanmış test scripti

# ============================================
# AYARLAR
# ============================================

# Token'ınızı buraya yapıştırın
$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmNwbHdpbWljeWxheGdoaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NTAyNzUsImV4cCI6MjA3NzQyNjI3NX0.m-eijSqNdec6zalRvurUpKiVpecTBGAG6a8rIpEuPK8"

# Supabase Project URL
$BASE_URL = "https://xcvcplwimicylaxghiak.supabase.co/functions/v1"

# ============================================
# TEST FONKSİYONLARI
# ============================================

function Test-ChatGetRooms {
    Write-Host "`n🧪 Testing chat-get-rooms..." -ForegroundColor Cyan
    
    # tRPC endpoint format: /api/trpc/procedureName
    $url = "$BASE_URL/chat-get-rooms/api/trpc/getRooms"
    
    # tRPC standart HTTP format (direkt input)
    $body = @{
        limit = 10
        offset = 0
    } | ConvertTo-Json
    
    Write-Host "URL: $url" -ForegroundColor Gray
    Write-Host "Body: $body" -ForegroundColor Gray
    
    # Headers oluştur (case-sensitive kontrolü için)
    $headers = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"
    $headers.Add("Authorization", "Bearer $TOKEN")
    $headers.Add("Content-Type", "application/json")
    
    Write-Host "Headers gönderiliyor..." -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
        
        Write-Host "✅ Success!" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
            }
            catch {
                Write-Host "Could not read response body" -ForegroundColor Yellow
            }
            Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
        }
    }
}

function Test-ChatGetMessages {
    param(
        [string]$RoomId = "ROOM_ID_HERE"
    )
    
    Write-Host "`n🧪 Testing chat-get-messages..." -ForegroundColor Cyan
    
    $url = "$BASE_URL/chat-get-messages/api/trpc/getMessages"
    
    # tRPC standart HTTP format (direkt input)
    $body = @{
        roomId = $RoomId
        limit = 50
        offset = 0
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        } -Body $body
        
        Write-Host "✅ Success!" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
            }
            catch {
                Write-Host "Could not read response body" -ForegroundColor Yellow
            }
        }
    }
}

function Test-KycGet {
    Write-Host "`n🧪 Testing kyc-get..." -ForegroundColor Cyan
    
    $url = "$BASE_URL/kyc-get/api/trpc/get"
    
    # tRPC standart HTTP format (query için body boş olabilir)
    $body = "{}"
    
    # Headers oluştur
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
        
        Write-Host "✅ Success!" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
            }
            catch {
                Write-Host "Could not read response body" -ForegroundColor Yellow
            }
        }
    }
}

function Test-AllFunctions {
    Write-Host "`n🚀 Testing All Edge Functions..." -ForegroundColor Magenta
    Write-Host "=================================" -ForegroundColor Magenta
    
    $startTime = Get-Date
    Test-ChatGetRooms
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    Write-Host "⏱️  Execution time: $([math]::Round($duration, 2))ms" -ForegroundColor Gray
    
    $startTime = Get-Date
    Test-KycGet
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    Write-Host "⏱️  Execution time: $([math]::Round($duration, 2))ms" -ForegroundColor Gray
    
    Write-Host "`n✅ All tests completed!" -ForegroundColor Green
    Write-Host "`n💡 İpucu: Supabase Dashboard → Edge Functions → Logs sekmesinden detaylı logları görebilirsiniz." -ForegroundColor Cyan
}

# ============================================
# ÇALIŞTIRMA
# ============================================

Write-Host "`n📋 Edge Functions Test Script" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow

if ($TOKEN -eq "YOUR_TOKEN_HERE" -or $TOKEN -eq "") {
    Write-Host "`n⚠️  UYARI: Token'ı güncelleyin!" -ForegroundColor Red
    Write-Host "Script dosyasında `$TOKEN değişkenini düzenleyin.`n" -ForegroundColor Yellow
    Write-Host "Token alma rehberi için: .\get-token.ps1" -ForegroundColor Cyan
    exit
}

# Token kontrolü
if ($TOKEN.StartsWith("Bearer ")) {
    Write-Host "`n⚠️  UYARI: Token'da 'Bearer ' prefix'i var!" -ForegroundColor Yellow
    Write-Host "Token'dan 'Bearer ' kısmını kaldırın (script otomatik ekliyor)" -ForegroundColor Yellow
    $TOKEN = $TOKEN.Replace("Bearer ", "").Trim()
    Write-Host "Düzeltilmiş token kullanılıyor..." -ForegroundColor Green
}

Write-Host "`n✅ Token kontrolü: OK" -ForegroundColor Green
Write-Host "Token uzunluğu: $($TOKEN.Length) karakter" -ForegroundColor Gray
Write-Host "Token (ilk 30 karakter): $($TOKEN.Substring(0, [Math]::Min(30, $TOKEN.Length)))..." -ForegroundColor Gray

# Token tipini kontrol et (JWT decode)
try {
    $tokenParts = $TOKEN.Split('.')
    if ($tokenParts.Length -eq 3) {
        $payload = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($tokenParts[1] + "=="))
        $tokenData = $payload | ConvertFrom-Json
        Write-Host "Token Role: $($tokenData.role)" -ForegroundColor $(if ($tokenData.role -eq "anon") { "Red" } else { "Green" })
        if ($tokenData.role -eq "anon") {
            Write-Host "`n⚠️  UYARI: Bu bir ANON token!" -ForegroundColor Red
            Write-Host "Authenticated endpoint'ler için USER token gerekiyor!" -ForegroundColor Yellow
            Write-Host "Token alma rehberi için: .\get-token.ps1" -ForegroundColor Cyan
            Write-Host "`nDevam ediliyor ama 401 hatası alabilirsiniz..." -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "Token decode edilemedi (normal olabilir)" -ForegroundColor Gray
}

# Tüm function'ları test et
Test-AllFunctions

# Veya tek tek test etmek için:
# Test-ChatGetRooms
# Test-ChatGetMessages -RoomId "your-room-id"
# Test-KycGet

