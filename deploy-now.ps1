# Hızlı Deploy Script
$env:SUPABASE_ACCESS_TOKEN="sbp_18e64fd74e0e7cd39423ab716355b6803da9b875"
$PROJECT_REF="xcvcplwimicylaxghiak"

Write-Host "🚀 Starting deployment..." -ForegroundColor Cyan
Write-Host "📌 Project: $PROJECT_REF" -ForegroundColor Yellow
Write-Host "✅ Token: Set" -ForegroundColor Green
Write-Host ""

Write-Host "🔗 Linking project..." -ForegroundColor Cyan
supabase link --project-ref $PROJECT_REF

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project linked!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Deploying function..." -ForegroundColor Cyan
    supabase functions deploy trpc --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅✅✅ DEPLOYMENT SUCCESSFUL! ✅✅✅" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 Function URL: https://$PROJECT_REF.supabase.co/functions/v1/trpc" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🎉 You can now test notifications from the admin panel!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Link failed (may already be linked, continuing...)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📦 Deploying function anyway..." -ForegroundColor Cyan
    supabase functions deploy trpc --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅✅✅ DEPLOYMENT SUCCESSFUL! ✅✅✅" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 Function URL: https://$PROJECT_REF.supabase.co/functions/v1/trpc" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
    }
}
