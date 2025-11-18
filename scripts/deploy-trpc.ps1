# Deploy TRPC Edge Function to Supabase
# Otomatik olarak dosyalardan bilgileri okur
# 
# Usage:
#   .\scripts\deploy-trpc.ps1

$ErrorActionPreference = "Stop"

# Project ref'i otomatik olarak bul
function Get-ProjectRef {
    # 1. Environment variable'dan
    if ($env:SUPABASE_PROJECT_REF) {
        return $env:SUPABASE_PROJECT_REF
    }
    
    # 2. .env dosyasından EXPO_PUBLIC_SUPABASE_URL'i oku ve project ref'i çıkar
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "EXPO_PUBLIC_SUPABASE_URL=https://([^.]+)\.supabase\.co") {
            return $matches[1]
        }
    }
    
    # 3. GitHub workflow dosyalarından
    $workflowFiles = Get-ChildItem -Path ".github/workflows" -Filter "deploy-*.yml" -ErrorAction SilentlyContinue
    foreach ($file in $workflowFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match 'PROJECT_REF="([^"]+)"' -or $content -match "PROJECT_REF=`"([^`"]+)`"") {
            $ref = $matches[1]
            if ($ref -ne "`${{ secrets.SUPABASE_PROJECT_REF }}" -and $ref -ne "") {
                return $ref
            }
        }
    }
    
    # 4. Default değer
    return "xcvcplwimicylaxghiak"
}

# Access token'ı otomatik olarak bul
function Get-AccessToken {
    # 1. Environment variable'dan
    if ($env:SUPABASE_ACCESS_TOKEN) {
        return $env:SUPABASE_ACCESS_TOKEN
    }
    
    # 2. .env dosyasından
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "SUPABASE_ACCESS_TOKEN=([^\r\n]+)") {
            return $matches[1].Trim()
        }
    }
    
    # 3. .env.local dosyasından
    if (Test-Path ".env.local") {
        $envContent = Get-Content ".env.local" -Raw
        if ($envContent -match "SUPABASE_ACCESS_TOKEN=([^\r\n]+)") {
            return $matches[1].Trim()
        }
    }
    
    return $null
}

$PROJECT_REF = Get-ProjectRef
$ACCESS_TOKEN = Get-AccessToken

Write-Host "🚀 Deploying TRPC Edge Function..." -ForegroundColor Cyan
Write-Host "📌 Project Ref: $PROJECT_REF" -ForegroundColor Yellow
if ($ACCESS_TOKEN) {
    Write-Host "✅ Access Token: Found (from files/env)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Access Token: Not found" -ForegroundColor Yellow
}
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "🔍 Checking Supabase CLI..." -ForegroundColor Cyan
try {
    $null = supabase --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLI not found"
    }
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install it first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host "  or" -ForegroundColor White
    Write-Host "  scoop install supabase" -ForegroundColor White
    Write-Host "  or" -ForegroundColor White
    Write-Host "  winget install Supabase.CLI" -ForegroundColor White
    exit 1
}

# Access token kontrolü ve ayarlama
if (-not $ACCESS_TOKEN) {
    Write-Host "⚠️  SUPABASE_ACCESS_TOKEN not found in files or environment!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please enter your Supabase Access Token:" -ForegroundColor Yellow
    Write-Host "  (Get it from: https://app.supabase.com -> Settings -> Access Tokens)" -ForegroundColor White
    Write-Host ""
    Write-Host "Token format should be like: sbp_0102...1920" -ForegroundColor Cyan
    Write-Host ""
    $tokenInput = Read-Host "Enter SUPABASE_ACCESS_TOKEN" -AsSecureString
    $ACCESS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($tokenInput))
    
    if (-not $ACCESS_TOKEN -or $ACCESS_TOKEN.Trim() -eq "") {
        Write-Host "❌ Token cannot be empty!" -ForegroundColor Red
        exit 1
    }
    
    # Token'ı environment variable'a set et
    $env:SUPABASE_ACCESS_TOKEN = $ACCESS_TOKEN.Trim()
    Write-Host "✅ Access token set" -ForegroundColor Green
} else {
    # Token bulundu, environment variable'a set et
    $env:SUPABASE_ACCESS_TOKEN = $ACCESS_TOKEN.Trim()
    Write-Host "✅ Access token found and set from files" -ForegroundColor Green
}

# Token format kontrolü
if ($env:SUPABASE_ACCESS_TOKEN -notmatch "^sbp_[a-zA-Z0-9]+$") {
    Write-Host "⚠️  Warning: Token format doesn't look correct. Should start with 'sbp_'" -ForegroundColor Yellow
    Write-Host "   Current token starts with: $($env:SUPABASE_ACCESS_TOKEN.Substring(0, [Math]::Min(10, $env:SUPABASE_ACCESS_TOKEN.Length)))..." -ForegroundColor Yellow
}

# Link to project if not already linked
Write-Host ""
Write-Host "🔗 Linking to project..." -ForegroundColor Cyan
try {
    $linkOutput = supabase link --project-ref $PROJECT_REF 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Project linked successfully" -ForegroundColor Green
    } else {
        # Link might fail if already linked, that's okay
        if ($linkOutput -match "already linked" -or $linkOutput -match "already exists") {
            Write-Host "ℹ️  Project already linked" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  Link warning (may already be linked)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "ℹ️  Link check (may already be linked)" -ForegroundColor Yellow
}

# Deploy the function
Write-Host ""
Write-Host "📦 Deploying trpc function..." -ForegroundColor Cyan
try {
    supabase functions deploy trpc --no-verify-jwt 2>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Successfully deployed TRPC Edge Function!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 Function URL: https://$PROJECT_REF.supabase.co/functions/v1/trpc" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🎉 Deployment complete! You can now test it from the admin panel." -ForegroundColor Green
    } else {
        throw "Deployment failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor White
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Make sure you have SUPABASE_ACCESS_TOKEN set in your environment" -ForegroundColor White
    Write-Host "  2. Check that your project ref is correct: $PROJECT_REF" -ForegroundColor White
    Write-Host "  3. Verify you have permission to deploy to this project" -ForegroundColor White
    Write-Host ""
    Write-Host "To set access token:" -ForegroundColor Yellow
    Write-Host "  `$env:SUPABASE_ACCESS_TOKEN=`"your_token_here`"" -ForegroundColor White
    Write-Host ""
    exit 1
}
