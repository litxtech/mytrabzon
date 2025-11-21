# Tüm Function'ları Tek Tek Deploy Et
# Manuel olarak çalıştırılacak komutlar

$env:SUPABASE_ACCESS_TOKEN="sbp_18e64fd74e0e7cd39423ab716355b6803da9b875"
$PROJECT_REF="xcvcplwimicylaxghiak"

Write-Host "🚀 Tüm Function'ları Deploy Ediyor..." -ForegroundColor Cyan
Write-Host "📌 Project: $PROJECT_REF" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ trpc - Zaten deploy edildi" -ForegroundColor Green
Write-Host ""

# Kalan function'lar
$functions = @(
    "admin-worker",
    "chat-add-reaction",
    "chat-block-user",
    "chat-create-room",
    "chat-delete-message",
    "chat-get-messages",
    "chat-get-rooms",
    "chat-mark-as-read",
    "chat-send-message",
    "chat-unblock-user",
    "kyc-create",
    "kyc-get",
    "send-otp",
    "signup-init",
    "stripe-webhook",
    "stripe-worker",
    "verify-otp"
)

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Deploy Edilecek Function'lar:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
foreach ($func in $functions) {
    Write-Host "  - $func" -ForegroundColor White
}
Write-Host ""

Write-Host "Her function için şu komutu çalıştırın:" -ForegroundColor Yellow
Write-Host ""
Write-Host 'npx supabase functions deploy [FUNCTION_NAME] --no-verify-jwt --project-ref xcvcplwimicylaxghiak' -ForegroundColor Cyan
Write-Host ""

Write-Host "Örnek komutlar:" -ForegroundColor Yellow
Write-Host ""
foreach ($func in $functions) {
    Write-Host "npx supabase functions deploy $func --no-verify-jwt --project-ref $PROJECT_REF" -ForegroundColor White
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Otomatik Deploy Denemesi:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$successCount = 1  # trpc zaten deploy edildi
$failCount = 0
$failedFunctions = @()

foreach ($func in $functions) {
    Write-Host ""
    Write-Host "📦 Deploying $func..." -ForegroundColor Cyan
    
    $command = "npx supabase functions deploy $func --no-verify-jwt --project-ref $PROJECT_REF"
    Write-Host "Komut: $command" -ForegroundColor Gray
    
    try {
        $result = Invoke-Expression $command 2>&1
        
        if ($LASTEXITCODE -eq 0 -or $result -match "Deployed Functions") {
            Write-Host "✅ $func deployed successfully!" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ $func deployment failed!" -ForegroundColor Red
            Write-Host $result -ForegroundColor Yellow
            $failCount++
            $failedFunctions += $func
        }
    } catch {
        Write-Host "❌ $func deployment error: $_" -ForegroundColor Red
        $failCount++
        $failedFunctions += $func
    }
    
    # Her function arasında kısa bir bekleme
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Deployment Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Successful: $successCount / $($functions.Count + 1)" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red

if ($failedFunctions.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed functions:" -ForegroundColor Yellow
    foreach ($func in $failedFunctions) {
        Write-Host "  - $func" -ForegroundColor Red
        Write-Host "    Komut: npx supabase functions deploy $func --no-verify-jwt --project-ref $PROJECT_REF" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🔗 Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF/functions" -ForegroundColor Cyan
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "🎉 Tüm functions başarıyla deploy edildi!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Bazı functions deploy edilemedi. Yukarıdaki komutları manuel olarak çalıştırın." -ForegroundColor Yellow
}

