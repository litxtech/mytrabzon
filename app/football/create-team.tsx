import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Users, Trophy } from 'lucide-react-native';

export default function CreateTeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: 'Trabzon',
    district: '',
  });

  const createTeam = trpc.football.createTeam.useMutation({
    onSuccess: (data) => {
      Alert.alert('Başarılı', 'Takım başarıyla oluşturuldu!');
      router.push(`/football/team/${data.id}` as any);
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Takım oluşturulamadı');
    },
  });

  const handleSubmit = async () => {
    if (!formData.name) {
      Alert.alert('Hata', 'Lütfen takım adını girin');
      return;
    }

    setLoading(true);
    try {
      await createTeam.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        city: formData.city,
        district: formData.district || undefined,
      });
    } catch (err) {
      console.error('Create team error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Trophy size={32} color={COLORS.primary} />
          <Text style={styles.title}>Yeni Takım Oluştur</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Takım Adı *</Text>
          <TextInput
            style={styles.input}
            placeholder="Takım adını girin"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Takım hakkında bilgi verin"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Şehir</Text>
          <View style={styles.cityButtons}>
            <TouchableOpacity
              style={[
                styles.cityButton,
                formData.city === 'Trabzon' && styles.cityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, city: 'Trabzon' })}
            >
              <Text
                style={[
                  styles.cityButtonText,
                  formData.city === 'Trabzon' && styles.cityButtonTextActive,
                ]}
              >
                Trabzon
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cityButton,
                formData.city === 'Giresun' && styles.cityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, city: 'Giresun' })}
            >
              <Text
                style={[
                  styles.cityButtonText,
                  formData.city === 'Giresun' && styles.cityButtonTextActive,
                ]}
              >
                Giresun
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>İlçe (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="İlçe adı"
            value={formData.district}
            onChangeText={(text) => setFormData({ ...formData, district: text })}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Users size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Takım Oluştur</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  scrollContent: {
    padding: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cityButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cityButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cityButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  cityButtonTextActive: {
    color: COLORS.white,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

