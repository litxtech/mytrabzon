import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { DISTRICTS, getDistrictsByCity } from '@/constants/districts';
import { CITIES, GENDERS, SOCIAL_MEDIA_PLATFORMS, City } from '@/constants/cities';
import { Camera, Trash2, ChevronDown, Eye, EyeOff, Save, Users } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { SocialMedia, PrivacySettings } from '@/types/database';
import { trpc } from '@/lib/trpc';

type PickerItem<T> = {
  label: string;
  value: T;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: async () => {
      console.log('✅ Profile update successful, refreshing...');
      await refreshProfile();
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.', [
        {
          text: 'Tamam',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          },
        },
      ]);
    },
    onError: (error) => {
      console.error('❌ Profile update error:', error);
      Alert.alert('Hata', `Profil güncellenirken bir hata oluştu: ${error.message}`);
    },
  });

  const uploadAvatarMutation = trpc.user.uploadAvatar.useMutation({
    onSuccess: async (result) => {
      if (result?.url) {
        console.log('✅ Avatar uploaded successfully, URL:', result.url);
        // Profile otomatik güncellendi, refresh et
        await refreshProfile();
        Alert.alert('Başarılı', 'Profil resmi güncellendi.');
      }
    },
    onError: (error) => {
      console.error('❌ Avatar upload error:', error);
      Alert.alert('Hata', `Profil resmi yüklenirken bir hata oluştu: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    city: profile?.city || null,
    district: profile?.district || 'Ortahisar',
    age: profile?.age?.toString() || '',
    gender: profile?.gender || null,
    phone: profile?.phone || '',
    email: profile?.email || '',
    address: profile?.address || '',
    height: profile?.height?.toString() || '',
    weight: profile?.weight?.toString() || '',
  });

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });

  const checkUsernameQuery = trpc.user.checkUsername.useQuery(
    { username: formData.username },
    { enabled: false } // Manuel tetikleme için
  );

  const suggestUsernameQuery = trpc.user.suggestUsername.useQuery(
    { base: formData.full_name || 'user' },
    { enabled: false }
  );

  // Debounce için timer
  const [usernameDebounceTimer, setUsernameDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Component unmount olduğunda timer'ı temizle
  useEffect(() => {
    return () => {
      if (usernameDebounceTimer) {
        clearTimeout(usernameDebounceTimer);
      }
    };
  }, [usernameDebounceTimer]);

  const handleUsernameChange = async (text: string) => {
    setFormData({ ...formData, username: text });
    
    // Önceki timer'ı temizle
    if (usernameDebounceTimer) {
      clearTimeout(usernameDebounceTimer);
    }

    if (text.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    // Debounce: 500ms bekle
    const timer = setTimeout(async () => {
      setUsernameStatus({ checking: true, available: null, message: '' });
      
      try {
        const result = await checkUsernameQuery.refetch();
        if (result.data) {
          setUsernameStatus({
            checking: false,
            available: result.data.available,
            message: result.data.message,
          });
        }
      } catch (error) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Kontrol sırasında bir hata oluştu',
        });
      }
    }, 500);

    setUsernameDebounceTimer(timer);
  };

  const handleSuggestUsername = async () => {
    try {
      const result = await suggestUsernameQuery.refetch();
      if (result.data?.suggestions && result.data.suggestions.length > 0) {
        setFormData({ ...formData, username: result.data.suggestions[0] });
        await handleUsernameChange(result.data.suggestions[0]);
      }
    } catch (error) {
      console.error('Username suggestion error:', error);
    }
  };

  const [showInDirectory, setShowInDirectory] = useState(
    profile?.show_in_directory !== undefined ? profile.show_in_directory : true
  );

  const availableDistricts = formData.city ? getDistrictsByCity(formData.city) : DISTRICTS;

  const [socialMedia, setSocialMedia] = useState<SocialMedia>(
    profile?.social_media || {}
  );

  const [privacy, setPrivacy] = useState<PrivacySettings>(
    profile?.privacy_settings || {
      show_age: true,
      show_gender: true,
      show_phone: true,
      show_email: true,
      show_address: true,
      show_height: true,
      show_weight: true,
      show_social_media: true,
    }
  );

  const [showPickers, setShowPickers] = useState({
    city: false,
    district: false,
    gender: false,
  });

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gerekli.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUploading(true);

      // React Native'de blob() çalışmıyor, base64 kullan
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      
      // Base64'e çevir
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });

      // tRPC uploadAvatar mutation'ını kullan
      await uploadAvatarMutation.mutateAsync({
        base64Data: base64,
        fileType: `image/${fileExt}`,
        fileName: fileName,
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert('Hata', 'Profil resmi yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async () => {
    Alert.alert(
      'Profil Resmini Sil',
      'Profil resminizi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true);

              updateProfileMutation.mutate({ avatar_url: null });
              Alert.alert('Başarılı', 'Profil resmi silindi.');
            } catch (error) {
              console.error('Avatar delete error:', error);
              Alert.alert('Hata', 'Profil resmi silinirken bir hata oluştu.');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = () => {
    // Username validation kontrolü
    if (formData.username && formData.username.length > 0 && !usernameStatus.available && usernameStatus.available !== null) {
      Alert.alert('Hata', 'Lütfen müsait bir kullanıcı adı seçin.');
      return;
    }

    const updateData = {
      full_name: formData.full_name || undefined,
      username: formData.username && formData.username.length > 0 ? formData.username : undefined,
      bio: formData.bio || undefined,
      city: formData.city || undefined,
      district: formData.district || 'Ortahisar',
      age: formData.age ? parseInt(formData.age) : undefined,
      gender: formData.gender || undefined,
      phone: formData.phone || undefined,
      email: formData.email || profile?.email || '',
      address: formData.address || undefined,
      height: formData.height ? parseInt(formData.height) : undefined,
      weight: formData.weight ? parseInt(formData.weight) : undefined,
      social_media: socialMedia,
      privacy_settings: privacy,
      show_in_directory: showInDirectory,
    };

    console.log('💾 Saving profile with data:', JSON.stringify(updateData, null, 2));
    updateProfileMutation.mutate(updateData);
  };

  const renderPicker = <T extends string>(
    label: string,
    value: T | null,
    items: readonly PickerItem<T>[],
    onSelect: (value: T) => void,
    pickerKey: keyof typeof showPickers
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowPickers({ ...showPickers, [pickerKey]: !showPickers[pickerKey] })}
      >
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
          {value ? items.find(item => item.value === value)?.label : `${label} seçin`}
        </Text>
        <ChevronDown size={20} color={COLORS.textLight} />
      </TouchableOpacity>
      {showPickers[pickerKey] && (
        <ScrollView style={styles.pickerOptions} nestedScrollEnabled>
          {items.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={styles.pickerOption}
              onPress={() => {
                onSelect(item.value);
                setShowPickers({ ...showPickers, [pickerKey]: false });
              }}
            >
              <Text style={[styles.pickerOptionText, value === item.value && styles.selectedOption]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/profile');
          }
        }}>
          <Text style={styles.cancelButton}>İptal</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profili Düzenle</Text>
        <TouchableOpacity onPress={handleSave} disabled={updateProfileMutation.isPending}>
          {updateProfileMutation.isPending ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Save size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {uploading ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <Image
                source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/120' }}
                style={styles.avatar}
              />
            )}
          </View>
          <View style={styles.avatarButtons}>
            <TouchableOpacity style={styles.avatarButton} onPress={pickImage} disabled={uploading}>
              <Camera size={20} color={COLORS.primary} />
              <Text style={styles.avatarButtonText}>Değiştir</Text>
            </TouchableOpacity>
            {profile?.avatar_url && (
              <TouchableOpacity style={styles.avatarButton} onPress={deleteAvatar} disabled={uploading}>
                <Trash2 size={20} color={COLORS.error} />
                <Text style={[styles.avatarButtonText, { color: COLORS.error }]}>Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              placeholder="Adınız ve soyadınız"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              {!profile?.username && (
                <TouchableOpacity onPress={handleSuggestUsername}>
                  <Text style={[styles.suggestButton, { color: COLORS.primary }]}>Öner</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.usernameContainer}>
              <TextInput
                style={[
                  styles.input,
                  usernameStatus.available === true && styles.inputSuccess,
                  usernameStatus.available === false && styles.inputError,
                ]}
                value={formData.username}
                onChangeText={handleUsernameChange}
                placeholder="kullanici_adi"
                placeholderTextColor={COLORS.textLight}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
              {usernameStatus.checking && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.usernameIndicator} />
              )}
              {!usernameStatus.checking && usernameStatus.available === true && (
                <Text style={[styles.usernameStatus, { color: COLORS.success }]}>✓</Text>
              )}
              {!usernameStatus.checking && usernameStatus.available === false && (
                <Text style={[styles.usernameStatus, { color: COLORS.error }]}>✗</Text>
              )}
            </View>
            {usernameStatus.message && (
              <Text
                style={[
                  styles.usernameMessage,
                  usernameStatus.available === true && { color: COLORS.success },
                  usernameStatus.available === false && { color: COLORS.error },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {usernameStatus.message}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Biyografi</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Kendiniz hakkında kısa bir açıklama"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
          </View>

          {renderPicker(
            'Şehir',
            formData.city,
            CITIES,
            (value: City) => {
              const newDistricts = getDistrictsByCity(value);
              setFormData({ 
                ...formData, 
                city: value, 
                district: newDistricts.length > 0 ? newDistricts[0] : 'Ortahisar'
              });
            },
            'city'
          )}

          {formData.city && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>İlçe</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowPickers({ ...showPickers, district: !showPickers.district })}
              >
                <Text style={[styles.pickerText, !formData.district && styles.placeholderText]}>
                  {formData.district || 'İlçe seçin'}
                </Text>
                <ChevronDown size={20} color={COLORS.textLight} />
              </TouchableOpacity>
              {showPickers.district && (
                <ScrollView style={styles.pickerOptions} nestedScrollEnabled>
                  {availableDistricts.map((district) => (
                    <TouchableOpacity
                      key={district}
                      style={styles.pickerOption}
                      onPress={() => {
                        setFormData({ ...formData, district: district });
                        setShowPickers({ ...showPickers, district: false });
                      }}
                    >
                      <Text style={[styles.pickerOptionText, formData.district === district && styles.selectedOption]}>
                        {district}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Yaş</Text>
              <TouchableOpacity onPress={() => setPrivacy({ ...privacy, show_age: !privacy.show_age })}>
                {privacy.show_age ? <Eye size={16} color={COLORS.primary} /> : <EyeOff size={16} color={COLORS.textLight} />}
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(text) => setFormData({ ...formData, age: text.replace(/[^0-9]/g, '') })}
              placeholder="Yaşınız"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Cinsiyet</Text>
              <TouchableOpacity onPress={() => setPrivacy({ ...privacy, show_gender: !privacy.show_gender })}>
                {privacy.show_gender ? <Eye size={16} color={COLORS.primary} /> : <EyeOff size={16} color={COLORS.textLight} />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowPickers({ ...showPickers, gender: !showPickers.gender })}
            >
              <Text style={[styles.pickerText, !formData.gender && styles.placeholderText]}>
                {formData.gender ? GENDERS.find(g => g.value === formData.gender)?.label : 'Cinsiyet seçin'}
              </Text>
              <ChevronDown size={20} color={COLORS.textLight} />
            </TouchableOpacity>
            {showPickers.gender && (
              <View style={styles.pickerOptions}>
                {GENDERS.map((gender) => (
                  <TouchableOpacity
                    key={gender.value}
                    style={styles.pickerOption}
                    onPress={() => {
                      setFormData({ ...formData, gender: gender.value });
                      setShowPickers({ ...showPickers, gender: false });
                    }}
                  >
                    <Text style={[styles.pickerOptionText, formData.gender === gender.value && styles.selectedOption]}>
                      {gender.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Boy (cm)</Text>
              <TouchableOpacity onPress={() => setPrivacy({ ...privacy, show_height: !privacy.show_height })}>
                {privacy.show_height ? <Eye size={16} color={COLORS.primary} /> : <EyeOff size={16} color={COLORS.textLight} />}
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={formData.height}
              onChangeText={(text) => setFormData({ ...formData, height: text.replace(/[^0-9]/g, '') })}
              placeholder="Boyunuz (cm)"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Kilo (kg)</Text>
              <TouchableOpacity onPress={() => setPrivacy({ ...privacy, show_weight: !privacy.show_weight })}>
                {privacy.show_weight ? <Eye size={16} color={COLORS.primary} /> : <EyeOff size={16} color={COLORS.textLight} />}
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={formData.weight}
              onChangeText={(text) => setFormData({ ...formData, weight: text.replace(/[^0-9]/g, '') })}
              placeholder="Kilonuz (kg)"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Telefon</Text>
              <TouchableOpacity onPress={() => setPrivacy({ ...privacy, show_phone: !privacy.show_phone })}>
                {privacy.show_phone ? <Eye size={16} color={COLORS.primary} /> : <EyeOff size={16} color={COLORS.textLight} />}
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Telefon numaranız"
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>E-posta</Text>
              <TouchableOpacity onPress={() => setPrivacy({ ...privacy, show_email: !privacy.show_email })}>
                {privacy.show_email ? <Eye size={16} color={COLORS.primary} /> : <EyeOff size={16} color={COLORS.textLight} />}
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="E-posta adresiniz"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Adres</Text>
              <TouchableOpacity onPress={() => setPrivacy({ ...privacy, show_address: !privacy.show_address })}>
                {privacy.show_address ? <Eye size={16} color={COLORS.primary} /> : <EyeOff size={16} color={COLORS.textLight} />}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Adresiniz"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>Sosyal Medya Hesapları</Text>
            <TouchableOpacity onPress={() => setPrivacy({ ...privacy, show_social_media: !privacy.show_social_media })}>
              {privacy.show_social_media ? <Eye size={16} color={COLORS.primary} /> : <EyeOff size={16} color={COLORS.textLight} />}
            </TouchableOpacity>
          </View>

          {SOCIAL_MEDIA_PLATFORMS.map((platform) => (
            <View key={platform.value} style={styles.inputContainer}>
              <Text style={styles.label}>
                {platform.icon} {platform.label}
              </Text>
              <TextInput
                style={styles.input}
                value={socialMedia[platform.value] || ''}
                onChangeText={(text) => setSocialMedia({ ...socialMedia, [platform.value]: text })}
                placeholder={`${platform.label} kullanıcı adınız`}
                placeholderTextColor={COLORS.textLight}
                autoCapitalize="none"
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kullanıcı Listesi</Text>
          
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <View style={styles.labelWithIcon}>
                <Users size={18} color={COLORS.text} />
                <Text style={styles.label}>Listede beni göster</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, showInDirectory && styles.switchActive]}
                onPress={() => setShowInDirectory(!showInDirectory)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.switchThumb,
                    showInDirectory && styles.switchThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.switchDescription}>
              Kullanıcı listesinde profilinizi görünür yapar. Kapatırsanız,
              sadece siz profilinizi görebilirsiniz.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.privacyNote}>
            👁️ Göz simgesi ile hangi bilgilerinizin diğer kullanıcılar tarafından görüleceğini kontrol edebilirsiniz.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  cancelButton: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarLoading: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  pickerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textLight,
  },
  pickerOptions: {
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  selectedOption: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  privacyNote: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    padding: 2,
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  switchDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  usernameContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameIndicator: {
    position: 'absolute',
    right: SPACING.md,
  },
  usernameStatus: {
    position: 'absolute',
    right: SPACING.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  usernameMessage: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  suggestButton: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  inputSuccess: {
    borderColor: COLORS.success || '#10b981',
  },
  inputError: {
    borderColor: COLORS.error || '#ef4444',
  },
});
