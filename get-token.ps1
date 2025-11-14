# Token Alma Script'i
# Bu script, Supabase'den geçerli bir token almanıza yardımcı olur

Write-Host "`n🔑 Supabase Token Alma Rehberi" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow

Write-Host "`n1️⃣ YÖNTEM: Supabase Dashboard'dan" -ForegroundColor Cyan
Write-Host "   - Supabase Dashboard → Authentication → Users" -ForegroundColor Gray
Write-Host "   - Bir kullanıcı seçin" -ForegroundColor Gray
Write-Host "   - 'Access Token' veya 'JWT Token' kopyalayın" -ForegroundColor Gray

Write-Host "`n2️⃣ YÖNTEM: Uygulamanızdan (React Native/Expo)" -ForegroundColor Cyan
Write-Host "   Aşağıdaki kodu uygulamanızda çalıştırın:" -ForegroundColor Gray
Write-Host @"
   import { supabase } from '@/lib/supabase';
   
   const { data: { session } } = await supabase.auth.getSession();
   const token = session?.access_token;
   console.log('Token:', token);
"@ -ForegroundColor Green

Write-Host "`n3️⃣ YÖNTEM: Supabase CLI ile" -ForegroundColor Cyan
Write-Host "   supabase auth login" -ForegroundColor Gray
Write-Host "   supabase auth token" -ForegroundColor Gray

Write-Host "`n⚠️  ÖNEMLİ:" -ForegroundColor Red
Write-Host "   - Token'ı test-edge-function.ps1 dosyasındaki `$TOKEN değişkenine yapıştırın" -ForegroundColor Yellow
Write-Host "   - Token'ın 'Bearer ' prefix'i OLMAMALI (script otomatik ekliyor)" -ForegroundColor Yellow
Write-Host "   - Token geçerli bir JWT token olmalı" -ForegroundColor Yellow

Write-Host "`n💡 İPUCU:" -ForegroundColor Cyan
Write-Host "   Token'ı test etmek için:" -ForegroundColor Gray
Write-Host "   .\test-edge-function.ps1" -ForegroundColor Green

Write-Host "`n"

