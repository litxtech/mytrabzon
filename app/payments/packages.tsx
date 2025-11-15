import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { stripeTrpc, stripeTrpcClient } from '@/lib/stripe-trpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Check, Crown, Zap, Heart, Football, GraduationCap } from 'lucide-react-native';

const queryClient = new QueryClient();

const PACKAGES = [
  {
    id: 'premium',
    name: 'Premium Üyelik',
    icon: Crown,
    color: '#FFD700',
    priceMonthly: 9900,
    priceYearly: 99000,
    features: [
      'Reklamsız deneyim',
      'Sınırsız post paylaşımı',
      'Sınırsız reel paylaşımı',
      'Sınırsız video eşleşme',
      'Öncelikli destek',
      'Premium profil rozeti',
      'Gelişmiş analitikler',
      'Özel tema seçenekleri',
    ],
  },
  {
    id: 'boost',
    name: 'Boost Paketi',
    icon: Zap,
    color: '#FF6B6B',
    priceMonthly: 4900,
    priceYearly: null,
    features: [
      'Post\'u öne çıkar (24 saat)',
      'Reel\'i öne çıkar (24 saat)',
      'Profili öne çıkar (24 saat)',
      'Öncelikli feed\'de görünme',
      'Daha fazla görüntülenme',
    ],
  },
  {
    id: 'video_match_premium',
    name: 'Video Eşleşme Premium',
    icon: Heart,
    color: '#FF69B4',
    priceMonthly: 7900,
    priceYearly: 79000,
    features: [
      'Sınırsız eşleşme',
      'Gelişmiş filtreler',
      'Öncelikli eşleşme',
      'Sınırsız swipe',
      'Seni beğenenleri gör',
      'Son swipe\'ı geri al',
    ],
  },
  {
    id: 'football_premium',
    name: 'Halı Saha Premium',
    icon: Football,
    color: '#4ECDC4',
    priceMonthly: 5900,
    priceYearly: 59000,
    features: [
      'Öncelikli saha rezervasyonu',
      'Özel maçlar',
      'Gelişmiş istatistikler',
      'Takım yönetimi',
      'Maç geçmişi',
      'Oyuncu puanlamaları',
    ],
  },
  {
    id: 'ktu_premium',
    name: 'KTÜ Premium',
    icon: GraduationCap,
    color: '#9B59B6',
    priceMonthly: 3900,
    priceYearly: 39000,
    features: [
      'Sınırsız not paylaşımı',
      'Özel kampüs etkinlikleri',
      'Kampüs özellikleri',
      'Çalışma grupları',
      'Sınav takvimi',
      'Kafeterya menüsü',
    ],
  },
];

function PackagesScreenContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const createCheckout = stripeTrpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        // Web için Stripe Checkout'a yönlendir
        router.push(data.url);
      } else {
        Alert.alert('Hata', 'Ödeme sayfası oluşturulamadı');
      }
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Ödeme başlatılamadı');
    },
  });

  const handlePurchase = (pkg: typeof PACKAGES[0]) => {
    if (!user) {
      Alert.alert('Giriş Gerekli', 'Ödeme yapmak için giriş yapmalısınız');
      router.push('/auth/login');
      return;
    }

    const price = billingPeriod === 'yearly' && pkg.priceYearly 
      ? pkg.priceYearly 
      : pkg.priceMonthly;

    if (!price) {
      Alert.alert('Hata', 'Bu paket için fiyat bulunamadı');
      return;
    }

    setSelectedPackage(pkg.id);

    // Boost paketi tek seferlik ödeme
    if (pkg.id === 'boost') {
      createCheckout.mutate({
        amount: price,
        currency: 'try',
        success_url: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/payments/success`,
        cancel_url: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/payments/cancel`,
        description: `${pkg.name} - Tek seferlik ödeme`,
        metadata: {
          package_id: pkg.id,
          package_name: pkg.name,
        },
      });
    } else {
      // Abonelik paketleri için subscription oluştur
      // Not: Stripe'da önce Price ID'leri oluşturmanız gerekiyor
      Alert.alert(
        'Yakında',
        'Abonelik paketleri yakında aktif olacak. Stripe Price ID\'leri yapılandırıldıktan sonra abonelik başlatılabilir.'
      );
    }
  };

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2) + ' TRY';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ödeme Paketleri</Text>
        <Text style={styles.subtitle}>İstediğin paketi seç ve özel özelliklere eriş</Text>

        {/* Billing Period Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, billingPeriod === 'monthly' && styles.toggleButtonActive]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text style={[styles.toggleText, billingPeriod === 'monthly' && styles.toggleTextActive]}>
              Aylık
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, billingPeriod === 'yearly' && styles.toggleButtonActive]}
            onPress={() => setBillingPeriod('yearly')}
          >
            <Text style={[styles.toggleText, billingPeriod === 'yearly' && styles.toggleTextActive]}>
              Yıllık
              <Text style={styles.savingsText}> (2 ay bedava)</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Packages */}
        {PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          const price = billingPeriod === 'yearly' && pkg.priceYearly 
            ? pkg.priceYearly 
            : pkg.priceMonthly;
          const isYearly = billingPeriod === 'yearly' && pkg.priceYearly !== null;

          return (
            <View key={pkg.id} style={styles.packageCard}>
              <View style={[styles.packageHeader, { backgroundColor: pkg.color + '20' }]}>
                <Icon size={32} color={pkg.color} />
                <View style={styles.packageHeaderText}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  {price && (
                    <Text style={styles.packagePrice}>
                      {formatPrice(price)}
                      {isYearly ? '/yıl' : '/ay'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.featuresList}>
                {pkg.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Check size={16} color={COLORS.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.purchaseButton, { backgroundColor: pkg.color }]}
                onPress={() => handlePurchase(pkg)}
                disabled={createCheckout.isPending && selectedPackage === pkg.id}
              >
                {createCheckout.isPending && selectedPackage === pkg.id ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    {pkg.id === 'boost' ? 'Satın Al' : 'Abone Ol'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PackagesScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <stripeTrpc.Provider client={stripeTrpcClient}>
        <PackagesScreenContent />
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
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.xl,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.xl,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  savingsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.8,
  },
  packageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
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
  featuresList: {
    marginBottom: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  purchaseButton: {
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

