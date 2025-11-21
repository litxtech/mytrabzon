/**
 * Video Feed Item Component
 * - Tam ekran video
 * - Yorum paneli (bottom sheet)
 * - Beğeni, paylaş, kaydet butonları
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Pressable,
  Modal,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Heart, MessageCircle, Share2, Bookmark, VolumeX } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { Image } from 'expo-image';
import { CommentSheetExpoGo, CommentSheetExpoGoRef } from './CommentSheetExpoGo';
import VerifiedBadgeIcon from './VerifiedBadge';

// Expo Go için CommentSheetExpoGo kullan (her zaman çalışır)
const CommentSheet = CommentSheetExpoGo;
type CommentSheetRef = CommentSheetExpoGoRef;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoFeedItemProps {
  post: any;
  isActive: boolean;
  isViewable: boolean;
  index: number;
  onCommentsChange?: (isOpen: boolean) => void;
}

export function VideoFeedItem({ post, isActive, isViewable, index, onCommentsChange }: VideoFeedItemProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
<<<<<<< HEAD
  const [isVideoReady, setIsVideoReady] = useState(false);
  const commentSheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
=======
  const [showShareModal, setShowShareModal] = useState(false);
  const commentSheetRef = useRef<CommentSheetRef>(null);
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020
  const lastTap = useRef(0);
  const isMountedRef = useRef(true);

  const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
  const videoUrl = firstMedia?.path;
  const isEvent = post.isEvent || false;

  const utils = trpc.useUtils();
  
  const likePostMutation = trpc.post.likePost.useMutation({
    onMutate: async () => {
      // Optimistic update: Beğeniyi hemen güncelle
      const previousLiked = isLiked;
      const previousCount = likeCount;
      
      setIsLiked(!isLiked);
      setLikeCount((prev: number) => (isLiked ? prev - 1 : prev + 1));
      
      return { previousLiked, previousCount };
    },
    onError: (error, variables, context) => {
      // Hata durumunda geri al
      if (context) {
        setIsLiked(context.previousLiked);
        setLikeCount(context.previousCount);
      }
      console.error('Like post error:', error);
    },
    onSuccess: () => {
      // Cache'i invalidate et
      utils.post.getPosts.invalidate();
      utils.post.getPostDetail.invalidate({ postId: post.id });
    },
  });

  const likeEventMutation = (trpc as any).event.likeEvent.useMutation({
    onSuccess: () => {
      setIsLiked(!isLiked);
      // Event'ler için upvotes - downvotes kullanılıyor
      setLikeCount((prev: number) => (isLiked ? prev - 1 : prev + 1));
    },
<<<<<<< HEAD
    onError: (error: any) => {
=======
    onError: (error: unknown) => {
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020
      console.error('Like event error:', error);
    },
  });

  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Audio session'ı aktif et
  useEffect(() => {
<<<<<<< HEAD
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {
      // Sessizce geç
    });
  }, []);
=======
    let mounted = true;
    
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        if (mounted) {
          setAudioSessionReady(true);
          // Audio session activated silently
        }
      } catch (error) {
        // Sessizce geç veya logla, crash olmasın
        console.warn('⚠️ Audio session activation warning:', error);
        // Hata olsa bile devam et, bazı durumlarda çalışabilir
        if (mounted) {
          setAudioSessionReady(true);
        }
      }
    };

    initAudio();
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020

  // Component unmount olduğunda flag'i güncelle
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Video yüklendiğinde hazır olduğunu işaretle
  const handleVideoLoad = () => {
    setVideoReady(true);
    setIsLoading(false);
  };

  // Sadece aktif video oynatılır - diğerleri durur
  useEffect(() => {
<<<<<<< HEAD
    // Video hazır değilse bekle
    if (!isVideoReady || !videoUrl) return;

    const timer = setTimeout(() => {
      if (!isMountedRef.current) return;

      // Video ref'inin geçerli olduğundan emin ol
      if (!videoRef.current) return;

      if (isActive) {
        // Audio session aktif olduğundan emin ol
        Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        })
          .then(() => {
            // Ref'in hala geçerli olduğunu kontrol et
            if (!isMountedRef.current || !videoRef.current) return;
            
            try {
              return videoRef.current.playAsync();
            } catch {
              // Native view hatası - sessizce geç
              return null;
            }
          })
          .then(() => {
            if (isMountedRef.current) {
              setIsPlaying(true);
            }
          })
          .catch(() => {
            // Tüm hataları sessizce geç - console'a yazma
            if (isMountedRef.current) {
              setIsLoading(false);
            }
          });
      } else {
        // Aktif değilse durdur
        if (videoRef.current && isMountedRef.current) {
          try {
            videoRef.current.pauseAsync().catch(() => {
              // Sessizce geç
            });
          } catch {
            // Sessizce geç
          }
        }
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
      }
    }, 200); // Daha uzun gecikme - native view'ın hazır olması için

    return () => clearTimeout(timer);
  }, [isActive, videoUrl, isVideoReady]);
=======
    if (isActive && videoRef.current && videoUrl && videoUrl.trim() !== '' && audioSessionReady && videoReady) {
      const playVideo = async () => {
        try {
          // Video referansının hala geçerli olduğundan emin ol
          if (!videoRef.current) {
            console.warn('⚠️ Video ref is null, skipping play');
            return;
          }
          
          // Video URL'inin geçerli olduğundan emin ol
          if (!videoUrl || videoUrl.trim() === '') {
            console.warn('⚠️ Video URL is invalid, skipping play');
            return;
          }

          // Audio session'ı tekrar aktif et (garanti olsun)
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              staysActiveInBackground: false,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
          } catch (audioError) {
            // Audio session hatası kritik değil, devam et
            console.warn('⚠️ Audio session re-activation warning:', audioError);
          }

          // Kısa bir gecikme ekle (audio session'ın aktif olması için)
          await new Promise(resolve => setTimeout(resolve, 100));

          // Tekrar kontrol et - video hala mevcut mu?
          if (videoRef.current) {
            try {
              await videoRef.current.playAsync();
              setIsPlaying(true);
            } catch (playError: any) {
              // "audio session not activated" hatası için tekrar dene
              if (playError?.message?.includes('audio session')) {
                console.warn('⚠️ Audio session hatası, tekrar deneniyor...');
                // Audio session'ı tekrar aktif et ve tekrar dene
                try {
                  await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                  });
                  await new Promise(resolve => setTimeout(resolve, 200));
                  if (videoRef.current) {
                    await videoRef.current.playAsync();
                    setIsPlaying(true);
                  }
                } catch (retryError) {
                  console.warn('⚠️ Video play retry failed:', retryError);
                  setIsLoading(false);
                }
              } else {
                console.warn('⚠️ Video play warning:', playError);
                setIsLoading(false);
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Video play error:', error);
          setIsLoading(false);
        }
      };

      playVideo();
    } else if (!isActive && videoRef.current && videoReady) {
      // Aktif değilse durdur - video hazır olduğunda
      videoRef.current.pauseAsync().catch((err) => {
        // Ignore pause errors - video null olabilir
        console.warn('⚠️ Video pause warning:', err);
      });
      setIsPlaying(false);
    }
  }, [isActive, videoUrl, audioSessionReady, videoReady]);
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020

  // Sadece aktif video sesli olmalı - video hazır olduğunda
  useEffect(() => {
<<<<<<< HEAD
    // Video hazır değilse bekle
    if (!isVideoReady) return;

    const timer = setTimeout(() => {
      if (!isMountedRef.current || !videoRef.current) return;

      try {
        videoRef.current.setIsMutedAsync(!isActive).catch(() => {
          // Sessizce geç
        });
      } catch {
        // Sessizce geç
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isActive, isVideoReady]);
=======
    if (videoRef.current && videoReady && videoUrl && videoUrl.trim() !== '') {
      videoRef.current.setIsMutedAsync(!isActive).catch((error) => {
        // Video henüz hazır değilse veya null ise sessizce geç
        console.warn('⚠️ Video mute operation warning:', error);
      });
    }
  }, [isActive, videoReady, videoUrl]);
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020

  const handleLike = () => {
    if (isEvent) {
      // Event'ler için event_id'yi çıkar (event_ prefix'ini kaldır)
      const eventId = post.id.replace('event_', '');
      likeEventMutation.mutate({ event_id: eventId });
    } else {
      likePostMutation.mutate({ postId: post.id });
    }
  };

  const handleComment = () => {
    commentSheetRef.current?.present();
    onCommentsChange?.(true);
  };

  // Video üzerine tıklama - çift tıklama beğeni, tek tıklama pause/play
  const handleVideoPress = async () => {
    if (!videoUrl || videoUrl.trim() === '') return; // Video URL geçersizse işlem yapma
    if (!videoRef.current) return; // Video ref null ise işlem yapma
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Çift tıklama - beğeni
      handleLike();
    } else {
      // Tek tıklama - pause/play toggle
<<<<<<< HEAD
      if (!videoRef.current || !isVideoReady || !isMountedRef.current) return;

      try {
        if (isPlaying) {
          videoRef.current.pauseAsync().catch(() => {
            // Sessizce geç
          });
          setIsPlaying(false);
        } else {
          videoRef.current.playAsync().catch(() => {
            // Sessizce geç
          });
          setIsPlaying(true);
        }
      } catch {
        // Sessizce geç
=======
      if (videoRef.current && videoReady && videoUrl && videoUrl.trim() !== '') {
        if (isPlaying) {
          // Video hazır olduğunda pause
          videoRef.current.pauseAsync().catch((error) => {
            // Video null olabilir, sessizce geç
            console.warn('⚠️ Video pause warning:', error);
          });
          setIsPlaying(false);
        } else {
          // Play için audio session kontrolü
          try {
            // Audio session'ı aktif et
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              staysActiveInBackground: false,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Video referansını tekrar kontrol et
            if (videoRef.current && videoReady) {
              try {
                await videoRef.current.playAsync();
                setIsPlaying(true);
              } catch (playError: any) {
                // "audio session not activated" hatası için tekrar dene
                if (playError?.message?.includes('audio session')) {
                  console.warn('⚠️ Audio session hatası, tekrar deneniyor...');
                  try {
                    await Audio.setAudioModeAsync({
                      allowsRecordingIOS: false,
                      staysActiveInBackground: false,
                      playsInSilentModeIOS: true,
                      shouldDuckAndroid: true,
                      playThroughEarpieceAndroid: false,
                    });
                    await new Promise(resolve => setTimeout(resolve, 200));
                    if (videoRef.current && videoReady) {
                      await videoRef.current.playAsync();
                      setIsPlaying(true);
                    }
                  } catch (retryError) {
                    console.warn('⚠️ Video play retry failed:', retryError);
                  }
                } else {
                  console.warn('⚠️ Video play warning:', playError);
                }
              }
            }
          } catch (audioError) {
            console.warn('⚠️ Audio session activation error:', audioError);
          }
        }
      } else {
        console.warn('⚠️ Video ref is null or not ready, cannot toggle play/pause');
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020
      }
    }
    lastTap.current = now;
  };

  // Video container için pan responder (sola swipe ile çıkış)
  const videoPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Sola swipe (dx < 0)
        return gestureState.dx < -30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Sola yeterince çekildiyse çık (eşik: -80px)
        if (gestureState.dx < -80 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5) {
          router.back();
        }
      },
    })
  ).current;

  if (!videoUrl) return null;

  // Güvenli author bilgileri
  const authorName = post.author?.full_name || 'Kullanıcı';
  const authorUsername = post.author?.username || authorName.toLowerCase().replace(/\s+/g, '') || 'kullanici';
  const authorAvatar = post.author?.avatar_url || 'https://via.placeholder.com/40';

  return (
    <View style={[styles.container, { height: SCREEN_HEIGHT }]} {...videoPanResponder.panHandlers}>
      <Pressable 
        style={styles.videoContainer}
        onPress={handleVideoPress}
      >
        {videoUrl && videoUrl.trim() !== '' && typeof videoUrl === 'string' ? (
          <Video
            key={`video-${post.id}-${index}-${videoUrl.substring(0, 20)}`}
            ref={videoRef}
            source={{ 
              uri: videoUrl.trim(),
              overrideFileExtensionAndroid: 'mp4' 
            }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted={isMuted}
            shouldPlay={isActive && videoReady && !isLoading}
            useNativeControls={false}
            onError={(error) => {
<<<<<<< HEAD
              // Hataları sessizce geç - console'a yazma
              if (isMountedRef.current) {
                setIsLoading(false);
              }
            }}
            onLoadStart={() => {
              if (isMountedRef.current) {
                setIsLoading(true);
              }
            }}
            onLoad={() => {
              if (isMountedRef.current) {
                setIsLoading(false);
                // Video yüklendiğinde hazır olarak işaretle
                setTimeout(() => {
                  if (isMountedRef.current) {
                    setIsVideoReady(true);
                  }
                }, 100);
              }
            }}
            onReadyForDisplay={() => {
              if (isMountedRef.current) {
                setIsVideoReady(true);
                setIsLoading(false);
              }
=======
              console.error('VideoFeedItem Video error:', error);
              setIsLoading(false);
              setVideoReady(false);
            }}
            onLoadStart={() => {
              setIsLoading(true);
              setVideoReady(false);
            }}
            onLoad={() => {
              setIsLoading(false);
              setVideoReady(true);
              handleVideoLoad();
            }}
            onReadyForDisplay={() => {
              // Video görüntülenmeye hazır olduğunda
              setIsLoading(false);
              setVideoReady(true);
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020
            }}
          />
        ) : (
          <View style={[styles.video, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={COLORS.white} />
            <Text style={{ color: COLORS.white, marginTop: 10 }}>Video yükleniyor...</Text>
          </View>
        )}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingIndicator} />
          </View>
        )}
      </Pressable>

      {/* Overlay - Kullanıcı bilgisi ve içerik */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Sol alt - Kullanıcı bilgisi */}
        <View style={styles.bottomSection} pointerEvents="auto">
          <View style={styles.userInfo}>
            <TouchableOpacity
              onPress={() => {
                if (post.author_id) {
                  router.push(`/profile/${post.author_id}` as any);
                }
              }}
              style={styles.userAvatarContainer}
            >
              <Image
                source={{ uri: authorAvatar }}
                style={styles.userAvatar}
                contentFit="cover"
              />
            </TouchableOpacity>
            <View style={styles.userDetails}>
              <TouchableOpacity
                onPress={() => {
                  if (post.author_id) {
                    router.push(`/profile/${post.author_id}` as any);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={[styles.username, { color: COLORS.white }]}>
                  {authorName}
                </Text>
                {post.author?.verified && <VerifiedBadgeIcon size={16} />}
              </TouchableOpacity>
              <Text style={[styles.userHandle, { color: COLORS.white }]}>
                @{authorUsername}
              </Text>
              {post.content && (
                <Text style={[styles.caption, { color: COLORS.white }]} numberOfLines={2}>
                  {post.content}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Sağ taraf - Aksiyon butonları */}
        <View style={styles.rightActions} pointerEvents="auto">
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Heart
              size={32}
              color={isLiked ? theme.colors.error : COLORS.white}
              fill={isLiked ? theme.colors.error : 'transparent'}
            />
            <Text style={styles.actionCount}>{likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
            <MessageCircle size={32} color={COLORS.white} />
            <Text style={styles.actionCount}>{post.comment_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Share2 size={32} color={COLORS.white} />
            <Text style={styles.actionCount}>{post.share_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Bookmark size={32} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Yorum Paneli - BottomSheetModal */}
      <CommentSheet
        ref={commentSheetRef}
        postId={post.id}
        initialCount={post.comment_count || 0}
        onClose={() => onCommentsChange?.(false)}
      />

      {/* Paylaş Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <Pressable
          style={styles.shareModalOverlay}
          onPress={() => setShowShareModal(false)}
        >
          <View style={[styles.shareModalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.shareModalTitle, { color: theme.colors.text }]}>
              Paylaş
            </Text>
            
            <TouchableOpacity
              style={[styles.shareOption, { borderBottomColor: theme.colors.border }]}
              onPress={async () => {
                setShowShareModal(false);
                try {
                  await Share.share({
                    message: 'Bu videoyu izle!',
                    url: videoUrl || '',
                  });
                } catch (error) {
                  console.error('Share error:', error);
                }
              }}
            >
              <Share2 size={24} color={theme.colors.text} />
              <Text style={[styles.shareOptionText, { color: theme.colors.text }]}>
                Normal Paylaş
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareOption}
              onPress={async () => {
                setShowShareModal(false);
                try {
                  await Share.share({
                    message: '🔇 Sessiz video - Bu videoyu izle!',
                    url: videoUrl || '',
                  });
                } catch (error) {
                  console.error('Share error:', error);
                }
              }}
            >
              <VolumeX size={24} color={theme.colors.text} />
              <Text style={[styles.shareOptionText, { color: theme.colors.text }]}>
                Sessiz Paylaş
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareCancelButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={[styles.shareCancelText, { color: theme.colors.text }]}>
                İptal
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userAvatarContainer: {
    marginRight: SPACING.sm,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: SPACING.xs / 2,
  },
  userHandle: {
    fontSize: FONT_SIZES.sm,
    opacity: 0.9,
    marginBottom: SPACING.xs,
  },
  caption: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  rightActions: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingRight: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  actionButton: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionCount: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: COLORS.white,
    borderTopColor: 'transparent',
  },

  // Paylaş Modal
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  shareModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  shareOptionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  shareCancelButton: {
    marginTop: SPACING.md,
    marginHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

