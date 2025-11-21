# Hızlı Deploy Script
$ErrorActionPreference = "Continue"

$env:SUPABASE_ACCESS_TOKEN="sbp_18e64fd74e0e7cd39423ab716355b6803da9b875"
$PROJECT_REF="xcvcplwimicylaxghiak"

Write-Host "🚀 Starting deployment..." -ForegroundColor Cyan
Write-Host "📌 Project: $PROJECT_REF" -ForegroundColor Yellow
Write-Host "✅ Token: Set" -ForegroundColor Green
Write-Host ""

# Check if npm is installed
Write-Host "🔍 Checking npm..." -ForegroundColor Cyan
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "npm not found"
    }
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔗 Linking project..." -ForegroundColor Cyan
$linkOutput = npx supabase link --project-ref $PROJECT_REF 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project linked successfully!" -ForegroundColor Green
} else {
    # Check if already linked
    if ($linkOutput -match "already linked" -or $linkOutput -match "already exists") {
        Write-Host "ℹ️  Project already linked, continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Link warning (may already be linked): $linkOutput" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📦 Deploying trpc function..." -ForegroundColor Cyan
$deployOutput = npx supabase functions deploy trpc --no-verify-jwt 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅✅✅ DEPLOYMENT SUCCESSFUL! ✅✅✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Function URL: https://$PROJECT_REF.supabase.co/functions/v1/trpc" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎉 Politika onayı artık çalışıyor!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Error output:" -ForegroundColor Yellow
    Write-Host $deployOutput -ForegroundColor White
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if SUPABASE_ACCESS_TOKEN is correct" -ForegroundColor White
    Write-Host "2. Verify project ref: $PROJECT_REF" -ForegroundColor White
    Write-Host "3. Make sure you have deploy permissions" -ForegroundColor White
    exit 1
}
