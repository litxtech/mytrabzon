import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert, Linking, Modal } from 'react-native';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, PhoneCall, X, Trash2, Mail } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { PolicyConsentModal } from '@/components/PolicyConsentModal';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';

type AuthMode = 'login' | 'register' | 'forgot' | 'phone' | 'phone-register' | 'phone-password-setup' | 'phone-forgot';
type RegisterType = 'phone' | null;

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [registerType, setRegisterType] = useState<RegisterType>(null); // Kayıt tipi: email veya phone
  const [email, setEmail] = useState(''); // Email/telefon input için
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false); // SMS kodu doğrulandı mı?
  const [phonePassword, setPhonePassword] = useState('');
  const [phonePasswordConfirm, setPhonePasswordConfirm] = useState('');
  const [phoneUserId, setPhoneUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const isNavigatingRef = useRef(false); // Navigation flag - duplicate call'ları önlemek için
  const router = useRouter();
  const pathname = usePathname(); // Mevcut path'i takip et
  const params = useLocalSearchParams();
  const returnUrl = params.returnUrl as string | undefined; // Giriş sonrası yönlendirilecek URL
  const { signInAsGuest } = useAuth();
  
  // Policy'leri çek (hata durumunda sessizce handle et)
  const { data: policies } = (trpc as any).admin.getPolicies.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    onError: () => {
      // Sessizce handle et, hata mesajı gösterme
    },
  });
  const { data: requiredPolicies } = (trpc as any).user.getRequiredPolicies.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    onError: () => {
      // Sessizce handle et, hata mesajı gösterme
    },
  });
  const consentMutation = (trpc as any).user.consentToPolicies.useMutation();
  const cancelAccountDeletionMutation = (trpc as any).user.cancelAccountDeletion.useMutation();
  
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);

  const handlePolicyPress = (policyType: string) => {
    if (policyType === 'childSafety') {
      setSelectedPolicy({
        title: 'CHILD SAFETY POLICY (Çocuk Koruma Politikası)',
        content: getChildSafetyPolicyContent(),
        updated_at: new Date().toISOString(),
      });
      setPolicyModalVisible(true);
    } else if (policyType === 'accountDeletion') {
      setSelectedPolicy({
        title: 'HESAP SİLME BİLGİLENDİRMESİ',
        content: getAccountDeletionContent(),
        updated_at: new Date().toISOString(),
      });
      setPolicyModalVisible(true);
    } else if (policyType === 'ridePolicy') {
      setSelectedPolicy({
        title: 'YOLCU TAŞIMA POLİTİKASI',
        content: getRidePolicyContent(),
        updated_at: new Date().toISOString(),
      });
      setPolicyModalVisible(true);
    } else if (policyType === 'dataPolicy') {
      setSelectedPolicy({
        title: 'VERİ POLİTİKASI',
        content: getDataPolicyContent(),
        updated_at: new Date().toISOString(),
      });
      setPolicyModalVisible(true);
    } else {
      setSelectedPolicy(policies?.find((p: any) => p.policy_type === policyType));
      setPolicyModalVisible(true);
    }
  };

  const getChildSafetyPolicyContent = () => {
    return `Last Updated: 2025

Applies to: MyTrabzon Mobile Application

Companies:
LITXTECH LLC (United States)
LITXTECH LTD (United Kingdom)
Toprak Travel Tourism (Turkey)

1. Amaç ve Kapsam

Bu politika; MyTrabzon tarafından sunulan sosyal medya, mesajlaşma, video, yol arkadaşı, etkinlik ve şehir yaşamı özelliklerinin 18 yaş altındaki kullanıcılar açısından güvenli olmasını sağlamak için hazırlanmıştır.

Platformun içerikleri; LITXTECH LLC, LITXTECH LTD ve Toprak Travel Tourism tarafından ortak olarak işletilen hizmetlere tabidir.

2. Yaş Sınırı

MyTrabzon uygulaması App Store ve Google Play tarafından 17+ / 16+ yaş kategorisine sınıflandırılmıştır.

Bu yaş sınırı:
• Kullanıcı tarafından oluşturulan içerik (UGC)
• Mesajlaşma özellikleri
• Fotoğraf/video paylaşımı
• Açık topluluk ortamı
nedeniyle belirlenmiştir.

18 yaş altı kullanıcıların uygulamayı kullanım sorumluluğu ebeveynlerine aittir.

3. Çocuklara Yönelik Koruma Önlemleri

3.1. İçerik Filtreleme
Küfür, hakaret, cinsel içerik, tehdit ve şiddet içeren paylaşımlar filtrelenir.
AI destekli moderasyon uygunsuz içerikleri otomatik olarak işaretler.
Hassas içerikler manuel incelemeye alınır.

3.2. Mesajlaşma Güvenliği
Taciz, tehdit veya uygunsuz davranış içeren mesajlar işaretlenir.
Şüpheli hesaplar sınırlanır veya engellenir.
Reşit olmayan kişilere yönelik riskli mesajlar otomatik tespit edilir.

3.3. Konum Gizliliği
Tam konum bilgisi hiçbir kullanıcıyla açık şekilde paylaşılmaz.
Yol arkadaşı ilanlarında adres detayları gizlenir.
Toprak Travel Tourism tarafından sunulan tur/transfer hizmetlerinde özel bilgiler korunur.

3.4. Reklam ve Ticari İçerik Güvenliği
Çocuklara yönelik hassas reklam gösterimi yapılmaz.
Toprak Travel Tourism'in tur ve hizmet duyuruları yaş sınırlamasına uygun biçimde gösterilir.
Reşit olmayan kullanıcıya yönelik finansal veya riskli içerik engellenir.

4. Kullanıcı İçerikleri (UGC) Kuralları

Kullanıcılar aşağıdaki içerikleri paylaşamaz:
• Cinsel veya uygunsuz içerik
• Aşırı şiddet
• Zorbalık / taciz
• Irkçı söylem
• Uyuşturucu / kumar / suç teşviki
• Çocuklara yönelik zararlı içerik

Bu kurallar LITXTECH ve Toprak Travel Tourism moderasyon ekibi tarafından uygulanır.

5. Şikayet ve Raporlama Mekanizması

MyTrabzon içinde her gönderi ve kullanıcı için "Şikayet Et (Report)" seçeneği bulunur.

Raporlanan içerikler:
• LITXTECH moderasyon ekibi
• Toprak Travel Tourism destek ekibi (tur/transfer içerikleri için)
tarafından 24 saat içinde incelenir.

6. Ebeveyn Hakları

Ebeveynler;
• Çocuğun hesabını kapatma
• Verileri silme
• Rahatsız edici içerikleri raporlama
• Mesajlaşmayı kısıtlama
haklarına sahiptir.

Bu talepler şirketlerden biri üzerinden işlenebilir (LITXTECH veya Toprak Travel Tourism).

7. LazGPT (AI) Güvenliği

LazGPT:
• Çocuklara uygun olmayan içerik üretmez
• Zorbalık, cinsel içerik veya tehlikeli davranış önermez
• Hassas talepleri otomatik olarak reddeder

AI güvenlik sistemi LITXTECH tarafından işletilir.

8. Hesap Güvenliği

• Şifreler şifrelenmiş şekilde saklanır
• Şüpheli aktivitelerde uyarı gönderilir
• Çocuk hesapları için ek koruma uygulanır

9. İhlal Durumunda Yaptırımlar

• İçerik silme
• Hesap askıya alma
• Kalıcı hesap kapatma
• Gerekirse ilgili makamlara bildirme

10. İletişim

LITXTECH LLC – USA
📧 support@litxtech.com
📞 +1 307 271 5151

LITXTECH LTD – UK
📧 info@litxtech.com

Toprak Travel Tourism – Turkey`;
  };

  const getAccountDeletionContent = () => {
    return `MyTrabzon uygulaması üzerinden verdiğiniz hesap silme talebi aşağıdaki kurallara göre işlenir.

Bu süreç LITXTECH LLC (USA), LITXTECH LTD (UK) ve Toprak Travel Tourism (Turkey) tarafından yürütülür.

1. Silme Süresi

Hesap silme talebi verildiğinde hesabınız anında gizlenir, kimse tarafından görülemez.

Ancak kalıcı silme işlemi 30 gün sonra gerçekleştirilir.

Bu 30 günlük dönem boyunca:
• Hesabınıza giriş yaparsanız silme işlemi otomatik olarak iptal olur.
• Hiç giriş yapılmazsa hesap 30 günün sonunda kalıcı olarak silinir.

2. Silinen Veriler

30 gün tamamlandığında aşağıdaki bilgiler tamamen silinir:
• Kişisel bilgiler (ad, soyad, e-posta, telefon)
• Profil fotoğrafı
• Mesajlaşma kayıtları
• Konum geçmişi
• Yol arkadaşı ilanları
• Halı saha rezervasyonları
• AI (LazGPT) sohbet geçmişleri
• Toprak Travel Tourism hesap bilgileri

Tüm kişisel verilerin bağlantısı kaldırılır; geri dönüşü yoktur.

3. Anonimleştirilen Veriler

Topluluk güvenliği için bazı içerikler tamamen silinmez, anonim hale getirilir:
• Eski yorumlar
• Gönderiler
• Beğeniler
• Olay Var postları
• Diğer kullanıcılara görünmüş içerikler

Bu içerikler kimliğinizle ilişkilendirilmez ve aşağıdaki şekilde görünür:
"This gönderi silinmiş bir kullanıcıya aittir."

4. Yasal Olarak Saklanması Gereken Kayıtlar

Toprak Travel Tourism üzerinden yapılan:
• Tur rezervasyonları
• Transfer işlemleri
• Fatura / ödeme kayıtları

Türkiye mevzuatı gereği 2–5 yıl saklanmak zorundadır.

Ancak 30 gün sonunda burada da ad-soyad, e-posta ve telefon bilgileriniz tamamen silinir ve kayıtlar kimliksiz (anonim) hale gelir.

5. Geri Alma Hakkı

• 30 gün içinde giriş yaparsanız → Hesabınız geri açılır.
• 30 gün geçtikten sonra → Hesap ve kişisel veriler geri getirilemez.

6. Güvenlik

Silme işlemi sırasında:
• Yetkisiz erişime izin verilmez
• Supabase üzerindeki tüm kullanıcıya bağlı kayıtlar kaldırılır veya anonim yapılır
• Sistemde kalan hiçbir veri kimliğinizle eşleştirilemez

7. İletişim

Silme süreciyle ilgili her türlü destek için:

LITXTECH LLC – USA
📧 support@litxtech.com
📞 +1 307 271 5151

LITXTECH LTD – UK
📧 info@litxtech.com

Toprak Travel Tourism – Turkey`;
  };

  const getRidePolicyContent = () => {
    return `YOLCU TAŞIMA POLİTİKASI

MyTrabzon – LITXTECH LLC
LITXTECH LTD
Toprak Travel Tourism

Son Güncelleme: 2025

1. Politikanın Amacı

Bu politika; MyTrabzon uygulamasında sunulan Yol Arkadaşı / Benide Al özelliği ile yapılan yolculukların güvenli, düzenli ve yasal çerçevede gerçekleşmesini sağlamak amacıyla hazırlanmıştır.

Bu hizmet:

LITXTECH LLC (ABD)
LITXTECH LTD (Birleşik Krallık)
Toprak Travel Tourism (Türkiye)

tarafından ortak işletilen platformun bir parçasıdır.

MyTrabzon resmi bir ulaşım hizmeti değildir.

Uygulama, yolcular ile gideceği rotayı paylaşmak isteyen sürücüleri birbirine bağlayan bir platformdur.

2. MyTrabzon'un Rolü

MyTrabzon:

• Taksi, dolmuş, otobüs, ticari taksi veya özel taşıma hizmeti sunmaz.
• Hiçbir kullanıcı adına taşıma sözleşmesi kurmaz.
• Sürücü veya yolcu tarafından yapılan yolculuklardan komisyon almaz.
• Yolculuğun gerçekleşmesinden doğrudan sorumlu değildir.

Platform; sadece kullanıcıların ilan oluşturmasına, yolculuk paylaşmasına ve iletişim kurmasına imkân veren aracı bir hizmet sağlar.

3. Yolcu ve Sürücü Sorumlulukları

3.1. Sürücü Sorumlulukları

• Aracın tüm hukuki sorumluluğu sürücüye aittir.
• Araç muayenesi, sigorta, trafik belgesi ve ehliyet geçerli olmalıdır.
• Araç içi güvenlikten sürücü sorumludur.
• Uygulama üzerinden verilen rota, saat ve fiyat bilgisi doğru olmalıdır.
• Yolcuya karşı güvenli ve saygılı davranılmalıdır.
• Yolculuk sonrası kişisel bilgilerin kötü amaçla kullanılması yasaktır.

3.2. Yolcu Sorumlulukları

• Gerçek bilgilerle profil oluşturmak zorundadır.
• Sürücünün aracına ve diğer yolculara zarar veremez.
• Seyahat kurallarına ve saatine uymalıdır.
• Sürücü hakkında yanlış veya kötü niyetli bilgi paylaşamaz.

4. Güvenlik Kuralları

Tüm kullanıcılar aşağıdaki güvenlik kurallarına uymak zorundadır:

• Tüm yolculuklar kendi isteğiyle katılım esasına dayanır.
• Yolculuk öncesi sürücü ve yolcu karşılıklı olarak kimlik doğrulaması yapmalıdır.
• Şüpheli bir durumda uygulama içinden "Şikayet Et" butonu kullanılmalıdır.
• Alkol veya uyuşturucu etkisinde yolculuk yapılması yasaktır.
• Çocuk yolcu taşınacaksa ebeveyn sorumluluğu gerekir.

5. Ücretlendirme

MyTrabzon üzerinde görüntülenen ücretler tamamen sürücü tarafından belirlenir ve:

• Platform tarafından onaylanmaz
• Denetlenmez
• Toprak Travel Tourism ile karıştırılmamalıdır
• Uygulama komisyon almaz

MyTrabzon yalnızca yolcu ile sürücüyü buluşturur.

6. Toprak Travel Tourism ile Alakası

Yol Arkadaşı sistemi, Toprak Travel Tourism'in profesyonel tur/transfer hizmeti değildir.

Bu iki hizmet birbirinden ayrıdır.

Toprak Travel Tourism tarafından sunulan profesyonel hizmetlerde:

• Ticari yolcu taşımacılığı
• Sigorta kapsamı
• Turizm taşıma belgesi
• Fatura kesme
• Rezervasyon sistemi

gibi resmi yükümlülükler bulunur.

Yol Arkadaşı özelliği kişiler arası paylaşım sistemidir, turizm taşımacılığı değildir.

7. Yasal Uyarı

MyTrabzon:

• Sürücü ile yolcu arasındaki anlaşmazlıklardan
• Yolculuk sırasında oluşabilecek maddi veya manevi zararlardan
• Trafik kazalarından
• Sigortasız taşıma faaliyetlerinden
• Fiyat uyuşmazlıklarından

doğrudan sorumlu değildir.

Platform; yalnızca aracılık hizmeti sağlar.

8. Yolculukta Kişisel Bilgilerin Korunması

Platform üzerinden paylaşılan bilgiler:

• Yolculuk sonrası silinebilir
• Kimlik verileri izinsiz üçüncü kişilerle paylaşılmaz
• Mesajlaşmalar uçtan uca güvenlik politikalarına uygun şekilde korunur
• Trafik konumu paylaşımı zorunlu değildir

9. Yolculuk Sonrası Değerlendirme

Sürücüler ve yolcular yolculuk sonrası birbirini değerlendirebilir.

Kötü davranış, taciz, tehdit, uygunsuz davranış bildirimleri moderasyon ekibi tarafından incelenir.

Gerektiğinde:

• Hesap askıya alınır
• Kalıcı olarak kapatılır
• Yetkili kurumlara bildirim yapılabilir

10. İletişim

LITXTECH LLC – USA
📧 support@litxtech.com
📞 +1 307 271 5151

LITXTECH LTD – UK
📧 info@litxtech.com

Toprak Travel Tourism – Turkey
📍 Trabzon, Türkiye`;
  };

  const getDataPolicyContent = () => {
    return `DATA POLICY (Veri Politikası)

MyTrabzon – LitxTech LLC / LitxTech LTD / Toprak Travel Tourism

Son Güncelleme: 2025

1. Amaç

Bu politika, MyTrabzon uygulaması tarafından işlenen tüm kişisel verilerin güvenli, yasal, şeffaf ve kullanıcı kontrolünde olmasını sağlamak amacıyla hazırlanmıştır.

Veri işlemleri;

LITXTECH LLC (USA)

LITXTECH LTD (UK)

Toprak Travel Tourism (Turkey)

tarafından yürütülmektedir.

2. Toplanan Veri Türleri

2.1. Hesap Bilgileri

• Ad, soyad
• E-posta, telefon
• Profil fotoğrafı
• Doğum tarihi (isteğe bağlı)

2.2. Konum Verileri

• Yakındaki mekan ve etkinlikleri göstermek için yaklaşık konum
• Yol Arkadaşı ilanı için rota bilgisi
• Tam konum hiçbir zaman diğer kullanıcılara açık gösterilmez.

2.3. Kullanım ve Etkileşim Verileri

• Beğeniler
• Yorumlar
• Gönderiler
• Halı saha rezervasyon hareketleri
• Yol arkadaşı ilan etkileşimleri

2.4. Mesajlaşma Verileri

• Mesaj içerikleri
• Medya dosyaları
• Bloklama ve şikayet kayıtları
• Mesajlar reklam amacıyla analiz edilmez.

2.5. Cihaz Verileri

• Cihaz modeli
• İşletim sistemi
• Çerez / depolama bilgileri
• Uygulama performans logları
• Veriler sadece güvenlik ve performans için kullanılır.

2.6. AI / LazGPT Verileri

• Sadece sohbet geçmişi
• Kullanıcıya bağlı olmayan anonim kullanım istatistikleri

3. Verilerin İşlenme Amaçları

Toplanan veriler aşağıdaki amaçlarla işlenir:

• Hesap oluşturma ve yönetimi
• Güvenli mesajlaşma ve topluluk moderasyonu
• Yol Arkadaşı ilanı oluşturma, görüntüleme ve güvenlik
• Halı saha rezervasyon işlemleri
• Uygulama içi deneyimi kişiselleştirme
• Spam, dolandırıcılık, kötü amaçlı davranışların engellenmesi
• Yasal yükümlülüklerin yerine getirilmesi
• LazyGPT / AI özelliklerinin çalışması

Toprak Travel Tourism kapsamında:

• Tur rezervasyonu
• Transfer işlemleri
• Zorunlu fatura kayıtları

4. Verilerin Paylaşıldığı Taraflar

MyTrabzon verileri hiçbir üçüncü tarafa satmaz.

Veriler yalnızca şu taraflarla paylaşılabilir:

✔ Hizmet Sağlayıcılar

• Supabase (veri tabanı ve kimlik doğrulama)
• Agora (görüntülü/rehber iletişim — eğer kullanılırsa)
• Stripe (bağış ve ödeme)
• Veriler sözleşmeli, güvenlik sertifikalı sağlayıcılara iletilir.

✔ Yasal Kurumlar

• Yalnızca mahkeme veya resmi makam talebi olursa.

✔ Toprak Travel Tourism

• Sadece rezervasyon ve hizmet sunumu için gereken minimum bilgiler paylaşılır.

5. Veri Saklama Süreleri

Hesap verileri:

• Kullanıcı hesabı silindikten 30 gün sonra kalıcı olarak silinir.

Mesajlar:

• Hesap silindiğinde tamamen kaldırılır.

Gönderiler / Yorumlar:

• Topluluk bütünlüğü için anonim hale getirilir (kimlik kaldırılır).

Turizm kayıtları (Toprak Travel Tourism):

• Türkiye mevzuatına göre 2–5 yıl saklanmak zorundadır, fakat kişisel bilgiler 30 gün sonunda anonimleştirilir.

6. Haklarınız (GDPR & KVKK Uyumlu)

Kullanıcılar aşağıdaki haklara sahiptir:

• Verilere erişme
• Verileri düzeltme
• Verilerin silinmesini isteme
• Hesap kapatma
• Veri taşınabilirliği
• İşlemeyi sınırlama
• Çocuk hesabı için ebeveyn kontrolü

Talepler 30 gün içinde işlenir.

7. Güvenlik Önlemleri

MyTrabzon, verileri korumak için:

• AES256 / TLS şifreleme
• Rol tabanlı erişim kontrolü
• Supabase RLS güvenlik politikaları
• Otomatik saldırı tespit sistemi
• Spam / sahte hesap filtreleri
• Uçtan uca güvenlik değerlendiriciler

kullanır.

Veriler hiçbir zaman düz metin olarak saklanmaz.

8. Çocuk Güvenliği

MyTrabzon 17+ yaş kategorisindedir.

Reşit olmayan kullanıcıların güvenliği için:

• Uygunsuz içerik filtreleri
• AI destekli moderasyon
• Konum gizleme
• Taciz / tehdit tespiti
• Mesaj güvenlik taramaları

uygulanır.

9. Hesap Silme Sonrası Veriler

Hesap silme talebi:

• 30 gün bekleme süreci
• Ardından tüm kişisel verilerin silinmesi
• Gönderilerin anonimleştirilmesi
• Turizm kayıtlarının kimliksiz tutulması

şeklinde işlenir.

Silinmiş hesaplar geri getirilemez.

10. İletişim

LITXTECH LLC – USA
📧 support@litxtech.com
📞 +1 307 271 5151

LITXTECH LTD – UK
📧 info@litxtech.com

Toprak Travel Tourism – Turkey`;
  };

  // Kullanıcı dostu hata mesajları için yardımcı fonksiyon
  const getFriendlyErrorMessage = (error: any): string => {
    // Network hataları
    if (error?.message?.includes('Network request failed') || 
        error?.message?.includes('network') ||
        error?.code === 'NETWORK_ERROR' ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('timeout')) {
      return 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
    }
    const errorMessage = error?.message || error?.error || '';
    const lowerMessage = errorMessage.toLowerCase();

    // Email servisi hataları
    if (lowerMessage.includes('email_service_unavailable') || 
        error?.error === 'email_service_unavailable') {
      return 'Email servisi şu anda kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.';
    }
    if (lowerMessage.includes('email_send_failed') || 
        error?.error === 'email_send_failed') {
      return 'Email gönderilemedi. Lütfen email adresinizi kontrol edip tekrar deneyin.';
    }
    if (lowerMessage.includes('otp_limit') || 
        error?.error === 'otp_limit') {
      return 'Çok fazla doğrulama kodu istedin. Lütfen 10 dakika sonra tekrar deneyin.';
    }

    // Email ile ilgili hatalar
    if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid_credentials')) {
      return 'Email veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
    }
    if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('email_not_confirmed')) {
      return 'Email adresinizi doğrulamanız gerekiyor. Email kutunuzu kontrol edin.';
    }
    if (lowerMessage.includes('user not found') || lowerMessage.includes('user_not_found')) {
      return 'Bu email adresi ile kayıtlı kullanıcı bulunamadı.';
    }
    if (lowerMessage.includes('email already registered') || lowerMessage.includes('already_registered')) {
      return 'Bu email adresi zaten kullanılıyor. Giriş yapmayı deneyin.';
    }

    // Şifre ile ilgili hatalar
    if (lowerMessage.includes('password') && lowerMessage.includes('weak')) {
      return 'Şifreniz çok zayıf. Daha güçlü bir şifre seçin.';
    }
    if (lowerMessage.includes('password') && lowerMessage.includes('too short')) {
      return 'Şifreniz en az 6 karakter olmalıdır.';
    }

    // Network hataları
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
      return 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }

    // Rate limit hataları
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';
    }

    // Magic link hataları
    if (lowerMessage.includes('magic link') || lowerMessage.includes('otp')) {
      return 'Doğrulama linki gönderilemedi. Lütfen tekrar deneyin.';
    }

    // SMS hataları
    if (lowerMessage.includes('sms') || lowerMessage.includes('phone')) {
      return 'SMS gönderilemedi. Telefon numaranızı kontrol edin ve tekrar deneyin.';
    }

    // Genel hatalar
    if (lowerMessage.includes('server error') || lowerMessage.includes('internal error')) {
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    }
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('permission')) {
      return 'Bu işlem için yetkiniz bulunmuyor.';
    }

    // Bilinmeyen hatalar için genel mesaj
    if (errorMessage) {
      // Eğer mesaj zaten Türkçe ve kullanıcı dostu görünüyorsa direkt kullan
      if (errorMessage.length < 100 && !errorMessage.includes('Error') && !errorMessage.includes('error')) {
        return errorMessage;
      }
    }

    return 'Bir sorun oluştu. Lütfen tekrar deneyin.';
  };

  const handlePolicyPressExtended = (policyType: 'terms' | 'privacy') => {
    if (policies) {
      const policy = policies.find((p: any) => p.policy_type === policyType && p.is_active);
      if (policy) {
        setSelectedPolicy(policy);
        setPolicyModalVisible(true);
      } else {
        Alert.alert('Bilgi', 'Politika bulunamadı');
      }
    } else {
      Alert.alert('Bilgi', 'Politikalar yükleniyor, lütfen tekrar deneyin');
    }
  };

  const getRedirectUrl = useCallback(
    (path: string) => {
      // Mobil için deep link, web için web URL
      if (Platform.OS === 'web') {
        // Web için Supabase callback URL'i kullan (public/auth/callback.html'e yönlendirecek)
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xcvcplwimicylaxghiak.supabase.co';
        // Supabase'in email callback URL'i: https://[project].supabase.co/auth/v1/callback
        // Ama bizim web callback sayfamız: https://www.litxtech.com/auth/callback
        return 'https://www.litxtech.com/auth/callback';
      }
      // Mobil için deep link
      return makeRedirectUri({
        scheme: 'mytrabzon',
        path,
      });
    },
    []
  );

  // Profil güncelleme fonksiyonu - email ve telefon bilgilerini otomatik ekle
  const updateProfileWithAuthInfo = useCallback(async (userId: string, email?: string, phone?: string, isNewUser: boolean = false) => {
    try {
      // Güvenli validation
      if (!userId || typeof userId !== 'string' || userId.length === 0) {
        console.warn('⚠️ [updateProfile] Invalid userId');
        return;
      }

      const updateData: any = {};
      
      // Email varsa ve geçerliyse ekle
      if (email && typeof email === 'string') {
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail.length > 0 && trimmedEmail.length <= 254) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(trimmedEmail)) {
            updateData.email = trimmedEmail;
          } else {
            console.warn('⚠️ [updateProfile] Invalid email format:', trimmedEmail);
          }
        }
      }
      
      // Telefon varsa ve geçerliyse ekle
      if (phone && typeof phone === 'string') {
        const trimmedPhone = phone.trim();
        if (trimmedPhone.length > 0 && trimmedPhone.length <= 20) {
          updateData.phone = trimmedPhone;
        } else {
          console.warn('⚠️ [updateProfile] Invalid phone format:', trimmedPhone);
        }
      }
      
      // Yeni kullanıcılar için "beni göster" ayarını açık yap
      if (isNewUser === true) {
        updateData.show_in_directory = true;
      }
      
      // Eğer güncellenecek bir şey varsa
      if (updateData && typeof updateData === 'object' && !Array.isArray(updateData) && Object.keys(updateData).length > 0) {
        console.log('📝 [updateProfile] Updating profile with:', updateData);
        
        try {
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
          
          if (updateError) {
            console.error('❌ [updateProfile] Error updating profile:', updateError);
            // Hata olsa bile devam et, kritik değil
          } else {
            console.log('✅ [updateProfile] Profile updated successfully');
          }
        } catch (dbError: any) {
          console.error('❌ [updateProfile] Database error:', dbError);
          // Hata olsa bile devam et
        }
      }
    } catch (error: any) {
      console.error('❌ [updateProfile] Unexpected error:', error);
      // Hata olsa bile devam et
    }
  }, []);

  // Hesap silme isteği kontrolü - eğer 30 gün içindeyse kullanıcıya "vazgeç" butonu göster
  const checkAndHandleAccountDeletion = useCallback(async (userId: string): Promise<boolean> => {
    try {
      console.log('🔍 [checkAccountDeletion] Checking deletion status for user:', userId);
      
      // Profile'den deletion_requested_at kontrolü yap
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('deletion_requested_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ [checkAccountDeletion] Error fetching profile:', error);
        return false; // Hata durumunda devam et
      }

      if (!profile || !profile.deletion_requested_at) {
        console.log('✅ [checkAccountDeletion] No deletion request found');
        return false; // Silme isteği yok, normal akışa devam et
      }

      // deletion_requested_at tarihini kontrol et
      const deletionRequestedAt = new Date(profile.deletion_requested_at);
      const now = new Date();
      const daysDiff = (now.getTime() - deletionRequestedAt.getTime()) / (1000 * 60 * 60 * 24); // Gün cinsinden

      console.log('📅 [checkAccountDeletion] Deletion requested at:', deletionRequestedAt);
      console.log('📅 [checkAccountDeletion] Days since deletion request:', daysDiff.toFixed(2));

      // 30 gün içindeyse kullanıcıya "vazgeç" butonu göster
      if (daysDiff <= 30) {
        console.log('⚠️ [checkAccountDeletion] Deletion request found within 30 days, showing restore option');
        
        // Promise döndüren Alert wrapper
        return new Promise<boolean>((resolve) => {
          Alert.alert(
            'Hesap Silme İsteği',
            `Hesabınızı silmek için talepte bulunmuştunuz. 30 gün içinde hesabınızı geri yükleyebilirsiniz.\n\nHesabınızı geri yüklemek ister misiniz?`,
            [
              {
                text: 'Hayır',
                style: 'cancel',
                onPress: () => {
                  console.log('👋 [checkAccountDeletion] User chose to keep deletion request');
                  resolve(false); // Normal akışa devam et
                },
              },
              {
                text: 'Hesabını Silmekten Vazgeç',
                style: 'default',
                onPress: async () => {
                  console.log('✅ [checkAccountDeletion] User chose to restore account');
                  try {
                    setLoading(true);
                    // Hesap silme isteğini iptal et
                    await cancelAccountDeletionMutation.mutateAsync();
                    console.log('✅ [checkAccountDeletion] Account deletion cancelled successfully');
                    setLoading(false);
                    resolve(true); // Hesap geri yüklendi, normal akışa devam et
                  } catch (error: any) {
                    console.error('❌ [checkAccountDeletion] Error cancelling deletion:', error);
                    setLoading(false);
                    Alert.alert('Hata', 'Hesap silme isteği iptal edilemedi. Lütfen tekrar deneyin.');
                    resolve(false); // Hata durumunda normal akışa devam et
                  }
                },
              },
            ],
            { cancelable: false }
          );
        });
      } else {
        console.log('⏰ [checkAccountDeletion] Deletion request is older than 30 days, cannot restore');
        // 30 günü geçtiyse hesap geri yüklenemez
        Alert.alert(
          'Hesap Silinmiş',
          'Hesabınız 30 gün önce silinmek üzere işaretlenmişti. Maalesef hesabınızı geri yükleyemezsiniz.',
          [{ text: 'Tamam' }]
        );
        // Çıkış yap ve giriş sayfasına yönlendir
        await supabase.auth.signOut();
        return false;
      }
    } catch (error: any) {
      console.error('❌ [checkAccountDeletion] Unexpected error:', error);
      return false; // Hata durumunda normal akışa devam et
    }
  }, [cancelAccountDeletionMutation]);

  const checkProfileAndNavigate = useCallback(async (userId: string) => {
    // Duplicate call'ları önle
    if (isNavigatingRef.current) {
      console.log('Navigation already in progress, skipping...');
      return;
    }

    try {
      isNavigatingRef.current = true;
      console.log('🔍 [checkProfileAndNavigate] Starting for user:', userId);
      console.log('🔍 [checkProfileAndNavigate] isNavigatingRef.current:', isNavigatingRef.current);
      
      // Hesap silme isteği kontrolü - eğer 30 gün içindeyse kullanıcıya "vazgeç" butonu göster
      const accountRestored = await checkAndHandleAccountDeletion(userId);
      
      // Eğer hesap geri yüklenmediyse, tekrar deletion_requested_at kontrolü yap
      // (kullanıcı "hayır" dediyse silme isteği hala var)
      if (!accountRestored) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('deletion_requested_at')
          .eq('id', userId)
          .single();
        
        if (profile?.deletion_requested_at) {
          // Silme isteği hala varsa (kullanıcı "hayır" dedi veya 30 günü geçti)
          // 30 gün kontrolü yap
          const deletionRequestedAt = new Date(profile.deletion_requested_at);
          const now = new Date();
          const daysDiff = (now.getTime() - deletionRequestedAt.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff > 30) {
            // 30 günü geçtiyse hesap geri yüklenemez, çıkış yap
            console.log('⏰ [checkProfileAndNavigate] Account deletion period expired, signing out');
            await supabase.auth.signOut();
            isNavigatingRef.current = false;
            setLoading(false);
            return;
          }
          // 30 gün içindeyse ve kullanıcı "hayır" dediyse, normal akışa devam et
          // (kullanıcı hesabını silmek istediğini onayladı ama henüz silinmedi)
        }
      }

      console.log('🔍 [checkProfileAndNavigate] Skipping profile fetch, navigating directly to onboarding');
      
      // Profile fetch'i atla - direkt onboarding'e yönlendir
      // Profil kontrolü onboarding ekranında yapılacak
      const profile = null;

      // Loading state'leri kapat
      console.log('🔍 [checkProfileAndNavigate] Closing loading states...');
      setLoading(false);
      console.log('✅ [checkProfileAndNavigate] Loading states closed');

      // Navigation path'ini belirle - önce returnUrl kontrol et
      let targetPath: string;
      if (returnUrl) {
        // returnUrl varsa oraya yönlendir
        targetPath = returnUrl;
      } else {
        // returnUrl yoksa normal akış - her zaman onboarding'e yönlendir (profile fetch atlandı)
        targetPath = '/auth/onboarding';
      }
      
      console.log('🚀 [checkProfileAndNavigate] Navigating to:', targetPath);

      // Navigation'ı gerçekleştir - birden fazla deneme yap
      let navigationAttempts = 0;
      const maxAttempts = 3;
      let navigationSuccess = false;
      const initialPath = pathname; // Başlangıç path'ini kaydet

      while (navigationAttempts < maxAttempts && !navigationSuccess) {
        navigationAttempts++;
        console.log(`🚀 [checkProfileAndNavigate] Navigation attempt ${navigationAttempts}/${maxAttempts} to ${targetPath}`);
        console.log(`🚀 [checkProfileAndNavigate] Current pathname: ${pathname}, Initial path: ${initialPath}`);
        
        try {
          // İlk denemede replace, sonraki denemelerde push kullan
          if (navigationAttempts === 1) {
            console.log('🚀 [checkProfileAndNavigate] Calling router.replace...');
            router.replace(targetPath as any);
            console.log('✅ [checkProfileAndNavigate] router.replace called successfully');
          } else {
            console.log('🚀 [checkProfileAndNavigate] Calling router.push (fallback)...');
            router.push(targetPath as any);
            console.log('✅ [checkProfileAndNavigate] router.push called successfully');
          }
          
          // Navigation'ın çalışması için delay - pathname'in değişmesini bekle
          console.log('⏳ [checkProfileAndNavigate] Waiting 800ms for navigation to complete...');
          await new Promise(resolve => setTimeout(resolve, 800));
          console.log('✅ [checkProfileAndNavigate] Wait completed');
          
          // Pathname'in değişip değişmediğini kontrol et
          // Not: pathname state'i güncellenmiş olabilir, ama callback içinde direkt erişemeyiz
          // Bu yüzden navigation'ı başarılı kabul ediyoruz
          // Eğer navigation gerçekten başarısız olursa, onAuthStateChange tekrar tetiklenecek
          // ve checkProfileAndNavigate tekrar çağrılacak, ama isNavigatingRef flag'i bunu engelleyecek
          navigationSuccess = true;
          console.log('✅ [checkProfileAndNavigate] Navigation completed successfully');
          
        } catch (navError: any) {
          console.error(`❌ [checkProfileAndNavigate] Navigation attempt ${navigationAttempts} failed:`, navError);
          console.error(`❌ [checkProfileAndNavigate] Navigation error details:`, JSON.stringify(navError, null, 2));
          
          if (navigationAttempts < maxAttempts) {
            // Bir sonraki deneme için kısa bir delay
            await new Promise(resolve => setTimeout(resolve, 300));
          } else {
            // Tüm denemeler başarısız - hata göster
            console.error('All navigation attempts failed');
            Alert.alert(
              'Yönlendirme Hatası',
              'Sayfaya yönlendirilemedi. Lütfen tekrar deneyin.',
              [
                {
                  text: 'Tekrar Dene',
                  onPress: () => {
                    isNavigatingRef.current = false;
                    checkProfileAndNavigate(userId);
                  }
                },
                {
                  text: 'Tamam',
                  onPress: () => {
                    isNavigatingRef.current = false;
                  }
                }
              ]
            );
          }
        }
      }

      if (navigationSuccess) {
        console.log('✅ [checkProfileAndNavigate] Navigation successful, resetting flag after 3s delay');
        // Navigation başarılı - flag'i sıfırla (delay ile)
        // Eğer navigation gerçekten başarısız olursa, onAuthStateChange tekrar tetiklenecek
        // ama isNavigatingRef flag'i bunu engelleyecek, bu yüzden döngü oluşmayacak
        setTimeout(() => {
          isNavigatingRef.current = false;
          console.log('✅ [checkProfileAndNavigate] Navigation flag reset');
        }, 3000);
      } else {
        console.error('❌ [checkProfileAndNavigate] Navigation was not successful after all attempts');
      }

    } catch (error: any) {
      console.error('❌ [checkProfileAndNavigate] Error in checkProfileAndNavigate:', error);
      console.error('❌ [checkProfileAndNavigate] Error details:', JSON.stringify(error, null, 2));
      setLoading(false);
      
      // Hata durumunda onboarding'e yönlendir
      try {
        console.log('🚀 [checkProfileAndNavigate] Error fallback: Navigating to onboarding');
        router.replace('/auth/onboarding');
        console.log('✅ [checkProfileAndNavigate] Error fallback navigation completed');
      } catch (navError) {
        console.error('❌ [checkProfileAndNavigate] Error fallback navigation failed:', navError);
        try {
          router.push('/auth/onboarding');
          console.log('✅ [checkProfileAndNavigate] Error fallback push completed');
        } catch (pushError) {
          console.error('❌ [checkProfileAndNavigate] Error fallback push also failed:', pushError);
        }
      }
      
      // Flag'i sıfırla
      setTimeout(() => {
        isNavigatingRef.current = false;
        console.log('✅ [checkProfileAndNavigate] Error: Navigation flag reset');
      }, 2000);
    }
  }, [router, pathname, checkAndHandleAccountDeletion]);

  // OAuth callback'i dinle - her zaman aktif
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [onAuthStateChange] Auth state changed:', event, 'User ID:', session?.user?.id);
      console.log('🔔 [onAuthStateChange] isNavigatingRef.current:', isNavigatingRef.current);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [onAuthStateChange] User signed in via OAuth:', session.user.id);
        // Duplicate call'ları önle - eğer zaten navigation yapılıyorsa atla
        if (!isNavigatingRef.current) {
          console.log('🚀 [onAuthStateChange] Calling checkProfileAndNavigate (isNavigatingRef is false)');
          // checkProfileAndNavigate içinde loading state'leri kapatılıyor
          await checkProfileAndNavigate(session.user.id);
          console.log('✅ [onAuthStateChange] checkProfileAndNavigate completed');
        } else {
          console.log('⏭️ [onAuthStateChange] Skipping checkProfileAndNavigate (navigation already in progress)');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 [onAuthStateChange] User signed out');
        setLoading(false);
        isNavigatingRef.current = false;
        console.log('✅ [onAuthStateChange] Reset states and navigation flag');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkProfileAndNavigate]);

  useEffect(() => {
    if (mode !== 'phone') {
      setSmsSent(false);
      setSmsCode('');
      setSmsLoading(false);
      setSmsVerified(false);
    }
    // Mode değiştiğinde registerType'ı sıfırla
    if (mode !== 'register') {
      setRegisterType(null);
    }
  }, [mode]);

  const handlePolicyAccept = async (policyIds: string[]) => {
    if (!policyIds || policyIds.length === 0) {
      console.error('No policy IDs provided');
      Alert.alert('Hata', 'Politika ID\'leri bulunamadı');
      return;
    }

    // Kayıt modunda kullanıcı henüz oluşturulmamış olabilir
    // Bu durumda sadece checkbox'ı işaretle, kayıt işleminden sonra politika onayı yapılacak
    if (mode === 'register') {
      console.log('📝 [login] Register mode: Marking policies as accepted, will be saved after signup');
      setPoliciesAccepted(true);
      setShowPolicyModal(false);
      return;
    }

    // Giriş modunda veya mevcut kullanıcı için politika onayını kaydet
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        setLoading(false);
        return;
      }

      console.log('📝 [login] Accepting policies:', policyIds, 'for user:', user.id);
      await consentMutation.mutateAsync({ 
        policyIds,
        userId: user.id,
      });
      console.log('✅ [login] Policies accepted successfully');
      setPoliciesAccepted(true);
      setShowPolicyModal(false);
    } catch (error: any) {
      console.error('❌ [login] Error accepting policies:', error);
      const errorMessage = error?.message || 'Politika onayı sırasında bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Telefon numarasını normalize et
  const normalizePhone = (raw: string) => {
    let value = raw.trim();
    if (!value) return '';
    
    // Sadece rakamları al
    let digits = value.replace(/\D/g, '');
    
    // Boşsa döndür
    if (!digits) return '';
    
    // Eğer zaten +90 ile başlıyorsa, olduğu gibi döndür
    if (value.startsWith('+90')) {
      return value.replace(/\D/g, '').replace(/^90/, '+90');
    }
    
    // Eğer 0 ile başlıyorsa, 0'ı kaldır
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    
    // Eğer 90 ile başlıyorsa, + ekle
    if (digits.startsWith('90')) {
      return `+${digits}`;
    }
    
    // Eğer 10 haneli numara ise (5330483061 gibi), +90 ekle
    if (digits.length === 10) {
      return `+90${digits}`;
    }
    
    // Diğer durumlarda +90 ekle
    return `+90${digits}`;
  };

  // Telefon ile giriş yap
  const handlePhoneLogin = async () => {
    const input = email.trim();
    const formatted = normalizePhone(input);
    if (!formatted) {
      Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Hata', 'Lütfen şifrenizi girin');
      return;
    }

    setLoading(true);
    try {
      // Telefon numarasını email formatına çevir (Supabase telefon + şifre girişi için)
      // Format: +905551234567 -> +905551234567@phone.mytrabzon.com
      const phoneEmail = `${formatted}@phone.mytrabzon.com`;
      
      console.log('📱 [phone-login] Attempting login with phone:', formatted);
      
      // Telefon numarasını email olarak kullanarak şifre ile giriş yap
      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: password.trim(),
      });

      if (error) {
        console.error('❌ [phone-login] Error:', error);
        throw error;
      }

      if (data?.user) {
        console.log('✅ [phone-login] Login successful');
        // Giriş başarılı - telefon numarasını profile ekle
        await updateProfileWithAuthInfo(data.user.id, undefined, formatted);
        await checkProfileAndNavigate(data.user.id);
      }
    } catch (error: any) {
      console.error('Error in phone login:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      
      // Kullanıcı bulunamadı hatası için özel mesaj
      if (error?.message?.includes('not found') || 
          error?.message?.includes('User not found') ||
          error?.message?.includes('Invalid login credentials') ||
          error?.message?.includes('invalid_credentials')) {
        Alert.alert(
          'Giriş Yapılamadı', 
          'Telefon numarası veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.'
        );
      } else {
        Alert.alert('Giriş Yapılamadı', friendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    const input = email.trim();
    
    console.log('🔍 [login] handleEmailAuth called:', {
      mode,
      input,
      inputLength: input.length,
      passwordLength: password.length,
    });
    
    // Input kontrolü
    if (!input || input.length === 0) {
      Alert.alert('Hata', 'Lütfen email veya telefon numaranızı girin');
      return;
    }
    
    // Telefon mu email mi kontrol et
    const isPhone = /^[0-9+\s-]+$/.test(input) && !input.includes('@');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(input);
    
    // Telefon numarası girildiyse telefon + şifre ile giriş yap
    if (isPhone) {
      const formatted = normalizePhone(input);
      if (!formatted) {
        Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
        return;
      }
      
      // Şifre kontrolü
      if (!password.trim()) {
        Alert.alert('Hata', 'Lütfen şifrenizi girin');
        return;
      }
      
      // Telefon + şifre ile giriş yap
      await handlePhoneLogin();
      return;
    }
    
    // Email kontrolü
    if (!isEmail) {
      Alert.alert('Hata', 'Geçerli bir email adresi veya telefon numarası girin');
      return;
    }
    
    const trimmedEmail = input.toLowerCase();
    const trimmedPassword = password.trim();
    
    // Şifre kontrolü
    if (!trimmedPassword || trimmedPassword.length === 0) {
      Alert.alert('Hata', 'Lütfen şifrenizi girin');
      return;
    }

    // Giriş modunda email + şifre ile giriş yap
    setLoading(true);
    try {
      // Giriş modunda normal şifre ile giriş yap
      const result = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: trimmedPassword });

      if (result.error) {
        // Giriş modunda email confirmation hatası
        if (result.error.message?.includes('Email not confirmed') || result.error.message?.includes('email_not_confirmed')) {
          Alert.alert(
            'Email Doğrulama Gerekli',
            'Email adresinizi doğrulamanız gerekiyor. Email kutunuzu kontrol edin ve doğrulama linkine tıklayın.',
            [
              {
                text: 'Email Gönder',
                onPress: async () => {
                  try {
                    // Email resend için web callback sayfası kullan (oradan deep link'e yönlendirecek)
                    const deepLinkUrl = getRedirectUrl('auth/callback');
                    const emailRedirectTo = Platform.select({
                      web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : deepLinkUrl,
                      default: deepLinkUrl,
                    });

                    const { error: resendError } = await supabase.auth.resend({
                      type: 'signup',
                      email: trimmedEmail,
                      options: {
                        emailRedirectTo,
                      },
                    });
                    if (resendError) throw resendError;
                    Alert.alert('Başarılı', 'Doğrulama emaili tekrar gönderildi!');
                  } catch (resendErr: any) {
                    const friendlyMessage = getFriendlyErrorMessage(resendErr);
                    Alert.alert('Email Gönderilemedi', friendlyMessage);
                  }
                },
              },
              { text: 'Tamam' },
            ]
          );
          setLoading(false);
          return;
        }
        throw result.error;
      }

      // Giriş başarılı - email bilgisini profile ekle
      const userId = result.data.user?.id || '';
      if (userId) {
        await updateProfileWithAuthInfo(userId, trimmedEmail, undefined);
      }
      checkProfileAndNavigate(userId);
    } catch (error: any) {
      console.error('Error during auth:', error);
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Apple Sign In Handler (iOS)
  const handleAppleSignIn = async () => {
    // Butona tıklandığında direkt bilgilendirme mesajı göster
    Alert.alert(
      'Yakında Eklenecek',
      'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
      [{ text: 'Tamam' }]
    );
    return;

    try {
      if (Platform.OS !== 'ios') {
        return;
      }

      setAppleLoading(true);
      console.log('🍎 [Apple] Starting Apple Sign In...');

      // Apple Sign In başlat
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        console.error('❌ [Apple] Identity token alınamadı');
        // Hata durumunda kullanıcı dostu mesaj göster
        Alert.alert(
          'Yakında Eklenecek',
          'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      console.log('🍎 [Apple] Credential received:', {
        user: credential.user,
        hasEmail: !!credential.email,
        hasFullName: !!credential.fullName,
      });

      // Supabase ile Apple Sign In
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('❌ [Apple] Sign in error:', error);
        // Hata durumunda kullanıcı dostu mesaj göster
        Alert.alert(
          'Yakında Eklenecek',
          'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      if (!data.session || !data.user) {
        console.error('❌ [Apple] Session oluşturulamadı');
        // Hata durumunda kullanıcı dostu mesaj göster
        Alert.alert(
          'Yakında Eklenecek',
          'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      console.log('✅ [Apple] Sign in successful:', data.user.id);

      // Session'ı manuel olarak set et (AuthContext'in güncellenmesi için)
      // onAuthStateChange bazen tetiklenmeyebilir, bu yüzden manuel set ediyoruz
      try {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (setSessionError) {
          console.warn('⚠️ [Apple] setSession warning (non-critical):', setSessionError);
        } else {
          console.log('✅ [Apple] Session set successfully');
        }
      } catch (setSessionErr: any) {
        console.warn('⚠️ [Apple] setSession error (non-critical):', setSessionErr);
      }

      // Kullanıcının yeni olup olmadığını kontrol et (created_at ile)
      // Eğer kullanıcı şu an oluşturulduysa (5 saniye içinde), yeni kullanıcıdır
      const userCreatedAt = new Date(data.user.created_at);
      const now = new Date();
      const timeDiff = (now.getTime() - userCreatedAt.getTime()) / 1000; // saniye cinsinden
      const isNewUser = timeDiff < 5; // 5 saniye içinde oluşturulduysa yeni kullanıcı

      console.log('🍎 [Apple] User info:', {
        userId: data.user.id,
        isNewUser,
        created_at: data.user.created_at,
        timeDiff: `${timeDiff.toFixed(2)}s`,
      });

      // Email ve isim bilgilerini profile ekle
      const email = credential.email || data.user.email;
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined;

      if (email || fullName) {
        try {
          // Yeni kullanıcıysa isNewUser: true gönder, değilse false
          await updateProfileWithAuthInfo(data.user.id, email || undefined, undefined, isNewUser);
          if (fullName) {
            await supabase
              .from('profiles')
              .update({ full_name: fullName })
              .eq('id', data.user.id);
          }
        } catch (profileError: any) {
          console.warn('⚠️ [Apple] Profile update warning (non-critical):', profileError);
        }
      }

      // Profil kontrolü ve yönlendirme
      await checkProfileAndNavigate(data.user.id);
    } catch (error: any) {
      console.error('❌ [Apple] Sign in error:', error);
      
      // Kullanıcı iptal ettiyse hata gösterme
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('🍎 [Apple] User canceled sign in');
        return;
      }

      // Hata durumunda kullanıcı dostu mesaj göster
      Alert.alert(
        'Yakında Eklenecek',
        'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setAppleLoading(false);
    }
  };

  // Google Sign In Handler (iOS & Android)
  const handleGoogleSignIn = async () => {
    // Butona tıklandığında direkt bilgilendirme mesajı göster
    Alert.alert(
      'Yakında Eklenecek',
      'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
      [{ text: 'Tamam' }]
    );
    return;

    try {
      setGoogleLoading(true);
      console.log('🔵 [Google] Starting Google Sign In...');

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xcvcplwimicylaxghiak.supabase.co';
      
      // Platform'a göre callback URL belirle
      // Mobil uygulamada direkt deep link kullan, web'de web URL kullan
      const redirectUrl = Platform.OS === 'web' 
        ? 'https://www.litxtech.com/auth/callback' // Web için
        : makeRedirectUri({
            scheme: 'mytrabzon',
            path: 'auth/callback',
          }); // Mobil için direkt deep link

      console.log('🔵 [Google] Platform:', Platform.OS);
      console.log('🔵 [Google] Redirect URL:', redirectUrl);

      // Google OAuth başlat - platform'a göre uygun URL kullan
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl, // Mobilde direkt deep link, web'de web URL
          skipBrowserRedirect: Platform.OS !== 'web', // Mobilde true, web'de false
        },
      });

      if (error) {
        console.error('❌ [Google] OAuth error:', error);
        // Hata durumunda kullanıcı dostu mesaj göster
        Alert.alert(
          'Yakında Eklenecek',
          'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      if (!data.url) {
        console.error('❌ [Google] OAuth URL alınamadı');
        // Hata durumunda kullanıcı dostu mesaj göster
        Alert.alert(
          'Yakında Eklenecek',
          'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      console.log('🔵 [Google] Opening OAuth URL in-app...');
      
      // Mobil uygulamada expo-web-browser ile uygulama içinde aç
      if (Platform.OS !== 'web') {
        const WebBrowser = await import('expo-web-browser');
        
        // OAuth URL'ini uygulama içinde aç - mobilde direkt deep link kullan
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl // Mobilde direkt deep link
        );

        console.log('🔵 [Google] OAuth result:', result.type);
        console.log('🔵 [Google] Result URL:', result.type === 'success' && 'url' in result ? result.url : 'N/A');

        if (result.type === 'success' && 'url' in result && result.url) {
          const resultUrl = result.url;
          
          // URL'den code veya token'ları çıkar
          // Android için URL parsing iyileştirmeleri
          let url: URL;
          try {
            url = new URL(resultUrl);
          } catch (urlError) {
            console.error('❌ [Google] URL parsing error:', urlError);
            // Android için alternatif parsing
            const match = resultUrl.match(/[?&#](code|access_token|error)=([^&]+)/);
            if (match && match[1] === 'code') {
              const code = decodeURIComponent(match[2]);
              console.log('🔵 [Google] Code extracted via regex:', code.substring(0, 20) + '...');
              
              const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              
              if (exchangeError) {
                console.error('❌ [Google] Code exchange error:', exchangeError);
                // Hata durumunda kullanıcı dostu mesaj göster
                Alert.alert(
                  'Yakında Eklenecek',
                  'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
                  [{ text: 'Tamam' }]
                );
                return;
              }

              if (sessionData.session && sessionData.user) {
                console.log('✅ [Google] Sign in successful:', sessionData.user.id);
                
                // Email bilgisini profile ekle
                if (sessionData.user.email) {
                  try {
                    await updateProfileWithAuthInfo(sessionData.user.id, sessionData.user.email, undefined, true);
                  } catch (profileError: any) {
                    console.warn('⚠️ [Google] Profile update warning (non-critical):', profileError);
                  }
                }

                // Profil kontrolü ve yönlendirme
                await checkProfileAndNavigate(sessionData.user.id);
                return;
              }
            }
            throw new Error('URL parse edilemedi ve code bulunamadı');
          }
          
          const code = url.searchParams.get('code') || url.hash.match(/[#&]code=([^&]+)/)?.[1];
          
          if (code) {
            console.log('🔵 [Google] Exchanging code for session...');
            const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('❌ [Google] Code exchange error:', exchangeError);
              // Hata durumunda kullanıcı dostu mesaj göster
              Alert.alert(
                'Yakında Eklenecek',
                'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
                [{ text: 'Tamam' }]
              );
              return;
            }

            if (sessionData.session && sessionData.user) {
              console.log('✅ [Google] Sign in successful:', sessionData.user.id);
              
              // Email bilgisini profile ekle
              if (sessionData.user.email) {
                try {
                  await updateProfileWithAuthInfo(sessionData.user.id, sessionData.user.email, undefined, true);
                } catch (profileError: any) {
                  console.warn('⚠️ [Google] Profile update warning (non-critical):', profileError);
                }
              }

              // Profil kontrolü ve yönlendirme
              await checkProfileAndNavigate(sessionData.user.id);
              return;
            }
          } else {
            // Android için alternatif - hash'ten code çıkarmayı dene
            console.warn('⚠️ [Google] No code in URL params, checking hash...');
            const hashMatch = resultUrl.match(/[#&]code=([^&]+)/);
            if (hashMatch) {
              const codeFromHash = decodeURIComponent(hashMatch[1]);
              console.log('🔵 [Google] Code found in hash, exchanging...');
              
              const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeFromHash);
              
              if (exchangeError) {
                console.error('❌ [Google] Code exchange error:', exchangeError);
                // Hata durumunda kullanıcı dostu mesaj göster
                Alert.alert(
                  'Yakında Eklenecek',
                  'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
                  [{ text: 'Tamam' }]
                );
                return;
              }

              if (sessionData.session && sessionData.user) {
                console.log('✅ [Google] Sign in successful:', sessionData.user.id);
                
                if (sessionData.user.email) {
                  try {
                    await updateProfileWithAuthInfo(sessionData.user.id, sessionData.user.email, undefined, true);
                  } catch (profileError: any) {
                    console.warn('⚠️ [Google] Profile update warning (non-critical):', profileError);
                  }
                }

                await checkProfileAndNavigate(sessionData.user.id);
                return;
              }
            }
            
            // Code bulunamadı - kullanıcı dostu mesaj göster
            Alert.alert(
              'Yakında Eklenecek',
              'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
              [{ text: 'Tamam' }]
            );
            return;
          }
        } else if (result.type === 'cancel') {
          console.log('🔵 [Google] User canceled sign in');
          return;
        } else {
          console.error('❌ [Google] OAuth result type:', result.type);
          // OAuth başarısız - kullanıcı dostu mesaj göster
          Alert.alert(
            'Yakında Eklenecek',
            'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
            [{ text: 'Tamam' }]
          );
          return;
        }
      } else {
        // Web platform - Supabase otomatik yönlendirme yapacak
        console.log('🔵 [Google] Web platform - Supabase will handle redirect automatically');
        // Web'de skipBrowserRedirect: false olduğu için Supabase otomatik yönlendirecek
        // Deep link handling app/_layout.tsx'te yapılacak
      }
    } catch (error: any) {
      console.error('❌ [Google] Sign in error:', error);
      
      // Kullanıcı iptal ettiyse hata gösterme
      if (error.code === 'ERR_REQUEST_CANCELED' || error.message?.includes('cancel')) {
        console.log('🔵 [Google] User canceled sign in');
        return;
      }
      
      // Hata durumunda kullanıcı dostu mesaj göster
      Alert.alert(
        'Yakında Eklenecek',
        'Bu özellik yakında eklenecek. Lütfen telefon numarasıyla giriş yapın.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendEmailCode = async () => {
    try {
      // Güvenli email validation
      if (!email || typeof email !== 'string') {
        Alert.alert('Hata', 'Lütfen geçerli bir email adresi girin');
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();
      
      if (!trimmedEmail || trimmedEmail.length === 0) {
        Alert.alert('Hata', 'Lütfen email adresinizi girin');
        return;
      }

      // Email uzunluk kontrolü
      if (trimmedEmail.length > 254) {
        Alert.alert('Hata', 'Email adresi çok uzun. Lütfen geçerli bir email adresi girin');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        Alert.alert('Hata', 'Geçerli bir email adresi girin');
        return;
      }

      setLoading(true);
      
      try {
        // Magic link gönder - web callback URL kullan (oradan deep link'e yönlendirecek)
        // Supabase email doğrulama linkleri web URL gerektirir, web callback sayfası deep link'e yönlendirir
        const webCallbackUrl = 'https://www.litxtech.com/auth/callback';
        
        console.log('📧 [magic-link] Sending magic link to:', trimmedEmail);
        console.log('📧 [magic-link] Web callback URL:', webCallbackUrl);
        console.log('📧 [magic-link] Mode:', mode, 'isRegister:', mode === 'register');
        
        // Timeout ile email gönderme
        const emailPromise = supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            shouldCreateUser: mode === 'register',
            emailRedirectTo: webCallbackUrl, // Web callback URL - oradan deep link'e yönlendirecek
          },
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email gönderme işlemi zaman aşımına uğradı')), 30000)
        );

        const { error } = await Promise.race([emailPromise, timeoutPromise]) as any;

        if (error) {
          console.error('❌ [magic-link] Error:', error);
          throw error;
        }

        Alert.alert(
          'Başarılı',
          mode === 'register'
            ? 'Email adresinize doğrulama linki gönderildi! Linke tıklayarak kayıt işleminizi tamamlayabilirsiniz.'
            : 'Email adresinize doğrulama linki gönderildi! Linke tıklayarak giriş yapabilirsiniz.'
        );
      } catch (error: any) {
        console.error('Error sending email code:', error);
        
        let errorMessage = 'Email gönderilemedi';
        try {
          errorMessage = getFriendlyErrorMessage(error);
        } catch (e) {
          errorMessage = error?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
        }
        
        Alert.alert('Email Gönderilemedi', errorMessage);
      } finally {
        setLoading(false);
      }
    } catch (error: any) {
      console.error('❌ [magic-link] Unexpected error in handleSendEmailCode:', error);
      setLoading(false);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Email kayıt için magic link gönder
  const handleSendEmailVerificationCode = async () => {
    try {
      // Güvenli email validation
      if (!email || typeof email !== 'string') {
        Alert.alert('Hata', 'Lütfen geçerli bir email adresi girin');
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();
      
      if (!trimmedEmail || trimmedEmail.length === 0) {
        Alert.alert('Hata', 'Lütfen email adresinizi girin');
        return;
      }

      // Email uzunluk kontrolü
      if (trimmedEmail.length > 254) {
        Alert.alert('Hata', 'Email adresi çok uzun. Lütfen geçerli bir email adresi girin');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        Alert.alert('Hata', 'Geçerli bir email adresi girin');
        return;
      }

      setLoading(true);
      
      try {
        // Magic link gönder - web callback URL kullan (oradan deep link'e yönlendirecek)
        const webCallbackUrl = 'https://www.litxtech.com/auth/callback';
        
        console.log('📧 [email-register] Sending magic link to:', trimmedEmail);
        console.log('📧 [email-register] Web callback URL:', webCallbackUrl);
        
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            shouldCreateUser: true, // Kayıt modu
            emailRedirectTo: webCallbackUrl, // Web callback URL - oradan deep link'e yönlendirecek
          },
        });

        if (error) {
          console.error('❌ [email-register] Error:', error);
          throw error;
        }

        Alert.alert(
          'Başarılı',
          'Email adresinize doğrulama linki gönderildi! Linke tıklayarak kayıt işleminizi tamamlayabilirsiniz.'
        );
      } catch (error: any) {
        console.error('❌ [email-register] Error sending magic link:', error);
        
        let errorMessage = 'Email gönderilemedi';
        try {
          errorMessage = getFriendlyErrorMessage(error);
        } catch (e) {
          errorMessage = error?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
        }
        
        Alert.alert('Email Gönderilemedi', errorMessage);
      } finally {
        setLoading(false);
      }
    } catch (error: any) {
      console.error('❌ [email-register] Unexpected error:', error);
      setLoading(false);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };


  // Email kayıt için bilgileri tamamla (politika onayları ve profil bilgileri)
  // Not: Kullanıcı magic link ile doğrulandı, callback'te session oluşturuldu
  const handleCompleteEmailRegistration = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    // Kayıt modunda politika onayı kontrolü
    if (requiredPolicies?.policies && requiredPolicies.policies.length > 0 && !policiesAccepted) {
      Alert.alert('Uyarı', 'Devam etmek için politikaları kabul etmeniz gerekmektedir');
      setShowPolicyModal(true);
      return;
    }

    setLoading(true);
    try {
      const userId = phoneUserId || (await supabase.auth.getUser()).data?.user?.id;
      
      if (!userId) {
        throw new Error('Kullanıcı ID bulunamadı');
      }
      
      console.log('📧 [email-register] Completing registration for user:', userId);
      
      // Email bilgisini profile ekle ve "beni göster" ayarını aç
      await updateProfileWithAuthInfo(userId, trimmedEmail, undefined, true);
      
      // Politika onaylarını kaydet
      if (requiredPolicies?.policies && requiredPolicies.policies.length > 0) {
        try {
          const policyIds = requiredPolicies.policies.map((p: any) => p.id);
          console.log('📝 [email-register] Saving policies for new user:', userId);
          await consentMutation.mutateAsync({ 
            policyIds,
            userId: userId,
          });
          console.log('✅ [email-register] Policies accepted for new user');
        } catch (policyError: any) {
          console.error('❌ [email-register] Error accepting policies:', policyError);
        }
      }
      
      // Profil kontrolü ve yönlendirme
      await checkProfileAndNavigate(userId);
    } catch (error: any) {
      console.error('❌ [email-register] Error completing registration:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Kayıt Başarısız', friendlyMessage);
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async () => {
    const input = email.trim();
    
    if (!input) {
      Alert.alert('Hata', 'Lütfen email veya telefon numaranızı girin');
      return;
    }

    setLoading(true);
    try {
      // Email mi telefon mu kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(input);
      
      if (isEmail) {
        // Email ile şifre sıfırlama
        const trimmedEmail = input.toLowerCase();
        const redirectUrl = Platform.select({
          web: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : getRedirectUrl('auth/reset-password'),
          default: getRedirectUrl('auth/reset-password'),
        });
        
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: redirectUrl,
        });
        
        if (error) throw error;
        Alert.alert('Başarılı', 'Şifre sıfırlama linki email adresinize gönderildi! Linke tıklayarak şifrenizi sıfırlayabilirsiniz.');
      } else {
        // Telefon ile şifre sıfırlama
        const formatted = normalizePhone(input);
        if (!formatted) {
          Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
          setLoading(false);
          return;
        }
        
        // Telefon numarasına OTP gönder
        const { error } = await supabase.auth.signInWithOtp({
          phone: formatted,
          options: {
            shouldCreateUser: false,
            channel: 'sms',
          },
        });
        
        if (error) throw error;
        
        // Telefon numarasını state'e kaydet
        setPhoneNumber(input);
        setSmsSent(true);
        setMode('phone-forgot');
        Alert.alert('Başarılı', 'Telefonunuza doğrulama kodu gönderildi. Lütfen kodu girin.');
      }
      
      setMode('login');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Şifre Sıfırlama Hatası', friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSmsCode = async (isRegister: boolean = false) => {
    const input = email.trim();
    const formatted = normalizePhone(input || phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
      return;
    }
    // Telefon numarasını state'e kaydet
    setPhoneNumber(formatted);
    setSmsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: {
          shouldCreateUser: isRegister, // Kayıt modunda kullanıcı oluştur
          channel: 'sms',
        },
      });
      if (error) throw error;
      setSmsSent(true);
      Alert.alert(
        'Başarılı', 
        isRegister 
          ? 'SMS doğrulama kodu gönderildi. Telefonunuza gelen kodu girin ve şifrenizi oluşturun.'
          : 'SMS doğrulama kodu gönderildi. Telefonunuza gelen kodu girin.'
      );
    } catch (error: any) {
      console.error('Error sending SMS code:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('SMS Gönderilemedi', friendlyMessage);
    } finally {
      setSmsLoading(false);
    }
  };

  const handlePhonePasswordSetup = async () => {
    // Şifre validasyonu
    if (!phonePassword.trim()) {
      Alert.alert('Hata', 'Lütfen şifre girin');
      return;
    }
    
    if (phonePassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    if (!phonePasswordConfirm.trim()) {
      Alert.alert('Hata', 'Lütfen şifre tekrarını girin');
      return;
    }
    
    if (phonePassword !== phonePasswordConfirm) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor. Lütfen kontrol edin.');
      return;
    }

    // Kayıt modunda politika onayı kontrolü
    if (requiredPolicies?.policies && requiredPolicies.policies.length > 0 && !policiesAccepted) {
      Alert.alert(
        'Politika Onayı Gerekli', 
        'Devam etmek için Kullanım Koşulları ve Gizlilik Politikası\'nı kabul etmeniz gerekmektedir.',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Politikaları Görüntüle', 
            onPress: () => setShowPolicyModal(true) 
          }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const userId = phoneUserId || (await supabase.auth.getUser()).data?.user?.id;
      
      if (!userId) {
        throw new Error('Kullanıcı ID bulunamadı');
      }
      
      console.log('📱 [phone-register] Setting password for user:', userId);
      
      // Şifreyi güncelle
      const { error: passwordError } = await supabase.auth.updateUser({
        password: phonePassword,
      });
      
      if (passwordError) {
        console.error('❌ [phone-register] Password update error:', passwordError);
        throw passwordError;
      }

      // Metadata'ya has_password ekle
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { has_password: true },
      });
      
      if (metadataError) {
        console.warn('⚠️ [phone-register] Metadata update error (non-critical):', metadataError);
        // Metadata hatası kritik değil, devam et
      }

      console.log('✅ [phone-register] Password set successfully');
      
      // Telefon numarasını profile ekle (eğer henüz eklenmediyse) ve "beni göster" ayarını aç
      const formatted = normalizePhone(phoneNumber);
      if (formatted) {
        console.log('📱 [phone-register] Updating profile with phone:', formatted);
        await updateProfileWithAuthInfo(userId, undefined, formatted, true);
      }
      
      // Politika onaylarını kontrol et ve kaydet (eğer kayıt modundaysa)
      if (requiredPolicies?.policies && requiredPolicies.policies.length > 0) {
        try {
          const policyIds = requiredPolicies.policies.map((p: any) => p.id);
          console.log('📝 [phone-register] Saving policies for new user:', userId);
          await consentMutation.mutateAsync({ 
            policyIds,
            userId: userId,
          });
          console.log('✅ [phone-register] Policies accepted for new user');
        } catch (policyError: any) {
          console.error('❌ [phone-register] Error accepting policies:', policyError);
          // Politika hatası kayıt işlemini durdurmaz
        }
      }
      
      // Telefon kayıt sonrası giriş ekranına geç
      Alert.alert(
        'Kayıt Başarılı',
        'Kaydınız tamamlandı. Şimdi giriş yapabilirsiniz.',
        [{
          text: 'Tamam',
          onPress: () => {
            // State'leri temizle ve giriş ekranına geç
            setMode('login');
            setRegisterType(null);
            setPhoneNumber('');
            setSmsSent(false);
            setSmsCode('');
            setSmsVerified(false);
            setPhonePassword('');
            setPhonePasswordConfirm('');
            setPhoneUserId(null);
            // Telefon numarasını email alanına kopyala (giriş için)
            setEmail(formatted);
          }
        }]
      );
    } catch (error: any) {
      console.error('❌ [phone-register] Error setting password:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Kayıt Başarısız', friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneForgotPassword = async () => {
    const formatted = normalizePhone(phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
      return;
    }

    setSmsLoading(true);
    try {
      // Telefon numarasına OTP gönder - signInWithOtp kullan (shouldCreateUser: false ile)
      // Not: Supabase'de telefon ile şifre sıfırlama için özel endpoint yok, signInWithOtp kullanmak zorundayız
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: {
          shouldCreateUser: false, // Yeni kullanıcı oluşturma - şifre unuttum için
          channel: 'sms',
        },
      });
      
      if (error) {
        // "Signups not allowed" hatası - kullanıcı yoksa veya telefon ile kayıt kapalıysa
        if (error.message?.includes('Signups not allowed') || 
            error.message?.includes('signups') ||
            error.message?.includes('not allowed')) {
          Alert.alert(
            'Kullanıcı Bulunamadı',
            'Bu telefon numarası ile kayıtlı bir hesap bulunamadı. Lütfen telefon numaranızı kontrol edin veya kayıt olun.'
          );
          return;
        }
        
        // Diğer hatalar
        throw error;
      }
      
      setSmsSent(true);
      Alert.alert('Başarılı', 'Telefonunuza doğrulama kodu gönderildi. Lütfen kodu girin.');
    } catch (error: any) {
      console.error('Error sending forgot password SMS:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('SMS Gönderilemedi', friendlyMessage);
    } finally {
      setSmsLoading(false);
    }
  };

  const handlePhoneResetPassword = async () => {
    const formatted = normalizePhone(phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Telefon numarası gerekli');
      return;
    }
    if (!smsVerified) {
      Alert.alert('Hata', 'Önce SMS kodunu doğrulayın');
      return;
    }
    
    // Şifre validasyonu
    if (!phonePassword.trim()) {
      Alert.alert('Hata', 'Lütfen yeni şifre girin');
      return;
    }
    
    if (phonePassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    if (!phonePasswordConfirm.trim()) {
      Alert.alert('Hata', 'Lütfen şifre tekrarını girin');
      return;
    }
    
    if (phonePassword !== phonePasswordConfirm) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor. Lütfen kontrol edin.');
      return;
    }

    setLoading(true);
    try {
      console.log('📱 [phone-forgot] Resetting password...');
      
      // SMS kodu zaten doğrulanmış, şifreyi güncelle
      const { error: updateError } = await supabase.auth.updateUser({
        password: phonePassword,
      });
      
      if (updateError) {
        console.error('❌ [phone-forgot] Password update error:', updateError);
        throw updateError;
      }

      console.log('✅ [phone-forgot] Password updated successfully');
      
      // Kullanıcı bilgisini al
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [phone-forgot] Error getting user:', userError);
        throw userError;
      }
      
      if (user?.id) {
        // Telefon numarasını profile ekle
        await updateProfileWithAuthInfo(user.id, undefined, formatted);
        
        // State'leri temizle
        setPhoneNumber('');
        setSmsSent(false);
        setSmsCode('');
        setSmsVerified(false);
        setPhonePassword('');
        setPhonePasswordConfirm('');
        setPhoneUserId(null);
        
        // Loading'i kapat
        setLoading(false);
        
        // Otomatik olarak uygulamaya yönlendir (Alert göstermeden)
        console.log('✅ [phone-forgot] Password reset successful, navigating to app...');
        await checkProfileAndNavigate(user.id);
      } else {
        // Loading'i kapat
        setLoading(false);
        
        // Kullanıcı bulunamadı, giriş ekranına yönlendir
        Alert.alert(
          'Şifre Değiştirildi',
          'Şifreniz başarıyla değiştirildi. Lütfen giriş yapın.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                setMode('login');
                setPhoneNumber('');
                setSmsSent(false);
                setSmsCode('');
                setSmsVerified(false);
                setPhonePassword('');
                setPhonePasswordConfirm('');
                setPhoneUserId(null);
                // Telefon numarasını email alanına kopyala (giriş için)
                setEmail(formatted);
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ [phone-forgot] Error resetting password:', error);
      
      // Network hatası kontrolü
      if (error?.message?.includes('Network request failed') || 
          error?.message?.includes('network') ||
          error?.code === 'NETWORK_ERROR') {
        Alert.alert(
          'Bağlantı Hatası',
          'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      } else {
        const friendlyMessage = getFriendlyErrorMessage(error);
        Alert.alert('Şifre Değiştirilemedi', friendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleVerifySmsCode = async (isRegister: boolean = false) => {
    const formatted = normalizePhone(phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Telefon numarası gerekli');
      return;
    }
    if (!smsSent) {
      Alert.alert('Hata', 'Önce telefonunuza kod gönderin');
      return;
    }
    if (!smsCode.trim()) {
      Alert.alert('Hata', 'SMS kodunu girin');
      return;
    }

    setLoading(true);
    try {
      console.log('📱 [phone-verify] Verifying SMS code for:', formatted);
      console.log('📱 [phone-verify] Is register mode:', isRegister);
      console.log('📱 [phone-verify] Current mode:', mode);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: smsCode.trim(),
        type: 'sms',
      });
      
      if (error) {
        console.error('❌ [phone-verify] OTP verification error:', error);
        throw error;
      }

      let resolvedId = data?.session?.user?.id || data?.user?.id;
      if (!resolvedId) {
        const { data: current } = await supabase.auth.getUser();
        resolvedId = current?.user?.id;
      }
      if (!resolvedId) {
        console.error('❌ [phone-verify] User ID not found');
        throw new Error('Kullanıcı doğrulanamadı');
      }
      
      console.log('✅ [phone-verify] SMS code verified, user ID:', resolvedId);
      
      // ÖNCE MOD KONTROLÜ YAP - Şifre sıfırlama durumu (phone-forgot mode)
      // Bu kontrolü en başa al ki direkt uygulamaya atmasın
      if (mode === 'phone-forgot') {
        console.log('📱 [phone-forgot] SMS verified, showing password fields');
        
        // Telefon numarasını profile ekle (async ama await etme, UI'ı bloklamasın)
        updateProfileWithAuthInfo(resolvedId, undefined, formatted).catch(err => {
          console.warn('⚠️ [phone-forgot] Profile update warning (non-critical):', err);
        });
        
        setPhoneUserId(resolvedId);
        setSmsVerified(true); // SMS doğrulandı, şifre alanlarını göster
        setSmsCode(''); // SMS kodunu temizle (güvenlik için)
        setSmsSent(false); // SMS gönderildi flag'ini sıfırla (UI'da SMS alanını gizlemek için)
        setLoading(false); // Loading'i kapat
        
        // Başarı mesajı göster
        Alert.alert(
          'Kod Doğrulandı ✅',
          'SMS kodu başarıyla doğrulandı. Lütfen yeni şifrenizi belirleyin.',
          [{ text: 'Tamam' }]
        );
        return; // ERKEN RETURN - direkt uygulamaya atmasın
      }
      
      // Kayıt modunda şifre alanını göster
      if (isRegister || mode === 'phone-register' || (mode === 'register' && registerType === 'phone')) {
        console.log('📱 [phone-register] SMS verified, showing password field');
        
        // Telefon numarasını profile ekle (async ama await etme, UI'ı bloklamasın)
        updateProfileWithAuthInfo(resolvedId, undefined, formatted).catch(err => {
          console.warn('⚠️ [phone-register] Profile update warning (non-critical):', err);
        });
        
        setPhoneUserId(resolvedId);
        setSmsVerified(true); // SMS doğrulandı, şifre alanını göster
        setSmsCode(''); // SMS kodunu temizle (güvenlik için)
        setSmsSent(false); // SMS gönderildi flag'ini sıfırla (UI'da SMS alanını gizlemek için)
        setLoading(false); // Loading'i kapat
        
        // Başarı mesajı göster
        Alert.alert(
          'Kod Doğrulandı ✅',
          'SMS kodu başarıyla doğrulandı. Lütfen şifrenizi belirleyin.',
          [{ text: 'Tamam' }]
        );
        return; // ERKEN RETURN - direkt uygulamaya atmasın
      }
      
      // Buraya gelinmemeli - sadece güvenlik için
      console.warn('⚠️ [phone-verify] Unexpected mode:', mode, 'isRegister:', isRegister);
      console.warn('⚠️ [phone-verify] This should not happen - SMS verification should only be used for registration or password reset');
      
      // Beklenmeyen durum - loading'i kapat ve hata göster
      setLoading(false);
      Alert.alert(
        'Hata',
        'Beklenmeyen bir durum oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
      
    } catch (error: any) {
      console.error('❌ [phone-verify] Error verifying SMS code:', error);
      setLoading(false); // Hata durumunda loading'i kapat
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Doğrulama Başarısız', friendlyMessage);
    }
  };





  const renderForm = () => {
    if (mode === 'forgot') {
      // Şifre sıfırlama için phone-forgot moduna yönlendir
      setMode('phone-forgot');
      return null;
    }


    if (mode === 'phone-password-setup') {
      // Bu mod şifre sıfırlama için kullanılıyor (phone-forgot'dan geliyor)
      const isPasswordReset = phoneUserId !== null && smsVerified;
      
      return (
        <View style={styles.formContainer}>
          <Text style={styles.betaText}>{isPasswordReset ? 'Yeni Şifre Belirle' : 'Şifre Belirle'}</Text>

          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre (en az 6 karakter)"
              placeholderTextColor={COLORS.textLight}
              value={phonePassword}
              onChangeText={setPhonePassword}
              secureTextEntry
              autoFocus
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre Tekrar"
              placeholderTextColor={COLORS.textLight}
              value={phonePasswordConfirm}
              onChangeText={setPhonePasswordConfirm}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!phonePassword.trim() || !phonePasswordConfirm.trim() || loading) && styles.buttonDisabled]}
            onPress={isPasswordReset ? handlePhoneResetPassword : handlePhonePasswordSetup}
            disabled={!phonePassword.trim() || !phonePasswordConfirm.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isPasswordReset ? 'Şifreyi Değiştir ve Giriş Yap' : 'Kayıt Ol'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === 'phone-forgot') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Şifremi Unuttum</Text>
          <Text style={styles.formSubtitle}>Telefon numaranıza doğrulama kodu göndereceğiz</Text>

          <View style={styles.inputContainer}>
            <PhoneCall size={20} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="5xx xxx xx xx"
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, (smsLoading || !phoneNumber.trim()) && styles.buttonDisabled]}
            onPress={handlePhoneForgotPassword}
            disabled={smsLoading || !phoneNumber.trim()}
          >
            {smsLoading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {smsSent ? 'Kodu Yeniden Gönder' : 'Doğrulama Kodu Gönder'}
              </Text>
            )}
          </TouchableOpacity>

          {smsSent && !smsVerified && (
            <>
              <Text style={[styles.formSubtitle, { marginBottom: SPACING.md, marginTop: SPACING.sm }]}>
                Telefonunuza gönderilen 6 haneli kodu girin
              </Text>
              
              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="SMS Kodu (6 haneli)"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="number-pad"
                  value={smsCode}
                  onChangeText={setSmsCode}
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!smsCode.trim() || loading) && styles.buttonDisabled]}
                onPress={async () => {
                  // phone-forgot modunda SMS doğrulaması yap
                  await handleVerifySmsCode(false);
                }}
                disabled={!smsCode.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={styles.primaryButtonText}>Kodu Doğrula</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handlePhoneForgotPassword}
                disabled={smsLoading}
              >
                <Text style={styles.secondaryButtonText}>Kodu Yeniden Gönder</Text>
              </TouchableOpacity>
            </>
          )}

          {smsVerified && (
            <>
              <View style={[styles.successMessage, { marginBottom: SPACING.md }]}>
                <Text style={styles.successText}>✅ SMS kodu doğrulandı</Text>
                <Text style={styles.successSubtext}>Yeni şifrenizi belirleyin</Text>
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Yeni Şifre (en az 6 karakter)"
                  placeholderTextColor={COLORS.textLight}
                  value={phonePassword}
                  onChangeText={setPhonePassword}
                  secureTextEntry
                  autoFocus
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Yeni Şifre Tekrar"
                  placeholderTextColor={COLORS.textLight}
                  value={phonePasswordConfirm}
                  onChangeText={setPhonePasswordConfirm}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!phonePassword.trim() || !phonePasswordConfirm.trim() || loading) && styles.buttonDisabled]}
                onPress={handlePhoneResetPassword}
                disabled={!phonePassword.trim() || !phonePasswordConfirm.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={styles.primaryButtonText}>Şifreyi Değiştir ve Giriş Yap</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => { setMode('phone'); setSmsSent(false); setSmsCode(''); }}>
            <Text style={styles.linkText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Kayıt modunda direkt telefon kayıt akışına geç
    if (mode === 'register' && !registerType) {
      setRegisterType('phone');
      return null;
    }


    // Telefon kayıt akışı
    if (mode === 'register' && registerType === 'phone') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.betaText}>Yakında tam sürüm kullanıma sunulacak</Text>
          <Text style={styles.formTitle}>Telefon ile Kayıt Ol</Text>
          
          {!smsSent && !smsVerified && (
            <>
              <View style={styles.inputContainer}>
                <PhoneCall size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Telefon numaranız (5xx xxx xx xx)"
                  placeholderTextColor={COLORS.textLight}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    setEmail(text); // Email alanına da kopyala (geri dönüş için)
                  }}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Şifre (en az 6 karakter)"
                  placeholderTextColor={COLORS.textLight}
                  value={phonePassword}
                  onChangeText={setPhonePassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Şifre Tekrar"
                  placeholderTextColor={COLORS.textLight}
                  value={phonePasswordConfirm}
                  onChangeText={setPhonePasswordConfirm}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  (!phoneNumber.trim() || !phonePassword.trim() || !phonePasswordConfirm.trim() || phonePassword !== phonePasswordConfirm || phonePassword.length < 6 || smsLoading) && styles.buttonDisabled
                ]}
                onPress={() => {
                  // Şifre validasyonu
                  if (!phonePassword.trim()) {
                    Alert.alert('Hata', 'Lütfen şifre girin');
                    return;
                  }
                  if (phonePassword.length < 6) {
                    Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
                    return;
                  }
                  if (!phonePasswordConfirm.trim()) {
                    Alert.alert('Hata', 'Lütfen şifre tekrarını girin');
                    return;
                  }
                  if (phonePassword !== phonePasswordConfirm) {
                    Alert.alert('Hata', 'Şifreler eşleşmiyor. Lütfen kontrol edin.');
                    return;
                  }
                  handleSendSmsCode(true);
                }}
                disabled={!phoneNumber.trim() || !phonePassword.trim() || !phonePasswordConfirm.trim() || phonePassword !== phonePasswordConfirm || phonePassword.length < 6 || smsLoading}
              >
                {smsLoading ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={styles.primaryButtonText}>Doğrulama Kodu Gönder</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {smsSent && !smsVerified && (
            <>
              <Text style={[styles.formSubtitle, { marginBottom: SPACING.md }]}>
                Telefonunuza gönderilen 6 haneli kodu girin
              </Text>
              
              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="SMS Kodu (6 haneli)"
                  placeholderTextColor={COLORS.textLight}
                  value={smsCode}
                  onChangeText={setSmsCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!smsCode.trim() || loading) && styles.buttonDisabled]}
                onPress={() => handleVerifySmsCode(true)}
                disabled={!smsCode.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={styles.primaryButtonText}>Kodu Doğrula</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleSendSmsCode(true)}
                disabled={smsLoading}
              >
                <Text style={styles.secondaryButtonText}>Kodu Yeniden Gönder</Text>
              </TouchableOpacity>
            </>
          )}

          {smsVerified && (
            <>
              <View style={[styles.successMessage, { marginBottom: SPACING.md }]}>
                <Text style={styles.successText}>✅ SMS kodu doğrulandı</Text>
                <Text style={styles.successSubtext}>Kayıt işlemini tamamlamak için butona tıklayın</Text>
              </View>

              {/* Politika Onay Checkbox */}
              {requiredPolicies?.policies && requiredPolicies.policies.length > 0 && (
                <TouchableOpacity
                  style={styles.policyCheckboxContainer}
                  onPress={() => setShowPolicyModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    policiesAccepted && styles.checkboxChecked,
                    { borderColor: COLORS.white }
                  ]}>
                    {policiesAccepted && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.policyCheckboxText}>
                    Kullanım Koşulları ve Gizlilik Politikası&apos;nı kabul ediyorum
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  (loading || (requiredPolicies?.policies && requiredPolicies.policies.length > 0 && !policiesAccepted)) && styles.buttonDisabled
                ]}
                onPress={handlePhonePasswordSetup}
                disabled={loading || (requiredPolicies?.policies && requiredPolicies.policies.length > 0 && !policiesAccepted)}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity 
            onPress={() => {
              setMode('login');
              setRegisterType(null);
              setPhoneNumber('');
              setSmsSent(false);
              setSmsCode('');
              setSmsVerified(false);
              setPhonePassword('');
              setPhonePasswordConfirm('');
              setPhoneUserId(null);
            }}
            style={{ marginTop: SPACING.md }}
          >
            <Text style={styles.linkText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Giriş modu
    return (
      <View style={styles.formContainer}>
        {/* Beta Sürümü Mesajı */}
        <Text style={styles.betaText}>Yakında tam sürüm kullanıma sunulacak</Text>

        <Text style={styles.formTitle}>Giriş Yap</Text>
        
        <View style={styles.inputContainer}>
          {/* Dinamik ikon: email varsa Mail, yoksa PhoneCall */}
          {email.includes('@') ? (
            <Mail size={20} color={COLORS.textLight} style={styles.inputIcon} />
          ) : (
            <PhoneCall size={20} color={COLORS.textLight} style={styles.inputIcon} />
          )}
          <TextInput
            style={styles.input}
            placeholder="Telefon veya Email"
            placeholderTextColor={COLORS.textLight}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              // Eğer telefon numarası formatındaysa phoneNumber'a da kaydet
              const isPhone = /^[0-9+\s-]+$/.test(text) && !text.includes('@');
              if (isPhone) {
                setPhoneNumber(text);
              } else {
                setPhoneNumber('');
              }
            }}
            keyboardType={email.includes('@') ? 'email-address' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Şifre Input */}
        <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor={COLORS.textLight}
            value={password}
            onChangeText={(text) => {
              console.log('🔑 [login] Password changed:', text.length, 'characters');
              setPassword(text);
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity onPress={() => setMode('forgot')}>
          <Text style={styles.forgotText}>Şifremi unuttum</Text>
        </TouchableOpacity>

        {/* Giriş Butonu */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleEmailAuth}
          disabled={loading || !email.trim()}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Text style={styles.primaryButtonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setRegisterType(null);
          setPhoneNumber('');
          setSmsSent(false);
          setSmsCode('');
          setSmsVerified(false);
        }}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Hesabın var mı? Giriş yap'}
          </Text>
        </TouchableOpacity>

        {/* Sosyal Giriş Butonları */}
        <View style={styles.socialButtonsContainer}>
          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[styles.googleButton, (googleLoading || loading) && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.googleButtonText}>Google ile Giriş Yap</Text>
            )}
          </TouchableOpacity>

          {/* Apple Sign In Button (iOS only) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.appleButton, (appleLoading || loading) && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
              disabled={appleLoading || loading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text style={styles.appleButtonText}>Apple ile Giriş Yap</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Misafir Olarak Devam Et Butonu */}
        {(mode === 'login' || mode === 'register') && (
          <>
            <TouchableOpacity
              style={[styles.guestButton, (loading || guestLoading) && styles.buttonDisabled]}
              onPress={async () => {
                try {
                  setGuestLoading(true);
                  await signInAsGuest();
                  // Misafir girişi başarılı - feed'e yönlendir
                  router.replace('/(tabs)/feed');
                } catch (error: any) {
                  console.error('Guest sign in error:', error);
                  Alert.alert('Hata', error.message || 'Misafir girişi başarısız');
                } finally {
                  setGuestLoading(false);
                }
              }}
              disabled={loading || guestLoading}
            >
              {guestLoading ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <>
                  <User size={20} color="#DC2626" style={{ marginRight: SPACING.xs }} />
                  <Text style={styles.guestButtonText}>Misafir Olarak Devam Et</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderForm()}

          <View style={styles.footer}>
            <Text style={styles.terms}>
              Devam ederek{' '}
              <Text 
                style={styles.termsLink}
                onPress={() => handlePolicyPress('terms')}
              >
                Kullanım Koşulları
              </Text>
              {' '}ve{' '}
              <Text 
                style={styles.termsLink}
                onPress={() => handlePolicyPress('privacy')}
              >
                Gizlilik Politikası
              </Text>
              &apos;nı kabul etmiş olursunuz
            </Text>

            {/* Platform Bilgileri - Estetik Düzen */}
            <View style={styles.platformInfoContainer}>
              <View style={styles.platformInfoRow}>
                <Text style={styles.platformInfoText}>☁️ Supabase Secure DB</Text>
                <Text style={styles.platformInfoSeparator}>•</Text>
                <Text style={styles.platformInfoText}>🔐 SSL Encryption</Text>
              </View>
              <View style={styles.platformInfoRow}>
                <Text style={styles.platformInfoText}>⚡ Powered by LitxTech LLC & Toprak Travel Tourism</Text>
              </View>
              <View style={styles.platformInfoRow}>
                <Text style={styles.platformInfoText}>🛡️ 17+ Age Rating</Text>
              </View>
            </View>

            {/* Politikalar - Küçük Linkler */}
            <View style={styles.policiesLinksContainer}>
              <Text style={styles.policiesLinksText}>
                <Text 
                  style={styles.policyLink}
                  onPress={() => handlePolicyPress('terms')}
                >
                  Kullanım Koşulları
                </Text>
                {' • '}
                <Text 
                  style={styles.policyLink}
                  onPress={() => handlePolicyPress('privacy')}
                >
                  Gizlilik Politikası
                </Text>
                {' • '}
                <Text 
                  style={styles.policyLink}
                  onPress={() => handlePolicyPress('childSafety')}
                >
                  Çocuk Koruma
                </Text>
                {' • '}
                <Text 
                  style={styles.policyLink}
                  onPress={() => handlePolicyPress('accountDeletion')}
                >
                  Hesap Silme
                </Text>
                {' • '}
                <Text 
                  style={styles.policyLink}
                  onPress={() => handlePolicyPress('ridePolicy')}
                >
                  Yolcu Taşıma
                </Text>
                {' • '}
                <Text 
                  style={styles.policyLink}
                  onPress={() => handlePolicyPress('dataPolicy')}
                >
                  Veri Politikası
                </Text>
              </Text>
            </View>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Policy Modal */}
      <Modal
        visible={policyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setPolicyModalVisible(false);
          setSelectedPolicy(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => {
              setPolicyModalVisible(false);
              setSelectedPolicy(null);
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPolicy?.title || 'Politika'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setPolicyModalVisible(false);
                  setSelectedPolicy(null);
                }} 
                style={styles.closeButton}
              >
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView} 
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {selectedPolicy && (
                <>
                  <Text style={styles.modalPolicyContent}>{selectedPolicy.content}</Text>
                  <Text style={styles.modalPolicyDate}>
                    Son güncelleme: {new Date(selectedPolicy.updated_at || selectedPolicy.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </>
              )}
            </ScrollView>
            
            {/* Hesap Silme Politikası için Hesap Silme Butonu */}
            {selectedPolicy?.title === 'HESAP SİLME BİLGİLENDİRMESİ' && (
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.deleteAccountButton}
                  onPress={() => {
                    setPolicyModalVisible(false);
                    setSelectedPolicy(null);
                    router.push('/profile/delete-account');
                  }}
                >
                  <Trash2 size={20} color={COLORS.textLight} style={{ marginRight: SPACING.xs }} />
                  <Text style={styles.deleteAccountButtonText}>Hesabımı Sil</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Politika Onay Modalı */}
      {requiredPolicies?.policies && requiredPolicies.policies.length > 0 && (
        <PolicyConsentModal
          visible={showPolicyModal}
          policies={requiredPolicies.policies}
          onAccept={() => {
            const policyIds = requiredPolicies.policies.map((p: any) => p.id);
            handlePolicyAccept(policyIds);
          }}
          onReject={() => {
            Alert.alert('Uyarı', 'Politikaları kabul etmeden devam edemezsiniz');
          }}
          required={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  formContainer: {
    width: '100%',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center' as const,
  },
  formTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center' as const,
    flexWrap: 'wrap',
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xl * 1.2,
    }),
  },
  formSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    opacity: 0.8,
    marginBottom: SPACING.lg,
    textAlign: 'center' as const,
    flexWrap: 'wrap',
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.background,
    borderRadius: 30,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.md,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center' as const,
      paddingTop: 0,
      paddingBottom: 0,
    }),
  },
  forgotText: {
    color: '#DC2626',
    fontSize: FONT_SIZES.sm,
    textAlign: 'right' as const,
    marginBottom: SPACING.md,
    opacity: 0.8,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  primaryButton: {
    backgroundColor: '#DC2626',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.xl,
    minHeight: 48,
    width: '100%',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 30,
    alignItems: 'center' as const,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.2,
    }),
  },
  alternativeButtonsContainer: {
    width: '100%',
    alignItems: 'center' as const,
    marginTop: SPACING.md,
  },
  googleButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
  },
  googleInfoText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    opacity: 0.7,
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xs * 1.3,
    }),
  },
  magicLinkButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    minHeight: 40,
  },
  magicLinkButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.2,
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    color: COLORS.white,
    marginHorizontal: SPACING.md,
    opacity: 0.7,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  switchText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center' as const,
    marginTop: SPACING.md,
    opacity: 0.9,
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xs,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  linkText: {
    color: '#DC2626',
    fontSize: FONT_SIZES.sm,
    textAlign: 'center' as const,
    marginTop: SPACING.md,
    textDecorationLine: 'underline' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  oauthButtonContainer: {
    width: '100%',
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.xl,
    marginTop: SPACING.md,
  },
  oauthButton: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.xl,
    minHeight: 48,
    width: '100%',
    marginTop: SPACING.md,
  },
  socialButtonsContainer: {
    width: '100%',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
    width: '100%',
  },
  appleButton: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appleButtonText: {
    color: '#DC2626',
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
  },
  guestButton: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 30,
    marginTop: SPACING.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    minHeight: 48,
  },
  guestButtonText: {
    color: '#DC2626',
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
  },
  footer: {
    marginTop: SPACING.xxl,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
  },
  policiesContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    maxWidth: '100%',
  },
  policyButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    minHeight: 32,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  policyButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.85,
    textDecorationLine: 'underline' as const,
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xs * 1.4,
    }),
  },
  policySeparator: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.5,
    marginHorizontal: SPACING.xs,
    lineHeight: FONT_SIZES.xs * 1.4,
  },
  terms: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center' as const,
    opacity: 0.8,
    lineHeight: Platform.OS === 'android' ? FONT_SIZES.xs * 1.4 : 18,
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xs,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  termsLink: {
    textDecorationLine: 'underline' as const,
  },
  betaText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
  },
  betaSubtext: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '400' as const,
    color: COLORS.white,
    opacity: 0.6,
    textAlign: 'center' as const,
    marginBottom: SPACING.lg,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  phoneInfoText: {
    color: COLORS.white,
    opacity: 0.8,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
    textAlign: 'left' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalOverlayTouchable: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  modalPolicyContent: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  modalPolicyDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontStyle: 'italic' as const,
  },
  modalButtonContainer: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  deleteAccountButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  deleteAccountButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
  },
  policyCheckboxContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
    marginRight: SPACING.sm,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  checkmark: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  policyCheckboxText: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    opacity: 0.9,
    flexWrap: 'wrap',
  },
  platformInfoContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center' as const,
    gap: SPACING.xs,
  },
  platformInfoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: SPACING.xs,
  },
  platformInfoText: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textLight,
    opacity: 0.8,
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xs * 1.3,
    }),
  },
  platformInfoSeparator: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textLight,
    opacity: 0.5,
    marginHorizontal: SPACING.xs / 2,
  },
  platformBadges: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center' as const,
    gap: SPACING.xs,
  },
  platformBadge: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.8,
    textAlign: 'center' as const,
  },
  policySection: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 36,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    width: '100%',
  },
  successMessage: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    alignItems: 'center' as const,
  },
  successText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    marginBottom: SPACING.xs,
  },
  successSubtext: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    opacity: 0.9,
  },
  policyTitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    opacity: 0.9,
    lineHeight: FONT_SIZES.xs * 1.4,
  },
  policiesLinksContainer: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center' as const,
  },
  policiesLinksText: {
    fontSize: FONT_SIZES.xs - 2,
    color: COLORS.textLight,
    opacity: 0.8,
    textAlign: 'center' as const,
    lineHeight: FONT_SIZES.xs * 1.5,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  policyLink: {
    fontSize: FONT_SIZES.xs - 2,
    color: '#DC2626',
    opacity: 0.9,
    textDecorationLine: 'underline' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  registerTypeButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 30,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '80%',
    alignSelf: 'center' as const,
  },
  registerTypeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
});
