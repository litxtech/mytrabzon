# Test send-otp Edge Function
$SUPABASE_URL = "https://xcvcplwimicylaxghiak.supabase.co"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/send-otp"
$ANON_KEY = "sb_publishable_jTpEPRL2oeGnsBcZSyoxPA_G2cG4ZM7"

Write-Host "🧪 Testing send-otp Edge Function..." -ForegroundColor Cyan
Write-Host "URL: $FUNCTION_URL" -ForegroundColor Yellow
Write-Host ""

$body = @{
    email = "test@example.com"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $ANON_KEY"
    } -Body $body -ErrorAction Stop
    
    Write-Host "✅ BAŞARILI! Edge Function çalışıyor!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ HATA!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host ""
        Write-Host "⚠️  404 Not Found - Function deploy edilmemiş olabilir!" -ForegroundColor Yellow
        Write-Host "Deploy edin: .\deploy-otp-functions.ps1" -ForegroundColor Cyan
    }
}

