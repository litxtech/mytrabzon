-- MyTrabzon Tüm Politikaları Ekleme/Güncelleme
-- Bu dosya tüm gerekli politikaları içerir

-- ============================================
-- 1. TOPLULUK KURALLARI (Community Guidelines)
-- ============================================
-- Google Play için kritik - sosyal medya uygulamaları için zorunlu

UPDATE policies
SET 
  title = 'Topluluk Kuralları',
  content = 'TOPLULUK KURALLARI (COMMUNITY GUIDELINES)

Son Güncelleme: 2025

MyTrabzon, güvenli, saygılı ve eğlenceli bir topluluk ortamı sağlamak için aşağıdaki kuralları belirlemiştir. Bu kurallara uymak tüm kullanıcıların sorumluluğundadır.

1. KABUL EDİLEN İÇERİKLER

✅ Sosyal paylaşımlar ve gönderiler
✅ Eğitici ve bilgilendirici içerikler
✅ Spor, etkinlik ve topluluk organizasyonları
✅ Üniversite yaşamı ve öğrenci içerikleri
✅ Yerel kültür ve gelenek paylaşımları
✅ Yapıcı tartışmalar ve fikir alışverişi
✅ Sanat, müzik ve yaratıcı içerikler

2. KABUL EDİLMEYEN İÇERİKLER

❌ Nefret söylemi, ırkçılık, ayrımcılık
❌ Taciz, zorbalık, tehdit
❌ Cinsel içerikli uygunsuz paylaşımlar
❌ Şiddet içeren görüntüler veya tehditler
❌ Dolandırıcılık, spam, sahte bilgiler
❌ Yasa dışı aktiviteler
❌ Kişisel bilgi ifşası (doxxing)
❌ Sahte haberler ve yanıltıcı bilgiler
❌ Telif hakkı ihlali içerikleri

3. NEVRET SÖYLEMİ VE TACİZ

Aşağıdaki davranışlar kesinlikle yasaktır:

Irk, din, cinsiyet, cinsel yönelim, engellilik durumu temelinde ayrımcılık
Kişisel saldırılar ve hakaretler
Sürekli rahatsız etme veya takip etme
Tehdit içeren mesajlar
Zorbalık ve siber zorbalık

4. CİNSEL İÇERİK VE ŞİDDET

Yasak içerikler:

Açık cinsel içerikler
Cinsel taciz veya istismar içerikleri
Şiddet içeren görüntüler
İntihar veya zararlı davranışları teşvik eden içerikler
Hayvan istismarı görüntüleri

5. DOLANDIRICILIK VE SPAM

Yasak aktiviteler:

Finansal dolandırıcılık girişimleri
Sahte hesap oluşturma
Otomatik bot hesapları
Toplu mesaj gönderimi (spam)
Yanıltıcı reklamlar veya bağlantılar
Pyramid scheme veya yasadışı pazarlama

6. UYGUNSUZ DAVRANIŞ CEZALARI

İhlal durumunda uygulanan yaptırımlar:

İlk ihlal: Uyarı ve içerik kaldırma
İkinci ihlal: 7 gün hesap askıya alma
Üçüncü ihlal: 30 gün hesap askıya alma
Ciddi ihlaller: Kalıcı hesap kapatma
Yasal ihlaller: Yetkili mercilere bildirim

7. EŞLEŞME SİSTEMİ KURALLARI (18+)

Eşleşme özelliği sadece 18 yaş üstü kullanıcılar içindir:

KYC doğrulaması zorunludur
Taciz, tehdit veya uygunsuz davranış yasaktır
Sahte profil oluşturma yasaktır
Reşit olmayan kullanıcılarla iletişim kesinlikle yasaktır
İhlal durumunda anında hesap kapatılır

8. VİDEO GÖRÜŞME KURALLARI (18+)

Görüntülü ve sesli arama özellikleri için:

18+ yaş şartı ve KYC doğrulaması zorunludur
Uygunsuz davranış, cinsel içerik, tehdit yasaktır
Kayıt yapma veya ekran görüntüsü alma (izinsiz) yasaktır
Taciz veya rahatsız edici davranışlar yasaktır
İhlal durumunda anında hesap kapatılır ve yasal mercilere bildirilir

9. HALI SAHA / ETKİNLİK DAVRANIŞ KURALLARI

Etkinlik ve maç organizasyonlarında:

Etkinlikler kullanıcı sorumluluğundadır
Güvenli buluşma noktaları tercih edilmelidir
Toplu buluşmalarda güvenlik önlemleri alınmalıdır
Dolandırıcılık veya sahte etkinlik oluşturma yasaktır
Etkinlik sırasında uygunsuz davranış yasaktır

10. MODERASYON YETKİSİ

MyTrabzon moderasyon ekibi:

İçerikleri inceleme ve kaldırma yetkisine sahiptir
Hesapları askıya alma veya kapatma yetkisine sahiptir
Yasal mercilere bildirimde bulunma yetkisine sahiptir
KYC doğrulama süreçlerini yönetir
Topluluk kurallarını uygular

11. HESAP KAPATMA DURUMLARI

Aşağıdaki durumlarda hesap kalıcı olarak kapatılır:

Çocuk istismarı veya yasa dışı içerik
Ciddi taciz veya tehdit
Dolandırıcılık veya finansal suç
Sahte hesap veya kimlik hırsızlığı
Tekrarlayan ciddi ihlaller
Yasal mercilerin talebi

12. İTİRAZ VE ŞİKAYET

Hesap kapatma veya içerik kaldırma kararlarına itiraz için:

📧 support@litxtech.com

İtirazlar 7 iş günü içinde değerlendirilir.

13. İLETİŞİM

Topluluk Kuralları ile ilgili sorular için:

📧 support@litxtech.com
📞 +1 307 271 5151',
  policy_type = 'community',
  display_order = 4,
  is_active = true,
  updated_at = NOW()
WHERE policy_type = 'community';

INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Topluluk Kuralları',
  'TOPLULUK KURALLARI (COMMUNITY GUIDELINES)

Son Güncelleme: 2025

MyTrabzon, güvenli, saygılı ve eğlenceli bir topluluk ortamı sağlamak için aşağıdaki kuralları belirlemiştir. Bu kurallara uymak tüm kullanıcıların sorumluluğundadır.

1. KABUL EDİLEN İÇERİKLER

✅ Sosyal paylaşımlar ve gönderiler
✅ Eğitici ve bilgilendirici içerikler
✅ Spor, etkinlik ve topluluk organizasyonları
✅ Üniversite yaşamı ve öğrenci içerikleri
✅ Yerel kültür ve gelenek paylaşımları
✅ Yapıcı tartışmalar ve fikir alışverişi
✅ Sanat, müzik ve yaratıcı içerikler

2. KABUL EDİLMEYEN İÇERİKLER

❌ Nefret söylemi, ırkçılık, ayrımcılık
❌ Taciz, zorbalık, tehdit
❌ Cinsel içerikli uygunsuz paylaşımlar
❌ Şiddet içeren görüntüler veya tehditler
❌ Dolandırıcılık, spam, sahte bilgiler
❌ Yasa dışı aktiviteler
❌ Kişisel bilgi ifşası (doxxing)
❌ Sahte haberler ve yanıltıcı bilgiler
❌ Telif hakkı ihlali içerikleri

3. NEVRET SÖYLEMİ VE TACİZ

Aşağıdaki davranışlar kesinlikle yasaktır:

Irk, din, cinsiyet, cinsel yönelim, engellilik durumu temelinde ayrımcılık
Kişisel saldırılar ve hakaretler
Sürekli rahatsız etme veya takip etme
Tehdit içeren mesajlar
Zorbalık ve siber zorbalık

4. CİNSEL İÇERİK VE ŞİDDET

Yasak içerikler:

Açık cinsel içerikler
Cinsel taciz veya istismar içerikleri
Şiddet içeren görüntüler
İntihar veya zararlı davranışları teşvik eden içerikler
Hayvan istismarı görüntüleri

5. DOLANDIRICILIK VE SPAM

Yasak aktiviteler:

Finansal dolandırıcılık girişimleri
Sahte hesap oluşturma
Otomatik bot hesapları
Toplu mesaj gönderimi (spam)
Yanıltıcı reklamlar veya bağlantılar
Pyramid scheme veya yasadışı pazarlama

6. UYGUNSUZ DAVRANIŞ CEZALARI

İhlal durumunda uygulanan yaptırımlar:

İlk ihlal: Uyarı ve içerik kaldırma
İkinci ihlal: 7 gün hesap askıya alma
Üçüncü ihlal: 30 gün hesap askıya alma
Ciddi ihlaller: Kalıcı hesap kapatma
Yasal ihlaller: Yetkili mercilere bildirim

7. EŞLEŞME SİSTEMİ KURALLARI (18+)

Eşleşme özelliği sadece 18 yaş üstü kullanıcılar içindir:

KYC doğrulaması zorunludur
Taciz, tehdit veya uygunsuz davranış yasaktır
Sahte profil oluşturma yasaktır
Reşit olmayan kullanıcılarla iletişim kesinlikle yasaktır
İhlal durumunda anında hesap kapatılır

8. VİDEO GÖRÜŞME KURALLARI (18+)

Görüntülü ve sesli arama özellikleri için:

18+ yaş şartı ve KYC doğrulaması zorunludur
Uygunsuz davranış, cinsel içerik, tehdit yasaktır
Kayıt yapma veya ekran görüntüsü alma (izinsiz) yasaktır
Taciz veya rahatsız edici davranışlar yasaktır
İhlal durumunda anında hesap kapatılır ve yasal mercilere bildirilir

9. HALI SAHA / ETKİNLİK DAVRANIŞ KURALLARI

Etkinlik ve maç organizasyonlarında:

Etkinlikler kullanıcı sorumluluğundadır
Güvenli buluşma noktaları tercih edilmelidir
Toplu buluşmalarda güvenlik önlemleri alınmalıdır
Dolandırıcılık veya sahte etkinlik oluşturma yasaktır
Etkinlik sırasında uygunsuz davranış yasaktır

10. MODERASYON YETKİSİ

MyTrabzon moderasyon ekibi:

İçerikleri inceleme ve kaldırma yetkisine sahiptir
Hesapları askıya alma veya kapatma yetkisine sahiptir
Yasal mercilere bildirimde bulunma yetkisine sahiptir
KYC doğrulama süreçlerini yönetir
Topluluk kurallarını uygular

11. HESAP KAPATMA DURUMLARI

Aşağıdaki durumlarda hesap kalıcı olarak kapatılır:

Çocuk istismarı veya yasa dışı içerik
Ciddi taciz veya tehdit
Dolandırıcılık veya finansal suç
Sahte hesap veya kimlik hırsızlığı
Tekrarlayan ciddi ihlaller
Yasal mercilerin talebi

12. İTİRAZ VE ŞİKAYET

Hesap kapatma veya içerik kaldırma kararlarına itiraz için:

📧 support@litxtech.com

İtirazlar 7 iş günü içinde değerlendirilir.

13. İLETİŞİM

Topluluk Kuralları ile ilgili sorular için:

📧 support@litxtech.com
📞 +1 307 271 5151',
  'community',
  4,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE policy_type = 'community'
);

