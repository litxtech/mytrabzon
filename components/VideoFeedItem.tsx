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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Heart, MessageCircle, Share2, Bookmark, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { formatTimeAgo } from '@/lib/time-utils';
import { Image } from 'expo-image';
import { CommentSheet } from './CommentSheet';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoFeedItemProps {
  post: any;
  isActive: boolean;
  index: number;
}

export function VideoFeedItem({ post, isActive, index }: VideoFeedItemProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const commentSheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
  const videoUrl = firstMedia?.path;

  const likePostMutation = trpc.post.likePost.useMutation({
    onSuccess: () => {
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
    },
  });

  // Video aktif olduğunda oynat
  useEffect(() => {
    if (isActive && videoRef.current && videoUrl) {
      videoRef.current.playAsync().catch(console.error);
      setIsPlaying(true);
    } else if (!isActive && videoRef.current) {
      videoRef.current.pauseAsync().catch(console.error);
      setIsPlaying(false);
    }
  }, [isActive, videoUrl]);

  const handleLike = () => {
    likePostMutation.mutate({ postId: post.id });
  };

  const handleComment = () => {
    setShowComments(true);
    Animated.spring(commentSheetY, {
      toValue: SCREEN_HEIGHT * 0.5, // Ekranın %50'si - yarıya kadar açılır, video hala görünür
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleCloseComments = () => {
    Animated.spring(commentSheetY, {
      toValue: SCREEN_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start(() => {
      setShowComments(false);
    });
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
          commentSheetY.setValue(SCREEN_HEIGHT * 0.5 + gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleCloseComments();
        } else {
          Animated.spring(commentSheetY, {
            toValue: SCREEN_HEIGHT * 0.5,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  if (!videoUrl) return null;

  return (
    <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl, overrideFileExtensionAndroid: 'mp4' }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted={isMuted}
        shouldPlay={isActive}
        useNativeControls={false}
      />

      {/* Overlay - Kullanıcı bilgisi ve içerik */}
      <View style={styles.overlay}>
        <View style={styles.userInfo}>
          <TouchableOpacity
            onPress={() => router.push(`/profile/${post.author_id}` as any)}
            style={styles.userAvatarContainer}
          >
            <Image
              source={{ uri: post.author?.avatar_url || 'https://via.placeholder.com/40' }}
              style={styles.userAvatar}
              contentFit="cover"
            />
          </TouchableOpacity>
          <View style={styles.userDetails}>
            <TouchableOpacity
              onPress={() => router.push(`/profile/${post.author_id}` as any)}
            >
              <Text style={[styles.username, { color: COLORS.white }]}>
                @{post.author?.username || post.author?.full_name}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.caption, { color: COLORS.white }]} numberOfLines={3}>
              {post.content}
            </Text>
          </View>
        </View>

        {/* Sağ taraf - Aksiyon butonları */}
        <View style={styles.rightActions}>
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
              backgroundColor: 'rgba(0, 0, 0, 0.7)', // Daha şeffaf - video daha görünür
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
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 'auto',
    marginBottom: SPACING.lg,
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
    marginBottom: SPACING.xs,
  },
  caption: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  rightActions: {
    alignItems: 'center',
    gap: SPACING.lg,
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
});

