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
import { supabase } from '@/lib/supabase';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICT_BADGES, DISTRICTS, getDistrictsByCity } from '@/constants/districts';
import { District, City } from '@/types/database';
import { X, Image as ImageIcon, Camera, MapPin, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Footer } from '@/components/Footer';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { compressImage } from '@/lib/image-compression';
import { 
  compressVideo, 
  uploadViaSignedUrl, 
  getFriendlyErrorMessage
} from '@/lib/mediaUpload';

export default function CreatePostScreen() {
  const router = useRouter();
  const { edit, room_id, shareEvent, content: initialContent, mediaUrls } = useLocalSearchParams<{ 
    edit?: string; 
    room_id?: string;
    shareEvent?: string;
    content?: string;
    mediaUrls?: string;
  }>();
  const { profile, user, session } = useAuth();
  const { guard } = useAuthGuard();
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [videoDurations, setVideoDurations] = useState<{ [key: string]: number }>({}); // Video URI -> duration (seconds)
  const [videoTrimming, setVideoTrimming] = useState<{ [key: string]: { start: number; end: number } }>({}); // Video URI -> trim times
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({}); // Media URI -> progress percentage
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const isEditMode = !!edit;
  const isGroupPost = !!room_id;
  const isShareEvent = !!shareEvent;

  const createPostMutation = trpc.post.createPost.useMutation();
  const updatePostMutation = trpc.post.updatePost.useMutation();
  const getUploadUrlMutation = trpc.post.getUploadUrl.useMutation();
  
  // Event paylaşımı için event bilgilerini yükle
  const { data: eventsData } = trpc.event.getEvents.useQuery(
    { limit: 100, offset: 0 },
    { enabled: isShareEvent && !!shareEvent }
  );

  // Edit modunda gönderiyi yükle
  const { data: existingPost, isLoading: isLoadingPost } = trpc.post.getPostDetail.useQuery(
    { postId: edit! },
    { enabled: isEditMode && !!edit }
  );

  // Misafir kullanıcı kontrolü - gönderi oluşturma ekranına erişimi engelle
  useEffect(() => {
    if (!user || !session) {
      router.replace('/auth/login');
    }
  }, [user, session, router]);

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    }
    if (mediaUrls) {
      try {
        const urls = JSON.parse(mediaUrls);
        if (Array.isArray(urls)) {
          urls.forEach((url: string) => {
            if (url.match(/\.(mp4|mov|avi|webm)$/i)) {
              setSelectedVideos((prev) => [...prev, url]);
            } else {
              setSelectedImages((prev) => [...prev, url]);
            }
          });
        }
      } catch (e) {
        console.error('Media URLs parse error:', e);
      }
    }
  }, [initialContent, mediaUrls]);

  useEffect(() => {
    if (existingPost && isEditMode) {
      setContent(existingPost.content || '');
      // Mevcut medya varsa URL'lerini ekle
      if (existingPost.media && Array.isArray(existingPost.media)) {
        setSelectedImages(existingPost.media.map((m: { path: string }) => m.path));
      }
      // Mevcut ilçeyi ayarla
      if (existingPost.district) {
        setSelectedDistrict(existingPost.district as District);
      }
    }
  }, [existingPost, isEditMode]);

  // Profil ilçesini varsayılan olarak ayarla
  useEffect(() => {
    if (!isEditMode && profile?.district && !selectedDistrict) {
      setSelectedDistrict(profile.district as District);
    }
  }, [profile?.district, isEditMode, selectedDistrict]);

  useEffect(() => {
    if (isShareEvent && shareEvent && eventsData?.events) {
      const event = eventsData.events.find((e: any) => e.id === shareEvent);
      if (event && !initialContent) {
        // Event bilgilerini içeriğe ekle
        const eventContent = `🚨 Olay Var: ${event.title}\n\n${event.description || ''}\n\n📍 ${event.district}${event.city ? `, ${event.city}` : ''}`;
        setContent(eventContent);
        // Event medya URL'lerini ekle (zaten URL'ler, direkt kullan)
        if (event.media_urls && Array.isArray(event.media_urls) && event.media_urls.length > 0) {
          const videoUrls: string[] = [];
          const imageUrls: string[] = [];
          
          event.media_urls.forEach((url: string) => {
            if (url && typeof url === 'string') {
              // Video kontrolü
              if (url.match(/\.(mp4|mov|avi|webm)$/i) || url.includes('video') || url.includes('mp4')) {
                videoUrls.push(url);
              } else {
                // Image
                imageUrls.push(url);
              }
            }
          });
          
          // URL'leri direkt ekle (upload edilmeyecek - zaten URL'ler)
          if (videoUrls.length > 0) {
            setSelectedVideos((prev) => [...prev, ...videoUrls].slice(0, 3));
          }
          if (imageUrls.length > 0) {
            setSelectedImages((prev) => [...prev, ...imageUrls].slice(0, 5));
          }
        }
      }
    }
    
    // mediaUrls parametresinden de medya ekle (paylaşım için)
    if (mediaUrls && !isShareEvent) {
      try {
        const parsedUrls = JSON.parse(mediaUrls);
        if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
          const videoUrls: string[] = [];
          const imageUrls: string[] = [];
          
          parsedUrls.forEach((url: string) => {
            if (url && typeof url === 'string') {
              // Video kontrolü
              if (url.match(/\.(mp4|mov|avi|webm)$/i) || url.includes('video') || url.includes('mp4')) {
                videoUrls.push(url);
              } else {
                // Image
                imageUrls.push(url);
              }
            }
          });
          
          // URL'leri direkt ekle
          if (videoUrls.length > 0) {
            setSelectedVideos((prev) => [...prev, ...videoUrls].slice(0, 3));
          }
          if (imageUrls.length > 0) {
            setSelectedImages((prev) => [...prev, ...imageUrls].slice(0, 5));
          }
        }
      } catch (error) {
        console.warn('⚠️ mediaUrls parse hatası:', error);
      }
    }
  }, [isShareEvent, shareEvent, eventsData, initialContent, mediaUrls]);

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
      const videoAssets = result.assets.filter(asset => asset.type === 'video');
      const imageUris = result.assets.filter(asset => asset.type !== 'video').map(asset => asset.uri);
      
      // Video limitleri kaldırıldı - tüm videolar kabul edilir
      const validVideos: string[] = [];
      const durations: { [key: string]: number } = {};
      const trimmingInfo: { [key: string]: { start: number; end: number } } = {};
      
      for (const asset of videoAssets) {
        try {
          const duration = asset.duration || 0; // seconds
          
          // Video format kontrolü
          const uri = asset.uri;
          const uriLower = uri.toLowerCase();
          const supportedFormats = ['.mp4', '.mov', '.m4v', '.3gp'];
          const hasSupportedFormat = supportedFormats.some(format => uriLower.includes(format));
          
          if (!hasSupportedFormat && uriLower.includes('.')) {
            const ext = uriLower.split('.').pop();
            console.warn(`⚠️ Desteklenmeyen video formatı: ${ext}. MP4 formatı önerilir.`);
            // Uyarı ver ama devam et (bazı formatlar çalışabilir)
          }
          
          durations[uri] = duration;
          
          // Video dosya boyutunu logla (limit yok)
          let fileSizeMB = 0;
          if (asset.fileSize) {
            fileSizeMB = asset.fileSize / (1024 * 1024);
            console.log(`📹 Video boyutu: ${fileSizeMB.toFixed(2)}MB`);
          }
          
          // Tüm videoları ekle (limit yok)
          validVideos.push(uri);
        } catch (assetError: any) {
          console.error(`❌ Video işleme hatası (${asset.uri}):`, assetError);
          Alert.alert(
            'Video Hatası',
            `Video işlenirken bir hata oluştu: ${assetError.message || 'Bilinmeyen hata'}`,
            [{ text: 'Tamam' }]
          );
          continue; // Bu videoyu atla
        }
      }
      
      // Image'ları compress et (sadece image'lar, video'lara ASLA)
      const compressedImages = await Promise.all(
        imageUris.map(async (uri) => {
          try {
            return await compressImage(uri, { maxWidth: 1080, quality: 0.8 });
          } catch (error) {
            console.warn('Image compression failed, using original:', error);
            return uri; // fallback to original
          }
        })
      );
      
      setVideoDurations(prev => ({ ...prev, ...durations }));
      setVideoTrimming(prev => ({ ...prev, ...trimmingInfo }));
      setSelectedVideos((prev) => [...prev, ...validVideos].slice(0, 3));
      setSelectedImages((prev) => [...prev, ...compressedImages].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor');
      return;
    }

    // Kullanıcıya fotoğraf mı video mu çekmek istediğini sor
    Alert.alert(
      'Medya Seç',
      'Fotoğraf mı video mu çekmek istersiniz?',
      [
        {
          text: 'Fotoğraf',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              // Compress et
              const compressedUri = await compressImage(result.assets[0].uri, { maxWidth: 1080, quality: 0.8 });
              setSelectedImages((prev) => [...prev, compressedUri].slice(0, 5));
            }
          },
        },
        {
          text: 'Video',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['videos'],
              quality: 0.8,
              videoMaxDuration: undefined, // Süre limiti yok
            });

            if (!result.canceled && result.assets[0]) {
              const videoUri = result.assets[0].uri;
              const duration = result.assets[0].duration || 0;
              
              // Video süresini kaydet
              setVideoDurations(prev => ({ ...prev, [videoUri]: duration }));
              
              // Videoyu ekle
              setSelectedVideos((prev) => [...prev, videoUri].slice(0, 3));
            }
          },
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ]
    );
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    const uri = selectedVideos[index];
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index));
    setVideoDurations(prev => {
      const newDurations = { ...prev };
      delete newDurations[uri];
      return newDurations;
    });
    setVideoTrimming(prev => {
      const newTrimming = { ...prev };
      delete newTrimming[uri];
      return newTrimming;
    });
  };

  // Video süresini formatla (MM:SS)
  const formatVideoDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0 && selectedVideos.length === 0) {
      Alert.alert('Hata', 'Lütfen bir içerik yazın veya medya ekleyin');
      return;
    }

    // İlçe kontrolü - profil ilçesi kullan
    const districtToUse = profile?.district;
    if (!districtToUse) {
      Alert.alert('Hata', 'Profil bölgesi bulunamadı. Lütfen profil ayarlarından ilçe seçin.');
      return;
    }

    setIsUploading(true);

    try {
      let mediaUrls: string[] = [];

      // Image ve video upload
      const allMedia: Array<{ uri: string; type: 'image' | 'video' }> = [
        ...selectedImages.map(uri => ({ uri, type: 'image' as const })),
        ...selectedVideos.map(uri => ({ uri, type: 'video' as const })),
      ];

      if (allMedia.length > 0) {
        // Video'ları sequential upload et (paralel yerine) - büyük dosyalar için daha güvenli
        const uploadSequentially = async (mediaArray: typeof allMedia) => {
          const results: string[] = [];
          for (let i = 0; i < mediaArray.length; i++) {
            const media = mediaArray[i];
            try {
              const url = await uploadSingleMedia(media);
              results.push(url);
            } catch (error: any) {
              console.error(`❌ Medya ${i + 1}/${mediaArray.length} upload hatası:`, error);
              throw error; // İlk hatada durdur
            }
          }
          return results;
        };

        const uploadSingleMedia = async (media: { uri: string; type: 'image' | 'video' }) => {
          // Eğer URI zaten bir URL ise (http/https ile başlıyorsa), direkt kullan
          if (media.uri.startsWith('http://') || media.uri.startsWith('https://')) {
            setUploadProgress(prev => ({ ...prev, [media.uri]: 100 }));
            return media.uri;
          }

          // Local file ise upload et
          let finalUri = media.uri;
          let actualFormat: 'jpeg' | 'png' = 'jpeg';
          
          if (media.type === 'image') {
            // Orijinal format'ı kontrol et
            const originalIsPng = media.uri.toLowerCase().endsWith('.png');
            
            // Progress: 10%
            setUploadProgress(prev => ({ ...prev, [media.uri]: 10 }));
            
            // compressImage sadece image'lere uygulanır, video'lara ASLA
            try {
              // compressImage fonksiyonu orijinal format'ı korur (PNG ise PNG, değilse JPEG)
              finalUri = await compressImage(media.uri, { 
                maxWidth: 1080, 
                quality: 0.8,
              });
            } catch (compressionError: any) {
              // Image compression başarısız olursa orijinal URI'yi kullan
              console.warn('⚠️ Image compression failed, using original:', compressionError);
              finalUri = media.uri; // fallback to original
            }
            
            // Progress: 30%
            setUploadProgress(prev => ({ ...prev, [media.uri]: 30 }));
            
            // Compress edilmiş URI'nin formatını kontrol et
            const uriLower = finalUri.toLowerCase();
            if (uriLower.endsWith('.png')) {
              actualFormat = 'png';
            } else if (uriLower.endsWith('.jpg') || uriLower.endsWith('.jpeg')) {
              actualFormat = 'jpeg';
            } else {
              actualFormat = originalIsPng ? 'png' : 'jpeg';
            }
          } else if (media.type === 'video') {
            // Progress: 10% - Video compression başlıyor
            setUploadProgress(prev => ({ ...prev, [media.uri]: 10 }));
            
            try {
              // Compress video using ffmpeg (TikTok/Instagram style)
              console.log('🎬 Video sıkıştırma başlıyor...');
              const compressedResult = await compressVideo(finalUri);
              finalUri = compressedResult.uri;
              
              // Progress: 30% - Compression tamamlandı
              setUploadProgress(prev => ({ ...prev, [media.uri]: 30 }));
              
              // Boyut kontrolü kaldırıldı - compression sonrası sadece log
              const fileInfo = await FileSystem.getInfoAsync(finalUri);
              if (fileInfo.exists && 'size' in fileInfo && fileInfo.size) {
                const fileSizeMB = fileInfo.size / (1024 * 1024);
                console.log(`📹 Sıkıştırılmış video boyutu: ${fileSizeMB.toFixed(2)}MB`);
              }
              
              console.log(`✅ Video sıkıştırma başarılı: ${(compressedResult.size / (1024 * 1024)).toFixed(2)}MB`);
            } catch (compressionError: any) {
              // Compression hatası durumunda orijinal dosyayı kullan
              // Boyut kontrolü kaldırıldı - herhangi bir boyutta video kabul ediliyor
              console.warn('⚠️ Video sıkıştırma hatası, orijinal dosya kullanılıyor:', compressionError);
              
              // Orijinal dosyanın boyutunu sadece log için kontrol et
              try {
                const originalFileInfo = await FileSystem.getInfoAsync(media.uri);
                if (originalFileInfo.exists && 'size' in originalFileInfo && originalFileInfo.size) {
                  const originalSizeMB = originalFileInfo.size / (1024 * 1024);
                  console.log(`📹 Orijinal video boyutu: ${originalSizeMB.toFixed(2)}MB`);
                }
              } catch (sizeError: any) {
                // Boyut kontrolü yapılmıyor, sadece log
                console.warn('Boyut bilgisi alınamadı:', sizeError);
              }
              
              // finalUri zaten orijinal URI'yi içeriyor, devam et
            }
          }
          
          // Progress: 50% - File ready for upload
          setUploadProgress(prev => ({ ...prev, [media.uri]: 50 }));

          const isVideo = media.type === 'video';
          const fileType = isVideo
            ? 'video/mp4'
            : actualFormat === 'png'
            ? 'image/png'
            : 'image/jpeg';

          const extension = isVideo ? 'mp4' : actualFormat;

          // Progress: 60% - Getting upload URL
          setUploadProgress(prev => ({ ...prev, [media.uri]: 60 }));

          // Get signed upload URL from backend
          let uploadUrlResult;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount <= maxRetries) {
            try {
              uploadUrlResult = await getUploadUrlMutation.mutateAsync({
                fileExtension: extension,
                contentType: fileType,
                mediaType: isVideo ? 'video' : 'image',
              });
              break;
            } catch (urlError: any) {
              console.error(`❌ Upload URL hatası (deneme ${retryCount + 1}/${maxRetries + 1}):`, urlError);
              
              if (retryCount >= maxRetries) {
                throw new Error('Sunucu hatası. Lütfen tekrar deneyin.');
              }
              
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
          }

          if (!uploadUrlResult) {
            throw new Error('Upload URL alınamadı. Lütfen tekrar deneyin.');
          }

          // Progress: 70% - Uploading via signed URL
          setUploadProgress(prev => ({ ...prev, [media.uri]: 70 }));

          // Upload file directly to Supabase Storage using signed URL
          retryCount = 0;
          const maxUploadRetries = isVideo ? 3 : 2;
          
          while (retryCount <= maxUploadRetries) {
            try {
              await uploadViaSignedUrl(
                uploadUrlResult.uploadUrl,
                finalUri,
                fileType,
                (progress) => {
                  // Progress: 70% + (progress * 0.25) = 70-95%
                  const totalProgress = 70 + (progress * 0.25);
                  setUploadProgress(prev => ({ ...prev, [media.uri]: totalProgress }));
                }
              );
              
              // Progress: 100% - Upload complete
              setUploadProgress(prev => ({ ...prev, [media.uri]: 100 }));
              
              console.log(`✅ Upload başarılı: ${uploadUrlResult.publicUrl}`);
              return uploadUrlResult.publicUrl;
            } catch (uploadError: any) {
              const errorMessage = uploadError?.message || '';
              
              // VIDEO_TOO_LARGE hatası artık kontrol edilmiyor - boyut limiti kaldırıldı
              // if (errorMessage === 'VIDEO_TOO_LARGE' || errorMessage.includes('VIDEO_TOO_LARGE')) {
              //   throw new Error('VIDEO_TOO_LARGE');
              // }
              
              console.error(`❌ Upload hatası (deneme ${retryCount + 1}/${maxUploadRetries + 1}):`, uploadError);
              
              // Network/timeout hataları için retry
              const isRetryableError = 
                errorMessage.includes('network') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('fetch') ||
                errorMessage.includes('connection');
              
              if (isRetryableError && retryCount < maxUploadRetries) {
                retryCount++;
                const delay = 2000 * retryCount;
                console.log(`⏳ ${delay / 1000} saniye bekleyip tekrar denenecek...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
              
              // Son deneme veya retry yapılamaz hata
              throw uploadError;
            }
          }
          
          throw new Error('Upload başarısız oldu. Lütfen tekrar deneyin.');
        };

        // Video varsa sequential, sadece image varsa parallel upload
        const hasVideo = allMedia.some(m => m.type === 'video');
        if (hasVideo) {
          console.log('📹 Video tespit edildi - sequential upload kullanılıyor');
          mediaUrls = await uploadSequentially(allMedia);
        } else {
          console.log('📷 Sadece resim var - parallel upload kullanılıyor');
          const uploadPromises = allMedia.map(media => uploadSingleMedia(media));
          mediaUrls = await Promise.all(uploadPromises);
        }
        
        // Upload tamamlandıktan sonra progress'i temizle
        setUploadProgress({});
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
        const districtToUse = selectedDistrict || profile?.district;
        if (!districtToUse) {
          throw new Error('İlçe seçilmedi');
        }
        
        await createPostMutation.mutateAsync({
          content: content.trim() || ' ',
          district: districtToUse,
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
    } catch (error: any) {
      console.error('❌ Post oluşturma hatası:', error);
      
      // Use friendly error message helper
      const errorMessage = getFriendlyErrorMessage(error);
      
      // VIDEO_TOO_LARGE kontrolü kaldırıldı - boyut limiti yok
      // if (isVideoTooLarge) {
      //   Alert.alert('Hata', errorMessage);
      //   return;
      // }
      
      console.error('Hata detayları:', {
        message: errorMessage,
        error: error,
      });
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header} pointerEvents="box-none">
        <TouchableOpacity 
          onPress={() => {
            router.back();
          }} 
          style={styles.closeButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.7}
          disabled={isUploading}
        >
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Gönderiyi Düzenle' : 'Yeni Gönderi'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: profile?.avatar_url || 'https://via.placeholder.com/40',
            }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
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
            {selectedVideos.map((uri, index) => {
              const duration = videoDurations[uri] || 0;
              const trimInfo = videoTrimming[uri];
              const displayDuration = trimInfo ? trimInfo.end - trimInfo.start : duration;
              const progress = uploadProgress[uri] || 0;
              
              return (
                <View key={`vid-${index}`} style={styles.videoWrapper}>
                  <Video
                    source={{ 
                      uri,
                      overrideFileExtensionAndroid: 'mp4' // Android için format belirt
                    }}
                    style={styles.selectedVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={false}
                    isLooping
                    isMuted
                    useNativeControls
                    onError={(error) => {
                      console.error(`❌ Video yükleme hatası (${uri.substring(0, 50)}...):`, error);
                      Alert.alert(
                        'Video Hatası',
                        'Video yüklenirken bir hata oluştu. Lütfen farklı bir video seçin.',
                        [{ text: 'Tamam' }]
                      );
                    }}
                    onLoadStart={() => {
                      console.log(`📹 Video yükleniyor: ${uri.substring(0, 50)}...`);
                    }}
                    onLoad={(status) => {
                      console.log(`✅ Video yüklendi: ${uri.substring(0, 50)}...`);
                    }}
                    onPlaybackStatusUpdate={(status) => {
                      // Video yüklendiğinde süresini al
                      if (status.isLoaded && status.durationMillis && !videoDurations[uri]) {
                        const videoDuration = status.durationMillis / 1000; // seconds
                        setVideoDurations(prev => ({ ...prev, [uri]: videoDuration }));
                      }
                    }}
                  />
                  <View style={styles.videoOverlay}>
                    {/* Video Süre Göstergesi */}
                    {duration > 0 && (
                      <View style={styles.videoDurationBadge}>
                        <Text style={styles.videoDurationText}>
                          {formatVideoDuration(displayDuration)}
                        </Text>
                      </View>
                    )}
                    {/* Kırpma Bilgisi */}
                    {trimInfo && (
                      <View style={styles.trimBadge}>
                        <Text style={styles.trimText}>Kırpıldı</Text>
                      </View>
                    )}
                    {/* Upload Progress */}
                    {isUploading && progress > 0 && progress < 100 && (
                      <View style={styles.uploadProgressContainer}>
                        <View style={[styles.uploadProgressBar, { width: `${progress}%` }]} />
                        <Text style={styles.uploadProgressText}>{Math.round(progress)}%</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeVideo(index)}
                    style={styles.removeButton}
                  >
                    <X size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.characterCount}>
          {content.length} / 1000
        </Text>
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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative' as const,
    zIndex: 100,
  },
  closeButton: {
    padding: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 101,
    position: 'relative' as const,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600' as const,
    color: COLORS.text,
  },

  content: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
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
    pointerEvents: 'none' as const,
  },
  videoDurationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoDurationText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
  },
  trimBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  trimText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
  },
  uploadProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  uploadProgressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  uploadProgressText: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -20 }],
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  districtSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  districtLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  districtPickerButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  districtPickerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  districtPickerPlaceholder: {
    color: COLORS.textLight,
  },
  districtPickerContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  districtScroll: {
    maxHeight: 300,
  },
  districtOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  districtOptionActive: {
    backgroundColor: COLORS.primary + '10',
  },
  districtOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  districtOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600' as const,
  },
});
