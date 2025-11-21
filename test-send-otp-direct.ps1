# Direct Test for send-otp Function
$SUPABASE_URL = "https://xcvcplwimicylaxghiak.supabase.co"
$ANON_KEY = "sb_publishable_jTpEPRL2oeGnsBcZSyoxPA_G2cG4ZM7"

Write-Host "🧪 Testing send-otp Function..." -ForegroundColor Cyan
Write-Host ""

$sendOtpUrl = "$SUPABASE_URL/functions/v1/send-otp"
Write-Host "📤 URL: $sendOtpUrl" -ForegroundColor Yellow
Write-Host "📤 Method: POST" -ForegroundColor Yellow
Write-Host ""

$body = @{
    email = "test@example.com"
} | ConvertTo-Json

Write-Host "📤 Request Body:" -ForegroundColor Cyan
Write-Host $body -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $sendOtpUrl -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $ANON_KEY"
    } -Body $body -ErrorAction Stop
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    
    if ($statusCode -eq 404) {
        Write-Host ""
        Write-Host "⚠️  404 Not Found - Function deploy edilmemiş olabilir" -ForegroundColor Yellow
        Write-Host "💡 Supabase Dashboard'dan kontrol edin:" -ForegroundColor Cyan
        Write-Host "   https://supabase.com/dashboard/project/xcvcplwimicylaxghiak/functions" -ForegroundColor White
    } elseif ($statusCode -eq 500) {
        Write-Host ""
        Write-Host "⚠️  500 Server Error - Muhtemelen secrets eksik" -ForegroundColor Yellow
        Write-Host "💡 Secrets ekleyin:" -ForegroundColor Cyan
        Write-Host "   https://supabase.com/dashboard/project/xcvcplwimicylaxghiak/settings/functions" -ForegroundColor White
        Write-Host ""
        Write-Host "Gerekli secrets:" -ForegroundColor Yellow
        Write-Host "   - SUPABASE_URL" -ForegroundColor Gray
        Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
        Write-Host "   - RESEND_API_KEY (opsiyonel)" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Response body'yi de göster
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Cyan
        Write-Host $responseBody -ForegroundColor Gray
    } catch {
        # Response body okunamadı
    }
}

Write-Host ""
Write-Host "💡 Test tamamlandı!" -ForegroundColor Cyan

