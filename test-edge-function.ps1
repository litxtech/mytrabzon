# Edge Function Test Script
# Bu script Edge Function'ın çalışıp çalışmadığını test eder

$EDGE_FUNCTION_URL = "https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc"
$TEST_ENDPOINT = "$EDGE_FUNCTION_URL/api/trpc/example.hi"

Write-Host "🧪 Edge Function Test Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Test URL: $TEST_ENDPOINT" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "📤 Request gönderiliyor..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $TEST_ENDPOINT -Method Get -ContentType "application/json" -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅ Edge Function çalışıyor!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
    Write-Host ""
    Write-Host "✅✅✅ TEST BAŞARILI! ✅✅✅" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ Edge Function testi başarısız!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Hata Detayları:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
        } catch {
            Write-Host "Response body okunamadı" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🔍 Kontrol Edilmesi Gerekenler:" -ForegroundColor Cyan
    Write-Host "1. Edge Function deploy edildi mi?" -ForegroundColor White
    Write-Host "2. Supabase Secrets ayarlandı mı?" -ForegroundColor White
    Write-Host "3. URL doğru mu?" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "🔗 Edge Function URL'leri:" -ForegroundColor Cyan
Write-Host "  Base URL: $EDGE_FUNCTION_URL" -ForegroundColor White
Write-Host "  tRPC Endpoint: $EDGE_FUNCTION_URL/api/trpc" -ForegroundColor White
Write-Host ""

