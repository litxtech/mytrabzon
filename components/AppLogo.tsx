import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const LOGO_FONT_SIZES: Record<'small' | 'medium' | 'large', number> = {
  small: 20,
  medium: 28,
  large: 36,
};

export function AppLogo({ size = 'medium', style }: AppLogoProps) {
  const fontSize = LOGO_FONT_SIZES[size];

  return (
    <Text style={[styles.logoText, { fontSize }, style]}>
      MyTrabzon
    </Text>
  );
}

const styles = StyleSheet.create({
  logoText: {
    color: COLORS.error,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

