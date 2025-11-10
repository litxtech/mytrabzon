import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';

export function Footer() {
  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening link:', err));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.versionText}>MyTrabzon v1.0</Text>
      <Text style={styles.tagline}>Trabzon&apos;un Dijital Sesi</Text>
      
      <View style={styles.divider} />
      
      <Text style={styles.developedBy}>Developed by</Text>
      <Text style={styles.companyName}>LITXTECH LLC</Text>
      
      <TouchableOpacity onPress={() => handleLinkPress('https://www.litxtech.com')}>
        <Text style={styles.websiteLink}>www.litxtech.com</Text>
      </TouchableOpacity>
      
      <View style={styles.contactContainer}>
        <TouchableOpacity onPress={() => handleLinkPress('tel:+13072715151')}>
          <Text style={styles.contactText}>+1 307 271 5151</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleLinkPress('mailto:support@litxtech.com')}>
          <Text style={styles.contactText}>support@litxtech.com</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => handleLinkPress('https://www.litxtech.com/privacy-policy')}>
          <Text style={styles.link}>Gizlilik Politikası</Text>
        </TouchableOpacity>
        <Text style={styles.separator}>•</Text>
        <TouchableOpacity onPress={() => handleLinkPress('https://www.litxtech.com/terms-of-service')}>
          <Text style={styles.link}>Kullanım Koşulları</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => handleLinkPress('https://www.litxtech.com/commercial-agreement')}>
          <Text style={styles.link}>Ticari Sözleşme</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.copyright}>© 2025 LITXTECH LLC. Tüm hakları saklıdır.</Text>
    </View>
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
  separator: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  copyright: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    opacity: 0.7,
  },
});
