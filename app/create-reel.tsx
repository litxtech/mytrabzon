/**
 * Create Reel Screen
 * Reel yükleme ekranı
 */

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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICT_BADGES } from '@/constants/districts';
import { District } from '@/types/database';
import { X, Video as VideoIcon, Camera, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CreateReelScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<{
    width: number;
    height: number;
    duration: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadReelMutation = trpc.post.uploadReel.useMutation();
  const uploadMediaMutation = trpc.post.uploadMedia.useMutation();

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 60, // Max 60 saniye
      aspect: [9, 16], // 9:16 aspect ratio
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedVideo(asset.uri);
      
      // Video metadata al
      if (asset.width && asset.height && asset.duration) {
        setVideoMetadata({
          width: asset.width,
          height: asset.height,
          duration: Math.floor(asset.duration),
        });
      }

      // Thumbnail oluştur (ilk frame)
      if (asset.uri) {
        setThumbnail(asset.uri); // Basit olarak video URI'sini kullan
      }
    }
  };

  const takeVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 60,
      aspect: [9, 16],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedVideo(asset.uri);
      
      if (asset.width && asset.height && asset.duration) {
        setVideoMetadata({
          width: asset.width,
          height: asset.height,
          duration: Math.floor(asset.duration),
        });
      }

      setThumbnail(asset.uri);
    }
  };

  const uploadVideo = async (uri: string): Promise<string> => {
    // Video'yu Supabase Storage'a yükle
    const fileExtension = uri.split('.').pop() || 'mp4';
    const fileName = `reels/${Date.now()}.${fileExtension}`;

    // Video'yu base64'e çevir (basit implementasyon)
    // Gerçek uygulamada FormData kullanılmalı
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const { data, error } = await supabase.storage
      .from('post_media')
      .upload(fileName, blob, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      throw new Error(`Video yüklenirken hata oluştu: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('post_media')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!profile?.district) {
      Alert.alert('Hata', 'Profilinizde ilçe bilgisi bulunmuyor. Lütfen profilinizi güncelleyin.');
      return;
    }

    if (!selectedVideo || !videoMetadata) {
      Alert.alert('Uyarı', 'Lütfen bir video seçin.');
      return;
    }

    if (videoMetadata.duration > 60) {
      Alert.alert('Uyarı', 'Video süresi maksimum 60 saniye olmalıdır.');
      return;
    }

    setIsUploading(true);
    try {
      // Video'yu yükle
      const videoUrl = await uploadVideo(selectedVideo);
      
      // Thumbnail yükle (eğer varsa)
      let thumbnailUrl: string | undefined;
      if (thumbnail) {
        const thumbnailResponse = await fetch(thumbnail);
        const thumbnailBlob = await thumbnailResponse.blob();
        const thumbnailFileName = `reels/thumbnails/${Date.now()}.jpg`;
        
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('post_media')
          .upload(thumbnailFileName, thumbnailBlob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (!thumbError && thumbData) {
          const { data: thumbUrlData } = supabase.storage
            .from('post_media')
            .getPublicUrl(thumbData.path);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      // Reel'i oluştur
      await uploadReelMutation.mutateAsync({
        content: content.trim() || ' ',
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        width: videoMetadata.width,
        height: videoMetadata.height,
        duration_seconds: videoMetadata.duration,
        district: profile.district,
        tags: extractHashtags(content),
      });

      Alert.alert('Başarılı', 'Reeliniz paylaşıldı!', [
        {
          text: 'Tamam',
          onPress: () => router.replace('/(tabs)/reels'),
        },
      ]);
    } catch (error) {
      console.error('Reel oluşturma hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Reel oluşturulurken bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image
            source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/40' }}
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
          placeholder="Reel'iniz hakkında bir şeyler yazın..."
          placeholderTextColor={COLORS.textLight}
          multiline
          value={content}
          onChangeText={setContent}
          maxLength={2000}
        />

        {selectedVideo && (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: selectedVideo }}
              style={styles.videoPreview}
              useNativeControls
              resizeMode="contain"
            />
            {videoMetadata && (
              <View style={styles.metadataContainer}>
                <Text style={styles.metadataText}>
                  {videoMetadata.width} × {videoMetadata.height}
                </Text>
                <Text style={styles.metadataText}>
                  {videoMetadata.duration} saniye
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                setSelectedVideo(null);
                setThumbnail(null);
                setVideoMetadata(null);
              }}
              style={styles.removeButton}
            >
              <X size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.characterCount}>
          {content.length} / 2000
        </Text>
      </ScrollView>

      <View style={styles.toolbar}>
        <View style={styles.toolbarActions}>
          <TouchableOpacity
            onPress={pickVideo}
            style={styles.toolButton}
            disabled={!!selectedVideo}
          >
            <VideoIcon
              size={24}
              color={selectedVideo ? COLORS.textLight : COLORS.primary}
            />
            <Text
              style={[
                styles.toolButtonText,
                selectedVideo && styles.toolButtonTextDisabled,
              ]}
            >
              Galeri
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={takeVideo}
            style={styles.toolButton}
            disabled={!!selectedVideo}
          >
            <Camera
              size={24}
              color={selectedVideo ? COLORS.textLight : COLORS.primary}
            />
            <Text
              style={[
                styles.toolButtonText,
                selectedVideo && styles.toolButtonTextDisabled,
              ]}
            >
              Kamera
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isUploading || !selectedVideo}
          style={[styles.shareButton, (isUploading || !selectedVideo) && styles.shareButtonDisabled]}
        >
          {isUploading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.shareButtonText}>Paylaş</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingVertical: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  location: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  videoContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  videoPreview: {
    width: '100%',
    height: 400,
    backgroundColor: COLORS.background,
  },
  metadataContainer: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  metadataText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  characterCount: {
    textAlign: 'right',
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  toolButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  toolButtonTextDisabled: {
    color: COLORS.textLight,
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

