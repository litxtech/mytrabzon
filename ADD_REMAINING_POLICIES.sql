-- MyTrabzon Kalan Politikaları Ekleme/Güncelleme
-- Çerez, Güvenlik, Hesap Silme, vb.

-- ============================================
-- ÇEREZ POLİTİKASI
-- ============================================
UPDATE policies
SET 
  title = 'Çerez Politikası',
  content = 'Çerez Politikası (Cookie Policy)

Son Güncelleme: 2025

MyTrabzon – Powered by LitxTech LLC & LitxTech LTD

Bu Çerez Politikası, MyTrabzon mobil uygulaması ve web platformu ("Platform") içerisinde kullanılan çerez (cookie) ve benzeri teknolojiler hakkında bilgi vermek amacıyla hazırlanmıştır.

MyTrabzon; LitxTech LLC (ABD) ve LitxTech LTD (Birleşik Krallık) tarafından geliştirilir ve işletilir.

1. Çerez Nedir?

Çerezler ("cookies"), bir web sitesi veya mobil uygulama tarafından cihazınıza (telefon, tablet, bilgisayar) kaydedilen küçük veri dosyalarıdır. Bu dosyalar sayesinde:

Hesabınız açık tutulur

Oturum bilgileriniz korunur

Kişiselleştirilmiş içerikler gösterilir

Analitik ölçümler yapılır

Tercihleriniz hatırlanır

Güvenlik doğrulamaları yapılır

Mobil uygulamalarda çerez işlevini Secure Storage, AsyncStorage, Expo Secure Store, Supabase Auth Cookies gibi mekanizmalar sağlar.

2. Kullanılan Çerez Türleri

MyTrabzon; web ve mobil ortamda farklı teknikler kullansa da işlevsel olarak aşağıdaki çerez türleri uygulanır:

2.1. Zorunlu (Essential) Çerezler

Bu çerezler uygulamanın çalışması için gereklidir.

Kullanım amaçları:

Giriş yapma / oturum yönetimi

Kullanıcı doğrulaması (JWT, Supabase Session)

Hesap güvenliği

Sunucu yük dengeleme

Sayfa yönlendirme

Spam ve kötüye kullanım engelleme

Bu çerezler olmadan uygulama çalışmaz.

2.2. Performans & Analitik Çerezleri

Kullanıcıların uygulamayı nasıl kullandığını ölçmek için kullanılır.

Örnek araçlar:

Google Analytics (web)

Supabase Log Service

Edge Function Logs

Crash & error tracking

Toplanan bilgiler:

Hangi sayfalar görüntüleniyor

Buton tıklamaları

Hata raporları

Cihaz bilgileri (model, işletim sistemi vs.)

Bu veriler anonim veya pseudonim şekilde tutulur; kimlik tespiti yapılmaz.

2.3. Fonksiyonel Çerezler

Kullanıcıyı tekrar tanımak ve tercihler sunmak için kullanılır.

Kapsar:

Dil tercihi

Bildirim ayarları

Tema tercihleri

Son kullanılan modüller

2.4. Reklam ve Pazarlama Çerezleri

MyTrabzon şu anda uygulama içinde reklam yayınlamamaktadır.

Ancak ileride:

Google Ads

Meta Ads

TikTok Ads

gibi ağlar entegre edilirse reklam çerezleri devreye girebilir.

Bu durumda politika güncellenecektir.

2.5. Üçüncü Taraf Çerezleri

Entegrasyon yapılan hizmetlere göre değişir:

Stripe (ödeme işlemleri)

Agora (canlı arama bağlantı çerezleri)

Supabase (oturum yönetimi)

Google & X (social login)

DeepSeek / LazGPT (AI kullanım kayıtları)

Bu çerezler ilgili hizmetlerin kendi politikalarına tabidir.

3. Mobil Uygulamalarda Çerez Mantığı Nasıldır?

Mobil uygulamalarda klasik "browser cookie" kullanılmaz.

Bunun yerine:

Secure Storage

AsyncStorage

Token-based session

Local database cache

Supabase Session Store

kullanılır.

Hukuk açısından bunların hepsi çerez olarak kabul edilir.

MyTrabzon aşağıdaki verileri lokal depoda tutabilir:

Supabase session token (JWT)

Kullanıcı ID''si (anonim)

Ayarlar

Tema bilgisi

Push notification token

Geçici oturum verisi

Bu veriler cihazda şifrelenmiş şekilde saklanır ve kullanıcı tarafından silinebilir.

4. Çerezlerin Kullanım Amaçları

MyTrabzon çerezleri aşağıdaki amaçlarla kullanır:

Uygulamanın çalışmasını sağlamak

Oturum ve hesap güvenliğini sağlamak

Kullanıcı deneyimini geliştirmek

Performans ölçmek

Uygulama hatalarını tespit etmek

İçerik öneri sistemini iyileştirmek (algoritma)

Push bildirimlerini yönetmek

İşlem geçmişi tutmak

Kişisel veri içeren çerezlerin işlenmesi KVKK, GDPR ve COPPA kapsamında yapılır.

5. Çerezleri Yönetme ve Silme

Kullanıcılar istedikleri zaman:

Web için:

Tarayıcı ayarlarından çerezleri silebilir

Bazı çerezleri engelleyebilir

Mobil uygulama için:

Uygulama ayarlarından "Hesap Silme" → tüm çerezler silinir

Cihaz ayarlarından uygulamayı kaldırmak → tüm veriler silinir

MyTrabzon''dan "Hesabımı Sil" talebi → tüm oturum ve yerel veri silinir

Zorunlu çerezlerin engellenmesi uygulamanın çalışmasını engelleyebilir.

6. Üçüncü Taraf Teknolojiler ve Çerezler

MyTrabzon aşağıdaki sistemleri kullanır ve bunlar gereklilik halinde kullanıcı cihazında çerez/tanımlayıcı tutabilir:

Supabase Auth

Supabase Storage

Edge Function Logs

Stripe

Agora

Google OAuth

X (Twitter OAuth)

DeepSeek AI / LazGPT

Expo Push Notifications

Her hizmetin kendi gizlilik ve çerez politikası geçerlidir.

7. Hukuki Dayanaklar (KVKK & GDPR)

Çerezlerin işlenmesinin hukuki dayanakları:

KVKK (Türkiye):

Açık rıza

Sözleşmenin ifası

Meşru menfaat

GDPR (AB/UK):

User Consent (açık kullanıcı onayı)

Legitimate Interest (meşru menfaat)

Contract Performance (sözleşme gereği)

COPPA (ABD):

13 yaş altından veri toplanmaz

8. Çerezlerin Saklama Süresi

Çerezlerin saklama süreleri şunlardır:

Oturum çerezleri → uygulama kapanınca silinir

Kimlik doğrulama çerezleri → 7–30 gün

Analitik çerezler → 6–12 ay

Stripe ödeme çerezleri → Stripe politikaları kapsamında

Güvenlik logları → 6 ay – 2 yıl

Süreler dolduğunda çerezler silinir veya anonim hâle getirilir.

9. Politika Değişiklikleri

MyTrabzon, bu Çerez Politikasını zaman zaman güncelleyebilir.

Güncellemeler uygulama içinde veya web sitesinde yayınlandığında yürürlüğe girer.

10. İletişim

Çerezlere ilişkin her türlü talep için:

📩 support@litxtech.com

📞 +1 307 271 5151

LitxTech LLC & LitxTech LTD – MyTrabzon Veri ve Güvenlik Ekibi',
  policy_type = 'cookie',
  display_order = 6,
  is_active = true,
  updated_at = NOW()
WHERE policy_type = 'cookie';

INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Çerez Politikası',
  'Çerez Politikası (Cookie Policy)

Son Güncelleme: 2025

MyTrabzon – Powered by LitxTech LLC & LitxTech LTD

Bu Çerez Politikası, MyTrabzon mobil uygulaması ve web platformu ("Platform") içerisinde kullanılan çerez (cookie) ve benzeri teknolojiler hakkında bilgi vermek amacıyla hazırlanmıştır.

MyTrabzon; LitxTech LLC (ABD) ve LitxTech LTD (Birleşik Krallık) tarafından geliştirilir ve işletilir.

1. Çerez Nedir?

Çerezler ("cookies"), bir web sitesi veya mobil uygulama tarafından cihazınıza (telefon, tablet, bilgisayar) kaydedilen küçük veri dosyalarıdır. Bu dosyalar sayesinde:

Hesabınız açık tutulur

Oturum bilgileriniz korunur

Kişiselleştirilmiş içerikler gösterilir

Analitik ölçümler yapılır

Tercihleriniz hatırlanır

Güvenlik doğrulamaları yapılır

Mobil uygulamalarda çerez işlevini Secure Storage, AsyncStorage, Expo Secure Store, Supabase Auth Cookies gibi mekanizmalar sağlar.

2. Kullanılan Çerez Türleri

MyTrabzon; web ve mobil ortamda farklı teknikler kullansa da işlevsel olarak aşağıdaki çerez türleri uygulanır:

2.1. Zorunlu (Essential) Çerezler

Bu çerezler uygulamanın çalışması için gereklidir.

Kullanım amaçları:

Giriş yapma / oturum yönetimi

Kullanıcı doğrulaması (JWT, Supabase Session)

Hesap güvenliği

Sunucu yük dengeleme

Sayfa yönlendirme

Spam ve kötüye kullanım engelleme

Bu çerezler olmadan uygulama çalışmaz.

2.2. Performans & Analitik Çerezleri

Kullanıcıların uygulamayı nasıl kullandığını ölçmek için kullanılır.

Örnek araçlar:

Google Analytics (web)

Supabase Log Service

Edge Function Logs

Crash & error tracking

Toplanan bilgiler:

Hangi sayfalar görüntüleniyor

Buton tıklamaları

Hata raporları

Cihaz bilgileri (model, işletim sistemi vs.)

Bu veriler anonim veya pseudonim şekilde tutulur; kimlik tespiti yapılmaz.

2.3. Fonksiyonel Çerezler

Kullanıcıyı tekrar tanımak ve tercihler sunmak için kullanılır.

Kapsar:

Dil tercihi

Bildirim ayarları

Tema tercihleri

Son kullanılan modüller

2.4. Reklam ve Pazarlama Çerezleri

MyTrabzon şu anda uygulama içinde reklam yayınlamamaktadır.

Ancak ileride:

Google Ads

Meta Ads

TikTok Ads

gibi ağlar entegre edilirse reklam çerezleri devreye girebilir.

Bu durumda politika güncellenecektir.

2.5. Üçüncü Taraf Çerezleri

Entegrasyon yapılan hizmetlere göre değişir:

Stripe (ödeme işlemleri)

Agora (canlı arama bağlantı çerezleri)

Supabase (oturum yönetimi)

Google & X (social login)

DeepSeek / LazGPT (AI kullanım kayıtları)

Bu çerezler ilgili hizmetlerin kendi politikalarına tabidir.

3. Mobil Uygulamalarda Çerez Mantığı Nasıldır?

Mobil uygulamalarda klasik "browser cookie" kullanılmaz.

Bunun yerine:

Secure Storage

AsyncStorage

Token-based session

Local database cache

Supabase Session Store

kullanılır.

Hukuk açısından bunların hepsi çerez olarak kabul edilir.

MyTrabzon aşağıdaki verileri lokal depoda tutabilir:

Supabase session token (JWT)

Kullanıcı ID''si (anonim)

Ayarlar

Tema bilgisi

Push notification token

Geçici oturum verisi

Bu veriler cihazda şifrelenmiş şekilde saklanır ve kullanıcı tarafından silinebilir.

4. Çerezlerin Kullanım Amaçları

MyTrabzon çerezleri aşağıdaki amaçlarla kullanır:

Uygulamanın çalışmasını sağlamak

Oturum ve hesap güvenliğini sağlamak

Kullanıcı deneyimini geliştirmek

Performans ölçmek

Uygulama hatalarını tespit etmek

İçerik öneri sistemini iyileştirmek (algoritma)

Push bildirimlerini yönetmek

İşlem geçmişi tutmak

Kişisel veri içeren çerezlerin işlenmesi KVKK, GDPR ve COPPA kapsamında yapılır.

5. Çerezleri Yönetme ve Silme

Kullanıcılar istedikleri zaman:

Web için:

Tarayıcı ayarlarından çerezleri silebilir

Bazı çerezleri engelleyebilir

Mobil uygulama için:

Uygulama ayarlarından "Hesap Silme" → tüm çerezler silinir

Cihaz ayarlarından uygulamayı kaldırmak → tüm veriler silinir

MyTrabzon''dan "Hesabımı Sil" talebi → tüm oturum ve yerel veri silinir

Zorunlu çerezlerin engellenmesi uygulamanın çalışmasını engelleyebilir.

6. Üçüncü Taraf Teknolojiler ve Çerezler

MyTrabzon aşağıdaki sistemleri kullanır ve bunlar gereklilik halinde kullanıcı cihazında çerez/tanımlayıcı tutabilir:

Supabase Auth

Supabase Storage

Edge Function Logs

Stripe

Agora

Google OAuth

X (Twitter OAuth)

DeepSeek AI / LazGPT

Expo Push Notifications

Her hizmetin kendi gizlilik ve çerez politikası geçerlidir.

7. Hukuki Dayanaklar (KVKK & GDPR)

Çerezlerin işlenmesinin hukuki dayanakları:

KVKK (Türkiye):

Açık rıza

Sözleşmenin ifası

Meşru menfaat

GDPR (AB/UK):

User Consent (açık kullanıcı onayı)

Legitimate Interest (meşru menfaat)

Contract Performance (sözleşme gereği)

COPPA (ABD):

13 yaş altından veri toplanmaz

8. Çerezlerin Saklama Süresi

Çerezlerin saklama süreleri şunlardır:

Oturum çerezleri → uygulama kapanınca silinir

Kimlik doğrulama çerezleri → 7–30 gün

Analitik çerezler → 6–12 ay

Stripe ödeme çerezleri → Stripe politikaları kapsamında

Güvenlik logları → 6 ay – 2 yıl

Süreler dolduğunda çerezler silinir veya anonim hâle getirilir.

9. Politika Değişiklikleri

MyTrabzon, bu Çerez Politikasını zaman zaman güncelleyebilir.

Güncellemeler uygulama içinde veya web sitesinde yayınlandığında yürürlüğe girer.

10. İletişim

Çerezlere ilişkin her türlü talep için:

📩 support@litxtech.com

📞 +1 307 271 5151

LitxTech LLC & LitxTech LTD – MyTrabzon Veri ve Güvenlik Ekibi',
  'cookie',
  6,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE policy_type = 'cookie'
);

-- ============================================
-- GÜVENLİK POLİTİKASI
-- ============================================
UPDATE policies
SET 
  title = 'Güvenlik Politikası',
  content = 'MyTrabzon Güvenlik Politikası (Security Policy)

Son Güncelleme: 2025

LitxTech LLC (ABD) & LitxTech LTD (Birleşik Krallık)

Powered by MyTrabzon

Bu Güvenlik Politikası; MyTrabzon uygulamasında kullanıcı verilerinin, altyapının, sistemlerin ve hizmetlerin nasıl korunduğunu açıklamak amacıyla hazırlanmıştır.

Platformumuz; uluslararası güvenlik standartlarına, KVKK, GDPR, COPPA, CCPA ve sektör gerekliliklerine uygun şekilde tasarlanmış olup, veri güvenliği en yüksek önceliğimizdir.

1. Teknik Altyapı ve Sistem Güvenliği

MyTrabzon''un teknolojik altyapısı modern ve ölçeklenebilir bir mimari üzerinde çalışır:

Supabase — PostgreSQL veritabanı + Kimlik doğrulama

Deno Edge Functions — API ve backend işlemleri

Hono Framework — Server-end işlemler

tRPC — Tip güvenli API iletişimi

Zod — Veri doğrulama

Expo + React Native — Mobil uygulama

Stripe — Ödeme güvenliği

Agora — Sesli/görüntülü arama protokolü

Tüm sistemler güvenli iletişim (TLS/SSL 1.2+) ile korunur.

2. Veri Şifreleme (Encryption)

MyTrabzon''da veri güvenliği iki katmandan oluşur:

2.1. Veri Aktarımında (In-Transit)

Tüm API çağrıları HTTPS üzerinden yapılır

TLS 1.2/1.3 protokolü kullanılır

MITM (Man-in-the-Middle) saldırılarına karşı koruma sağlanır

2.2. Veri Saklamada (At-Rest)

Veritabanı diskleri şifrelenmiştir

Şifreler hashlenmiş + salt''lı olarak tutulur

Tokenler şifreli depolarda saklanır

Kullanıcı oturum bilgileri cihazda SecureStorage/Keychain''e yazılır

3. Kimlik Doğrulama (Authentication)

Platform aşağıdaki güvenli kimlik doğrulama yöntemlerini kullanır:

JWT tabanlı oturum yönetimi

OAuth 2.0 (Google & X)

Magic Link doğrulaması

Şifreli e-posta doğrulaması

Çok faktörlü doğrulama (opsiyonel geliştirme planında)

Rehberleme tabanlı brute force koruma sistemi

Yanlış girişlerde hız limitleri

Şifreler asla düz metin olarak saklanmaz.

4. Yetkilendirme ve Erişim Kontrolleri (Authorization)

MyTrabzon veri tabanı RLS (Row Level Security) ile korunur.

Bu sayede:

Kullanıcılar yalnızca kendi verilerine erişir

Rol tabanlı erişim kontrolü (RBAC) uygulanır

Admin yetkileri kısıtlı ve izlenebilir

Edge Functions sadece belirli veriye erişime sahiptir

Bu sistem, modern sosyal medya platformlarının kullandığı en güvenli modeldir.

5. Mesajlaşma ve İçerik Güvenliği

Mesajlar gizlidir.

Mesaj içerikleri uçtan uca şifreleme prensiplerine göre işlenir

Platform üzerinde "mesaj taraması" yapılmaz

Sadece kullanıcı şikayet ettiğinde inceleme yapılır

Gönderilen foto/video dosyaları güvenli depolama alanlarında saklanır

Tüm medya dosyaları güvenlik testinden geçer

Gizlilik, güvenlik ve kullanıcı deneyimi aynı anda korunur.

6. Video & Sesli Arama Güvenliği (Agora)

Agora bağlantıları şifreli iletişim protokolleri ile yapılır

Her görüşme için tek kullanımlık erişim tokeni oluşturulur

Tokenler belirli süre sonra geçersiz olur

18 yaş altı kullanıcılar video aramayı kullanamaz

Görüşmeler asla kaydedilmez

Uygunsuz davranış tespitinde hesap kapatılır

7. Ödeme Güvenliği (Stripe)

Stripe; PCI-DSS Level 1 sertifikalı bir ödeme sağlayıcısıdır.

Kart bilgileri tarafımızca asla saklanmaz

Kartlar Stripe tarafından şifrelenir

Fraud (dolandırıcılık) tespit sistemi aktiftir

Bağış ve ödeme sistemleri Stripe güvenlik kurallarına tabidir

8. AI (LazGPT) Güvenliği

LazGPT, DeepSeek altyapısından güç alır.

AI ile güvenlik kuralları:

AI, kullanıcı verisini eğitime katmaz

Kişisel verileri saklamaz

Yasa dışı veya zararlı içerikleri üretmez

18 altı kullanıcılar için filtreleme uygulanır

Uygunsuz istekler otomatik olarak engellenir

9. Yaş Doğrulama Güvenliği

MyTrabzon''da:

Genel kullanım: minimum 13 yaş

Eşleşme & video görüşme: minimum 18 yaş

Doğrulama yöntemleri:

Kimlik (KYC) doğrulama

Öğrenci e-posta doğrulaması

Profil fotoğrafı analizleri

Manuel moderasyon

10. İçerik Moderasyonu & Güvenli Topluluk

Uygunsuz içerikler:

Otomatik filtre

AI destekli tarama

Manuel inceleme

Kullanıcı ihbar sistemi

ile kontrol edilir.

Yasaklı içerikler (örnek):

Cinsel istismar

Çocuk istismarı

Taciz

Nefret söylemi

Uyuşturucu/şiddet teşviki

Dolandırıcılık

Scam ve phishing

Spam

İhlallerde hesap kapatma + yasal bildirim uygulanır.

11. Olay Müdahale (Incident Response)

Güvenlik ihlali durumunda:

Sistem otomatik olarak olayı algılar

Teknik ekip tarafından inceleme başlatılır

72 saat içinde kullanıcılar bilgilendirilir (GDPR gereği)

Gerekirse yetkili kurumlara rapor verilir

Sorun giderilir ve tekrar etmemesi için önlem alınır

12. Yurt Dışı Veri Aktarımı Güvenliği

MyTrabzon veri işleme bölgeleri:

Amerika Birleşik Devletleri

İngiltere

Avrupa Birliği

Aktarımlar:

Sözleşmeye dayalı

Güvenli ülke politikasına uygun

KVKK & GDPR uyumlu

Şifreli bağlantı protokolleri ile yapılır

13. Cihaz Güvenliği (Mobile App Security)

Mobil uygulama:

Code obfuscation (kod gizleme)

Anti-debugging koruması

Reverse engineering engelleme

Güvenli veri depolama

İmza doğrulama sistemi

kullanır.

14. Loglama ve İzleme

Toplanan loglar:

Hata raporları

Performans verileri

Güvenlik olayları

API istekleri

Rate limit ihlalleri

Loglar kişisel veri içermez, anonimleştirilmiş hâlde tutulur.

15. Kullanıcı Sorumlulukları

Kullanıcılar:

Şifresini korumalı

Uygunsuz içerik paylaşmamalı

Güvenlik açıklarını bildirmeli

Başkalarının verisini kötüye kullanmamalı

Video görüşmede kurallara uymalı

16. Güvenlik Açığı Bildirimi (Responsible Disclosure)

Herhangi bir güvenlik açığı tespit eden kullanıcılar:

📩 security@litxtech.com

adresine e-posta gönderebilir.

Raporlanan açıklar özenle incelenir.

17. Politika Güncellemeleri

Bu Güvenlik Politikası gerektiğinde güncellenebilir.

Değişiklikler uygulama ve web sitesi üzerinden duyurulur.

18. İletişim

Güvenlik ekibi ile iletişim için:

📩 support@litxtech.com

📩 security@litxtech.com (güvenlik ihlalleri)

📞 +1 307 271 5151',
  policy_type = 'other',
  display_order = 7,
  is_active = true,
  updated_at = NOW()
WHERE title LIKE '%Güvenlik%';

INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Güvenlik Politikası',
  'MyTrabzon Güvenlik Politikası (Security Policy)

Son Güncelleme: 2025

LitxTech LLC (ABD) & LitxTech LTD (Birleşik Krallık)

Powered by MyTrabzon

Bu Güvenlik Politikası; MyTrabzon uygulamasında kullanıcı verilerinin, altyapının, sistemlerin ve hizmetlerin nasıl korunduğunu açıklamak amacıyla hazırlanmıştır.

Platformumuz; uluslararası güvenlik standartlarına, KVKK, GDPR, COPPA, CCPA ve sektör gerekliliklerine uygun şekilde tasarlanmış olup, veri güvenliği en yüksek önceliğimizdir.

1. Teknik Altyapı ve Sistem Güvenliği

MyTrabzon''un teknolojik altyapısı modern ve ölçeklenebilir bir mimari üzerinde çalışır:

Supabase — PostgreSQL veritabanı + Kimlik doğrulama

Deno Edge Functions — API ve backend işlemleri

Hono Framework — Server-end işlemler

tRPC — Tip güvenli API iletişimi

Zod — Veri doğrulama

Expo + React Native — Mobil uygulama

Stripe — Ödeme güvenliği

Agora — Sesli/görüntülü arama protokolü

Tüm sistemler güvenli iletişim (TLS/SSL 1.2+) ile korunur.

2. Veri Şifreleme (Encryption)

MyTrabzon''da veri güvenliği iki katmandan oluşur:

2.1. Veri Aktarımında (In-Transit)

Tüm API çağrıları HTTPS üzerinden yapılır

TLS 1.2/1.3 protokolü kullanılır

MITM (Man-in-the-Middle) saldırılarına karşı koruma sağlanır

2.2. Veri Saklamada (At-Rest)

Veritabanı diskleri şifrelenmiştir

Şifreler hashlenmiş + salt''lı olarak tutulur

Tokenler şifreli depolarda saklanır

Kullanıcı oturum bilgileri cihazda SecureStorage/Keychain''e yazılır

3. Kimlik Doğrulama (Authentication)

Platform aşağıdaki güvenli kimlik doğrulama yöntemlerini kullanır:

JWT tabanlı oturum yönetimi

OAuth 2.0 (Google & X)

Magic Link doğrulaması

Şifreli e-posta doğrulaması

Çok faktörlü doğrulama (opsiyonel geliştirme planında)

Rehberleme tabanlı brute force koruma sistemi

Yanlış girişlerde hız limitleri

Şifreler asla düz metin olarak saklanmaz.

4. Yetkilendirme ve Erişim Kontrolleri (Authorization)

MyTrabzon veri tabanı RLS (Row Level Security) ile korunur.

Bu sayede:

Kullanıcılar yalnızca kendi verilerine erişir

Rol tabanlı erişim kontrolü (RBAC) uygulanır

Admin yetkileri kısıtlı ve izlenebilir

Edge Functions sadece belirli veriye erişime sahiptir

Bu sistem, modern sosyal medya platformlarının kullandığı en güvenli modeldir.

5. Mesajlaşma ve İçerik Güvenliği

Mesajlar gizlidir.

Mesaj içerikleri uçtan uca şifreleme prensiplerine göre işlenir

Platform üzerinde "mesaj taraması" yapılmaz

Sadece kullanıcı şikayet ettiğinde inceleme yapılır

Gönderilen foto/video dosyaları güvenli depolama alanlarında saklanır

Tüm medya dosyaları güvenlik testinden geçer

Gizlilik, güvenlik ve kullanıcı deneyimi aynı anda korunur.

6. Video & Sesli Arama Güvenliği (Agora)

Agora bağlantıları şifreli iletişim protokolleri ile yapılır

Her görüşme için tek kullanımlık erişim tokeni oluşturulur

Tokenler belirli süre sonra geçersiz olur

18 yaş altı kullanıcılar video aramayı kullanamaz

Görüşmeler asla kaydedilmez

Uygunsuz davranış tespitinde hesap kapatılır

7. Ödeme Güvenliği (Stripe)

Stripe; PCI-DSS Level 1 sertifikalı bir ödeme sağlayıcısıdır.

Kart bilgileri tarafımızca asla saklanmaz

Kartlar Stripe tarafından şifrelenir

Fraud (dolandırıcılık) tespit sistemi aktiftir

Bağış ve ödeme sistemleri Stripe güvenlik kurallarına tabidir

8. AI (LazGPT) Güvenliği

LazGPT, DeepSeek altyapısından güç alır.

AI ile güvenlik kuralları:

AI, kullanıcı verisini eğitime katmaz

Kişisel verileri saklamaz

Yasa dışı veya zararlı içerikleri üretmez

18 altı kullanıcılar için filtreleme uygulanır

Uygunsuz istekler otomatik olarak engellenir

9. Yaş Doğrulama Güvenliği

MyTrabzon''da:

Genel kullanım: minimum 13 yaş

Eşleşme & video görüşme: minimum 18 yaş

Doğrulama yöntemleri:

Kimlik (KYC) doğrulama

Öğrenci e-posta doğrulaması

Profil fotoğrafı analizleri

Manuel moderasyon

10. İçerik Moderasyonu & Güvenli Topluluk

Uygunsuz içerikler:

Otomatik filtre

AI destekli tarama

Manuel inceleme

Kullanıcı ihbar sistemi

ile kontrol edilir.

Yasaklı içerikler (örnek):

Cinsel istismar

Çocuk istismarı

Taciz

Nefret söylemi

Uyuşturucu/şiddet teşviki

Dolandırıcılık

Scam ve phishing

Spam

İhlallerde hesap kapatma + yasal bildirim uygulanır.

11. Olay Müdahale (Incident Response)

Güvenlik ihlali durumunda:

Sistem otomatik olarak olayı algılar

Teknik ekip tarafından inceleme başlatılır

72 saat içinde kullanıcılar bilgilendirilir (GDPR gereği)

Gerekirse yetkili kurumlara rapor verilir

Sorun giderilir ve tekrar etmemesi için önlem alınır

12. Yurt Dışı Veri Aktarımı Güvenliği

MyTrabzon veri işleme bölgeleri:

Amerika Birleşik Devletleri

İngiltere

Avrupa Birliği

Aktarımlar:

Sözleşmeye dayalı

Güvenli ülke politikasına uygun

KVKK & GDPR uyumlu

Şifreli bağlantı protokolleri ile yapılır

13. Cihaz Güvenliği (Mobile App Security)

Mobil uygulama:

Code obfuscation (kod gizleme)

Anti-debugging koruması

Reverse engineering engelleme

Güvenli veri depolama

İmza doğrulama sistemi

kullanır.

14. Loglama ve İzleme

Toplanan loglar:

Hata raporları

Performans verileri

Güvenlik olayları

API istekleri

Rate limit ihlalleri

Loglar kişisel veri içermez, anonimleştirilmiş hâlde tutulur.

15. Kullanıcı Sorumlulukları

Kullanıcılar:

Şifresini korumalı

Uygunsuz içerik paylaşmamalı

Güvenlik açıklarını bildirmeli

Başkalarının verisini kötüye kullanmamalı

Video görüşmede kurallara uymalı

16. Güvenlik Açığı Bildirimi (Responsible Disclosure)

Herhangi bir güvenlik açığı tespit eden kullanıcılar:

📩 security@litxtech.com

adresine e-posta gönderebilir.

Raporlanan açıklar özenle incelenir.

17. Politika Güncellemeleri

Bu Güvenlik Politikası gerektiğinde güncellenebilir.

Değişiklikler uygulama ve web sitesi üzerinden duyurulur.

18. İletişim

Güvenlik ekibi ile iletişim için:

📩 support@litxtech.com

📩 security@litxtech.com (güvenlik ihlalleri)

📞 +1 307 271 5151',
  'other',
  7,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Güvenlik%'
);

-- ============================================
-- HESAP SİLME POLİTİKASI
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Hesap Silme Politikası',
  'HESAP SİLME POLİTİKASI (ACCOUNT DELETION POLICY)

Son Güncelleme: 2025

1. HESAP NASIL SİLİNİR?

Uygulama içinden: Profil > Ayarlar > Hesabı Sil
E-posta ile: support@litxtech.com

2. VERİLER NE ZAMAN SİLİNİR?

Profil bilgileri: 30 gün içinde
Mesajlar: Geri döndürülemez şekilde kaldırılır
Yasal kayıtlar: 3 yıl tutulabilir

3. E-POSTA ÜZERİNDEN SİLME PROSEDÜRÜ

support@litxtech.com adresine talebinizi gönderin
Kimlik doğrulama gerekebilir
7 iş günü içinde işlem tamamlanır

4. VERİ İMHA SÜRESİ

Hesap silme talebi sonrası 30 gün içinde veriler kalıcı olarak silinir.

5. İLETİŞİM

📧 support@litxtech.com',
  'other',
  8,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Hesap Silme%'
);

-- ============================================
-- KABUL EDİLEBİLİR KULLANIM POLİTİKASI
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Kabul Edilebilir Kullanım Politikası',
  'KABUL EDİLEBİLİR KULLANIM POLİTİKASI (ACCEPTABLE USE POLICY)

Son Güncelleme: 2025

1. YASAKLI AKTİVİTELER

Ödeme kötüye kullanımı
Kredi kartı dolandırıcılığı
Spam & bot hesap oluşturma
Siyasi reklam yasağı
Yasa dışı aktiviteler

2. ÖDEME KÖTÜYE KULLANIMI

Stripe üzerinden yapılan işlemlerde:
Fraud tespiti durumunda hesap dondurulur
Yanıltıcı işlemler yasaktır
İade politikası Stripe kurallarına uygundur

3. SPAM & BOT HESAP POLİTİKALARI

Otomatik hesap oluşturma yasaktır
Toplu mesaj gönderimi yasaktır
Sahte hesaplar kapatılır

4. İLETİŞİM

📧 support@litxtech.com',
  'other',
  9,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Kabul Edilebilir%'
);

-- ============================================
-- ÖDEME & BAĞIŞ KULLANIM KOŞULLARI
-- ============================================
UPDATE policies
SET 
  title = 'Ödeme & Bağış Kullanım Koşulları',
  content = 'ÖDEME & BAĞIŞ KULLANIM KOŞULLARI (PAYMENT & DONATION TERMS)

Son Güncelleme: 2025

1. BAĞIŞLARIN NİTELİĞİ

Bağışlar gönüllü ve geri dönüşümsüzdür
Destek paketleri dijital ürünlerdir
İade kapsamı sınırlıdır

2. DİJİTAL ÜRÜNLERDE İADE

Dijital hizmetlerde iade, kullanım durumuna bağlı olarak sınırlı olabilir
Stripe Terms ile uyumludur

3. RİSKLİ DAVRANIŞLARIN ÖDEME ENGELLİ

Fraud tespiti durumunda ödeme engellenir
Şüpheli işlemler askıya alınır

4. STRIPE TERMS İLE UYUMLULUK

Tüm ödemeler Stripe kurallarına tabidir
Kredi kartı bilgileri MyTrabzon tarafından saklanmaz

5. İLETİŞİM

📧 support@litxtech.com',
  policy_type = 'refund',
  display_order = 10,
  is_active = true,
  updated_at = NOW()
WHERE policy_type = 'refund';

INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Ödeme & Bağış Kullanım Koşulları',
  'ÖDEME & BAĞIŞ KULLANIM KOŞULLARI (PAYMENT & DONATION TERMS)

Son Güncelleme: 2025

1. BAĞIŞLARIN NİTELİĞİ

Bağışlar gönüllü ve geri dönüşümsüzdür
Destek paketleri dijital ürünlerdir
İade kapsamı sınırlıdır

2. DİJİTAL ÜRÜNLERDE İADE

Dijital hizmetlerde iade, kullanım durumuna bağlı olarak sınırlı olabilir
Stripe Terms ile uyumludur

3. RİSKLİ DAVRANIŞLARIN ÖDEME ENGELLİ

Fraud tespiti durumunda ödeme engellenir
Şüpheli işlemler askıya alınır

4. STRIPE TERMS İLE UYUMLULUK

Tüm ödemeler Stripe kurallarına tabidir
Kredi kartı bilgileri MyTrabzon tarafından saklanmaz

5. İLETİŞİM

📧 support@litxtech.com',
  'refund',
  10,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE policy_type = 'refund'
);

