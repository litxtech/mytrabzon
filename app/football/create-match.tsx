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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Calendar, Clock, MapPin, ChevronDown } from 'lucide-react-native';
import { TRABZON_DISTRICTS, GIRESUN_DISTRICTS } from '@/constants/districts';

export default function CreateMatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [formData, setFormData] = useState({
    field_name: '',
    city: 'Trabzon' as 'Trabzon' | 'Giresun',
    district: '',
    match_date: '',
    match_time: '',
    team1_name: '',
    team2_name: '',
    max_players: '',
    needed_players: '',
  });

  const createMatch = trpc.football.createMatch.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Maç başarıyla oluşturuldu!');
      router.replace('/(tabs)/football');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Maç oluşturulamadı');
    },
  });

  const districts = formData.city === 'Trabzon' ? TRABZON_DISTRICTS : GIRESUN_DISTRICTS;

  const handleSubmit = async () => {
    if (!formData.field_name || !formData.district || !formData.match_date || !formData.match_time) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      // Tarih ve saat formatını düzelt - ISO formatına çevir
      const dateStr = formData.match_date.trim();
      const timeStr = formData.match_time.trim();
      
      // Tarih formatını kontrol et (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        Alert.alert('Hata', 'Tarih formatı yanlış. Örnek: 2025-01-15');
        setLoading(false);
        return;
      }
      
      // Saat formatını kontrol et (HH:MM)
      if (!/^\d{2}:\d{2}$/.test(timeStr)) {
        Alert.alert('Hata', 'Saat formatı yanlış. Örnek: 18:00');
        setLoading(false);
        return;
      }
      
      // ISO formatına çevir (UTC)
      const matchDateTime = new Date(`${dateStr}T${timeStr}:00.000Z`);
      
      // Geçerli bir tarih mi kontrol et
      if (isNaN(matchDateTime.getTime())) {
        Alert.alert('Hata', 'Geçersiz tarih veya saat');
        setLoading(false);
        return;
      }
      
      await createMatch.mutateAsync({
        field_name: formData.field_name,
        city: formData.city,
        district: formData.district,
        match_date: matchDateTime.toISOString(),
        team1_name: formData.team1_name || undefined,
        team2_name: formData.team2_name || undefined,
        max_players: formData.max_players ? parseInt(formData.max_players) : undefined,
        needed_players: formData.needed_players ? parseInt(formData.needed_players) : undefined,
      });
    } catch (err) {
      console.error('Create match error:', err);
      Alert.alert('Hata', 'Maç oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/football');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Yeni Maç Oluştur</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Halı Saha İsmi *</Text>
          <TextInput
            style={styles.input}
            placeholder="Halı saha ismini yazın"
            value={formData.field_name}
            onChangeText={(text) => setFormData({ ...formData, field_name: text })}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Şehir *</Text>
          <View style={styles.cityButtons}>
            <TouchableOpacity
              style={[
                styles.cityButton,
                formData.city === 'Trabzon' && styles.cityButtonActive,
              ]}
              onPress={() => {
                setFormData({ ...formData, city: 'Trabzon', district: '' });
                setShowDistrictPicker(false);
              }}
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
              onPress={() => {
                setFormData({ ...formData, city: 'Giresun', district: '' });
                setShowDistrictPicker(false);
              }}
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
          <Text style={styles.label}>İlçe *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDistrictPicker(!showDistrictPicker)}
          >
            <Text style={[styles.pickerButtonText, !formData.district && styles.pickerButtonPlaceholder]}>
              {formData.district || 'İlçe seçin'}
            </Text>
            <ChevronDown size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          {showDistrictPicker && (
            <View style={styles.districtPicker}>
              <ScrollView style={styles.districtScroll} nestedScrollEnabled>
                {districts.map((district) => (
                  <TouchableOpacity
                    key={district}
                    style={[
                      styles.districtOption,
                      formData.district === district && styles.districtOptionActive,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, district });
                      setShowDistrictPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.districtOptionText,
                        formData.district === district && styles.districtOptionTextActive,
                      ]}
                    >
                      {district}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tarih *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örnek: 2025-01-15"
            value={formData.match_date}
            onChangeText={(text) => setFormData({ ...formData, match_date: text })}
            keyboardType="default"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Saat *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örnek: 18:00"
            value={formData.match_time}
            onChangeText={(text) => setFormData({ ...formData, match_time: text })}
            keyboardType="default"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Takım 1 Adı (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Takım 1"
            value={formData.team1_name}
            onChangeText={(text) => setFormData({ ...formData, team1_name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Takım 2 Adı (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Takım 2"
            value={formData.team2_name}
            onChangeText={(text) => setFormData({ ...formData, team2_name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Maksimum Oyuncu Sayısı (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Örnek: 10"
            value={formData.max_players}
            onChangeText={(text) => setFormData({ ...formData, max_players: text })}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Aranan Oyuncu Sayısı (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Kaç oyuncu aranıyor?"
            value={formData.needed_players}
            onChangeText={(text) => setFormData({ ...formData, needed_players: text })}
            keyboardType="numeric"
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
            <Text style={styles.submitButtonText}>Maç Oluştur</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: SPACING.xl * 2,
  },
  backButton: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xl,
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
    minHeight: 50,
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 50,
  },
  pickerButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
  pickerButtonPlaceholder: {
    color: COLORS.textLight,
  },
  districtPicker: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
    maxHeight: 200,
  },
  districtScroll: {
    maxHeight: 200,
  },
  districtOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  districtOptionActive: {
    backgroundColor: COLORS.primary + '20',
  },
  districtOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  districtOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.lg,
    minHeight: 50,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
});
