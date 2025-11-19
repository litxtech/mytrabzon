/**
 * Profesyonel Video Player Komponenti
 * - Önizleme modu (hover'da otomatik başlar)
 * - Tam ekran modu (tüm telefonlara uyumlu)
 * - Beğeni, yorum, paylaşma, etiketleme
 * - Gesture kontrolleri (çift tıklama beğeni, kaydırma)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import {
  Heart,
  MessageCircle,
  Share2,
  Tag,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { CommentSheet } from './CommentSheet';

interface VideoPlayerProps {
  videoUrl: string;
  postId: string;
  isLiked?: boolean;
  isSaved?: boolean;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onTag?: () => void;
  onSave?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
  previewMode?: boolean; // Önizleme modu (feed'de)
  onFullScreen?: () => void; // Fullscreen'e geçiş callback'i
}

export function VideoPlayer({
  videoUrl,
  postId,
  isLiked = false,
  isSaved = false,
  likeCount = 0,
  commentCount = 0,
  shareCount = 0,
  onLike,
  onComment,
  onShare,
  onTag,
  onSave,
  autoPlay = false,
  showControls = true,
  previewMode = true,
  onFullScreen,
}: VideoPlayerProps) {
  const { theme } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(previewMode); // Önizlemede sessiz başlar
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const lastTap = useRef<number>(0);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audio session'ı aktif et (sadece bir kez)
  useEffect(() => {
    let mounted = true;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    })
      .then(() => {
        if (mounted) {
          console.log('✅ Audio session activated');
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('❌ Audio session error:', err);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // autoPlay değiştiğinde video'yu başlat
  useEffect(() => {
    if (autoPlay && videoRef.current && !isLoading) {
      // Video yüklendikten sonra başlat
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.playAsync().catch(console.error);
          setIsPlaying(true);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isLoading]);

  // Video yüklendiğinde otomatik başlat (previewMode için)
  useEffect(() => {
    if (previewMode && autoPlay && videoRef.current && !isLoading && !isPlaying) {
      const timer = setTimeout(() => {
        videoRef.current?.playAsync().catch(console.error);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [previewMode, autoPlay, isLoading, isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const wasLoading = isLoading;
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
      setIsMuted(status.isMuted);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      
      // İlk yüklemede autoPlay true ise başlat
      if (autoPlay && wasLoading && !status.isPlaying && !status.didJustFinish) {
        setTimeout(() => {
          videoRef.current?.playAsync().catch((err) => {
            console.error('Video play error:', err);
            // Hata durumunda tekrar dene
            setTimeout(() => {
              videoRef.current?.playAsync().catch(console.error);
            }, 500);
          });
        }, 200);
      }
    } else if (status.error) {
      console.error('Video playback error:', status.error);
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
      } catch (error) {
        // Video null olabilir veya henüz yüklenmemiş olabilir
        console.warn('⚠️ Video play/pause operation warning:', error);
      }
    }
  };

  const toggleMute = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.setIsMutedAsync(!isMuted);
      } catch (error) {
        // Video null olabilir veya henüz yüklenmemiş olabilir
        console.warn('⚠️ Video mute operation warning:', error);
      }
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Çift tıklama - beğeni
      onLike?.();
    }
    lastTap.current = now;
  };

  const handleSingleTap = async () => {
    if (previewMode) {
      // Önizleme modunda tek tıklama = direkt tam ekran aç (video-feed sayfasına git)
      if (onFullScreen) {
        onFullScreen();
      } else {
        // onFullScreen yoksa eski davranış
        if (!isPlaying && !isLoading) {
          // Video durmuşsa oynat
          await togglePlayPause();
        } else {
          // Video oynuyorsa tam ekran aç
          setShowFullScreen(true);
        }
      }
    } else {
      // Tam ekranda tek tıklama = kontrolleri göster/gizle
      setShowControlsOverlay(!showControlsOverlay);
      resetControlsTimeout();
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      setShowControlsOverlay(false);
    }, 3000);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Önizleme modunda video (feed'de)
  if (previewMode) {
    return (
      <>
        <Pressable
          style={styles.previewContainer}
          onPress={handleSingleTap}
          onLongPress={handleDoubleTap}
        >
          <Video
            ref={videoRef}
            source={{ 
              uri: videoUrl,
              overrideFileExtensionAndroid: 'mp4',
            }}
            style={styles.previewVideo}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted={isMuted}
            shouldPlay={autoPlay || isPlaying}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            useNativeControls={false}
            usePoster={false}
            posterSource={undefined}
            progressUpdateIntervalMillis={100}
          />
          
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.white} />
            </View>
          )}

          {(!isPlaying || isLoading) && (
            <View style={styles.playOverlay}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={async () => {
                  if (isLoading) return;
                  await togglePlayPause();
                }}
              >
                <Play size={40} color={COLORS.white} fill={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.previewControls}>
            <TouchableOpacity
              style={styles.muteButton}
              onPress={toggleMute}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isMuted ? (
                <VolumeX size={18} color={COLORS.white} />
              ) : (
                <Volume2 size={18} color={COLORS.white} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fullScreenButton}
              onPress={() => {
                if (onFullScreen) {
                  onFullScreen();
                } else {
                  setShowFullScreen(true);
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Maximize size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </Pressable>

        {/* Tam Ekran Modal */}
        <Modal
          visible={showFullScreen}
          animationType="fade"
          onRequestClose={() => setShowFullScreen(false)}
          statusBarTranslucent
        >
          <FullScreenVideoPlayer
            videoUrl={videoUrl}
            postId={postId}
            isLiked={isLiked}
            isSaved={isSaved}
            likeCount={likeCount}
            commentCount={commentCount}
            shareCount={shareCount}
            onLike={onLike}
            onComment={onComment}
            onShare={onShare}
            onTag={onTag}
            onSave={onSave}
            onClose={() => setShowFullScreen(false)}
          />
        </Modal>
      </>
    );
  }

  // Tam ekran olmayan normal video player
  return (
    <View style={styles.normalContainer}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.normalVideo}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        isMuted={isMuted}
        shouldPlay={isPlaying}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        useNativeControls
      />
    </View>
  );
}

// Tam Ekran Video Player
interface FullScreenVideoPlayerProps {
  videoUrl: string;
  postId: string;
  isLiked: boolean;
  isSaved?: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onTag?: () => void;
  onSave?: () => void;
  onClose: () => void;
}

function FullScreenVideoPlayer({
  videoUrl,
  postId,
  isLiked,
  isSaved = false,
  likeCount,
  commentCount,
  shareCount,
  onLike,
  onComment,
  onShare,
  onTag,
  onSave,
  onClose,
}: FullScreenVideoPlayerProps) {
  const { theme } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const lastTap = useRef<number>(0);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const SCREEN_HEIGHT = height;
  const COMMENT_SHEET_HEIGHT = SCREEN_HEIGHT * 0.5; // Ekranın yarısı
  const commentSheetY = useRef(new Animated.Value(COMMENT_SHEET_HEIGHT)).current;
  const hasStartedRef = useRef(false);

  // Audio session'ı aktif et (sadece bir kez)
  useEffect(() => {
    let mounted = true;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    })
      .then(() => {
        if (mounted) {
          console.log('✅ Audio session activated (FullScreen)');
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('❌ Audio session error (FullScreen):', err);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Tam ekran açıldığında video'yu otomatik başlat
    if (videoRef.current && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const timer = setTimeout(() => {
        videoRef.current?.playAsync().catch(console.error);
        setIsPlaying(true);
      }, 500); // Audio session'ın aktif olması için biraz bekle
      return () => clearTimeout(timer);
    }
  }, []);

  // Yorum paneli açıldığında animasyonu başlat
  useEffect(() => {
    if (showComments) {
      commentSheetY.setValue(COMMENT_SHEET_HEIGHT);
      const timer = setTimeout(() => {
        Animated.spring(commentSheetY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showComments, commentSheetY, COMMENT_SHEET_HEIGHT]);

  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      // Sadece değiştiğinde state'i güncelle (infinite loop'u önle)
      if (status.isPlaying !== isPlaying) {
        setIsPlaying(status.isPlaying);
      }
      if (status.isMuted !== isMuted) {
        setIsMuted(status.isMuted);
      }
      if (status.durationMillis !== duration) {
        setDuration(status.durationMillis || 0);
      }
      if (status.positionMillis !== position) {
        setPosition(status.positionMillis || 0);
      }
      if (isLoading) {
        setIsLoading(false);
      }
      
      // Sadece ilk yüklemede ve henüz başlamadıysa otomatik başlat
      if (!hasStartedRef.current && !status.isPlaying && !status.didJustFinish) {
        hasStartedRef.current = true;
        setTimeout(() => {
          videoRef.current?.playAsync().catch(console.error);
        }, 200);
      }
    } else if (status.error) {
      console.error('Full screen video playback error:', status.error);
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
      } catch (error) {
        // Video null olabilir veya henüz yüklenmemiş olabilir
        console.warn('⚠️ FullScreen Video play/pause operation warning:', error);
      }
    }
  };

  const toggleMute = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.setIsMutedAsync(!isMuted);
      } catch (error) {
        // Video null olabilir veya henüz yüklenmemiş olabilir
        console.warn('⚠️ FullScreen Video mute operation warning:', error);
      }
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Çift tıklama - beğeni
      onLike?.();
      // Animasyon göster
    }
    lastTap.current = now;
  };

  const handleSingleTap = () => {
    setShowControls(!showControls);
    if (!showControls) {
      resetControlsTimeout();
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const closeCommentsSheet = useCallback(() => {
    Animated.spring(commentSheetY, {
      toValue: COMMENT_SHEET_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start(() => {
      setShowComments(false);
    });
  }, [COMMENT_SHEET_HEIGHT, commentSheetY]);

  const handleCloseComments = () => {
    closeCommentsSheet();
  };

  // Yorum paneli için pan responder (sadece drag handle için - aşağı çekme)
  const dragHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          const newOffset = Math.min(gestureState.dy, COMMENT_SHEET_HEIGHT);
          commentSheetY.setValue(newOffset);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > COMMENT_SHEET_HEIGHT * 0.3) {
          closeCommentsSheet();
        } else {
          Animated.spring(commentSheetY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.fullScreenContainer}>
      <Pressable
        style={styles.videoContainer}
        onPress={handleSingleTap}
        onLongPress={handleDoubleTap}
      >
        <Video
          ref={videoRef}
          source={{ 
            uri: videoUrl,
            overrideFileExtensionAndroid: 'mp4',
          }}
          style={[styles.fullScreenVideo, { width, height }]}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={isMuted}
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          usePoster={false}
          progressUpdateIntervalMillis={100}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.white} />
          </View>
        )}

        {/* Kontroller Overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Üst Bar - Kapat Butonu */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <X size={28} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {/* Orta - Play/Pause */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.playPauseButton}
                onPress={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause size={60} color={COLORS.white} fill={COLORS.white} />
                ) : (
                  <Play size={60} color={COLORS.white} fill={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>

            {/* Alt Bar - Progress ve Ses */}
            <View style={styles.bottomBar}>
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={toggleMute}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isMuted ? (
                  <VolumeX size={22} color={COLORS.white} />
                ) : (
                  <Volume2 size={22} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sağ Taraf - Aksiyon Butonları (TikTok tarzı) */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.actionButtonLarge}
            onPress={onLike}
          >
            <Heart
              size={32}
              color={isLiked ? theme.colors.error : COLORS.white}
              fill={isLiked ? theme.colors.error : 'transparent'}
            />
            <Text style={styles.actionCountText}>{formatCount(likeCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonLarge}
            onPress={() => {
              console.log('Yorum butonuna basıldı, panel açılıyor...');
              setShowComments(true);
            }}
          >
            <MessageCircle size={32} color={COLORS.white} />
            <Text style={styles.actionCountText}>{formatCount(commentCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonLarge}
            onPress={onShare}
          >
            <Share2 size={32} color={COLORS.white} />
            <Text style={styles.actionCountText}>{formatCount(shareCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonLarge}
            onPress={onTag}
          >
            <Tag size={32} color={COLORS.white} />
          </TouchableOpacity>

          {onSave && (
            <TouchableOpacity
              style={styles.actionButtonLarge}
              onPress={onSave}
            >
              {isSaved ? (
                <BookmarkCheck size={32} color={COLORS.primary} fill={COLORS.primary} />
              ) : (
                <Bookmark size={32} color={COLORS.white} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </Pressable>

      {/* Yorum Paneli (Bottom Sheet) - Instagram tarzı, şeffaf, video izlenirken */}
      {showComments && (
        <Animated.View
          style={[
            styles.commentSheet,
            {
              transform: [{ translateY: commentSheetY }],
              height: COMMENT_SHEET_HEIGHT,
              backgroundColor: 'rgba(0, 0, 0, 0.75)', // Şeffaf - video görünür
              zIndex: 1000,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            },
          ]}
          pointerEvents="auto"
        >
          {/* Drag Handle - Sadece burada pan responder çalışır */}
          <View style={styles.dragHandleContainer} {...dragHandlePanResponder.panHandlers} pointerEvents="auto">
            <View style={[styles.dragHandle, { backgroundColor: COLORS.white }]} />
          </View>
          
          <View style={[styles.commentSheetHeader, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]} pointerEvents="auto">
            <Text style={[styles.commentSheetTitle, { color: COLORS.white }]}>
              Yorumlar ({commentCount || 0})
            </Text>
            <TouchableOpacity onPress={handleCloseComments}>
              <X size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.commentSheetContent} pointerEvents="auto">
            <CommentSheet postId={postId} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Önizleme Modu (Feed'de)
  previewContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 0,
    marginBottom: 0,
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewControls: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  muteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fullScreenButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Normal Video Player
  normalContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  normalVideo: {
    width: '100%',
    height: '100%',
  },

  // Tam Ekran Modu
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  commentSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    overflow: 'hidden',
    zIndex: 1000,
  },
  commentSheetContent: {
    flex: 1,
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  volumeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Sağ Taraf Aksiyon Butonları (TikTok tarzı)
  rightActions: {
    position: 'absolute',
    right: SPACING.md,
    bottom: 100,
    gap: SPACING.lg,
    alignItems: 'center',
  },
  actionButtonLarge: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionCountText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

