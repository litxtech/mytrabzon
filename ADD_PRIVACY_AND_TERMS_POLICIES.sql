-- ============================================
-- MYTRABZON TÜM POLİTİKALAR
-- ============================================
-- Bu SQL dosyası tüm politikaları veritabanına ekler:
-- 1. Gizlilik Politikası (Privacy Policy)
-- 2. Hizmet Koşulları (Terms of Service)
-- 3. Kullanım Şartları (Terms of Use)
-- 4. Çocuk Güvenliği Politikası (Child Safety Policy)
-- 5. Topluluk Kuralları (Community Guidelines)
-- 6. Ödeme ve Bağış Politikası (Payment & Donation Policy)
-- ============================================

-- Önce mevcut politikaları kontrol et ve güncelle
DO $$ 
DECLARE
  privacy_policy_id UUID;
  terms_policy_id UUID;
BEGIN
  -- Gizlilik Politikası
  SELECT id INTO privacy_policy_id 
  FROM policies 
  WHERE policy_type = 'privacy' 
  AND title LIKE '%Gizlilik%' 
  LIMIT 1;

  IF privacy_policy_id IS NULL THEN
    INSERT INTO policies (
      title,
      content,
      policy_type,
      display_order,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      'MYTRABZON – GİZLİLİK POLİTİKASI',
      'Yürürlük Tarihi: 2025

Son Güncelleme: 2025

Sahibi: LITXTECH LLC (ABD) & LITXTECH LTD (Birleşik Krallık)

1. Giriş

MyTrabzon, kullanıcılarına sosyal medya, mesajlaşma, etkinlik, halı saha, üniversite modu, eşleşme ve LazGPT destekli yapay zekâ özellikleri sunan çok amaçlı bir platformdur. Bu Gizlilik Politikası; uygulamayı kullanırken hangi verileri topladığımızı, nasıl işlediğimizi, nasıl sakladığımızı ve kullanıcı haklarını açıklar.

MyTrabzon;

LITXTECH LLC (ABD)

LITXTECH LTD (Birleşik Krallık)

tarafından yönetilmektedir.

Uygulamayı kullanarak bu politikayı kabul etmiş olursunuz.

2. Toplanan Veriler

MyTrabzon aşağıdaki kategorilerde kişisel veri toplar:

2.1. Hesap Verileri

Ad / soyad

E-posta adresi

Profil fotoğrafı

Kullanıcı adı

Şifre (hash''lenmiş – geri çözülemez)

Doğrulama yöntemleri (Google, X/Twitter, Magic Link)

2.2. Kimlik Doğrulama (KYC)

18+ alanlar, eşleşme sistemi ve belirli güvenlik kontrolleri için:

TC kimlik doğrulaması veya pasaport belgesi (gerekirse)

Yüz doğrulama

Doğum tarihi

Bu veriler yalnızca doğrulama amacıyla kullanılır, saklanmaz veya paylaşılmaz.

2.3. Kullanıcı İçeriği

Fotoğraf, video, metin içerikleri

Paylaşılan etkinlikler ve yorumlar

Reels/kısa videolara eklenen müzik bilgisi

Gönderi lokasyonu (kullanıcı izin verirse)

2.4. Mesajlaşma

Mesaj içerikleri (uçtan uca şifreleme mantığı)

Medya dosyaları

Grup sohbetleri

MyTrabzon mesaj içeriklerini reklam amaçlı işlemez. Moderasyon yalnızca kullanıcı şikâyeti olduğunda sınırlı yapılır.

2.5. Cihaz ve Teknik Veriler

IP adresi

Cihaz modeli

İşletim sistemi

App sürümü

Çerezler / SDK verileri

Bildirim izinleri

2.6. Konum Verisi

Yaklaşık konum (saha rehberi, eşleşme, etkinlikler için)

Kesin konum (kullanıcı izin verdiği sürece)

2.7. Ödeme Verisi (Stripe)

MyTrabzon ödeme bilgilerini asla saklamaz.

Stripe tarafından işlenen:

Kart son 4 hane

Fatura bilgileri

İşlem ID

3. Verilerin Kullanım Amaçları

Toplanan veriler aşağıdaki amaçlarla işlenir:

3.1. Hizmetlerin Sunulması

Kullanıcı hesabı oluşturma

Mesajlaşma ve sosyal medya fonksiyonları

Halı saha ve etkinlik sistemi

Üniversite modu doğrulamaları

Eşleşme ve video görüşmeleri

LazGPT yapay zekâ yanıtları

3.2. Güvenlik

Spam önleme

Ban sistemi

Şikâyet yönetimi

Yaş doğrulama (18+)

Kötüye kullanım tespiti

Dolandırıcılık / sahte profil engelleme

3.3. Ödeme

Bağış ve destekçi paketleri

Stripe faturaları

Sahtekarlık koruması

3.4. Geliştirme

Hata raporları

Performans ölçümleri

Yapay zekâ model eğitimi için anonim veriler

3.5. Bildirimler

Mesaj, yorum, beğeni uyarıları

Etkinlik hatırlatmaları

Güvenlik bildirimleri

4. Verilerin Saklanması

Veriler Supabase üzerinde şifrelenmiş (AES-256) olarak saklanır.

RLS (Row Level Security) tüm kullanıcı verilerinde aktiftir.

Saklama süreleri:

Hesap verileri: Hesap silinene kadar

KYC verisi: Sadece doğrulama sürecinde, ardından otomatik imha

Log verileri: 90 gün

Ödeme verileri: Stripe tarafında

5. Verilerin Paylaşımı

MyTrabzon kullanıcı verilerini üçüncü taraflarla satmaz.

Paylaşım yalnızca aşağıdaki durumlarda yapılır:

5.1. Hizmet Sağlayıcılar

Stripe (ödeme)

Agora (sesli & görüntülü arama)

DeepSeek (LazGPT)

Supabase (veritabanı)

Bildirim servisleri (Expo Notifications)

5.2. Hukuki Yükümlülük

Mahkeme kararı, resmi talep veya kanuni zorunluluk halinde yalnızca gerekli veriler paylaşılır.

5.3. Güvenlik

Sahte hesap, dolandırıcılık, taciz gibi durumlarda moderasyon amacıyla sınırlı inceleme yapılabilir.

6. Çocukların Gizliliği

MyTrabzon 13 yaş altı kullanıcıları kabul etmez.

Üniversite modu için yaş doğrulaması zorunludur.

18+ eşleşme sistemi için ek doğrulama yapılır.

7. Kullanıcı Hakları

Kullanıcılar şu haklara sahiptir:

Veriye erişim

Veriyi düzeltme

Veriyi silme

Hesabı kapatma

İşlemeye itiraz

Veri taşınabilirliği

Çerez tercihlerini yönetme

Talep e-posta adresi: support@litxtech.com

8. Veri Güvenliği

AES-256 sunucu şifrelemesi

HTTPS / TLS 1.3

RLS (Row Level Security)

SQL trigger''lar

Güvenlik denetimleri

2FA (yakında)

Fraud detection (Stripe)

9. Uluslararası Veri Transferi

Veriler ABD, Birleşik Krallık ve Avrupa''daki sunucular arasında aktarılabilir.

Tüm aktarımlar GDPR Madde 46 kapsamında Standart Sözleşme Maddeleri (SCC) ile yapılır.

10. Çerezler ve SDK''lar

MyTrabzon; performans ve güvenlik amaçlı sınırlı SDK kullanır:

Expo

Stripe

Agora

DeepSeek

Supabase

Çerezler web sürümünde oturum yönetimi için kullanılır.

11. Politika Değişiklikleri

LITXTECH LLC ve LITXTECH LTD politikayı güncelleyebilir.

Önemli değişiklikler uygulama içi bildirim ile duyurulur.

12. İletişim

LITXTECH LLC – USA

15442 Ventura Blvd., STE 201-1834, Sherman Oaks, CA 91403

Telefon: +1 307 271 5151

E-posta: support@litxtech.com

LITXTECH LTD – United Kingdom

71–75 Shelton Street, Covent Garden, London, WC2H 9JQ

Şirket No: 16745093',
      'privacy',
      1,
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO privacy_policy_id;
  ELSE
    UPDATE policies 
    SET 
      content = 'Yürürlük Tarihi: 2025

Son Güncelleme: 2025

Sahibi: LITXTECH LLC (ABD) & LITXTECH LTD (Birleşik Krallık)

1. Giriş

MyTrabzon, kullanıcılarına sosyal medya, mesajlaşma, etkinlik, halı saha, üniversite modu, eşleşme ve LazGPT destekli yapay zekâ özellikleri sunan çok amaçlı bir platformdur. Bu Gizlilik Politikası; uygulamayı kullanırken hangi verileri topladığımızı, nasıl işlediğimizi, nasıl sakladığımızı ve kullanıcı haklarını açıklar.

MyTrabzon;

LITXTECH LLC (ABD)

LITXTECH LTD (Birleşik Krallık)

tarafından yönetilmektedir.

Uygulamayı kullanarak bu politikayı kabul etmiş olursunuz.

2. Toplanan Veriler

MyTrabzon aşağıdaki kategorilerde kişisel veri toplar:

2.1. Hesap Verileri

Ad / soyad

E-posta adresi

Profil fotoğrafı

Kullanıcı adı

Şifre (hash''lenmiş – geri çözülemez)

Doğrulama yöntemleri (Google, X/Twitter, Magic Link)

2.2. Kimlik Doğrulama (KYC)

18+ alanlar, eşleşme sistemi ve belirli güvenlik kontrolleri için:

TC kimlik doğrulaması veya pasaport belgesi (gerekirse)

Yüz doğrulama

Doğum tarihi

Bu veriler yalnızca doğrulama amacıyla kullanılır, saklanmaz veya paylaşılmaz.

2.3. Kullanıcı İçeriği

Fotoğraf, video, metin içerikleri

Paylaşılan etkinlikler ve yorumlar

Reels/kısa videolara eklenen müzik bilgisi

Gönderi lokasyonu (kullanıcı izin verirse)

2.4. Mesajlaşma

Mesaj içerikleri (uçtan uca şifreleme mantığı)

Medya dosyaları

Grup sohbetleri

MyTrabzon mesaj içeriklerini reklam amaçlı işlemez. Moderasyon yalnızca kullanıcı şikâyeti olduğunda sınırlı yapılır.

2.5. Cihaz ve Teknik Veriler

IP adresi

Cihaz modeli

İşletim sistemi

App sürümü

Çerezler / SDK verileri

Bildirim izinleri

2.6. Konum Verisi

Yaklaşık konum (saha rehberi, eşleşme, etkinlikler için)

Kesin konum (kullanıcı izin verdiği sürece)

2.7. Ödeme Verisi (Stripe)

MyTrabzon ödeme bilgilerini asla saklamaz.

Stripe tarafından işlenen:

Kart son 4 hane

Fatura bilgileri

İşlem ID

3. Verilerin Kullanım Amaçları

Toplanan veriler aşağıdaki amaçlarla işlenir:

3.1. Hizmetlerin Sunulması

Kullanıcı hesabı oluşturma

Mesajlaşma ve sosyal medya fonksiyonları

Halı saha ve etkinlik sistemi

Üniversite modu doğrulamaları

Eşleşme ve video görüşmeleri

LazGPT yapay zekâ yanıtları

3.2. Güvenlik

Spam önleme

Ban sistemi

Şikâyet yönetimi

Yaş doğrulama (18+)

Kötüye kullanım tespiti

Dolandırıcılık / sahte profil engelleme

3.3. Ödeme

Bağış ve destekçi paketleri

Stripe faturaları

Sahtekarlık koruması

3.4. Geliştirme

Hata raporları

Performans ölçümleri

Yapay zekâ model eğitimi için anonim veriler

3.5. Bildirimler

Mesaj, yorum, beğeni uyarıları

Etkinlik hatırlatmaları

Güvenlik bildirimleri

4. Verilerin Saklanması

Veriler Supabase üzerinde şifrelenmiş (AES-256) olarak saklanır.

RLS (Row Level Security) tüm kullanıcı verilerinde aktiftir.

Saklama süreleri:

Hesap verileri: Hesap silinene kadar

KYC verisi: Sadece doğrulama sürecinde, ardından otomatik imha

Log verileri: 90 gün

Ödeme verileri: Stripe tarafında

5. Verilerin Paylaşımı

MyTrabzon kullanıcı verilerini üçüncü taraflarla satmaz.

Paylaşım yalnızca aşağıdaki durumlarda yapılır:

5.1. Hizmet Sağlayıcılar

Stripe (ödeme)

Agora (sesli & görüntülü arama)

DeepSeek (LazGPT)

Supabase (veritabanı)

Bildirim servisleri (Expo Notifications)

5.2. Hukuki Yükümlülük

Mahkeme kararı, resmi talep veya kanuni zorunluluk halinde yalnızca gerekli veriler paylaşılır.

5.3. Güvenlik

Sahte hesap, dolandırıcılık, taciz gibi durumlarda moderasyon amacıyla sınırlı inceleme yapılabilir.

6. Çocukların Gizliliği

MyTrabzon 13 yaş altı kullanıcıları kabul etmez.

Üniversite modu için yaş doğrulaması zorunludur.

18+ eşleşme sistemi için ek doğrulama yapılır.

7. Kullanıcı Hakları

Kullanıcılar şu haklara sahiptir:

Veriye erişim

Veriyi düzeltme

Veriyi silme

Hesabı kapatma

İşlemeye itiraz

Veri taşınabilirliği

Çerez tercihlerini yönetme

Talep e-posta adresi: support@litxtech.com

8. Veri Güvenliği

AES-256 sunucu şifrelemesi

HTTPS / TLS 1.3

RLS (Row Level Security)

SQL trigger''lar

Güvenlik denetimleri

2FA (yakında)

Fraud detection (Stripe)

9. Uluslararası Veri Transferi

Veriler ABD, Birleşik Krallık ve Avrupa''daki sunucular arasında aktarılabilir.

Tüm aktarımlar GDPR Madde 46 kapsamında Standart Sözleşme Maddeleri (SCC) ile yapılır.

10. Çerezler ve SDK''lar

MyTrabzon; performans ve güvenlik amaçlı sınırlı SDK kullanır:

Expo

Stripe

Agora

DeepSeek

Supabase

Çerezler web sürümünde oturum yönetimi için kullanılır.

11. Politika Değişiklikleri

LITXTECH LLC ve LITXTECH LTD politikayı güncelleyebilir.

Önemli değişiklikler uygulama içi bildirim ile duyurulur.

12. İletişim

LITXTECH LLC – USA

15442 Ventura Blvd., STE 201-1834, Sherman Oaks, CA 91403

Telefon: +1 307 271 5151

E-posta: support@litxtech.com

LITXTECH LTD – United Kingdom

71–75 Shelton Street, Covent Garden, London, WC2H 9JQ

Şirket No: 16745093',
      updated_at = NOW()
    WHERE id = privacy_policy_id;
  END IF;

  -- Hizmet Koşulları
  SELECT id INTO terms_policy_id 
  FROM policies 
  WHERE policy_type = 'terms' 
  AND title LIKE '%Hizmet%' 
  LIMIT 1;

  IF terms_policy_id IS NULL THEN
    INSERT INTO policies (
      title,
      content,
      policy_type,
      display_order,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      'MYTRABZON – HİZMET KOŞULLARI (TERMS OF SERVICE)',
      'Yürürlük Tarihi: 2025

Son Güncelleme: 2025

Sahibi: LITXTECH LLC & LITXTECH LTD

1. Giriş

MyTrabzon; sosyal medya, mesajlaşma, etkinlik yönetimi, halı saha sistemi, üniversite modu, eşleşme sistemi ve LazGPT yapay zekâ özellikleri sunan çok amaçlı bir mobil ve web platformudur.

Bu Hizmet Koşulları ("Koşullar"), MyTrabzon''u kullanırken geçerli olan kuralları belirtir.

Uygulamaya giriş yaparak bu Koşulları kabul etmiş sayılırsınız.

Koşulları kabul etmiyorsanız MyTrabzon''u kullanamazsınız.

2. Hizmet Sağlayıcı

MyTrabzon aşağıdaki iki şirket tarafından işletilir:

LITXTECH LLC – USA (Ana Operasyon)

Adres: 15442 Ventura Blvd., STE 201-1834, Sherman Oaks, CA 91403

Telefon: +1 307 271 5151

E-posta: support@litxtech.com

LITXTECH LTD – United Kingdom (Avrupa Operasyonu)

Adres: 71–75 Shelton Street, Covent Garden, London WC2H 9JQ

Şirket No: 16745093

3. Hizmet İçeriği

MyTrabzon aşağıdaki ana hizmetleri sağlar:

Sosyal medya paylaşım sistemi (fotoğraf, video, reels, metin)

Mesajlaşma ve grup sohbetleri

Sesli ve görüntülü arama (Agora)

LazGPT AI asistanı (DeepSeek tabanlı)

Halı saha rehberi, maç oluşturma, takım yönetimi

Üniversite modu (KTÜ | Giresun) öğrenci doğrulama

Etkinlik yayınlama ve katılım

Eşleşme sistemi (video eşleşme, WebRTC görüşmeleri)

Destekçi/bağış sistemleri (Stripe)

Bildirimler

Admin paneli moderasyon sistemi

MyTrabzon sürekli gelişen bir yazılımdır; özellikler değişebilir, güncellenebilir veya kaldırılabilir.

4. Hesap Oluşturma ve Kullanıcı Yükümlülükleri

4.1 Hesap Zorunluluğu

MyTrabzon''u tam olarak kullanabilmek için bir hesap oluşturmanız gerekir.

Kayıt seçenekleri:

E-posta / şifre

Google

X (Twitter)

Magic Link

4.2 Kullanıcı Sorumlulukları

Kullanıcı şu hususları kabul eder:

Verdiği bilgilerin doğru ve güncel olduğunu

Şifresini koruma yükümlülüğü kendisinde olduğunu

Hesabının başkaları tarafından kullanılmasından sorumlu olduğunu

Uygulamayı yasa dışı amaçlarla kullanmayacağını

Bot / spam / sahte hesap oluşturmayacağını

4.3 Yaş Sınırı

Genel kullanım için 13+

Eşleşme sistemi ve video görüşmeler için 18+

Üniversite modu için öğrenci doğrulaması

5. Yasaklı Kullanım

MyTrabzon''da aşağıdaki eylemler kesinlikle yasaktır:

Taciz, tehdit, şantaj, zorbalık

Cinsel içerik paylaşımı (18+ alanlar hariç, orada da sıkı kurallar vardır)

Nefret söylemi

Şiddet / terör propagandası

Sahte profil, deepfake, başka birini taklit

Spam, reklam, dolandırıcılık

Kötü amaçlı yazılım, exploit veya hack girişimi

Hesap satma / kiralama

Eşleşme sistemini uygunsuz amaçlarla kullanmak

Üniversite doğrulamasını kötüye kullanmak

Bu ihlallerde hesap geçici veya kalıcı olarak kapatılabilir.

6. Kullanıcı İçeriği

6.1 İçerik Sahipliği

Paylaşmış olduğunuz fotoğraf, video, metin ve diğer içerikler size aittir.

MyTrabzon içeriklerinizin sahibi değildir.

6.2 MyTrabzon''un İçerik Kullanım Hakkı

Uygulamalarda görüntülenmesi için bize şu hakları vermiş olursunuz:

İçeriğin uygulamada gösterilmesi

Sunucularda saklanması

Gerektiğinde optimize edilmesi

Bu hak dünya çapında, telifsiz, devredilemez ve sınırlı bir ruhsattır.

MyTrabzon içeriklerinizi reklam için kullanmaz.

6.3 Moderasyon

Şikâyet gelmesi

Topluluk kurallarının ihlali

Telif şikâyeti

durumlarında içerik kaldırılabilir.

7. Ödeme ve Bağışlar

Ödemeler Stripe altyapısı ile yapılır.

Kullanıcı:

Destekçi paketleri, bağışlar, premium özellikler için ödeme yapabilir

Stripe''ın kullanım koşullarını ayrıca kabul eder

MyTrabzon''un kart verilerini asla saklamadığını bilir

Stripe tarafından reddedilen ödemelerden MyTrabzon sorumlu değildir.

8. Eşleşme ve Video Görüşme Sistemi

Eşleşme sistemi 18+ kullanıcılar içindir.

Kullanıcı şu hususları kabul eder:

Görüşme sırasında davranışlarından kendisi sorumludur

Uygunsuz davranış hesap kapatmaya yol açar

Görüntü kaydı almak yasaktır

Karşı tarafın mahremiyetine uymak zorundadır

MyTrabzon görüşmeleri kaydetmez

9. LazGPT (AI) Kullanımı

LazGPT; sohbet, öneri, mizah ve kültürel içerikler sunar.

Kullanıcı şunları kabul eder:

AI çıktıları otomatik üretilir

Her zaman %100 doğruluk garantisi yoktur

AI hukuki, tıbbi, finansal tavsiye yerine geçmez

Veriler anonimleştirilmiş şekilde işlenebilir

AI kullanımına ilişkin ayrı "AI Kullanım Politikası" ayrıca yayınlanacaktır.

10. Bildirimler

Push bildirimler şu amaçlarla gönderilir:

Mesaj

Yorum / beğeni

Etkinlik hatırlatmaları

Güvenlik duyuruları

Kullanıcı cihaz ayarlarından bildirimleri yönetebilir.

11. Hesabın Kapatılması

LITXTECH, aşağıdaki durumlarda hesabı kapatma hakkını saklı tutar:

Topluluk kurallarının ihlali

Cinsel taciz veya istismar

Dolandırıcılık / spam

Güvenlik riski

Yasa dışı faaliyetler

Kullanıcı istediği zaman hesabını tamamen silebilir.

Silme işlemi sonrası veriler kalıcı olarak kaldırılır.

12. Sorumluluk Reddi

MyTrabzon:

Kullanıcı içeriklerinden sorumlu değildir

Tanışma, eşleşme, etkinlik, halı saha gibi kullanıcı etkileşimlerinden sorumlu tutulamaz

Gerçek hayattaki buluşmaların güvenliğinden sorumlu değildir

Ağ, bağlantı ve cihaz sorunlarından sorumlu değildir

AI çıktılarındaki hatalardan sorumlu değildir

MyTrabzon "olduğu gibi" sunulur.

13. Garanti Vermeme

MyTrabzon kesintisiz, hatasız veya her cihazda mükemmel çalışacağına dair garanti vermez.

Geliştirme süreçleri devam ettiği için hizmet zaman zaman güncellenebilir veya geçici olarak kesilebilir.

14. Sorumluluğun Sınırlandırılması

MyTrabzon hiçbir şekilde:

Kâr kaybı

Veri kaybı

Dolaylı zararlar

Kullanıcılar arası anlaşmazlıklar

nedeniyle sorumlu tutulamaz.

15. Politika Değişiklikleri

Bu Koşullar gerektiğinde güncellenebilir.

Önemli değişiklikler uygulama içinde duyurulur.

16. Uygulanacak Hukuk

ABD kullanıcıları için California Eyalet Hukuku

AB kullanıcıları için GDPR ve İngiltere Yasaları

Türkiye kullanıcıları için Türk hukuku & KVKK geçerlidir

Uyuşmazlık durumunda şirket merkezlerinin bulunduğu mahkemeler yetkilidir.

17. İletişim

Sorular için:

📧 support@litxtech.com

☎️ +1 307 271 5151',
      'terms',
      2,
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO terms_policy_id;
  ELSE
    UPDATE policies 
    SET 
      content = 'Yürürlük Tarihi: 2025

Son Güncelleme: 2025

Sahibi: LITXTECH LLC & LITXTECH LTD

1. Giriş

MyTrabzon; sosyal medya, mesajlaşma, etkinlik yönetimi, halı saha sistemi, üniversite modu, eşleşme sistemi ve LazGPT yapay zekâ özellikleri sunan çok amaçlı bir mobil ve web platformudur.

Bu Hizmet Koşulları ("Koşullar"), MyTrabzon''u kullanırken geçerli olan kuralları belirtir.

Uygulamaya giriş yaparak bu Koşulları kabul etmiş sayılırsınız.

Koşulları kabul etmiyorsanız MyTrabzon''u kullanamazsınız.

2. Hizmet Sağlayıcı

MyTrabzon aşağıdaki iki şirket tarafından işletilir:

LITXTECH LLC – USA (Ana Operasyon)

Adres: 15442 Ventura Blvd., STE 201-1834, Sherman Oaks, CA 91403

Telefon: +1 307 271 5151

E-posta: support@litxtech.com

LITXTECH LTD – United Kingdom (Avrupa Operasyonu)

Adres: 71–75 Shelton Street, Covent Garden, London WC2H 9JQ

Şirket No: 16745093

3. Hizmet İçeriği

MyTrabzon aşağıdaki ana hizmetleri sağlar:

Sosyal medya paylaşım sistemi (fotoğraf, video, reels, metin)

Mesajlaşma ve grup sohbetleri

Sesli ve görüntülü arama (Agora)

LazGPT AI asistanı (DeepSeek tabanlı)

Halı saha rehberi, maç oluşturma, takım yönetimi

Üniversite modu (KTÜ | Giresun) öğrenci doğrulama

Etkinlik yayınlama ve katılım

Eşleşme sistemi (video eşleşme, WebRTC görüşmeleri)

Destekçi/bağış sistemleri (Stripe)

Bildirimler

Admin paneli moderasyon sistemi

MyTrabzon sürekli gelişen bir yazılımdır; özellikler değişebilir, güncellenebilir veya kaldırılabilir.

4. Hesap Oluşturma ve Kullanıcı Yükümlülükleri

4.1 Hesap Zorunluluğu

MyTrabzon''u tam olarak kullanabilmek için bir hesap oluşturmanız gerekir.

Kayıt seçenekleri:

E-posta / şifre

Google

X (Twitter)

Magic Link

4.2 Kullanıcı Sorumlulukları

Kullanıcı şu hususları kabul eder:

Verdiği bilgilerin doğru ve güncel olduğunu

Şifresini koruma yükümlülüğü kendisinde olduğunu

Hesabının başkaları tarafından kullanılmasından sorumlu olduğunu

Uygulamayı yasa dışı amaçlarla kullanmayacağını

Bot / spam / sahte hesap oluşturmayacağını

4.3 Yaş Sınırı

Genel kullanım için 13+

Eşleşme sistemi ve video görüşmeler için 18+

Üniversite modu için öğrenci doğrulaması

5. Yasaklı Kullanım

MyTrabzon''da aşağıdaki eylemler kesinlikle yasaktır:

Taciz, tehdit, şantaj, zorbalık

Cinsel içerik paylaşımı (18+ alanlar hariç, orada da sıkı kurallar vardır)

Nefret söylemi

Şiddet / terör propagandası

Sahte profil, deepfake, başka birini taklit

Spam, reklam, dolandırıcılık

Kötü amaçlı yazılım, exploit veya hack girişimi

Hesap satma / kiralama

Eşleşme sistemini uygunsuz amaçlarla kullanmak

Üniversite doğrulamasını kötüye kullanmak

Bu ihlallerde hesap geçici veya kalıcı olarak kapatılabilir.

6. Kullanıcı İçeriği

6.1 İçerik Sahipliği

Paylaşmış olduğunuz fotoğraf, video, metin ve diğer içerikler size aittir.

MyTrabzon içeriklerinizin sahibi değildir.

6.2 MyTrabzon''un İçerik Kullanım Hakkı

Uygulamalarda görüntülenmesi için bize şu hakları vermiş olursunuz:

İçeriğin uygulamada gösterilmesi

Sunucularda saklanması

Gerektiğinde optimize edilmesi

Bu hak dünya çapında, telifsiz, devredilemez ve sınırlı bir ruhsattır.

MyTrabzon içeriklerinizi reklam için kullanmaz.

6.3 Moderasyon

Şikâyet gelmesi

Topluluk kurallarının ihlali

Telif şikâyeti

durumlarında içerik kaldırılabilir.

7. Ödeme ve Bağışlar

Ödemeler Stripe altyapısı ile yapılır.

Kullanıcı:

Destekçi paketleri, bağışlar, premium özellikler için ödeme yapabilir

Stripe''ın kullanım koşullarını ayrıca kabul eder

MyTrabzon''un kart verilerini asla saklamadığını bilir

Stripe tarafından reddedilen ödemelerden MyTrabzon sorumlu değildir.

8. Eşleşme ve Video Görüşme Sistemi

Eşleşme sistemi 18+ kullanıcılar içindir.

Kullanıcı şu hususları kabul eder:

Görüşme sırasında davranışlarından kendisi sorumludur

Uygunsuz davranış hesap kapatmaya yol açar

Görüntü kaydı almak yasaktır

Karşı tarafın mahremiyetine uymak zorundadır

MyTrabzon görüşmeleri kaydetmez

9. LazGPT (AI) Kullanımı

LazGPT; sohbet, öneri, mizah ve kültürel içerikler sunar.

Kullanıcı şunları kabul eder:

AI çıktıları otomatik üretilir

Her zaman %100 doğruluk garantisi yoktur

AI hukuki, tıbbi, finansal tavsiye yerine geçmez

Veriler anonimleştirilmiş şekilde işlenebilir

AI kullanımına ilişkin ayrı "AI Kullanım Politikası" ayrıca yayınlanacaktır.

10. Bildirimler

Push bildirimler şu amaçlarla gönderilir:

Mesaj

Yorum / beğeni

Etkinlik hatırlatmaları

Güvenlik duyuruları

Kullanıcı cihaz ayarlarından bildirimleri yönetebilir.

11. Hesabın Kapatılması

LITXTECH, aşağıdaki durumlarda hesabı kapatma hakkını saklı tutar:

Topluluk kurallarının ihlali

Cinsel taciz veya istismar

Dolandırıcılık / spam

Güvenlik riski

Yasa dışı faaliyetler

Kullanıcı istediği zaman hesabını tamamen silebilir.

Silme işlemi sonrası veriler kalıcı olarak kaldırılır.

12. Sorumluluk Reddi

MyTrabzon:

Kullanıcı içeriklerinden sorumlu değildir

Tanışma, eşleşme, etkinlik, halı saha gibi kullanıcı etkileşimlerinden sorumlu tutulamaz

Gerçek hayattaki buluşmaların güvenliğinden sorumlu değildir

Ağ, bağlantı ve cihaz sorunlarından sorumlu değildir

AI çıktılarındaki hatalardan sorumlu değildir

MyTrabzon "olduğu gibi" sunulur.

13. Garanti Vermeme

MyTrabzon kesintisiz, hatasız veya her cihazda mükemmel çalışacağına dair garanti vermez.

Geliştirme süreçleri devam ettiği için hizmet zaman zaman güncellenebilir veya geçici olarak kesilebilir.

14. Sorumluluğun Sınırlandırılması

MyTrabzon hiçbir şekilde:

Kâr kaybı

Veri kaybı

Dolaylı zararlar

Kullanıcılar arası anlaşmazlıklar

nedeniyle sorumlu tutulamaz.

15. Politika Değişiklikleri

Bu Koşullar gerektiğinde güncellenebilir.

Önemli değişiklikler uygulama içinde duyurulur.

16. Uygulanacak Hukuk

ABD kullanıcıları için California Eyalet Hukuku

AB kullanıcıları için GDPR ve İngiltere Yasaları

Türkiye kullanıcıları için Türk hukuku & KVKK geçerlidir

Uyuşmazlık durumunda şirket merkezlerinin bulunduğu mahkemeler yetkilidir.

17. İletişim

Sorular için:

📧 support@litxtech.com

☎️ +1 307 271 5151',
      updated_at = NOW()
    WHERE id = terms_policy_id;
  END IF;
END $$;

-- ============================================
-- ÖNCE: POLICY_TYPE CONSTRAINT'İNİ GÜNCELLE
-- ============================================
DO $$ 
BEGIN
  -- Eğer constraint varsa kaldır
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'policies_policy_type_check'
  ) THEN
    ALTER TABLE policies DROP CONSTRAINT policies_policy_type_check;
  END IF;
END $$;

-- Yeni constraint ekle (tüm politika tipleri ile)
ALTER TABLE policies 
ADD CONSTRAINT policies_policy_type_check 
CHECK (policy_type IN (
  'terms', 'privacy', 'community', 'cookie', 'refund', 
  'child_safety', 'payment', 'moderation', 'data_storage', 
  'eula', 'university', 'event', 'other'
));

-- ============================================
-- 11. ETKİNLİK & HALI SAHA POLİTİKASI
-- ============================================
DO $$ 
DECLARE
  event_policy_id UUID;
BEGIN
  -- Etkinlik & Halı Saha Politikası var mı kontrol et
  SELECT id INTO event_policy_id
  FROM policies
  WHERE policy_type = 'event'
  LIMIT 1;

  IF event_policy_id IS NULL THEN
    -- Yeni politika oluştur
    INSERT INTO policies (title, content, policy_type, display_order, is_active, created_at, updated_at)
    VALUES (
      'MYTRABZON – ETKİNLİK & HALI SAHA POLİTİKASI',
      '🎉 MYTRABZON – ETKİNLİK & HALI SAHA POLİTİKASI



Yürürlük Tarihi: 2025

Sahibi: LITXTECH LLC & LITXTECH LTD**



1. Amaç



Bu politika; MyTrabzon''un "Etkinlik", "Halı Saha", "Maç Oluşturma", "Takım Yönetimi" ve "Eksik Oyuncu" özelliklerinde düzen sağlamak, sahte organizasyonları önlemek ve tüm kullanıcıların güvenliğini korumak için hazırlanmıştır.



Bu alanlar topluluk kurallarına ek olarak ekstra dikkat isteyen bölümlerdir.



🟦 2. Kapsam



Aşağıdaki tüm alanlar bu politikaya tabidir:



Etkinlik yayınlama



Etkinliğe katılım



Halı saha listeleme



Maç oluşturma



Maç katılımı



Takım yönetimi



Eksik oyuncu ilanları



Ücretli etkinlik/maç organizasyonları



Üniversite kulüp etkinlikleri



🟩 3. Etkinlik Oluşturma Kuralları



Etkinlik oluşturan kullanıcı aşağıdaki kurallara uymayı kabul eder:



✔️ 1) Etkinlik açıklaması doğru olmalıdır.



Yanlış bilgi, yanlış saat veya yanlış konum yasaktır.



✔️ 2) Sahte etkinlik oluşturmak kesin yasaktır.



"Sözde etkinlik" → kalıcı ban.



✔️ 3) Etkinlik ücretliyse açıkça belirtilmelidir.



Fiyat



Dahil olan şeyler



Organizasyon sahibi



Transparan olmayan etkinlik → ban sebebi.



✔️ 4) Etkinlik içeriği topluluk kurallarına uygun olmalıdır.



Cinsel içerik yok



Saldırgan/siyasi içerik yok



Tehlikeli davranış yok



✔️ 5) Katılımcıların güvenliğini tehlikeye atamaz.



Kavgaya, hesaplaşmaya, tehlikeye teşvik eden organizasyonlar yasaktır.



🟥 4. Yasaklı Etkinlik Türleri



Aşağıdaki etkinlikler MyTrabzon''da kesinlikle yasaktır:



Para toplama amaçlı sahte etkinlik



Kumar / bahis içerikli etkinlik



Reşit olmayanları hedefleyen uygunsuz etkinlik



Siyasi propaganda veya kalabalık provoke etme amaçlı etkinlik



Şiddet çağrısı içeren toplantılar



İzinsiz bilet/vize satışı



Topluluk huzurunu bozan kışkırtıcı etkinlikler



Tespitinde → derhal kalıcı ban.



🟦 5. Halı Saha & Maç Sistemi Kuralları



MyTrabzon''un halı saha sistemi hem bireysel hem takım organizasyonları içerir.



✔️ 1) Maç bilgileri doğru girilmelidir.



Saat, konum, ücret, oyuncu sayısı net olmalıdır.



✔️ 2) "Eksik oyuncu" ilanı ciddi olmalıdır.



Gerçek maç amacı olmalı



Fake ilan yasaktır



"Troll ilan" → ban



✔️ 3) Para toplama varsa açıklanmalıdır.



Kişi başı ücret belirtilmelidir.



✔️ 4) Sahte saha bilgisi vermek yasaktır.



Gerçek olmayan saha → kalıcı ban.



✔️ 5) Kişileri yanlış yönlendirmek yasaktır.



"10 kişi geleceğiz sonra vazgeçtik" gibi toplu troll davranışlar → 7 gün ban.



🟥 6. Halı Saha Alanında Yasaklı Davranışlar



Aşağıdakiler kesin yasaktır:



Küfür / hakaret içeren takım ilanları



Rakip takıma hakaret



Kasti troll amaçlı takım kurma



Para tuzağı organizasyonları



Sahte "geliyoruz" deyip insanlarla dalga geçme



İnsanları bilinçli mağdur bırakma



Dolandırıcılık amaçlı para toplama



Ağır ihlaller → kalıcı ban.



🟧 7. Güvenlik Tavsiyeleri (Kullanıcı İçin)



Bu bölüm tamamen kullanıcıyı bilgilendirmek içindir:



Etkinliğe katılmadan önce açıklamayı dikkatlice okuyun.



Ücretli etkinliklerde güvenilir kişileri tercih edin.



Halı sahaya tek başınıza gitmeyin.



Kişisel bilgilerinizi paylaşmayın.



Tartışma veya kavga durumlarında uygulama dışı çözüm yerine güvenlik birimleriyle iletişime geçin.



MyTrabzon fiziksel buluşmalardaki olaylardan sorumlu tutulamaz (yasal zorunluluk).



🟦 8. Etkinlik Katılımcıları İçin Kurallar



Katılımcılar:



Etkinliğe zamanında gelmelidir



Etkinliği sabote edemez



Diğer katılımcıları rahatsız edemez



Para toplama varsa saygılı şekilde yapılmalıdır



Etkinlikte kavga çıkaramaz



Sorunlu kullanıcı → şikâyet edilip banlanabilir.



🟫 9. Belediyeler / Kulüpler / Topluluklar İçin Kurallar



Bu alanı TRT gibi resmi kurumlar bile rahat okuyacak seviyede tuttum:



Resmi olmayan duyurular yasaktır



Etkinlik bilgilerinin doğruluğu zorunludur



Ücretli etkinliklerde şeffaflık zorunludur



Siyasi propaganda yasaktır



Öğrenci kulüpleri yalnızca kendi topluluklarına özel duyuru yapabilir



Etkinliklerde ticari ürün satışı belirtilmelidir



🟥 10. Dolandırıcılık & Sahte Organizasyon Tespiti



Aşağıdaki durumlarda hesap doğrudan kaldırılır:



Kişi başı para toplayıp etkinlik yapmamak



Saha rezervasyonu olduğunu söyleyip olmayan saha paylaşmak



Öğrencileri sahte etkinliğe çağırmak



Para toplama bahanesiyle kullanıcıları kandırmak



Grup halinde troll amaçlı etkinlik oluşturmak



Gerekirse kullanıcı bilgileri yetkililere iletilir.



🟧 11. Şikâyet Süreci



Etkinlik & Halı Saha bölümü için şikâyetler hızlı işlenir.



Kullanıcı "Rapor Et" ile şikâyet oluşturur



Moderatör 0–24 saat içinde bakar



Gerekirse ek kanıt istenir



Hafif ihlaller → 24 saat – 7 gün ban



Ağır ihlaller → kalıcı ban



Şikâyet eden kişinin kimliği gizlidir.



🟦 12. Sorumluluk Reddi



MyTrabzon:



Fiziksel etkinliklerde yaşanan kazalardan



Kavga, yaralanma, kişisel anlaşmazlıklardan



Para anlaşmazlıklarından



Takımlar arası çatışmalardan



Sahaların işletme politikalarından



sorumlu tutulamaz.



MyTrabzon sadece dijital organizasyonu sağlar.



🟩 13. İletişim



Etkinlik, halı saha, maç ve organizasyon ihlalleri için:

📧 support@litxtech.com



☎️ +1 307 271 5151',
      'event',
      11,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO event_policy_id;
  ELSE
    -- Mevcut politikayı güncelle
    UPDATE policies
    SET 
      title = 'MYTRABZON – ETKİNLİK & HALI SAHA POLİTİKASI',
      content = '🎉 MYTRABZON – ETKİNLİK & HALI SAHA POLİTİKASI



Yürürlük Tarihi: 2025

Sahibi: LITXTECH LLC & LITXTECH LTD**



1. Amaç



Bu politika; MyTrabzon''un "Etkinlik", "Halı Saha", "Maç Oluşturma", "Takım Yönetimi" ve "Eksik Oyuncu" özelliklerinde düzen sağlamak, sahte organizasyonları önlemek ve tüm kullanıcıların güvenliğini korumak için hazırlanmıştır.



Bu alanlar topluluk kurallarına ek olarak ekstra dikkat isteyen bölümlerdir.



🟦 2. Kapsam



Aşağıdaki tüm alanlar bu politikaya tabidir:



Etkinlik yayınlama



Etkinliğe katılım



Halı saha listeleme



Maç oluşturma



Maç katılımı



Takım yönetimi



Eksik oyuncu ilanları



Ücretli etkinlik/maç organizasyonları



Üniversite kulüp etkinlikleri



🟩 3. Etkinlik Oluşturma Kuralları



Etkinlik oluşturan kullanıcı aşağıdaki kurallara uymayı kabul eder:



✔️ 1) Etkinlik açıklaması doğru olmalıdır.



Yanlış bilgi, yanlış saat veya yanlış konum yasaktır.



✔️ 2) Sahte etkinlik oluşturmak kesin yasaktır.



"Sözde etkinlik" → kalıcı ban.



✔️ 3) Etkinlik ücretliyse açıkça belirtilmelidir.



Fiyat



Dahil olan şeyler



Organizasyon sahibi



Transparan olmayan etkinlik → ban sebebi.



✔️ 4) Etkinlik içeriği topluluk kurallarına uygun olmalıdır.



Cinsel içerik yok



Saldırgan/siyasi içerik yok



Tehlikeli davranış yok



✔️ 5) Katılımcıların güvenliğini tehlikeye atamaz.



Kavgaya, hesaplaşmaya, tehlikeye teşvik eden organizasyonlar yasaktır.



🟥 4. Yasaklı Etkinlik Türleri



Aşağıdaki etkinlikler MyTrabzon''da kesinlikle yasaktır:



Para toplama amaçlı sahte etkinlik



Kumar / bahis içerikli etkinlik



Reşit olmayanları hedefleyen uygunsuz etkinlik



Siyasi propaganda veya kalabalık provoke etme amaçlı etkinlik



Şiddet çağrısı içeren toplantılar



İzinsiz bilet/vize satışı



Topluluk huzurunu bozan kışkırtıcı etkinlikler



Tespitinde → derhal kalıcı ban.



🟦 5. Halı Saha & Maç Sistemi Kuralları



MyTrabzon''un halı saha sistemi hem bireysel hem takım organizasyonları içerir.



✔️ 1) Maç bilgileri doğru girilmelidir.



Saat, konum, ücret, oyuncu sayısı net olmalıdır.



✔️ 2) "Eksik oyuncu" ilanı ciddi olmalıdır.



Gerçek maç amacı olmalı



Fake ilan yasaktır



"Troll ilan" → ban



✔️ 3) Para toplama varsa açıklanmalıdır.



Kişi başı ücret belirtilmelidir.



✔️ 4) Sahte saha bilgisi vermek yasaktır.



Gerçek olmayan saha → kalıcı ban.



✔️ 5) Kişileri yanlış yönlendirmek yasaktır.



"10 kişi geleceğiz sonra vazgeçtik" gibi toplu troll davranışlar → 7 gün ban.



🟥 6. Halı Saha Alanında Yasaklı Davranışlar



Aşağıdakiler kesin yasaktır:



Küfür / hakaret içeren takım ilanları



Rakip takıma hakaret



Kasti troll amaçlı takım kurma



Para tuzağı organizasyonları



Sahte "geliyoruz" deyip insanlarla dalga geçme



İnsanları bilinçli mağdur bırakma



Dolandırıcılık amaçlı para toplama



Ağır ihlaller → kalıcı ban.



🟧 7. Güvenlik Tavsiyeleri (Kullanıcı İçin)



Bu bölüm tamamen kullanıcıyı bilgilendirmek içindir:



Etkinliğe katılmadan önce açıklamayı dikkatlice okuyun.



Ücretli etkinliklerde güvenilir kişileri tercih edin.



Halı sahaya tek başınıza gitmeyin.



Kişisel bilgilerinizi paylaşmayın.



Tartışma veya kavga durumlarında uygulama dışı çözüm yerine güvenlik birimleriyle iletişime geçin.



MyTrabzon fiziksel buluşmalardaki olaylardan sorumlu tutulamaz (yasal zorunluluk).



🟦 8. Etkinlik Katılımcıları İçin Kurallar



Katılımcılar:



Etkinliğe zamanında gelmelidir



Etkinliği sabote edemez



Diğer katılımcıları rahatsız edemez



Para toplama varsa saygılı şekilde yapılmalıdır



Etkinlikte kavga çıkaramaz



Sorunlu kullanıcı → şikâyet edilip banlanabilir.



🟫 9. Belediyeler / Kulüpler / Topluluklar İçin Kurallar



Bu alanı TRT gibi resmi kurumlar bile rahat okuyacak seviyede tuttum:



Resmi olmayan duyurular yasaktır



Etkinlik bilgilerinin doğruluğu zorunludur



Ücretli etkinliklerde şeffaflık zorunludur



Siyasi propaganda yasaktır



Öğrenci kulüpleri yalnızca kendi topluluklarına özel duyuru yapabilir



Etkinliklerde ticari ürün satışı belirtilmelidir



🟥 10. Dolandırıcılık & Sahte Organizasyon Tespiti



Aşağıdaki durumlarda hesap doğrudan kaldırılır:



Kişi başı para toplayıp etkinlik yapmamak



Saha rezervasyonu olduğunu söyleyip olmayan saha paylaşmak



Öğrencileri sahte etkinliğe çağırmak



Para toplama bahanesiyle kullanıcıları kandırmak



Grup halinde troll amaçlı etkinlik oluşturmak



Gerekirse kullanıcı bilgileri yetkililere iletilir.



🟧 11. Şikâyet Süreci



Etkinlik & Halı Saha bölümü için şikâyetler hızlı işlenir.



Kullanıcı "Rapor Et" ile şikâyet oluşturur



Moderatör 0–24 saat içinde bakar



Gerekirse ek kanıt istenir



Hafif ihlaller → 24 saat – 7 gün ban



Ağır ihlaller → kalıcı ban



Şikâyet eden kişinin kimliği gizlidir.



🟦 12. Sorumluluk Reddi



MyTrabzon:



Fiziksel etkinliklerde yaşanan kazalardan



Kavga, yaralanma, kişisel anlaşmazlıklardan



Para anlaşmazlıklarından



Takımlar arası çatışmalardan



Sahaların işletme politikalarından



sorumlu tutulamaz.



MyTrabzon sadece dijital organizasyonu sağlar.



🟩 13. İletişim



Etkinlik, halı saha, maç ve organizasyon ihlalleri için:

📧 support@litxtech.com



☎️ +1 307 271 5151',
      updated_at = NOW()
    WHERE id = event_policy_id;
  END IF;
END $$;

-- ============================================
-- TAMAMLANDI
-- ============================================

