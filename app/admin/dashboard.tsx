import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Users, MessageCircle, Bell } from 'lucide-react-native';
import { DISTRICTS } from '@/constants/districts';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendNotification = async () => {
    if (!title || !message) {
      alert('Lütfen başlık ve mesaj girin');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        title,
        message,
        district: selectedDistrict,
        type: selectedDistrict ? 'district' : 'general',
      });

      if (error) throw error;

      alert('Bildirim gönderildi!');
      setTitle('');
      setMessage('');
      setSelectedDistrict(null);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Bildirim gönderilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users size={32} color={COLORS.primary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Kullanıcılar</Text>
          </View>

          <View style={styles.statCard}>
            <MessageCircle size={32} color={COLORS.secondary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Gönderiler</Text>
          </View>

          <View style={styles.statCard}>
            <Bell size={32} color={COLORS.warning} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Bildirimler</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirim Gönder</Text>

          <TextInput
            style={styles.input}
            placeholder="Başlık"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={COLORS.textLight}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mesaj"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={styles.label}>Hedef İlçe (İsteğe bağlı)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
            <TouchableOpacity
              style={[styles.districtChip, !selectedDistrict && styles.districtChipSelected]}
              onPress={() => setSelectedDistrict(null)}
            >
              <Text style={[styles.districtText, !selectedDistrict && styles.districtTextSelected]}>
                Tümü
              </Text>
            </TouchableOpacity>
            {DISTRICTS.map((district) => (
              <TouchableOpacity
                key={district}
                style={[
                  styles.districtChip,
                  selectedDistrict === district && styles.districtChipSelected,
                ]}
                onPress={() => setSelectedDistrict(district)}
              >
                <Text
                  style={[
                    styles.districtText,
                    selectedDistrict === district && styles.districtTextSelected,
                  ]}
                >
                  {district}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendNotification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Send size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>Gönder</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top' as const,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  districtScroll: {
    marginBottom: SPACING.md,
  },
  districtChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },
  districtChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  districtText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  districtTextSelected: {
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  button: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.md,
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
});
