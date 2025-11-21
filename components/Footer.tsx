import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { X } from 'lucide-react-native';

// Platform Politikası Metni
const PLATFORM_POLICY = {
  title: 'MyTrabzon Uygulama Hakkında & Platform Politikası',
  lastUpdated: '15.11.2025',
  content: `Uygulama Adı: MyTrabzon

Geliştirici: MyTrabzon ekibi, LITXTECH LLC & LITXTECH LTD iş birliği ile

1. Kimiz?

MyTrabzon, Karadeniz bölgesine, özellikle Trabzon ve çevresindeki gençlere, üniversite öğrencilerine, yerel halka ve ziyaretçilere yönelik olarak tasarlanmış sosyal ve dijital yaşam uygulamasıdır.

Uygulama, aşağıdaki şirketler tarafından geliştirilmekte ve işletilmektedir:

1. LITXTECH LLC (ABD)

Ticari Unvan: LITXTECH LLC

Adres: 15442 Ventura Blvd., Ste 201-1834, Sherman Oaks, California 91403, USA

Telefon: +1 307 271 5151

E-posta: support@litxtech.com

2. LITXTECH LTD (Birleşik Krallık)

Ticari Unvan: LITXTECH LTD

Adres: 71–75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom

Kayıtlı Ülke: United Kingdom

Kayıt Numarası: 16745093

MyTrabzon, bu şirketlerin ortak ürünüdür ve:

"Powered by MyTrabzon & developed by LITXTECH LLC – LITXTECH LTD"

ifadesi ile tanımlanmaktadır.

2. MyTrabzon Neden Var? (Amaç ve Vizyon)

MyTrabzon'un temel amacı:

Trabzon ve çevresinde yaşayan veya bu bölgeyle bağlantısı olan gençleri, öğrencileri ve kullanıcıları tek bir dijital platformda buluşturmak,

Sosyal medya, mesajlaşma, etkinlik, halı saha organizasyonu, üniversite yaşamı, eşleşme sistemi ve yapay zekâ destekli yerel asistanı bir araya getiren bölge odaklı süper uygulama (super app) oluşturmaktır.

Bu uygulamanın vizyonu:

Trabzon ve Karadeniz'i merkeze alan,

Güvenli, denetimli, eğlenceli, modern ve teknolojik bir sosyal alan sunmak,

Öğrenciler, yerel işletmeler, spor takımları, kulüpler ve topluluklar için dijital altyapı oluşturmaktır.

MyTrabzon:

Bugünün ihtiyacı olan sosyal ağ, mesajlaşma, etkinlik ve ödeme altyapısını sağlar,

Yarının ihtiyacı olan yapay zekâ destekli asistan, kapsamlı üniversite platformu, online etkinlikler, topluluk ekonomisi ve daha fazlası için büyümeye devam eder.

3. Uygulamanın Genel Özellikleri

MyTrabzon; sosyal medya, mesajlaşma, üniversite ortamı, spor/halı saha yönetimi, eşleşme sistemi, yapay zekâ asistanı ve ödeme sistemlerini tek çatı altında toplar.

3.1. Kullanıcı Yönetimi

E-posta/şifre ile kayıt ve giriş

Google ve Apple ile sosyal giriş seçenekleri

Magic Link ile hızlı giriş

Profil oluşturma ve düzenleme

Benzersiz kullanıcı adı sistemi

KYC (kimlik doğrulama) süreçleri

Gizlilik ve görünürlük ayarları

3.2. Sosyal Medya Özellikleri

Akış (feed) yapısı

Reels benzeri kısa video içerikler

Metin, fotoğraf ve video paylaşımı

Beğeni, yorum, paylaşım ve etkileşim özellikleri

Hashtag desteği

Algoritma tabanlı sıralama ve içerik önerileri

Topluluk kuralları ve içerik moderasyonu

3.3. Mesajlaşma ve İletişim

Birebir ve grup sohbetleri

Gerçek zamanlı (real-time) mesajlaşma

Sesli ve görüntülü arama (Agora üzerinden)

Mesaj tepkileri (emoji vb.)

Kullanıcı engelleme ve şikâyet etme imkânı

3.4. Üniversite Modu (Özellikle KTÜ ve Giresun İçin)

Öğrenci doğrulama mekanizmaları

Üniversite etkinlikleri, kulüpler ve duyurular

Ders notları ve paylaşımları

Öğrenci toplulukları için özel alanlar

3.5. Halı Saha ve Spor Yönetimi

Trabzon & Giresun bölgesinde saha rehberi

Maç oluşturma / yönetme

Takım sistemi

Eksik oyuncu bulma ilanları

Spor topluluklarını organize etmeye yönelik araçlar

3.6. Eşleşme ve Sosyal Bağlantı Sistemi

Video eşleşme sistemi (Tinder benzeri mantık)

Hızlı eşleşme (quick match)

Cinsiyet bazlı kuyruk sistemi

WebRTC tabanlı video görüşme

Güvenlik kontrolleri ve ihlal tespiti

3.7. Bildirim ve Etkileşim

Push bildirimleri

Bildirim tercihlerini kişiselleştirme

Etkinlik, mesaj, eşleşme, yorum ve sistem bildirimleri

3.9. Ödeme ve Destek Sistemleri

Stripe entegrasyonu ile güvenli ödeme altyapısı

Bağış sistemi

Destekçi paketleri ve premium özellikler (ileride devreye alınabilir)

3.10. Yönetim ve Moderasyon (Admin Panel)

Kullanıcı yönetimi

KYC süreçlerini denetleme

İçerik moderasyonu

Şikâyet ve rapor yönetimi

Topluluk güvenliğini sağlama

4. Kullanılan Teknolojiler (Geliştirici Bilgisi)

MyTrabzon modern, ölçeklenebilir ve güvenli bir teknoloji yığını ile geliştirilmiştir. Bu bölüm daha çok teknik meraklı kullanıcılar ve geliştiriciler için bilgilendirme amaçlıdır.

4.1. Frontend (Mobil)

TypeScript

React Native (v0.81.5)

React (v19.1.0)

Expo SDK (v54.0.0)

Expo Router

NativeWind (Tailwind CSS benzeri stil sistemi)

Zustand (state management)

React Query (server state yönetimi)

4.2. Backend

TypeScript

Deno Runtime (Edge Functions)

Hono (web framework)

tRPC (type-safe API)

Zod (veri doğrulama)

4.3. Veritabanı

PostgreSQL (Supabase)

SQL

Row Level Security (RLS)

Trigger'lar, fonksiyonlar ve index optimizasyonları

30+ tablo ve detaylı veri modeli

4.4. Bulut ve Altyapı

Supabase (Backend as a Service)

GitHub Actions (CI/CD)

Expo EAS (build ve deploy süreçleri)

4.5. Üçüncü Parti Entegrasyonlar

Stripe (ödeme sistemleri)

Agora (sesli ve görüntülü arama)

Expo Notifications (push bildirimleri)

5. Platform ve Erişim

MyTrabzon şu platformları hedeflemektedir:

iOS

Android

Web (kademeli olarak genişletilebilir)

Uygulamanın bazı özellikleri yalnızca belirli platformlarda veya belirli bölgelerde kullanılabilir. Zaman içinde platform desteği ve bölgesel kapsama alanı genişletilebilir.

6. Güvenlik, Gizlilik ve Uyumluluk

MyTrabzon, kullanıcı verilerinin güvenliğini ve gizliliğini ciddiye alır. Bu kapsamda:

JWT bazlı kimlik doğrulama

Row Level Security (RLS) ile satır seviyesinde veri güvenliği

Yetkisiz erişimin engellenmesi için role ve politikaya dayalı kontroller

Hassas işlemler için ek doğrulama adımları

GDPR ve KVKK gibi veri koruma mevzuatlarına uyumu hedefleyen süreçler

Spam, istismar ve kötüye kullanım tespiti için moderasyon mekanizmaları

Uygulamanın kullanımına ilişkin detaylı veri işleme ve gizlilik hükümleri, Gizlilik Politikası (Privacy Policy) ve Kullanım Şartları (Terms of Service) belgelerinde ayrıca düzenlenecektir.

7. Gelişim, Gelecek Özellikler ve Değişiklikler

MyTrabzon yaşayan bir projedir. Zaman içinde:

Yeni sosyal özellikler

Yeni üniversiteler ve şehirler için destek

Yerel işletmelerle entegrasyonlar

Etkinlik ve biletleme sistemleri

Gelişmiş topluluk araçları

Yeni ödeme ve abonelik modelleri

eklenebilir veya mevcut özellikler güncellenebilir.

Bu çerçevede:

Uygulamanın tasarımı, işleyişi, özellikleri ve kapsamı zaman içinde değiştirilebilir.

Önemli değişiklikler, uygulama içi bildirimler veya güncelleme notları aracılığıyla kullanıcılarla paylaşılır.

8. Son Hükümler

MyTrabzon; LITXTECH LLC ve LITXTECH LTD tarafından geliştirilen, yönetilen ve işletilen bir platformdur.

Kullanıcılar, uygulamayı indirerek ve kullanarak bu metinde belirtilen genel platform yaklaşımını, amaçlarını ve işleyişini kabul etmiş sayılır.

Bu metin, uygulamanın "Hakkında / Platform Politikası" niteliğindedir; detaylı hukuki şartlar ayrı Gizlilik Politikası ve Kullanım Şartları belgelerinde yer alacaktır.

Her türlü soru, öneri ve bildirim için:

E-posta: support@litxtech.com

Telefon: +1 307 271 5151

MyTrabzon'u kullandığınız için teşekkür ederiz.

Amacımız, Trabzon ve Karadeniz'in dijital dünyada hak ettiği modern, güvenli ve enerjik platforma kavuşmasını sağlamaktır.`
};

export function Footer() {
  const insets = useSafeAreaInsets();
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPlatformPolicy, setShowPlatformPolicy] = useState(false);

  // Policy'leri çek (hata durumunda sessizce handle et)
  const { data: policies } = (trpc as any).admin.getPolicies.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    onError: () => {
      // Sessizce handle et, hata mesajı gösterme
    },
  });

  const handlePolicyPress = (policy: any) => {
    setSelectedPolicy(policy);
    setShowPlatformPolicy(false);
    setModalVisible(true);
  };

  const handlePlatformPolicyPress = () => {
    setSelectedPolicy(null);
    setShowPlatformPolicy(true);
    setModalVisible(true);
  };

  const policyTypeLabels: Record<string, string> = {
    terms: 'Kullanım Şartları',
    privacy: 'Gizlilik Politikası',
    community: 'Topluluk Kuralları',
    cookie: 'Çerez Politikası',
    refund: 'İade Politikası',
    child_safety: 'Çocuk Güvenliği Politikası',
    payment: 'Ödeme ve Bağış Politikası',
    moderation: 'Moderasyon & Şikâyet Politikası',
    data_storage: 'Veri Saklama & İmha Politikası',
    eula: 'Son Kullanıcı Lisans Sözleşmesi',
    university: 'Üniversite Modu Politikası',
    event: 'Etkinlik & Halı Saha Politikası',
    other: 'Diğer',
  };

  // Aktif politikaları sırala (display_order'a göre, maksimum 20 adet)
  const activePolicies = policies
    ?.filter((p: any) => p.is_active)
    .sort((a: any, b: any) => (a.display_order || 999) - (b.display_order || 999))
    .slice(0, 20) || [];

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.versionText}>MyTrabzon v1.0</Text>
        <Text style={styles.tagline}>Trabzon&apos;un Dijital Sesi</Text>
        
        {/* Platform Politikası */}
        <View style={styles.divider} />
        <TouchableOpacity onPress={handlePlatformPolicyPress}>
          <Text style={styles.policyLink}>Uygulama Hakkında & Platform Politikası</Text>
        </TouchableOpacity>
        
        {/* Politikalar - Sıralı ve Düzenli */}
        {activePolicies.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.policiesContainer}>
              {activePolicies.map((policy: any, index: number) => (
                <React.Fragment key={policy.id}>
                  <TouchableOpacity 
                    onPress={() => handlePolicyPress(policy)}
                    style={styles.policyButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.policyLink}>
                      {policyTypeLabels[policy.policy_type] || policy.title}
                    </Text>
                  </TouchableOpacity>
                  {index < activePolicies.length - 1 && <Text style={styles.separator}>•</Text>}
                </React.Fragment>
              ))}
            </View>
          </>
        )}
        
        <Text style={styles.copyright}>© 2025 MyTrabzon. Tüm hakları saklıdır.</Text>
      </View>

      {/* Policy Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setShowPlatformPolicy(false);
          setSelectedPolicy(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => {
              setModalVisible(false);
              setShowPlatformPolicy(false);
              setSelectedPolicy(null);
            }}
          />
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, SPACING.xl) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showPlatformPolicy 
                  ? PLATFORM_POLICY.title 
                  : selectedPolicy 
                    ? (policyTypeLabels[selectedPolicy.policy_type] || selectedPolicy.title) 
                    : ''}
              </Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setShowPlatformPolicy(false);
              }} style={styles.closeButton}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView} 
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {showPlatformPolicy ? (
                <>
                  <Text style={styles.modalPolicyTitle}>{PLATFORM_POLICY.title}</Text>
                  <Text style={styles.modalPolicyContent}>{PLATFORM_POLICY.content}</Text>
                  <Text style={styles.modalPolicyDate}>
                    Son güncelleme: {PLATFORM_POLICY.lastUpdated}
                  </Text>
                </>
              ) : selectedPolicy ? (
                <>
                  <Text style={styles.modalPolicyTitle}>{selectedPolicy.title}</Text>
                  <Text style={styles.modalPolicyContent}>{selectedPolicy.content}</Text>
                  <Text style={styles.modalPolicyDate}>
                    Son güncelleme: {new Date(selectedPolicy.updated_at || selectedPolicy.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  versionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  tagline: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  developedBy: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  companyName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  websiteLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
    textDecorationLine: 'underline' as const,
  },
  contactContainer: {
    alignItems: 'center' as const,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  contactText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.secondary,
    textDecorationLine: 'underline' as const,
  },
  linksContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  link: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textDecorationLine: 'underline' as const,
  },
  copyright: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    opacity: 0.7,
  },
  addressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center' as const,
  },
  policiesContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
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
  policyLink: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textDecorationLine: 'underline' as const,
    textAlign: 'center' as const,
  },
  separator: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    opacity: 0.6,
    marginHorizontal: SPACING.xs,
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
    paddingBottom: SPACING.xl,
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
    maxHeight: '100%',
  },
  modalScrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  modalPolicyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: SPACING.md,
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
});
