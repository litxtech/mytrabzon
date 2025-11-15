import React, { useState, useMemo } from 'react';
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
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { TRABZON_DISTRICTS, GIRESUN_DISTRICTS } from '@/constants/districts';

export default function CreateMatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const handleSubmit = async () => {
    if (!formData.field_name || !formData.district || !formData.match_date || !formData.match_time) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      // Tarih ve saat formatını düzelt - Türkiye formatından ISO formatına çevir
      const dateStr = formData.match_date.trim();
      const timeStr = formData.match_time.trim();
      
      // Tarih formatını kontrol et (DD.MM.YYYY)
      const dateMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (!dateMatch) {
        Alert.alert('Hata', 'Tarih formatı yanlış. Örnek: 15.01.2025');
        setLoading(false);
        return;
      }
      
      const [, day, month, year] = dateMatch;
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      // Tarih geçerliliğini kontrol et
      if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 2024) {
        Alert.alert('Hata', 'Geçersiz tarih değerleri');
        setLoading(false);
        return;
      }
      
      // ISO formatına çevir (YYYY-MM-DD)
      const isoDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      
      // Saat formatını kontrol et (HH:MM)
      if (!/^\d{2}:\d{2}$/.test(timeStr)) {
        Alert.alert('Hata', 'Saat formatı yanlış. Örnek: 18:00');
        setLoading(false);
        return;
      }
      
      // Türkiye saat dilimine göre ISO formatına çevir
      // Türkiye UTC+3, bu yüzden UTC'ye çevirirken 3 saat çıkarıyoruz
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        Alert.alert('Hata', 'Geçersiz saat değerleri');
        setLoading(false);
        return;
      }
      
      // ISO formatına çevir (Türkiye saati için)
      // Türkiye UTC+3, bu yüzden local time olarak oluşturup UTC'ye çeviriyoruz
      const matchDateTime = new Date(`${isoDate}T${timeStr}:00+03:00`);
      
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
            placeholder="Örnek: 15.01.2025"
            value={formData.match_date}
            onChangeText={(text) => {
              // Sadece rakam ve nokta kabul et
              const cleaned = text.replace(/[^0-9.]/g, '');
              setFormData({ ...formData, match_date: cleaned });
            }}
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.hintText}>Format: GG.AA.YYYY (Örnek: 15.01.2025)</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Saat *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTimePicker(!showTimePicker)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                !formData.match_time && styles.pickerButtonPlaceholder,
              ]}
            >
              {formData.match_time || 'Saat seçin'}
            </Text>
            <ChevronDown size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.hintText}>12:00 - 23:45 arası 15 dakikalık dilimler</Text>
          {showTimePicker && (
            <View style={styles.districtPicker}>
              <ScrollView style={styles.districtScroll} nestedScrollEnabled>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.districtOption,
                      formData.match_time === slot && styles.districtOptionActive,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, match_time: slot });
                      setShowTimePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.districtOptionText,
                        formData.match_time === slot && styles.districtOptionTextActive,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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

function generateTimeSlots() {
  const slots: string[] = [];
  for (let hour = 12; hour < 24; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(label);
    }
  }
  return slots;
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
  hintText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
});
