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
  Animated,
  PanResponder,
  Pressable,
  Modal,
  Share,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Heart, MessageCircle, Share2, Bookmark, X, VolumeX } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { Image } from 'expo-image';
import { CommentSheet } from './CommentSheet';
import VerifiedBadgeIcon from './VerifiedBadge';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_VISIBLE_POSITION = 0;
const SHEET_HIDDEN_POSITION = SCREEN_HEIGHT * 0.6;

interface VideoFeedItemProps {
  post: any;
  isActive: boolean;
  isViewable: boolean;
  index: number;
}

export function VideoFeedItem({ post, isActive, isViewable, index }: VideoFeedItemProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const commentSheetY = useRef(new Animated.Value(SHEET_HIDDEN_POSITION)).current;
  const lastTap = useRef(0);

  const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
  const videoUrl = firstMedia?.path;
  const isEvent = post.isEvent || false;

  const likePostMutation = trpc.post.likePost.useMutation({
    onSuccess: () => {
      setIsLiked(!isLiked);
      setLikeCount((prev: number) => (isLiked ? prev - 1 : prev + 1));
    },
    onError: (error: unknown) => {
      console.error('Like post error:', error);
    },
  });

  const likeEventMutation = (trpc as any).event.likeEvent.useMutation({
    onSuccess: () => {
      setIsLiked(!isLiked);
      // Event'ler için upvotes - downvotes kullanılıyor
      setLikeCount((prev: number) => (isLiked ? prev - 1 : prev + 1));
    },
    onError: (error: unknown) => {
      console.error('Like event error:', error);
    },
  });

  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Audio session'ı aktif et
  useEffect(() => {
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

    return () => {
      mounted = false;
    };
  }, []);

  // Video yüklendiğinde hazır olduğunu işaretle
  const handleVideoLoad = () => {
    setVideoReady(true);
    setIsLoading(false);
  };

  // Sadece aktif video oynatılır - diğerleri durur
  useEffect(() => {
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

  // Sadece aktif video sesli olmalı - video hazır olduğunda
  useEffect(() => {
    if (videoRef.current && videoReady && videoUrl && videoUrl.trim() !== '') {
      videoRef.current.setIsMutedAsync(!isActive).catch((error) => {
        // Video henüz hazır değilse veya null ise sessizce geç
        console.warn('⚠️ Video mute operation warning:', error);
      });
    }
  }, [isActive, videoReady, videoUrl]);

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
    setShowComments(true);
    Animated.spring(commentSheetY, {
      toValue: SHEET_VISIBLE_POSITION,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleCloseComments = () => {
    Animated.spring(commentSheetY, {
      toValue: SHEET_HIDDEN_POSITION,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start(() => {
      setShowComments(false);
    });
  };

  // Video üzerine tıklama - çift tıklama beğeni, tek tıklama pause/play
  const handleVideoPress = async () => {
    if (showComments) return; // Yorum paneli açıksa video tıklamalarını engelle
    if (!videoUrl || videoUrl.trim() === '') return; // Video URL geçersizse işlem yapma
    if (!videoRef.current) return; // Video ref null ise işlem yapma
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Çift tıklama - beğeni
      handleLike();
    } else {
      // Tek tıklama - pause/play toggle
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
      }
    }
    lastTap.current = now;
  };

  // Yorum paneli için pan responder (sadece drag handle için - aşağı çekme)
  const commentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, // Drag handle'a tıklandığında
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Sadece dikey hareket varsa (aşağı çekme)
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Aşağı doğru çekildiğinde
        if (gestureState.dy > 0) {
          const nextPosition = Math.min(
            SHEET_VISIBLE_POSITION + gestureState.dy,
            SHEET_HIDDEN_POSITION
          );
          commentSheetY.setValue(nextPosition);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Yeterince aşağı çekildiyse kapat
        if (gestureState.dy > 80) {
          handleCloseComments();
        } else {
          // Geri yukarı animasyonu
          Animated.spring(commentSheetY, {
            toValue: SHEET_VISIBLE_POSITION,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // Video container için pan responder (sola swipe ile çıkış)
  const videoPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Yorum paneli kapalıysa ve sola doğru başlangıç varsa
        return !showComments;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Sola swipe (dx < 0) ve yorum paneli kapalıysa
        if (showComments) return false;
        // Sola doğru hareket varsa ve yatay hareket dikey hareketten fazlaysa
        return gestureState.dx < -30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderGrant: () => {
        // Gesture başladığında
      },
      onPanResponderMove: (evt, gestureState) => {
        // Hareket sırasında görsel geri bildirim (opsiyonel)
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Sola yeterince çekildiyse çık (eşik: -80px)
        if (!showComments && gestureState.dx < -80 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5) {
          router.back();
        }
      },
      onPanResponderTerminate: () => {
        // Gesture iptal edildiğinde
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
        disabled={showComments}
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

      {/* Yorum Paneli (Bottom Sheet) - Şeffaf, video izlenirken */}
      {showComments && (
        <Animated.View
          style={[
            styles.commentSheet,
            {
              transform: [{ translateY: commentSheetY }],
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
            },
          ]}
          pointerEvents="box-none"
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={{ flex: 1 }}>
              {/* Drag Handle - Sadece drag handle'a pan responder */}
              <View 
                style={styles.dragHandleContainer}
                {...commentPanResponder.panHandlers}
                pointerEvents="auto"
              >
                <View style={[styles.dragHandle, { backgroundColor: theme.colors.textLight }]} />
              </View>
              
              <View style={[styles.commentSheetHeader, { borderBottomColor: theme.colors.border }]} pointerEvents="auto">
                <Text style={[styles.commentSheetTitle, { color: theme.colors.text }]}>
                  Yorumlar ({post.comment_count || 0})
                </Text>
                <TouchableOpacity onPress={handleCloseComments}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.commentSheetContent} pointerEvents="auto">
                <CommentSheet postId={post.id} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

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
  commentSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.65, // Maksimum yükseklik
    flexShrink: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    zIndex: 1000, // Yorum paneli üstte olmalı
    // Blur efekti için overlay
  },
  commentSheetContent: {
    flex: 1,
    overflow: 'hidden', // İçerik taşmasını önle
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  commentSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  commentSheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
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

