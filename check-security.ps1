# Security Check Script
# Security vulnerability checker and fixer

Write-Host "Security Check Starting..." -ForegroundColor Cyan
Write-Host ""

# npm audit
Write-Host "Running npm audit..." -ForegroundColor Yellow
npm audit

Write-Host ""
Write-Host "To fix security vulnerabilities:" -ForegroundColor Cyan
Write-Host "   npm audit fix" -ForegroundColor White
Write-Host ""

# expo-doctor
Write-Host "Running Expo Doctor..." -ForegroundColor Yellow
npx -y expo-doctor

Write-Host ""
Write-Host "Check completed!" -ForegroundColor Green

