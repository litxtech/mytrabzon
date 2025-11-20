# Check OTP Functions Deploy Status
$SUPABASE_URL = "https://xcvcplwimicylaxghiak.supabase.co"
$ANON_KEY = "sb_publishable_jTpEPRL2oeGnsBcZSyoxPA_G2cG4ZM7"

Write-Host "🔍 Checking OTP Functions Deploy Status..." -ForegroundColor Cyan
Write-Host ""

# Test send-otp
$sendOtpUrl = "$SUPABASE_URL/functions/v1/send-otp"
Write-Host "📤 Testing send-otp..." -ForegroundColor Yellow
try {
    $body = @{ email = "test@example.com" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri $sendOtpUrl -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $ANON_KEY"
    } -Body $body -ErrorAction Stop
    
    Write-Host "✅ send-otp: DEPLOYED (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "❌ send-otp: NOT DEPLOYED (404 Not Found)" -ForegroundColor Red
    } else {
        Write-Host "⚠️  send-otp: Status $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test verify-otp
$verifyOtpUrl = "$SUPABASE_URL/functions/v1/verify-otp"
Write-Host "📤 Testing verify-otp..." -ForegroundColor Yellow
try {
    $body = @{ email = "test@example.com"; code = "123456" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri $verifyOtpUrl -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $ANON_KEY"
    } -Body $body -ErrorAction Stop
    
    Write-Host "✅ verify-otp: DEPLOYED (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "❌ verify-otp: NOT DEPLOYED (404 Not Found)" -ForegroundColor Red
    } else {
        Write-Host "⚠️  verify-otp: Status $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "💡 Eğer 404 alıyorsanız, deploy edin: .\deploy-otp-functions.ps1" -ForegroundColor Cyan

