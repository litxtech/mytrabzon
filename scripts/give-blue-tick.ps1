# Mavi tik verme scripti
# Kullanım: .\scripts\give-blue-tick.ps1 -Username "mytrabzonteam"

param(
    [string]$Username = "mytrabzonteam",
    [string]$Email = "developer support@litxtech.com"
)

Write-Host "🔵 Mavi Tik Verme Scripti" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Supabase bağlantı bilgileri
$PROJECT_REF = "xcvcplwimicylaxghiak"
$SUPABASE_URL = "https://$PROJECT_REF.supabase.co"

Write-Host "📋 Kullanıcı bilgileri:" -ForegroundColor Yellow
Write-Host "  Username: $Username"
Write-Host "  Email: $Email"
Write-Host ""

# Kullanıcıyı bul
Write-Host "🔍 Kullanıcı aranıyor..." -ForegroundColor Yellow

# Supabase REST API ile kullanıcıyı bul
$headers = @{
    "apikey" = $env:SUPABASE_ANON_KEY
    "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
}

# Önce username ile dene
$userResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/profiles?username=eq.$Username&select=id,username,email" -Method GET -Headers $headers

if ($userResponse -and $userResponse.Count -gt 0) {
    $userId = $userResponse[0].id
    Write-Host "✅ Kullanıcı bulundu (username): $userId" -ForegroundColor Green
} else {
    # Email ile dene
    $emailResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/profiles?email=eq.$Email&select=id,username,email" -Method GET -Headers $headers
    
    if ($emailResponse -and $emailResponse.Count -gt 0) {
        $userId = $emailResponse[0].id
        Write-Host "✅ Kullanıcı bulundu (email): $userId" -ForegroundColor Green
    } else {
        Write-Host "❌ Kullanıcı bulunamadı!" -ForegroundColor Red
        Write-Host "   Lütfen username veya email'in doğru olduğundan emin olun." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "🔵 Mavi tik veriliyor..." -ForegroundColor Yellow

# Blue tick ekle/güncelle
$blueTickData = @{
    user_id = $userId
    is_active = $true
    verification_type = "manual"
} | ConvertTo-Json

try {
    # Önce mevcut blue tick var mı kontrol et
    $existingResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/blue_ticks?user_id=eq.$userId&select=id" -Method GET -Headers $headers
    
    if ($existingResponse -and $existingResponse.Count -gt 0) {
        # Güncelle
        $updateResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/blue_ticks?id=eq.$($existingResponse[0].id)" -Method PATCH -Headers $headers -Body $blueTickData
        Write-Host "✅ Mavi tik güncellendi!" -ForegroundColor Green
    } else {
        # Yeni ekle
        $insertResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/blue_ticks" -Method POST -Headers $headers -Body $blueTickData
        Write-Host "✅ Mavi tik verildi!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🎉 İşlem tamamlandı!" -ForegroundColor Green
} catch {
    Write-Host "❌ Hata: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Lütfen SUPABASE_ANON_KEY environment variable'ının ayarlandığından emin olun." -ForegroundColor Yellow
    exit 1
}

