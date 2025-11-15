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
import { ArrowLeft, MapPin, AlertCircle, Image as ImageIcon, Mic } from 'lucide-react-native';
import { TRABZON_DISTRICTS } from '@/constants/districts';
import { Footer } from '@/components/Footer';

const EVENT_CATEGORIES = [
  { value: 'trafik', label: '🚗 Trafik Var' },
  { value: 'kaza', label: '⚠️ Kaza Var' },
  { value: 'mac_hareketlendi', label: '⚽ Maç Hareketlendi' },
  { value: 'sahil_kalabalik', label: '🏖️ Sahilde Kalabalık' },
  { value: 'firtina_yagmur', label: '🌧️ Fırtına/Yağmur' },
  { value: 'etkinlik', label: '🎉 Etkinlik' },
  { value: 'konser', label: '🎵 Konser' },
  { value: 'polis_kontrol', label: '🚔 Polis Kontrolü' },
  { value: 'pazar_yogunlugu', label: '🛒 Pazar Yoğunluğu' },
  { value: 'kampanya_indirim', label: '💰 Kampanya/İndirim' },
  { value: 'güvenlik', label: '🛡️ Güvenlik' },
  { value: 'yol_kapanmasi', label: '🚧 Yol Kapanması' },
  { value: 'sel_riski', label: '🌊 Sel Riski' },
  { value: 'ciddi_olay', label: '🚨 Ciddi Olay' },
  { value: 'normal_trafik', label: '🚦 Normal Trafik' },
  { value: 'esnaf_duyuru', label: '🏪 Esnaf Duyurusu' },
];

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Kritik', color: COLORS.error, description: 'Tüm şehre bildirim' },
  { value: 'HIGH', label: 'Yüksek', color: COLORS.warning, description: 'İlçeye bildirim' },
  { value: 'NORMAL', label: 'Normal', color: COLORS.primary, description: 'İlçe + ilgi alanları' },
  { value: 'LOW', label: 'Düşük', color: COLORS.textLight, description: 'Sadece feed\'de görünür' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'NORMAL' as 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW',
    district: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  const createEventMutation = trpc.event.createEvent.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Olay başarıyla oluşturuldu!');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Olay oluşturulamadı');
      setLoading(false);
    },
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.district) {
      Alert.alert('Hata', 'Lütfen başlık, kategori ve ilçe seçin');
      return;
    }

    setLoading(true);
    try {
      await createEventMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        category: formData.category as any,
        severity: formData.severity,
        district: formData.district,
        city: 'Trabzon',
        latitude: formData.latitude,
        longitude: formData.longitude,
      });
    } catch (error) {
      console.error('Create event error:', error);
    } finally {
      setLoading(false);
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          title: 'Olay Var!',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <AlertCircle size={32} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Olay Var!</Text>
          <Text style={styles.headerSubtitle}>
            Trabzon'da ne olup bittiğini paylaş
          </Text>
        </View>

        {/* Başlık */}
        <View style={styles.section}>
          <Text style={styles.label}>Başlık *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Meydan'da ciddi trafik var"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            maxLength={200}
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* Açıklama */}
        <View style={styles.section}>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detaylı bilgi ekle (opsiyonel)"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* Kategori */}
        <View style={styles.section}>
          <Text style={styles.label}>Kategori *</Text>
          <View style={styles.categoryGrid}>
            {EVENT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  formData.category === cat.value && styles.categoryChipSelected,
                ]}
                onPress={() => setFormData({ ...formData, category: cat.value })}
              >
                <Text style={[
                  styles.categoryText,
                  formData.category === cat.value && styles.categoryTextSelected,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Önem Seviyesi */}
        <View style={styles.section}>
          <Text style={styles.label}>Önem Seviyesi</Text>
          <View style={styles.severityContainer}>
            {SEVERITY_OPTIONS.map((sev) => (
              <TouchableOpacity
                key={sev.value}
                style={[
                  styles.severityChip,
                  formData.severity === sev.value && {
                    backgroundColor: sev.color + '20',
                    borderColor: sev.color,
                  },
                ]}
                onPress={() => setFormData({ ...formData, severity: sev.value as any })}
              >
                <View style={[styles.severityDot, { backgroundColor: sev.color }]} />
                <Text style={[
                  styles.severityLabel,
                  formData.severity === sev.value && { color: sev.color, fontWeight: '700' },
                ]}>
                  {sev.label}
                </Text>
                <Text style={styles.severityDescription}>{sev.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* İlçe */}
        <View style={styles.section}>
          <Text style={styles.label}>İlçe *</Text>
          <View style={styles.districtGrid}>
            {TRABZON_DISTRICTS.map((district) => (
              <TouchableOpacity
                key={district.value}
                style={[
                  styles.districtChip,
                  formData.district === district.value && styles.districtChipSelected,
                ]}
                onPress={() => {
                  // Toggle: Eğer zaten seçiliyse iptal et, değilse seç
                  setFormData({ 
                    ...formData, 
                    district: formData.district === district.value ? '' : district.value 
                  });
                }}
              >
                <Text style={[
                  styles.districtText,
                  formData.district === district.value && styles.districtTextSelected,
                ]}>
                  {district.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gönder Butonu */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Olayı Paylaş</Text>
          )}
        </TouchableOpacity>

        <Footer />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  section: {
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
    paddingTop: SPACING.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: COLORS.white,
  },
  severityContainer: {
    gap: SPACING.sm,
  },
  severityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  severityLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  severityDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  districtChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  districtChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  districtText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
    flexShrink: 0,
  },
  districtTextSelected: {
    color: COLORS.white,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

