import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICT_BADGES } from '@/constants/districts';
import { District } from '@/types/database';
import { X, Image as ImageIcon, Camera, MapPin, Video as VideoIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Footer } from '@/components/Footer';
import { Video, ResizeMode } from 'expo-av';

export default function CreatePostScreen() {
  const router = useRouter();
  const { edit, room_id } = useLocalSearchParams<{ edit?: string; room_id?: string }>();
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const isEditMode = !!edit;
  const isGroupPost = !!room_id;

  const createPostMutation = trpc.post.createPost.useMutation();
  const updatePostMutation = trpc.post.updatePost.useMutation();
  const uploadMediaMutation = trpc.post.uploadMedia.useMutation();
  
  // Edit modunda gönderiyi yükle
  const { data: existingPost, isLoading: isLoadingPost } = trpc.post.getPostDetail.useQuery(
    { postId: edit! },
    { enabled: isEditMode && !!edit }
  );

  useEffect(() => {
    if (existingPost && isEditMode) {
      setContent(existingPost.content || '');
      // Mevcut medya varsa URL'lerini ekle
      if (existingPost.media && Array.isArray(existingPost.media)) {
        setSelectedImages(existingPost.media.map((m: { path: string }) => m.path));
      }
    }
  }, [existingPost, isEditMode]);

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
      // Video ve image'ları ayır
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

  const removeVideo = (index: number) => {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0 && selectedVideos.length === 0) {
      Alert.alert('Hata', 'Lütfen bir içerik yazın veya medya ekleyin');
      return;
    }

    if (!profile?.district) {
      Alert.alert('Hata', 'Profil bölgesi bulunamadı');
      return;
    }

    setIsUploading(true);

    try {
      let mediaUrls: string[] = [];

      // Image ve video upload
      const allMedia = [
        ...selectedImages.map(uri => ({ uri, type: 'image' })),
        ...selectedVideos.map(uri => ({ uri, type: 'video' })),
      ];

      if (allMedia.length > 0) {
        const uploadPromises = allMedia.map(async (media) => {
          const base64 = await FileSystem.readAsStringAsync(media.uri, {
            encoding: 'base64' as any,
          });

          const isVideo = media.type === 'video';
          const fileType = isVideo
            ? 'video/mp4'
            : media.uri.toLowerCase().endsWith('.png')
            ? 'image/png'
            : 'image/jpeg';

          const extension = isVideo ? 'mp4' : fileType.split('/')[1];
          const fileName = `${media.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;

          const result = await uploadMediaMutation.mutateAsync({
            base64Data: base64,
            fileType,
            fileName,
          });

          return result.url;
        });

        mediaUrls = await Promise.all(uploadPromises);
      }

      if (isEditMode && edit) {
        // Gönderiyi güncelle
        await updatePostMutation.mutateAsync({
          postId: edit,
          content: content.trim() || ' ',
          media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        });

        Alert.alert('Başarılı', 'Gönderiniz güncellendi!', [
          {
            text: 'Tamam',
            onPress: () => router.back(),
          },
        ]);
      } else {
        // Yeni gönderi oluştur
        await createPostMutation.mutateAsync({
          content: content.trim() || ' ',
          district: profile.district,
          media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        });

        Alert.alert('Başarılı', 'Gönderiniz paylaşıldı!', [
          {
            text: 'Tamam',
            onPress: () => {
              if (isGroupPost && room_id) {
                router.replace(`/chat/${room_id}`);
              } else {
                router.replace('/(tabs)/feed');
              }
            },
          },
        ]);
      }
    } catch (error) {
      console.error('Post oluşturma hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gönderi oluşturulurken bir hata oluştu';
      Alert.alert('Hata', errorMessage);
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
        <Text style={styles.headerTitle}>{isEditMode ? 'Gönderiyi Düzenle' : 'Yeni Gönderi'}</Text>
        <View style={{ width: 24 }} />
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
              <View key={`img-${index}`} style={styles.imageWrapper}>
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

        {selectedVideos.length > 0 && (
          <View style={styles.videosContainer}>
            {selectedVideos.map((uri, index) => (
              <View key={`vid-${index}`} style={styles.videoWrapper}>
                <Video
                  source={{ uri }}
                  style={styles.selectedVideo}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping
                  isMuted
                  useNativeControls
                />
                <View style={styles.videoOverlay}>
                  <VideoIcon size={32} color={COLORS.white} />
                </View>
                <TouchableOpacity
                  onPress={() => removeVideo(index)}
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
        
        <Footer />
      </ScrollView>

      <View style={styles.toolbar}>
        <View style={styles.toolbarActions}>
          <TouchableOpacity
            onPress={pickImage}
            style={styles.toolButton}
            disabled={selectedImages.length >= 5 && selectedVideos.length >= 3}
          >
            <ImageIcon
              size={24}
              color={(selectedImages.length >= 5 && selectedVideos.length >= 3) ? COLORS.textLight : COLORS.primary}
            />
            <Text
              style={[
                styles.toolButtonText,
                (selectedImages.length >= 5 && selectedVideos.length >= 3) && styles.toolButtonTextDisabled,
              ]}
            >
              Medya ({selectedImages.length + selectedVideos.length}/8)
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

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isUploading || isLoadingPost}
          style={[styles.shareButton, (isUploading || isLoadingPost) && styles.shareButtonDisabled]}
        >
          {(isUploading || isLoadingPost) ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.shareButtonText}>{isEditMode ? 'Güncelle' : 'Paylaş'}</Text>
          )}
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
    zIndex: 10,
  },
  videosContainer: {
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative' as const,
  },
  selectedVideo: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.3)',
    pointerEvents: 'none' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  toolbarActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.lg,
  },
  toolButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
    flexShrink: 0, // Android'de metinlerin kesilmemesi için
  },
  toolButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flexShrink: 0, // Android'de metinlerin tam görünmesi için
  },
  toolButtonTextDisabled: {
    color: COLORS.textLight,
  },
  shareButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 24,
    minWidth: 100,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0, // Android'de butonun küçülmemesi için
    shadowColor: COLORS.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shareButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    flexShrink: 0, // Android'de metinlerin tam görünmesi için
  },
});
