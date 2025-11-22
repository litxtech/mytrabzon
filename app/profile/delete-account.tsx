import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { ArrowLeft, Trash2, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user, signOut, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  
  // Giriş kontrolü - eğer giriş yapılmamışsa giriş sayfasına yönlendir
  useEffect(() => {
    if (!authLoading && !user) {
      setNeedsLogin(true);
      // Giriş sayfasına yönlendir, geri dönüş için returnUrl ekle
      router.replace({
        pathname: '/auth/login',
        params: { returnUrl: '/profile/delete-account' },
      } as any);
    }
  }, [user, authLoading, router]);

  const deleteAccountMutation = trpc.user.requestAccountDeletion.useMutation({
    onSuccess: async () => {
      // Hesap silme başarılı - AsyncStorage'dan misafir bilgilerini temizle
      try {
        await AsyncStorage.multiRemove([
          '@mytrabzon:guest_email',
          '@mytrabzon:guest_password',
          '@mytrabzon:guest_user_id',
        ]);
        console.log('✅ [DeleteAccount] Guest credentials cleared from AsyncStorage');
      } catch (storageError: any) {
        console.warn('⚠️ [DeleteAccount] Failed to clear guest credentials:', storageError);
        // Hata olsa bile devam et
      }
      
      // Direkt çıkış yap ve giriş sayfasına yönlendir
      await signOut();
      router.replace('/auth/login');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Hesap silme işlemi sırasında bir hata oluştu.');
      setLoading(false);
    },
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı silmek istediğinize emin misiniz?\n\nHesabınız anında gizlenecek ve 30 gün sonra kalıcı olarak silinecektir. Bu süre içinde giriş yaparsanız hesabınızı geri yükleyebilirsiniz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            deleteAccountMutation.mutate();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Hesap Silme',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Uyarı İkonu */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.error}20` }]}>
            <AlertTriangle size={48} color={theme.colors.error} />
          </View>
        </View>

        {/* Başlık */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          HESAP SİLME BİLGİLENDİRMESİ
        </Text>

        {/* İçerik */}
        <View style={[styles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            1. Silme Süresi
          </Text>
          <Text style={[styles.contentText, { color: theme.colors.textLight }]}>
            Hesap silme talebi verildiğinde hesabınız anında gizlenir, kimse tarafından görülemez.
          </Text>
          <Text style={[styles.contentText, { color: theme.colors.textLight, marginTop: SPACING.sm }]}>
            Ancak kalıcı silme işlemi 30 gün sonra gerçekleştirilir.
          </Text>
          <View style={styles.infoBox}>
            <Clock size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Bu 30 günlük dönem boyunca hesabınıza giriş yaparsanız silme işlemi otomatik olarak iptal olur.
            </Text>
          </View>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            2. Silinen Veriler
          </Text>
          <Text style={[styles.contentText, { color: theme.colors.textLight }]}>
            30 gün tamamlandığında aşağıdaki bilgiler tamamen silinir:
          </Text>
          <View style={styles.listContainer}>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Kişisel bilgiler (ad, soyad, e-posta, telefon)</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Profil fotoğrafı</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Mesajlaşma kayıtları</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Konum geçmişi</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Yol arkadaşı ilanları</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Halı saha rezervasyonları</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• AI (LazGPT) sohbet geçmişleri</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Toprak Travel Tourism hesap bilgileri</Text>
          </View>
          <View style={[styles.warningBox, { backgroundColor: `${theme.colors.error}15`, borderColor: `${theme.colors.error}30` }]}>
            <XCircle size={20} color={theme.colors.error} />
            <Text style={[styles.warningText, { color: theme.colors.error }]}>
              Tüm kişisel verilerin bağlantısı kaldırılır; geri dönüşü yoktur.
            </Text>
          </View>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            3. Anonimleştirilen Veriler
          </Text>
          <Text style={[styles.contentText, { color: theme.colors.textLight }]}>
            Topluluk güvenliği için bazı içerikler tamamen silinmez, anonim hale getirilir:
          </Text>
          <View style={styles.listContainer}>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Eski yorumlar</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Gönderiler</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Beğeniler</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Olay Var postları</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Diğer kullanıcılara görünmüş içerikler</Text>
          </View>
          <Text style={[styles.contentText, { color: theme.colors.textLight, marginTop: SPACING.sm, fontStyle: 'italic' }]}>
            Bu içerikler kimliğinizle ilişkilendirilmez ve "Bu gönderi silinmiş bir kullanıcıya aittir" şeklinde görünür.
          </Text>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            4. Yasal Olarak Saklanması Gereken Kayıtlar
          </Text>
          <Text style={[styles.contentText, { color: theme.colors.textLight }]}>
            Toprak Travel Tourism üzerinden yapılan tur rezervasyonları, transfer işlemleri ve fatura/ödeme kayıtları Türkiye mevzuatı gereği 2–5 yıl saklanmak zorundadır.
          </Text>
          <Text style={[styles.contentText, { color: theme.colors.textLight, marginTop: SPACING.sm }]}>
            Ancak 30 gün sonunda burada da ad-soyad, e-posta ve telefon bilgileriniz tamamen silinir ve kayıtlar kimliksiz (anonim) hale gelir.
          </Text>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            5. Geri Alma Hakkı
          </Text>
          <View style={styles.infoBox}>
            <CheckCircle2 size={20} color={theme.colors.success} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              30 gün içinde giriş yaparsanız → Hesabınız geri açılır.
            </Text>
          </View>
          <View style={[styles.warningBox, { backgroundColor: `${theme.colors.error}15`, borderColor: `${theme.colors.error}30`, marginTop: SPACING.sm }]}>
            <XCircle size={20} color={theme.colors.error} />
            <Text style={[styles.warningText, { color: theme.colors.error }]}>
              30 gün geçtikten sonra → Hesap ve kişisel veriler geri getirilemez.
            </Text>
          </View>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            6. Güvenlik
          </Text>
          <View style={styles.listContainer}>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Yetkisiz erişime izin verilmez</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Supabase üzerindeki tüm kullanıcıya bağlı kayıtlar kaldırılır veya anonim yapılır</Text>
            <Text style={[styles.listItem, { color: theme.colors.textLight }]}>• Sistemde kalan hiçbir veri kimliğinizle eşleştirilemez</Text>
          </View>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            7. İletişim
          </Text>
          <Text style={[styles.contentText, { color: theme.colors.textLight, fontWeight: '600' }]}>
            Silme süreciyle ilgili her türlü destek için:
          </Text>
          <View style={styles.contactContainer}>
            <Text style={[styles.contactTitle, { color: theme.colors.text }]}>LITXTECH LLC – USA</Text>
            <Text style={[styles.contactText, { color: theme.colors.textLight }]}>📧 support@litxtech.com</Text>
            <Text style={[styles.contactText, { color: theme.colors.textLight }]}>📞 +1 307 271 5151</Text>
          </View>
          <View style={styles.contactContainer}>
            <Text style={[styles.contactTitle, { color: theme.colors.text }]}>LITXTECH LTD – UK</Text>
            <Text style={[styles.contactText, { color: theme.colors.textLight }]}>📧 info@litxtech.com</Text>
          </View>
          <View style={styles.contactContainer}>
            <Text style={[styles.contactTitle, { color: theme.colors.text }]}>Toprak Travel Tourism – Turkey</Text>
          </View>
        </View>

        {/* Silme Butonu */}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Trash2 size={20} color={COLORS.white} />
              <Text style={styles.deleteButtonText}>Hesabımı Sil</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  contentCard: {
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  listContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  listItem: {
    fontSize: FONT_SIZES.md,
    lineHeight: FONT_SIZES.md * 1.6,
    marginBottom: SPACING.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * 1.5,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * 1.5,
    fontWeight: '600',
  },
  contactContainer: {
    marginTop: SPACING.md,
  },
  contactTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  contactText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  contentText: {
    fontSize: FONT_SIZES.md,
    lineHeight: FONT_SIZES.md * 1.6,
  },
});

