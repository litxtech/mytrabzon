import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES } from '@/constants/theme';

interface GenderIconProps {
  gender: 'male' | 'female' | 'other' | null | undefined;
  size?: number;
  color?: string;
}

export function GenderIcon({ gender, size = 16, color = COLORS.text }: GenderIconProps) {
  if (!gender || gender === 'other') {
    return null;
  }

  const icon = gender === 'male' ? '♂' : '♀';
  const iconColor = gender === 'male' ? '#3B82F6' : '#EC4899'; // Mavi ve pembe renkler

  return (
    <Text style={[styles.icon, { fontSize: size, color: iconColor || color }]}>
      {icon}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontWeight: '700' as const,
    lineHeight: FONT_SIZES.md,
  },
});

