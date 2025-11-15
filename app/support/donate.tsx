import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { stripeTrpc, stripeTrpcClient } from '@/lib/stripe-trpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Heart, Check, Eye, EyeOff } from 'lucide-react-native';

const queryClient = new QueryClient();

function DonateScreenContent() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Error boundary için try-catch
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Lütfen giriş yapın</Text>
        </View>
      </SafeAreaView>
    );
  }
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');

  const { data: packages, isLoading: packagesLoading } = stripeTrpc.stripe.getSupporterPackages.useQuery();

  const createCheckout = stripeTrpc.stripe.createCheckoutSession.useMutation();

  const createDonation = stripeTrpc.stripe.createSupporterDonation.useMutation({
    onSuccess: async (data) => {
      if (data.client_secret && data.payment_intent_id) {
        // Web için Stripe Checkout Session kullan
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            // Seçili paketi bul
            const selectedPkg = packages?.find((p: any) => p.id === selectedPackage);
            if (!selectedPkg) {
              Alert.alert('Hata', 'Paket bilgisi bulunamadı');
              return;
            }

            // Web için Checkout Session oluştur
            const checkoutResponse = await createCheckout.mutateAsync({
              amount: selectedPkg.amount,
              currency: 'try',
              success_url: `${window.location.origin}/support/donate?success=true&payment_intent_id=${data.payment_intent_id}`,
              cancel_url: `${window.location.origin}/support/donate?canceled=true`,
              description: selectedPkg.display_name || 'MyTrabzon Destek',
              metadata: {
                donation_id: data.donation_id || '',
                payment_intent_id: data.payment_intent_id,
                type: 'supporter_donation',
              },
            });

            if (checkoutResponse.url) {
              // Web tarayıcısında Stripe Checkout'a yönlendir
              window.location.href = checkoutResponse.url;
            }
          } catch (error: any) {
            Alert.alert('Hata', error.message || 'Ödeme sayfası açılamadı');
          }
        } else {
          // Mobil için Payment Intent kullan (gelecekte Stripe React Native SDK eklenecek)
          Alert.alert(
            'Ödeme Hazır',
            'Ödeme işlemi başlatıldı. Stripe SDK entegrasyonu tamamlandığında ödeme yapabileceksiniz.',
            [{ text: 'Tamam' }]
          );
        }
      }
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Bağış oluşturulamadı');
    },
  });

  const checkDonationStatus = stripeTrpc.stripe.checkDonationStatus.useMutation();

  // Web'de success/cancel durumlarını kontrol et
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const canceled = params.get('canceled');
      const paymentIntentId = params.get('payment_intent_id');

      if (success && paymentIntentId) {
        // Ödeme başarılı, durumu kontrol et
        checkDonationStatus.mutate(
          { payment_intent_id: paymentIntentId },
          {
            onSuccess: (result) => {
              if (result.status === 'completed') {
                Alert.alert('Başarılı!', 'Bağışınız için teşekkür ederiz! Destekçi etiketi profilinize eklendi.');
                // URL'den parametreleri temizle
                window.history.replaceState({}, '', '/support/donate');
              }
            },
            onError: (error) => {
              console.error('Donation status check error:', error);
            },
          }
        );
      } else if (canceled) {
        Alert.alert('İptal Edildi', 'Ödeme işlemi iptal edildi.');
        // URL'den parametreleri temizle
        window.history.replaceState({}, '', '/support/donate');
      }
    }
  }, [checkDonationStatus]);

  const handleDonate = (pkg: any) => {
    if (!user) {
      Alert.alert('Giriş Gerekli', 'Bağış yapmak için giriş yapmalısınız');
      router.push('/auth/login');
      return;
    }

    setSelectedPackage(pkg.id);
    createDonation.mutate({
      package_id: pkg.id,
      is_anonymous: isAnonymous,
      message: message.trim() || undefined,
    });
  };

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2) + ' TRY';
  };

  const getBadgeDuration = (days: number | null) => {
    if (!days) return 'Kalıcı';
    if (days === 30) return '30 gün';
    if (days === 90) return '90 gün';
    return `${days} gün`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Heart size={32} color={COLORS.primary} />
          <Text style={styles.title}>MyTrabzon'u Destekle</Text>
          <Text style={styles.subtitle}>
            MyTrabzon, üniversite öğrencilerini bir araya getiren; etkinlikler, topluluk organizasyonları, sosyal buluşmalar ve şehir içi yaşamı kolaylaştıran bir mobil uygulamadır.
          </Text>
          <Text style={styles.description}>
            Bu destekler üniversiteliler için kahvaltı etkinlikleri, sosyal buluşmalar, kültür-gezi ve doğa turları organizasyon desteği, MyTrabzon uygulamasının geliştirilmesi, güvenlik ve altyapı masrafları için kullanılmaktadır.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Bağış yapmak zorunlu değildir ve herhangi bir uygulama özelliğini açmak için gerekli değildir. Bağışlar tamamen isteğe bağlıdır.
            </Text>
          </View>
        </View>

        {/* Anonimlik ve Mesaj */}
        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={styles.anonymousOption}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            {isAnonymous ? (
              <EyeOff size={20} color={COLORS.primary} />
            ) : (
              <Eye size={20} color={COLORS.textLight} />
            )}
            <Text style={[styles.anonymousText, isAnonymous && styles.anonymousTextActive]}>
              İsimsiz bağış yap
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.messageInput}
            placeholder="Mesajınız (isteğe bağlı)"
            placeholderTextColor={COLORS.textLight}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={200}
          />
        </View>

        {/* Paketler */}
        {packagesLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <View style={styles.packagesContainer}>
            {packages?.map((pkg: any) => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <Heart size={24} color={COLORS.primary} />
                  <View style={styles.packageHeaderText}>
                    <Text style={styles.packageName}>{pkg.display_name}</Text>
                    <Text style={styles.packagePrice}>{formatPrice(pkg.amount)}</Text>
                  </View>
                </View>

                {pkg.description && (
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                )}

                <View style={styles.badgeInfo}>
                  <Check size={16} color={COLORS.success} />
                  <Text style={styles.badgeInfoText}>
                    Destekçi etiketi: {getBadgeDuration(pkg.badge_duration_days)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.donateButton,
                    createDonation.isPending && selectedPackage === pkg.id && styles.donateButtonDisabled
                  ]}
                  onPress={() => handleDonate(pkg)}
                  disabled={createDonation.isPending && selectedPackage === pkg.id}
                >
                  {createDonation.isPending && selectedPackage === pkg.id ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.donateButtonText}>Destek Ol</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Bilgilendirme */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Bu sistem ticari satış, ürün/servis satışı veya üyelik modeli değildir. Tüm destekler, topluluk faaliyetlerinin sürdürülebilirliği içindir.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function DonateScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <stripeTrpc.Provider client={stripeTrpcClient}>
        <DonateScreenContent />
      </stripeTrpc.Provider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: COLORS.primary + '20',
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsSection: {
    marginBottom: SPACING.xl,
  },
  anonymousOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  anonymousText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  anonymousTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  messageInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  packagesContainer: {
    gap: SPACING.lg,
  },
  packageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  packageHeaderText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  packageName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  packagePrice: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  packageDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  badgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  badgeInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: '600',
  },
  donateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  donateButtonDisabled: {
    opacity: 0.6,
  },
  donateButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  footerInfo: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
});

