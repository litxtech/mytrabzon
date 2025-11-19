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
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Heart, MessageCircle, Share2, Bookmark, X } from 'lucide-react-native';
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
          console.log('✅ Audio session activated');
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
    if (isActive && videoRef.current && videoUrl && audioSessionReady && videoReady) {
      const playVideo = async () => {
        try {
          // Video referansının hala geçerli olduğundan emin ol
          if (!videoRef.current) {
            console.warn('⚠️ Video ref is null, skipping play');
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
    if (videoRef.current && videoReady) {
      videoRef.current.setIsMutedAsync(!isActive).catch((error) => {
        // Video henüz hazır değilse veya null ise sessizce geç
        console.warn('⚠️ Video mute operation warning:', error);
      });
    }
  }, [isActive, videoReady]);

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
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Çift tıklama - beğeni
      handleLike();
    } else {
      // Tek tıklama - pause/play toggle
      if (videoRef.current && videoReady) {
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

  // Yorum paneli için pan responder (aşağı çekme)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => showComments,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return showComments && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          const nextPosition = Math.min(
            SHEET_VISIBLE_POSITION + gestureState.dy,
            SHEET_HIDDEN_POSITION
          );
          commentSheetY.setValue(nextPosition);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleCloseComments();
        } else {
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

  if (!videoUrl) return null;

  // Güvenli author bilgileri
  const authorName = post.author?.full_name || 'Kullanıcı';
  const authorUsername = post.author?.username || authorName.toLowerCase().replace(/\s+/g, '') || 'kullanici';
  const authorAvatar = post.author?.avatar_url || 'https://via.placeholder.com/40';

  return (
    <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
      {videoUrl && (
        <Pressable 
          style={styles.videoContainer}
          onPress={handleVideoPress}
          disabled={showComments}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUrl, overrideFileExtensionAndroid: 'mp4' }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted={isMuted}
            shouldPlay={isActive}
            useNativeControls={false}
            onError={(error) => {
              console.error('Video error:', error);
              setIsLoading(false);
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
              setVideoReady(true);
            }}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingIndicator} />
            </View>
          )}
        </Pressable>
      )}

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
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: theme.colors.textLight }]} />
          </View>
          
          <View style={[styles.commentSheetHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.commentSheetTitle, { color: theme.colors.text }]}>
              Yorumlar ({post.comment_count || 0})
            </Text>
            <TouchableOpacity onPress={handleCloseComments}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <CommentSheet postId={post.id} />
        </Animated.View>
      )}
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
    height: SCREEN_HEIGHT * 0.6, // Maksimum yükseklik
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    // Blur efekti için overlay
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
});

