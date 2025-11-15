import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';

interface SupporterBadgeProps {
  visible?: boolean;
  onToggle?: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: 'yellow' | 'green' | 'blue' | 'red' | null;
}

// TikTok benzeri renk tanımlamaları - Yuvarlak arka plan, beyaz tik
const BADGE_COLORS = {
  yellow: '#FFD700', // Sarı
  green: '#4CAF50',  // Yeşil
  blue: '#2196F3',   // Mavi (TikTok benzeri)
  red: '#F44336',    // Kırmızı
};

export function SupporterBadge({ visible = true, onToggle, size = 'small', color = null }: SupporterBadgeProps) {
  if (!visible) return null;

  const sizeStyles = {
    small: {
      containerSize: 18,
      iconSize: 12,
      borderWidth: 2,
    },
    medium: {
      containerSize: 22,
      iconSize: 14,
      borderWidth: 2.5,
    },
    large: {
      containerSize: 26,
      iconSize: 16,
      borderWidth: 3,
    },
  };

  const currentSize = sizeStyles[size];
  const badgeColor = color && BADGE_COLORS[color] ? BADGE_COLORS[color] : BADGE_COLORS.blue;

  const badgeContent = (
    <View 
      style={[
        styles.badge, 
        { 
          width: currentSize.containerSize,
          height: currentSize.containerSize,
          borderRadius: currentSize.containerSize / 2,
          backgroundColor: badgeColor,
          borderWidth: currentSize.borderWidth,
          borderColor: COLORS.white,
        }
      ]}
    >
      <Check 
        size={currentSize.iconSize} 
        color={COLORS.white} 
        strokeWidth={3}
      />
    </View>
  );

  if (onToggle) {
    return (
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        {badgeContent}
      </TouchableOpacity>
    );
  }

  return badgeContent;
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});

