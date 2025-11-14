import React from 'react';
import { Image, ImageStyle, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | number;
  style?: ImageStyle | ViewStyle;
  showText?: boolean;
}

const LOGO_SIZES = {
  small: 60,
  medium: 100,
  large: 150,
};

export function Logo({ size = 'medium', style, showText = false }: LogoProps) {
  const logoSize = typeof size === 'number' ? size : LOGO_SIZES[size];

  // Logo dosyası varsa kullan, yoksa splash-icon kullan
  let logoSource;
  try {
    logoSource = require('@/assets/images/logo.png');
  } catch (error) {
    // Logo yoksa splash-icon kullan
    try {
      logoSource = require('@/assets/images/splash-icon.png');
    } catch {
      // Hiçbiri yoksa null döndür (hata vermesin)
      return null;
    }
  }

  return (
    <Image
      source={logoSource}
      style={[
        {
          width: logoSize,
          height: logoSize * 0.5,
          resizeMode: 'contain',
        },
        style,
      ]}
    />
  );
}

