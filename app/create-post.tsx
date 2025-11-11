import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICT_BADGES } from '@/constants/districts';
import { District } from '@/types/database';
import { X, Image as ImageIcon, Camera, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function CreatePostScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const createPostMutation = trpc.post.createPost.useMutation();
  const uploadMediaMutation = trpc.post.uploadMedia.useMutation();

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
      const newImages = result.assets.map((asset) => asset.uri);
      setSelectedImages((prev) => [...prev, ...newImages].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImages((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      Alert.alert('Hata', 'Lütfen bir içerik yazın veya resim ekleyin');
      return;
    }

    if (!profile?.district) {
      Alert.alert('Hata', 'Profil bölgesi bulunamadı');
      return;
    }

    setIsUploading(true);

    try {
      let mediaUrls: string[] = [];

      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (uri) => {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64' as FileSystem.EncodingType,
          });

          const fileType = uri.toLowerCase().endsWith('.png')
            ? 'image/png'
            : uri.toLowerCase().endsWith('.jpg') || uri.toLowerCase().endsWith('.jpeg')
            ? 'image/jpeg'
            : 'image/jpeg';

          const fileName = `image-${Date.now()}.${fileType.split('/')[1]}`;

          const result = await uploadMediaMutation.mutateAsync({
            base64Data: base64,
            fileType,
            fileName,
          });

          return result.url;
        });

        mediaUrls = await Promise.all(uploadPromises);
      }

      await createPostMutation.mutateAsync({
        content: content.trim() || ' ',
        district: profile.district,
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        media_type:
          mediaUrls.length > 0
            ? mediaUrls.some((url) => url.includes('video'))
              ? 'video'
              : 'image'
            : undefined,
      });

      Alert.alert('Başarılı', 'Gönderiniz paylaşıldı!', [
        {
          text: 'Tamam',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Post oluşturma hatası:', error);
      Alert.alert('Hata', 'Gönderi oluşturulurken bir hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yeni Gönderi</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isUploading}
          style={[styles.postButton, isUploading && styles.postButtonDisabled]}
        >
          {isUploading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.postButtonText}>Paylaş</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: profile?.avatar_url || 'https://via.placeholder.com/40',
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.userName}>{profile?.full_name}</Text>
            <View style={styles.locationContainer}>
              <MapPin size={14} color={COLORS.textLight} />
              <Text style={styles.location}>
                {profile?.district && DISTRICT_BADGES[profile.district as District]}{' '}
                {profile?.district}
              </Text>
            </View>
          </View>
        </View>

        <TextInput
          style={styles.textInput}
          placeholder="Ne düşünüyorsunuz?"
          placeholderTextColor={COLORS.textLight}
          multiline
          value={content}
          onChangeText={setContent}
          maxLength={1000}
        />

        {selectedImages.length > 0 && (
          <View style={styles.imagesContainer}>
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.selectedImage} />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  style={styles.removeButton}
                >
                  <X size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.characterCount}>
          {content.length} / 1000
        </Text>
      </ScrollView>

      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={pickImage}
          style={styles.toolButton}
          disabled={selectedImages.length >= 5}
        >
          <ImageIcon
            size={24}
            color={selectedImages.length >= 5 ? COLORS.textLight : COLORS.primary}
          />
          <Text
            style={[
              styles.toolButtonText,
              selectedImages.length >= 5 && styles.toolButtonTextDisabled,
            ]}
          >
            Galeri ({selectedImages.length}/5)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={takePhoto}
          style={styles.toolButton}
          disabled={selectedImages.length >= 5}
        >
          <Camera
            size={24}
            color={selectedImages.length >= 5 ? COLORS.textLight : COLORS.primary}
          />
          <Text
            style={[
              styles.toolButtonText,
              selectedImages.length >= 5 && styles.toolButtonTextDisabled,
            ]}
          >
            Kamera
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  postButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  postButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  locationContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 4,
    gap: 4,
  },
  location: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  textInput: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 200,
    textAlignVertical: 'top' as const,
  },
  imagesContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  imageWrapper: {
    position: 'relative' as const,
    width: '48%',
    aspectRatio: 1,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute' as const,
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  characterCount: {
    textAlign: 'right' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    backgroundColor: COLORS.white,
  },
  toolbar: {
    flexDirection: 'row' as const,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
  },
  toolButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
  },
  toolButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  toolButtonTextDisabled: {
    color: COLORS.textLight,
  },
});
