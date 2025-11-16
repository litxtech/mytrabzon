/**
 * Profesyonel Video Player Komponenti
 * - Önizleme modu (hover'da otomatik başlar)
 * - Tam ekran modu (tüm telefonlara uyumlu)
 * - Beğeni, yorum, paylaşma, etiketleme
 * - Gesture kontrolleri (çift tıklama beğeni, kaydırma)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
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
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VideoPlayerProps {
  videoUrl: string;
  postId: string;
  isLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onTag?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
  previewMode?: boolean; // Önizleme modu (feed'de)
}

export function VideoPlayer({
  videoUrl,
  postId,
  isLiked = false,
  likeCount = 0,
  commentCount = 0,
  shareCount = 0,
  onLike,
  onComment,
  onShare,
  onTag,
  autoPlay = false,
  showControls = true,
  previewMode = true,
}: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(previewMode); // Önizlemede sessiz başlar
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const lastTap = useRef<number>(0);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
      setIsMuted(status.isMuted);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const toggleMute = async () => {
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(!isMuted);
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

  const handleSingleTap = () => {
    if (previewMode) {
      // Önizleme modunda tek tıklama = tam ekran aç
      setShowFullScreen(true);
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
            source={{ uri: videoUrl }}
            style={styles.previewVideo}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted={isMuted}
            shouldPlay={autoPlay}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
          
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.white} />
            </View>
          )}

          {!isPlaying && !isLoading && (
            <View style={styles.playOverlay}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}
              >
                <Play size={40} color={COLORS.white} fill={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.previewControls}>
            <TouchableOpacity
              style={styles.muteButton}
              onPress={toggleMute}
            >
              {isMuted ? (
                <VolumeX size={20} color={COLORS.white} />
              ) : (
                <Volume2 size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fullScreenButton}
              onPress={() => setShowFullScreen(true)}
            >
              <Maximize size={20} color={COLORS.white} />
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
            likeCount={likeCount}
            commentCount={commentCount}
            shareCount={shareCount}
            onLike={onLike}
            onComment={onComment}
            onShare={onShare}
            onTag={onTag}
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
  likeCount: number;
  commentCount: number;
  shareCount: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onTag?: () => void;
  onClose: () => void;
}

function FullScreenVideoPlayer({
  videoUrl,
  postId,
  isLiked,
  likeCount,
  commentCount,
  shareCount,
  onLike,
  onComment,
  onShare,
  onTag,
  onClose,
}: FullScreenVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const lastTap = useRef<number>(0);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
      setIsMuted(status.isMuted);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const toggleMute = async () => {
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(!isMuted);
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

  return (
    <View style={[styles.fullScreenContainer, { paddingTop: insets.top }]}>
      <Pressable
        style={styles.videoContainer}
        onPress={handleSingleTap}
        onLongPress={handleDoubleTap}
      >
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={[styles.fullScreenVideo, { width, height: height - insets.top - insets.bottom }]}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          isMuted={isMuted}
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
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
              >
                {isMuted ? (
                  <VolumeX size={24} color={COLORS.white} />
                ) : (
                  <Volume2 size={24} color={COLORS.white} />
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
              color={isLiked ? COLORS.error : COLORS.white}
              fill={isLiked ? COLORS.error : 'transparent'}
            />
            <Text style={styles.actionCountText}>{formatCount(likeCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonLarge}
            onPress={onComment}
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
        </View>
      </Pressable>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  fullScreenVideo: {
    flex: 1,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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

