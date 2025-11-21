import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import VerifiedBadgeIcon from './VerifiedBadge';

type KarmaBarProps = {
  karmaScore: number; // -100 to 100 (from database)
  karmaLevel: 'noble' | 'good' | 'neutral' | 'bad' | 'banned';
  isBannedFromRides?: boolean;
  showLabel?: boolean;
};

export function KarmaBar({ karmaScore, karmaLevel, isBannedFromRides = false, showLabel = true }: KarmaBarProps) {
  // Normalize karma score from -100..100 to 0..100 for display
  // -100 = 0% (all red), 0 = 50% (half red/half green), 100 = 100% (all green)
  const normalizedScore = Math.max(0, Math.min(100, ((karmaScore + 100) / 2)));
  // Karma skoruna göre renk hesapla
  const getBarColor = () => {
    if (karmaScore === 0) return COLORS.error; // Kırmızı
    if (karmaScore === 100) return COLORS.success; // Yeşil
    if (karmaScore >= 50) {
      // Yeşile doğru (50-100)
      const ratio = (karmaScore - 50) / 50;
      const green = Math.round(0 + ratio * 166); // 0 -> 166 (00A676)
      const blue = Math.round(166 + ratio * 0); // 166 -> 166
      return `rgb(0, ${green}, ${blue})`;
    } else {
      // Kırmızıya doğru (0-50)
      const ratio = karmaScore / 50;
      const red = Math.round(231 - ratio * 0); // 231 -> 231 (E74C3C)
      const green = Math.round(76 - ratio * 76); // 76 -> 0
      const blue = Math.round(60 - ratio * 60); // 60 -> 0
      return `rgb(${red}, ${green}, ${blue})`;
    }
  };

  const barColor = getBarColor();
  const greenPercentage = normalizedScore;
  const redPercentage = 100 - normalizedScore;

  const getLevelText = () => {
    switch (karmaLevel) {
      case 'noble':
        return 'Asil';
      case 'good':
        return 'İyi';
      case 'neutral':
        return 'Nötr';
      case 'bad':
        return 'Kötü';
      case 'banned':
        return 'Yasaklı';
      default:
        return 'Nötr';
    }
  };

  const getLevelColor = () => {
    switch (karmaLevel) {
      case 'noble':
        return COLORS.success;
      case 'good':
        return '#4CAF50';
      case 'neutral':
        return COLORS.textLight;
      case 'bad':
        return '#FF9800';
      case 'banned':
        return COLORS.error;
      default:
        return COLORS.textLight;
    }
  };

  if (isBannedFromRides) {
    return (
      <View style={styles.container}>
        {showLabel && (
          <View style={styles.labelRow}>
            <Text style={styles.label}>Yolculuk Durumu</Text>
            <Text style={[styles.bannedLabel, { color: COLORS.error }]}>Yasaklı</Text>
          </View>
        )}
        <View style={styles.barContainer}>
          <View style={[styles.bar, { backgroundColor: COLORS.error, width: '100%' }]} />
        </View>
        <Text style={[styles.bannedText, { color: COLORS.error }]}>
          Bu kullanıcı yolculuk paylaşımından yasaklanmıştır
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>Karma Skoru</Text>
          <View style={styles.levelRow}>
            {karmaLevel === 'noble' && <VerifiedBadgeIcon size={16} />}
            <Text style={[styles.levelText, { color: getLevelColor() }]}>
              {getLevelText()}
            </Text>
            <Text style={styles.scoreText}>{karmaScore}</Text>
          </View>
        </View>
      )}
      <View style={styles.barContainer}>
        {/* Yeşil kısım (pozitif) */}
        <View
          style={[
            styles.bar,
            styles.greenBar,
            {
              width: `${greenPercentage}%`,
              backgroundColor: greenPercentage === 100 ? COLORS.success : '#4CAF50',
            },
          ]}
        />
        {/* Kırmızı kısım (negatif) */}
        <View
          style={[
            styles.bar,
            styles.redBar,
            {
              width: `${redPercentage}%`,
              backgroundColor: redPercentage === 100 ? COLORS.error : '#FF5722',
            },
          ]}
        />
      </View>
      {karmaLevel === 'noble' && (
        <Text style={styles.nobleText}>
          ✨ Asil Etiketi - Platformda söz hakkına sahipsiniz
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  levelText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  scoreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginLeft: SPACING.xs,
  },
  barContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
  },
  bar: {
    height: '100%',
  },
  greenBar: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  redBar: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  nobleText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  bannedLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  bannedText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

