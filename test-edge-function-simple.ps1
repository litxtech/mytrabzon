# Basit Edge Function Test Script'i
$TEST_URL = "https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi"

Write-Host "🧪 Edge Function Test Ediliyor..." -ForegroundColor Cyan
Write-Host "URL: $TEST_URL" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $TEST_URL -Method Get -ErrorAction Stop
    Write-Host "✅ BAŞARILI! Edge Function çalışıyor!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ HATA!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response.StatusCode.value__ -eq 500) {
        Write-Host ""
        Write-Host "⚠️  Muhtemelen secrets eksik!" -ForegroundColor Yellow
        Write-Host "Dashboard'dan secrets ekleyin:" -ForegroundColor Cyan
        Write-Host "https://supabase.com/dashboard/project/xcvcplwimicylaxghiak/settings/functions" -ForegroundColor White
    }
}

