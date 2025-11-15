import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { Heart, ExternalLink, Coffee } from 'lucide-react-native';

const DONATION_AMOUNTS = [
  { amount: 89, label: 'Bir Kahve', color: '#FFD700', badgeColor: 'yellow' },
  { amount: 139, label: 'İki Kahve', color: '#4CAF50', badgeColor: 'green' },
  { amount: 339, label: 'Üç Kahve', color: '#2196F3', badgeColor: 'blue' },
  { amount: 3000, label: 'Özel Destek', color: '#F44336', badgeColor: 'red' },
];

function DonateScreenContent() {
  // Web sayfasına yönlendir - miktar parametresi ile
  const handleDonate = (amount: number) => {
    const url = `https://www.litxtech.com/donation?amount=${amount}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Heart size={48} color={COLORS.primary} />
          <Text style={styles.title}>MyTrabzon&apos;u Destekle</Text>
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

        {/* Bağış Seçenekleri */}
        <View style={styles.donationOptions}>
          <Text style={styles.sectionTitle}>Bir Kahve Ismarla ☕</Text>
          <Text style={styles.sectionSubtitle}>
            Bağış yaparak MyTrabzon topluluğuna destek olabilirsiniz
          </Text>
          
          {DONATION_AMOUNTS.map((option) => (
            <TouchableOpacity
              key={option.amount}
              style={[styles.donationCard, { borderLeftColor: option.color, borderLeftWidth: 4 }]}
              onPress={() => handleDonate(option.amount)}
              activeOpacity={0.8}
            >
              <View style={styles.donationCardContent}>
                <Coffee size={24} color={option.color} />
                <View style={styles.donationCardInfo}>
                  <Text style={styles.donationCardLabel}>{option.label}</Text>
                  <Text style={styles.donationCardAmount}>{option.amount} ₺</Text>
                </View>
                <View style={[styles.badgePreview, { backgroundColor: option.color + '20' }]}>
                  <Text style={[styles.badgePreviewText, { color: option.color }]}>
                    {option.badgeColor === 'yellow' && '🌟'}
                    {option.badgeColor === 'green' && '💚'}
                    {option.badgeColor === 'blue' && '💙'}
                    {option.badgeColor === 'red' && '❤️'}
                    {' '}Destekçi
                  </Text>
                </View>
              </View>
              <ExternalLink size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bilgilendirme */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Bu sistem ticari satış, ürün/servis satışı veya üyelik modeli değildir. Tüm destekler, topluluk faaliyetlerinin sürdürülebilirliği içindir.
          </Text>
          <Text style={styles.footerLink}>
            Bağış sayfasına gitmek için yukarıdaki butona tıklayın.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function DonateScreen() {
  return <DonateScreenContent />;
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
    textAlign: 'center',
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
    width: '100%',
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  donationOptions: {
    marginVertical: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  donationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  donationCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  donationCardInfo: {
    flex: 1,
  },
  donationCardLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  donationCardAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  badgePreview: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  badgePreviewText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
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
    marginBottom: SPACING.sm,
  },
  footerLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
});
