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
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { ArrowLeft, AlertCircle, ChevronDown, Camera, Image as ImageIcon, X, Video } from 'lucide-react-native';
import { getDistrictsByCity } from '@/constants/districts';
import { Footer } from '@/components/Footer';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'NORMAL' as 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW',
    city: 'Trabzon' as 'Trabzon' | 'Giresun',
    district: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  const utils = trpc.useUtils();
  
  const createEventMutation = trpc.event.createEvent.useMutation({
    onSuccess: async () => {
      // Feed'deki event query'sini invalidate et ve refetch et
      await utils.event.getEvents.invalidate();
      // Tüm parametrelerle invalidate et
      await utils.event.getEvents.invalidate(undefined);
      Alert.alert('Başarılı', 'Olay başarıyla oluşturuldu!');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Olay oluşturulamadı');
      setLoading(false);
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets) {
      const videos = result.assets.filter(asset => asset.type === 'video').map(asset => asset.uri);
      const images = result.assets.filter(asset => asset.type !== 'video').map(asset => asset.uri);
      setSelectedVideos((prev) => [...prev, ...videos].slice(0, 3));
      setSelectedImages((prev) => [...prev, ...images].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (result.assets[0].type === 'video') {
        setSelectedVideos((prev) => [...prev, result.assets[0].uri].slice(0, 3));
      } else {
        setSelectedImages((prev) => [...prev, result.assets[0].uri].slice(0, 5));
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMediaMutation = trpc.post.uploadMedia.useMutation();

  const uploadMedia = async (uri: string, type: 'image' | 'video'): Promise<string> => {
    if (!user?.id) throw new Error('Kullanıcı bilgisi bulunamadı');

    const fileExt = uri.split('.').pop()?.toLowerCase() || (type === 'video' ? 'mp4' : 'jpg');
    const fileName = `events/${type}_${Date.now()}.${fileExt}`;
    
    const fileType = type === 'video' 
      ? 'video/mp4' 
      : fileExt === 'png' 
      ? 'image/png' 
      : 'image/jpeg';

    // Base64 string'i oku
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });

    // Base64 string'i temizle (data: prefix varsa kaldır)
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '').replace(/^data:video\/\w+;base64,/, '');

    // Backend'deki uploadMedia mutation'ını kullan
    const result = await uploadMediaMutation.mutateAsync({
      base64Data,
      fileType,
      fileName,
    });

    return result.url;
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.district) {
      Alert.alert('Hata', 'Lütfen başlık, kategori ve ilçe seçin');
      return;
    }

    // İlçe zorunlu - "Tümü" seçeneği kaldırıldı

    setLoading(true);
    setUploading(true);

    try {
      let mediaUrls: string[] = [];

      // Medya yükle
      const allMedia = [
        ...selectedImages.map(uri => ({ uri, type: 'image' as const })),
        ...selectedVideos.map(uri => ({ uri, type: 'video' as const })),
      ];

      if (allMedia.length > 0) {
        const uploadPromises = allMedia.map(media => uploadMedia(media.uri, media.type));
        mediaUrls = await Promise.all(uploadPromises);
      }

      await createEventMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        category: formData.category as any,
        severity: formData.severity,
        district: formData.district,
        city: formData.city,
        latitude: formData.latitude,
        longitude: formData.longitude,
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      });
    } catch (error) {
      console.error('Create event error:', error);
      Alert.alert('Hata', error instanceof Error ? error.message : 'Olay oluşturulamadı');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Seçili şehre göre ilçeleri al
  const availableDistricts = getDistrictsByCity(formData.city);

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
            Trabzon&apos;da ne olup bittiğini paylaş
          </Text>
        </View>

        {/* Uyarı Mesajı */}
        <View style={styles.warningBox}>
          <AlertCircle size={20} color={COLORS.warning} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>⚠️ Önemli Uyarı</Text>
            <Text style={styles.warningText}>
              Bu bölüm sadece haber değeri taşıyan gönderiler için kullanılmalıdır. 
              Şahsi veya eğlence amaçlı kullanım yasaktır. Kurallara uymayan kullanıcılar banlanacaktır.
            </Text>
          </View>
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

        {/* Şehir */}
        <View style={styles.section}>
          <Text style={styles.label}>Şehir *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              setShowCityPicker(!showCityPicker);
              setShowDistrictPicker(false);
            }}
          >
            <Text style={[styles.pickerButtonText, !formData.city && styles.pickerButtonPlaceholder]}>
              {formData.city || 'Şehir seçin'}
            </Text>
            <ChevronDown size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          {showCityPicker && (
            <View style={styles.pickerContainer}>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                <TouchableOpacity
                  style={[
                    styles.pickerOption,
                    formData.city === 'Trabzon' && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, city: 'Trabzon', district: '' });
                    setShowCityPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.city === 'Trabzon' && styles.pickerOptionTextActive,
                    ]}
                  >
                    Trabzon
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pickerOption,
                    formData.city === 'Giresun' && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, city: 'Giresun', district: '' });
                    setShowCityPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.city === 'Giresun' && styles.pickerOptionTextActive,
                    ]}
                  >
                    Giresun
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>

        {/* İlçe */}
        <View style={styles.section}>
          <Text style={styles.label}>İlçe *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              if (!formData.city) {
                Alert.alert('Uyarı', 'Önce şehir seçin');
                return;
              }
              setShowDistrictPicker(!showDistrictPicker);
              setShowCityPicker(false);
            }}
            disabled={!formData.city}
          >
            <Text style={[styles.pickerButtonText, !formData.district && styles.pickerButtonPlaceholder]}>
              {formData.district || 'İlçe seçin'}
            </Text>
            <ChevronDown size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          {showDistrictPicker && formData.city && (
            <View style={styles.pickerContainer}>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {availableDistricts.map((district) => (
                  <TouchableOpacity
                    key={district}
                    style={[
                      styles.pickerOption,
                      formData.district === district && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, district });
                      setShowDistrictPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.district === district && styles.pickerOptionTextActive,
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

        {/* Medya Ekleme */}
        <View style={styles.section}>
          <Text style={styles.label}>Fotoğraf/Video Ekle (Opsiyonel)</Text>
          <View style={styles.mediaButtons}>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={pickImage}
              disabled={loading || uploading}
            >
              <ImageIcon size={20} color={COLORS.primary} />
              <Text style={styles.mediaButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={takePhoto}
              disabled={loading || uploading}
            >
              <Camera size={20} color={COLORS.primary} />
              <Text style={styles.mediaButtonText}>Kamera</Text>
            </TouchableOpacity>
          </View>

          {selectedImages.length > 0 && (
            <View style={styles.mediaContainer}>
              {selectedImages.map((uri, index) => (
                <View key={`img-${index}`} style={styles.mediaWrapper}>
                  <Image source={{ uri }} style={styles.mediaPreview} />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    style={styles.removeMediaButton}
                  >
                    <X size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {selectedVideos.length > 0 && (
            <View style={styles.mediaContainer}>
              {selectedVideos.map((uri, index) => (
                <View key={`vid-${index}`} style={styles.mediaWrapper}>
                  <View style={styles.videoPreview}>
                    <Video size={24} color={COLORS.white} />
                  </View>
                  <TouchableOpacity
                    onPress={() => removeVideo(index)}
                    style={styles.removeMediaButton}
                  >
                    <X size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.uploadingText}>Medya yükleniyor...</Text>
            </View>
          )}
        </View>

        {/* Gönder Butonu */}
        <TouchableOpacity
          style={[styles.submitButton, (loading || uploading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || uploading}
        >
          {loading || uploading ? (
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
  warningBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
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
  pickerButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionActive: {
    backgroundColor: COLORS.primary + '20',
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  pickerOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700' as const,
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
  mediaButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mediaButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  mediaWrapper: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
  },
  uploadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
});

