-- MyTrabzon Özel Politikalar (Eşleşme, Halı Saha, KYC, vb.)

-- ============================================
-- EŞLEŞME + VİDEO GÖRÜŞME GÜVENLİK PROTOKOLÜ
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Eşleşme & Video Görüşme Güvenlik Protokolü',
  'EŞLEŞME & VİDEO GÖRÜŞME GÜVENLİK PROTOKOLÜ

Son Güncelleme: 2025

1. 18+ ŞARTI

Eşleşme ve video görüşme özellikleri sadece 18 yaş üstü kullanıcılar içindir.

KYC doğrulaması zorunludur.

2. TACİZ TESPİTİ

Yapay zekâ destekli taciz tespiti aktif
Uygunsuz davranışlar anında tespit edilir
Hızlı şikayet sistemi mevcuttur

3. KAYIT TUTULMAMASI

Video görüşmeler kayıt edilmez
Agora tarafından içerik saklanmaz
Gizlilik korunur

4. İHLAL DURUMU

Taciz, tehdit veya uygunsuz davranış tespit edildiğinde:
Anında hesap kapatılır
Yasal mercilere bildirilir

5. İLETİŞİM

📧 support@litxtech.com',
  'other',
  11,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Eşleşme%'
);

-- ============================================
-- HALI SAHA & ETKİNLİK GÜVENLİK UYARILARI
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Halı Saha & Etkinlik Güvenlik Uyarıları',
  'HALI SAHA & ETKİNLİK GÜVENLİK UYARILARI

Son Güncelleme: 2025

1. ETKİNLİKLER KULLANICI SORUMLULUĞUNDADIR

MyTrabzon, etkinliklerin güvenliğinden sorumlu değildir.

Etkinlikler kullanıcılar tarafından organize edilir.

2. TOPLU BULUŞMA GÜVENLİK KURALLARI

Güvenli buluşma noktaları tercih edin
Toplu buluşmalarda güvenlik önlemleri alın
Şüpheli durumlarda yetkili mercilere bildirin

3. GÜVENLİK UYARI MADDELERİ

Etkinlik sırasında uygunsuz davranış yasaktır
Dolandırıcılık veya sahte etkinlik oluşturma yasaktır
Güvenliğinizden siz sorumlusunuz

4. İLETİŞİM

📧 support@litxtech.com',
  'other',
  12,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Halı Saha%'
);

-- ============================================
-- ÖĞRENCİ MODU KYC POLİTİKASI
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Öğrenci Modu KYC Politikası',
  'ÖĞRENCİ MODU KYC POLİTİKASI

Son Güncelleme: 2025

1. ÜNİVERSİTE DOĞRULAMA

Üniversite modu için öğrenci belgesi gereklidir
Belgeler moderatörler tarafından incelenir
Sahte belge tespiti durumunda hesap kapatılır

2. BELGE DENETİMİ

Yüklenen belgeler güvenli şekilde saklanır
Doğrulama süreci 1-3 iş günü sürer
Reddedilen başvurular tekrar edilebilir

3. SAHTE BELGE TESPİTİ

Sahte belge kullanımı tespit edildiğinde:
Hesap kalıcı olarak kapatılır
Yasal mercilere bildirilebilir

4. KÖTÜYE KULLANIM YAPTIRIMLARI

Üniversite modunu kötüye kullanma yasaktır
İhlal durumunda erişim kısıtlanır

5. İLETİŞİM

📧 support@litxtech.com',
  'other',
  13,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Öğrenci%'
);

-- ============================================
-- KULLANICI DOĞRULAMA (ID/KYC) POLİTİKASI
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Kullanıcı Doğrulama (KYC) Politikası',
  'KULLANICI DOĞRULAMA (ID/KYC) POLİTİKASI

Son Güncelleme: 2025

1. KİMLİK DOĞRULAMA ZORUNLULUĞU

Eşleşme ve video görüşme özellikleri için KYC zorunludur
18+ yaş doğrulaması gereklidir

2. BELGE DOĞRULAMA SÜREÇLERİ

Kimlik belgeleri güvenli şekilde işlenir
Doğrulama 1-3 iş günü sürer
Belgeler doğrulama sonrası silinir

3. YAŞ DOĞRULAMA

18 yaş altı kullanıcılar riskli özelliklere erişemez
Yaş doğrulaması zorunludur

4. SAHTE KİMLİK YAPTIRIMI

Sahte kimlik kullanımı:
Kalıcı hesap kapatma
Yasal mercilere bildirim

5. İLETİŞİM

📧 support@litxtech.com',
  'other',
  14,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%KYC%' AND title LIKE '%Doğrulama%'
);

-- ============================================
-- ACİL DURUM & YETKİLİ MAKAM BİLDİRİM POLİTİKASI
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Acil Durum & Yetkili Makam Bildirim Politikası',
  'ACİL DURUM & YETKİLİ MAKAM BİLDİRİM POLİTİKASI

Son Güncelleme: 2025

1. TACİZ, TEHDİT, İSTİSMAR DURUMUNDA YASAL BİLDİRİM

Çocuk istismarı, şiddet, tehdit durumlarında:
IP kayıtları yetkili makamlara iletilebilir
Cihaz bilgileri paylaşılabilir
Mesaj kayıtları (yasal izin dahilinde) bildirilebilir

2. İLGİLİ KURUMLARA İŞBİRLİĞİ

MyTrabzon, yasal zorunluluklar gereği yetkili makamlarla işbirliği yapar.

3. LOG & IP KAYDI SAKLAMA SÜRELERİ

Güvenlik logları: 1 yıl
IP kayıtları: Yasal gereklilik süresince
Mesaj kayıtları: Yalnızca yasal izin dahilinde

4. İLETİŞİM

Acil durumlar için: support@litxtech.com',
  'other',
  15,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Acil Durum%'
);

-- ============================================
-- ŞİKAYET VE MODERASYON PROSEDÜRÜ
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Şikayet ve Moderasyon Prosedürü',
  'ŞİKAYET VE MODERASYON PROSEDÜRÜ

Son Güncelleme: 2025

1. İÇERİK KALDIRMA

Uygunsuz içerikler 24 saat içinde incelenir
Onaylanan şikayetlerde içerik anında kaldırılır

2. MODERASYON SÜRELERİ

İçerik inceleme: 24 saat
Hesap askıya alma: 7-30 gün
Kalıcı kapatma: Ciddi ihlallerde anında

3. KULLANICI ENGELLEME

Kullanıcılar birbirlerini engelleyebilir
Engellenen kullanıcılar birbirlerini göremez

4. HESAP KAPATMA ŞARTLARI

Ciddi ihlallerde hesap anında kapatılır
Tekrarlayan ihlallerde kalıcı kapatma uygulanır

5. İLETİŞİM

📧 support@litxtech.com',
  'other',
  16,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Şikayet%'
);

-- ============================================
-- FİKRİ MÜLKİYET HAKLARI BİLDİRİMİ
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Fikri Mülkiyet Hakları Bildirimi',
  'FİKRİ MÜLKİYET HAKLARI BİLDİRİMİ

Son Güncelleme: 2025

1. MARKALAR

MyTrabzon markası LitxTech LLC & LitxTech LTD''ye aittir.

2. KODLAR

Uygulama kodu telif hakkı koruması altındadır.

3. TASARIM

Tüm tasarım öğeleri korunmaktadır.

4. LOGO

MyTrabzon logosu telif hakkı koruması altındadır.

5. ALGORİTMALAR

Eşleşme algoritmaları ve öneri sistemleri korunmaktadır.

6. LAZGPT İÇERİKLERİ

LazGPT tarafından üretilen içerikler yapay zekâ ürünüdür.

7. İZİNSİZ KULLANIM

İzinsiz çoğaltma, dağıtma, kopyalama yasaktır.

8. İLETİŞİM

📧 support@litxtech.com',
  'other',
  17,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Fikri Mülkiyet%'
);

-- ============================================
-- KULLANICININ SORUMLULUKLARI METNİ
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Kullanıcının Sorumlulukları',
  'KULLANICININ SORUMLULUKLARI

Son Güncelleme: 2025

1. DOĞRU BİLGİ VERMEK

Hesap oluştururken doğru bilgi vermek zorunludur.

2. KURALLARA UYMAK

Topluluk kurallarına ve kullanım şartlarına uymak gereklidir.

3. ZARARLI DAVRANIŞLARDAN KAÇINMAK

Taciz, tehdit, dolandırıcılık gibi davranışlardan kaçınmak zorunludur.

4. BİLDİRİMLERDE BULUNMAK

Uygunsuz içerik veya davranış tespit edildiğinde bildirimde bulunmak önemlidir.

5. İLETİŞİM

📧 support@litxtech.com',
  'other',
  18,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Sorumluluk%'
);

-- ============================================
-- PLATFORM SINIRLARI VE SORUMLULUK REDDİ
-- ============================================
INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Platform Sınırları ve Sorumluluk Reddi',
  'PLATFORM SINIRLARI VE SORUMLULUK REDDİ (DISCLAIMER)

Son Güncelleme: 2025

1. MYTRABZON PROFESYONEL TAVSİYE VERMEZ

MyTrabzon, tıbbi, hukuki, finansal veya profesyonel tavsiye vermez.

2. AI YANILABİLİR

LazGPT yanıtları her zaman doğru olmayabilir.

3. EŞLEŞME SİSTEMİ KULLANICI SORUMLULUĞUNDADIR

Eşleşme özellikleri kullanıcı sorumluluğundadır.
MyTrabzon, eşleşmelerden kaynaklanan sorunlardan sorumlu değildir.

4. ETKİNLİKLERDE FİRMA SORUMLULUĞU YOKTUR

Etkinlikler kullanıcılar tarafından organize edilir.
MyTrabzon, etkinliklerden kaynaklanan sorunlardan sorumlu değildir.

5. HİZMET KESİNTİLERİ

Platform "olduğu gibi" sunulur ve kesintiler yaşanabilir.

6. İLETİŞİM

📧 support@litxtech.com',
  'other',
  19,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Sorumluluk Reddi%'
);

