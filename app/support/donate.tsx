import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { Heart, ExternalLink } from 'lucide-react-native';

function DonateScreenContent() {
  // Web sayfasına yönlendir
  const handleDonate = () => {
    Linking.openURL('https://www.litxtech.com/donation');
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

        {/* Bağış Butonu */}
        <TouchableOpacity
          style={styles.donateButton}
          onPress={handleDonate}
          activeOpacity={0.8}
        >
          <Heart size={24} color={COLORS.white} />
          <Text style={styles.donateButtonText}>Bağış Yap</Text>
          <ExternalLink size={20} color={COLORS.white} />
        </TouchableOpacity>

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
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: 16,
    marginVertical: SPACING.xl,
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  donateButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
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
