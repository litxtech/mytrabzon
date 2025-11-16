import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';

export default function SettingsScreen() {
  const { theme, mode, setMode, toggle } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Ayarlar</Text>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Tema</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              { borderColor: theme.colors.border },
              mode === 'light' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
            ]}
            onPress={() => setMode('light')}
          >
            <Text style={[styles.modeButtonText, { color: theme.colors.text }]}>Açık</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              { borderColor: theme.colors.border },
              mode === 'dark' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
            ]}
            onPress={() => setMode('dark')}
          >
            <Text style={[styles.modeButtonText, { color: theme.colors.text }]}>Koyu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              { borderColor: theme.colors.border },
              mode === 'system' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
            ]}
            onPress={() => setMode('system')}
          >
            <Text style={[styles.modeButtonText, { color: theme.colors.text }]}>Sistem</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.toggleButton, { backgroundColor: theme.colors.primary }]} onPress={toggle}>
          <Text style={styles.toggleText}>Hızlı Değiştir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginBottom: SPACING.lg,
  },
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modeButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  modeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleText: {
    color: '#FFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});


