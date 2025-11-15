-- MyTrabzon KVKK + GDPR + Data Processing Addendum Ekleme/Güncelleme
-- AB kullanıcıları ve Türkiye için zorunlu

UPDATE policies
SET 
  title = 'KVKK + GDPR + Veri İşleme Sözleşmesi',
  content = 'KVKK + GDPR + VERİ İŞLEME SÖZLEŞMESİ (DATA PROCESSING ADDENDUM)

Son Güncelleme: 2025

1. VERİ SORUMLUSU

LitxTech LLC
15442 Ventura Blvd., Ste 201-1834, Sherman Oaks, CA 91403, United States

LitxTech LTD
71–75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom

2. VERİ İŞLEYENLER

Supabase (backend hizmetleri)
Stripe (ödeme işleme)
Agora (video/ses arama)
DeepSeek AI (LazGPT)
Expo Notifications (push bildirimleri)

3. VERİ SAKLAMA & İMHA POLİTİKASI

Profil verileri: Hesap aktif olduğu sürece
Mesajlar: Hesap silinene kadar
Ödeme kayıtları: Yasal gereklilik süresince (7 yıl)
Log kayıtları: 1 yıl
Hesap silme sonrası: 30 gün içinde kalıcı silme

4. EBEVEYN TALEPLERİ

18 yaş altı kullanıcılar için ebeveyn talepleri:
Veri silme
Hesap kapatma
İçerik kaldırma

İletişim: support@litxtech.com

5. ULUSLARARASI VERİ AKTARIMI

ABD → UK → TR veri aktarımı:
GDPR uyumlu transfer mekanizmaları kullanılır
Standard Contractual Clauses (SCC) uygulanır
Adequate safeguards sağlanır

6. KULLANICI HAKLARI (GDPR)

Erişim hakkı
Düzeltme hakkı
Silme hakkı
İtiraz hakkı
Veri taşınabilirliği hakkı

7. KULLANICI HAKLARI (KVKK)

Kişisel verilerin işlenip işlenmediğini öğrenme
İşlenen veriler hakkında bilgi talep etme
İşlenme amacını öğrenme
Yurt içi/yurt dışı aktarım bilgisi
Düzeltme talep etme
Silme talep etme
İtiraz etme

8. VERİ GÜVENLİĞİ

SSL/TLS şifreleme
RLS (Row Level Security) politikaları
Düzenli güvenlik denetimleri
Veri şifreleme

9. VERİ İHLALİ BİLDİRİMİ

Veri ihlali durumunda:
72 saat içinde yetkili mercilere bildirim
Etkilenen kullanıcılara bildirim

10. İLETİŞİM

Veri koruma soruları için:
📧 support@litxtech.com
📞 +1 307 271 5151',
  policy_type = 'other',
  display_order = 20,
  is_active = true,
  updated_at = NOW()
WHERE title LIKE '%KVKK%' OR title LIKE '%GDPR%';

INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'KVKK + GDPR + Veri İşleme Sözleşmesi',
  'KVKK + GDPR + VERİ İŞLEME SÖZLEŞMESİ (DATA PROCESSING ADDENDUM)

Son Güncelleme: 2025

1. VERİ SORUMLUSU

LitxTech LLC
15442 Ventura Blvd., Ste 201-1834, Sherman Oaks, CA 91403, United States

LitxTech LTD
71–75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom

2. VERİ İŞLEYENLER

Supabase (backend hizmetleri)
Stripe (ödeme işleme)
Agora (video/ses arama)
DeepSeek AI (LazGPT)
Expo Notifications (push bildirimleri)

3. VERİ SAKLAMA & İMHA POLİTİKASI

Profil verileri: Hesap aktif olduğu sürece
Mesajlar: Hesap silinene kadar
Ödeme kayıtları: Yasal gereklilik süresince (7 yıl)
Log kayıtları: 1 yıl
Hesap silme sonrası: 30 gün içinde kalıcı silme

4. EBEVEYN TALEPLERİ

18 yaş altı kullanıcılar için ebeveyn talepleri:
Veri silme
Hesap kapatma
İçerik kaldırma

İletişim: support@litxtech.com

5. ULUSLARARASI VERİ AKTARIMI

ABD → UK → TR veri aktarımı:
GDPR uyumlu transfer mekanizmaları kullanılır
Standard Contractual Clauses (SCC) uygulanır
Adequate safeguards sağlanır

6. KULLANICI HAKLARI (GDPR)

Erişim hakkı
Düzeltme hakkı
Silme hakkı
İtiraz hakkı
Veri taşınabilirliği hakkı

7. KULLANICI HAKLARI (KVKK)

Kişisel verilerin işlenip işlenmediğini öğrenme
İşlenen veriler hakkında bilgi talep etme
İşlenme amacını öğrenme
Yurt içi/yurt dışı aktarım bilgisi
Düzeltme talep etme
Silme talep etme
İtiraz etme

8. VERİ GÜVENLİĞİ

SSL/TLS şifreleme
RLS (Row Level Security) politikaları
Düzenli güvenlik denetimleri
Veri şifreleme

9. VERİ İHLALİ BİLDİRİMİ

Veri ihlali durumunda:
72 saat içinde yetkili mercilere bildirim
Etkilenen kullanıcılara bildirim

10. İLETİŞİM

Veri koruma soruları için:
📧 support@litxtech.com
📞 +1 307 271 5151',
  'other',
  20,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%KVKK%' OR title LIKE '%GDPR%'
);

