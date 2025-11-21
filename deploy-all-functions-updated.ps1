# Tum Edge Functions'lari Deploy Et
# Guncellenmis versiyon - npx kullanarak

$ErrorActionPreference = "Continue"

# Supabase proje bilgileri
$env:SUPABASE_ACCESS_TOKEN="sbp_18e64fd74e0e7cd39423ab716355b6803da9b875"
$PROJECT_REF="xcvcplwimicylaxghiak"

Write-Host "[DEPLOY] Tum Functions'lari Deploy Ediyor..." -ForegroundColor Cyan
Write-Host "[INFO] Project: $PROJECT_REF" -ForegroundColor Yellow
Write-Host ""

# Once projeyi link et (npx ile)
Write-Host "[LINK] Projeyi link ediyor..." -ForegroundColor Cyan
try {
    $linkOutput = npx --yes supabase link --project-ref $PROJECT_REF 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -or $linkOutput -match "already linked" -or $linkOutput -match "already exists") {
        Write-Host "[OK] Proje link edildi" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Link uyarisi (devam ediliyor): $linkOutput" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] Link hatasi (devam ediliyor): $_" -ForegroundColor Yellow
}

Write-Host ""

# Functions listesi - tum function'lari icerir
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

foreach ($func in $functions) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Gray
    Write-Host "[DEPLOY] Deploying $func..." -ForegroundColor Cyan
    
    # npx ile deploy et (--yes flag ile otomatik onay)
    $deployOutput = npx --yes supabase functions deploy $func --no-verify-jwt --project-ref $PROJECT_REF 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $func deployed successfully!" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[FAIL] $func deployment failed!" -ForegroundColor Red
        Write-Host "[ERROR] Error output:" -ForegroundColor Yellow
        Write-Host $deployOutput -ForegroundColor Yellow
        $failCount++
        $failedFunctions += $func
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[SUMMARY] Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[OK] Successful: $successCount" -ForegroundColor Green
Write-Host "[FAIL] Failed: $failCount" -ForegroundColor Red

if ($failedFunctions.Count -gt 0) {
    Write-Host ""
    Write-Host "[INFO] Failed functions:" -ForegroundColor Yellow
    foreach ($func in $failedFunctions) {
        Write-Host "  - $func" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[INFO] Function URLs:" -ForegroundColor Cyan
Write-Host "  https://$PROJECT_REF.supabase.co/functions/v1/trpc" -ForegroundColor White
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "[SUCCESS] Tum functions basariyla deploy edildi!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Bazi functions deploy edilemedi. Yukaridaki hatalari kontrol edin." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[TIP] Basarisiz function'lari tek tek deploy etmeyi deneyin:" -ForegroundColor Cyan
    foreach ($func in $failedFunctions) {
        $cmd = "npx --yes supabase functions deploy $func --no-verify-jwt --project-ref $PROJECT_REF"
        Write-Host "  $cmd" -ForegroundColor White
    }
}
