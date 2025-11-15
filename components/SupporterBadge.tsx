import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Heart } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';

interface SupporterBadgeProps {
  visible?: boolean;
  onToggle?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function SupporterBadge({ visible = true, onToggle, size = 'medium' }: SupporterBadgeProps) {
  if (!visible) return null;

  const sizeStyles = {
    small: {
      padding: SPACING.xs,
      fontSize: FONT_SIZES.xs,
      iconSize: 12,
    },
    medium: {
      padding: SPACING.xs,
      fontSize: FONT_SIZES.sm,
      iconSize: 14,
    },
    large: {
      padding: SPACING.sm,
      fontSize: FONT_SIZES.md,
      iconSize: 16,
    },
  };

  const currentSize = sizeStyles[size];

  const badgeContent = (
    <View style={[styles.badge, { padding: currentSize.padding }]}>
      <Heart size={currentSize.iconSize} color={COLORS.primary} fill={COLORS.primary} />
      <Text style={[styles.badgeText, { fontSize: currentSize.fontSize }]}>Destekçi</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    borderRadius: 20,
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

