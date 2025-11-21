# Manuel Function Deploy Script
# Her function'ı tek tek deploy eder

$ErrorActionPreference = "Continue"

$env:SUPABASE_ACCESS_TOKEN="sbp_18e64fd74e0e7cd39423ab716355b6803da9b875"
$PROJECT_REF="xcvcplwimicylaxghiak"

Write-Host "🚀 Manuel Function Deploy Başlatılıyor..." -ForegroundColor Cyan
Write-Host "📌 Project: $PROJECT_REF" -ForegroundColor Yellow
Write-Host ""

# Functions listesi
$functions = @(
    "trpc",
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

$successCount = 0
$failCount = 0
$failedFunctions = @()

Write-Host "⚠️  NOT: Her function için manuel olarak onay vermeniz gerekebilir." -ForegroundColor Yellow
Write-Host ""

foreach ($func in $functions) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor Gray
    Write-Host "📦 Deploying $func..." -ForegroundColor Cyan
    Write-Host "Komut: npx supabase functions deploy $func --no-verify-jwt --project-ref $PROJECT_REF" -ForegroundColor Gray
    
    # Kullanıcıya komutu göster ve çalıştır
    $command = "npx supabase functions deploy $func --no-verify-jwt --project-ref $PROJECT_REF"
    
    Write-Host "Çalıştırılıyor..." -ForegroundColor Cyan
    $deployOutput = Invoke-Expression $command 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully!" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "❌ $func deployment failed!" -ForegroundColor Red
        Write-Host "Error details:" -ForegroundColor Yellow
        Write-Host $deployOutput -ForegroundColor Yellow
        $failCount++
        $failedFunctions += $func
        
        Write-Host ""
        Write-Host "⚠️  Devam etmek için Enter'a basın..." -ForegroundColor Yellow
        Read-Host
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Deployment Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red

if ($failedFunctions.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed functions:" -ForegroundColor Yellow
    foreach ($func in $failedFunctions) {
        Write-Host "  - $func" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔗 Function URLs:" -ForegroundColor Cyan
Write-Host "  https://$PROJECT_REF.supabase.co/functions/v1/trpc" -ForegroundColor White
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "🎉 Tüm functions başarıyla deploy edildi!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Bazı functions deploy edilemedi." -ForegroundColor Yellow
}

