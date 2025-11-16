import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '@/constants/theme';
import { MapPin } from 'lucide-react-native';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  style?: any;
}

const LOGO_SIZES = {
  small: { icon: 20, text: FONT_SIZES.lg, spacing: SPACING.xs },
  medium: { icon: 32, text: FONT_SIZES.xxl, spacing: SPACING.sm },
  large: { icon: 48, text: 40, spacing: SPACING.md },
};

export function AppLogo({ size = 'medium', showIcon = true, showText = false, style }: AppLogoProps) {
  const sizes = LOGO_SIZES[size];

  return (
    <View style={[styles.container, style]}>
      {showIcon && (
        <View style={[styles.iconContainer, showText && { marginBottom: sizes.spacing }]}>
          <MapPin size={sizes.icon} color={COLORS.error} fill={COLORS.error} />
        </View>
      )}
      {showText && (
        <Text style={[styles.text, { fontSize: sizes.text }]}>MyTrabzon</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.error,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

