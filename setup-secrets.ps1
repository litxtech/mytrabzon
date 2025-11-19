# Supabase Edge Functions Secrets Kurulum Script'i
# Bu script secrets'ları Supabase CLI ile ekler

Write-Host "🔐 Supabase Edge Functions Secrets Kurulumu" -ForegroundColor Cyan
Write-Host ""

# Proje bilgileri
$PROJECT_REF = "xcvcplwimicylaxghiak"
$SUPABASE_URL = "https://xcvcplwimicylaxghiak.supabase.co"

Write-Host "📌 Proje: $PROJECT_REF" -ForegroundColor Yellow
Write-Host "📌 URL: $SUPABASE_URL" -ForegroundColor Yellow
Write-Host ""

# Service Role Key'i kullanıcıdan al
Write-Host "🔑 Service Role Key gerekiyor!" -ForegroundColor Yellow
Write-Host "   Bu key'i Supabase Dashboard'dan alabilirsiniz:" -ForegroundColor White
Write-Host "   Settings > API > service_role key (secret)" -ForegroundColor Cyan
Write-Host ""
$SERVICE_ROLE_KEY = Read-Host "Service Role Key'i girin (veya Enter'a basıp manuel ekleyin)"

if ([string]::IsNullOrWhiteSpace($SERVICE_ROLE_KEY)) {
    Write-Host ""
    Write-Host "⚠️  Service Role Key girilmedi. Manuel ekleme adımları:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions adresine gidin" -ForegroundColor Cyan
    Write-Host "2. 'Secrets' sekmesine tıklayın" -ForegroundColor Cyan
    Write-Host "3. Şu secrets'ları ekleyin:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Key: SUPABASE_URL" -ForegroundColor White
    Write-Host "   Value: $SUPABASE_URL" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Key: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
    Write-Host "   Value: [Settings > API > service_role key'i kopyalayın]" -ForegroundColor Green
    Write-Host ""
    Write-Host "4. 'Add Secret' butonuna tıklayın" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "📦 Secrets ekleniyor..." -ForegroundColor Cyan

# Supabase CLI ile secrets ekle
try {
    # SUPABASE_URL ekle
    Write-Host "   SUPABASE_URL ekleniyor..." -ForegroundColor Yellow
    supabase secrets set SUPABASE_URL=$SUPABASE_URL --project-ref $PROJECT_REF
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ SUPABASE_URL eklendi" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  SUPABASE_URL eklenirken hata oluştu" -ForegroundColor Yellow
    }
    
    # SUPABASE_SERVICE_ROLE_KEY ekle
    Write-Host "   SUPABASE_SERVICE_ROLE_KEY ekleniyor..." -ForegroundColor Yellow
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY --project-ref $PROJECT_REF
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ SUPABASE_SERVICE_ROLE_KEY eklendi" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  SUPABASE_SERVICE_ROLE_KEY eklenirken hata oluştu" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "✅✅✅ Secrets kurulumu tamamlandı! ✅✅✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Not: Eğer CLI ile ekleme başarısız olduysa, Dashboard'dan manuel ekleyin:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Secrets eklenirken hata oluştu!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternatif: Dashboard'dan manuel ekleyin:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions" -ForegroundColor Cyan
    Write-Host ""
}

