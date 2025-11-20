import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Platform, ActivityIndicator, TouchableWithoutFeedback, RefreshControl, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, Audio } from 'expo-av';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, Settings, Edit3, Heart, MoreVertical, MessageCircle, Instagram, Twitter, Facebook, Linkedin, Youtube, Shield, Car, Trophy, Search, HelpCircle, Target } from 'lucide-react-native';
import { DISTRICT_BADGES } from '../../constants/districts';
import { useRouter } from 'expo-router';
import { Footer } from '../../components/Footer';
import { SupporterBadge } from '../../components/SupporterBadge';
import VerifiedBadgeIcon from '../../components/VerifiedBadge';
import { GenderIcon } from '../../components/GenderIcon';
import { trpc } from '../../lib/trpc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type QuickAction = {
  id: string;
  label: string;
  icon: any;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'danger' | 'success';
};

// Post Grid Item Component
function PostGridItem({ post, firstMedia, router, onDelete }: { post: any; firstMedia: any; router: any; onDelete?: (postId: string) => void }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const videoRef = useRef<Video>(null);

  React.useEffect(() => {
    if (firstMedia) {
      const isVideoFile = firstMedia.type === 'video' || firstMedia.path?.match(/\.(mp4|mov|avi|webm)$/i);
      setIsVideo(isVideoFile);
    }
  }, [firstMedia]);

  // Video otomatik oynatma
  useEffect(() => {
    if (isVideo && firstMedia?.path && videoRef.current) {
      // Audio session'ı aktif et
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(() => {
        // Sessizce devam et
      });

      const timer = setTimeout(() => {
        videoRef.current?.playAsync().catch(() => {
          // Hata durumunda sessizce devam et
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVideo, firstMedia]);

  const handlePress = () => {
    if (isVideo) {
      router.push(`/video-feed?postId=${post.id}` as any);
    } else {
      router.push(`/post/${post.id}` as any);
    }
  };

  const handleLongPress = () => {
    if (onDelete) {
      Alert.alert(
        'Gönderiyi Sil',
        'Bu gönderiyi silmek istediğinizden emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: () => onDelete(post.id),
          },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.postGridItem}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={1}
    >
      {firstMedia ? (
        isVideo && firstMedia.path ? (
          <Video
            ref={videoRef}
            source={{ uri: firstMedia.path }}
            style={styles.postGridImage}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted
            shouldPlay
            useNativeControls={false}
            onError={() => {
              // Hata durumunda sessizce devam et
            }}
          />
        ) : (
          <Image
            source={{ uri: firstMedia.path }}
            style={styles.postGridImage}
            resizeMode="cover"
          />
        )
      ) : (
        <View style={[styles.postGridImage, styles.postGridPlaceholder]}>
          <Text style={styles.postGridText} numberOfLines={3}>
            {post.content}
          </Text>
        </View>
      )}
      <View style={[styles.postGridOverlay, isPressed && styles.postGridOverlayVisible]}>
        <View style={styles.postGridStats}>
          <Heart size={16} color={COLORS.white} fill={COLORS.white} />
          <Text style={styles.postGridStatText}>{post.like_count || 0}</Text>
          <MessageCircle size={16} color={COLORS.white} style={{ marginLeft: SPACING.sm }} />
          <Text style={styles.postGridStatText}>{post.comment_count || 0}</Text>
        </View>
      </View>
      {post.media && post.media.length > 1 && (
        <View style={styles.postGridBadge}>
          <Text style={styles.postGridBadgeText}>+{post.media.length - 1}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}


export default function ProfileScreen() {
  const { profile, user, signOut, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // Admin kontrolü - Sadece belirli hesap için
  const ADMIN_USER_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
  const ADMIN_EMAIL = 'support@litxtech.com';
  const ADMIN_USERNAME = 'mytrabzonteam';

  React.useEffect(() => {
    if (user?.id === ADMIN_USER_ID) {
      // Email ve username kontrolü
      const userEmail = user.email || user.user_metadata?.email || '';
      const username = profile?.username || user.user_metadata?.username || '';
      
      if (userEmail === ADMIN_EMAIL && username === ADMIN_USERNAME) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [user?.id, user?.email, user?.user_metadata?.email, profile?.username, user?.user_metadata?.username]);
  
  // Loading durumunda loading göster
  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // User yoksa loading göster
  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Profile yoksa placeholder göster
  const displayProfile = profile || {
    id: user.id,
    full_name: user.user_metadata?.full_name || 'Kullanıcı',
    username: user.user_metadata?.username || '',
    avatar_url: user.user_metadata?.avatar_url || 'https://via.placeholder.com/100',
    bio: '',
    district: null,
    gender: null,
    verified: false,
    privacy_settings: { show_social_media: true, show_gender: true },
    social_media: {},
    supporter_badge: null,
    supporter_badge_visible: false,
    supporter_badge_color: null,
  };

  const showGender = displayProfile.privacy_settings?.show_gender !== false && displayProfile.gender;

  const socialMedia = (displayProfile.social_media || {}) as {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  const showSocialMedia = displayProfile.privacy_settings?.show_social_media !== false;

  // Sosyal medya linklerini açma fonksiyonu
  const openSocialMedia = (platform: string, username: string) => {
    const urls: Record<string, string> = {
      instagram: `https://instagram.com/${username.replace('@', '')}`,
      twitter: `https://twitter.com/${username.replace('@', '')}`,
      facebook: `https://facebook.com/${username.replace('@', '')}`,
      linkedin: `https://linkedin.com/in/${username.replace('@', '')}`,
      youtube: `https://youtube.com/@${username.replace('@', '')}`,
      tiktok: `https://tiktok.com/@${username.replace('@', '')}`,
    };
    const url = urls[platform];
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Hata', 'Link açılamadı');
      });
    }
  };

  const handleNavigate = (path: string) => {
    setMenuVisible(false);
    router.push(path as any);
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    await signOut();
    router.replace('/auth/login');
  };

  // Adım 2: getFollowStats query'si ekleniyor
  const { data: followStats } = trpc.user.getFollowStats.useQuery(
    { user_id: user?.id || '' },
    { 
      enabled: !!user?.id && user.id.length > 0,
      retry: false,
      staleTime: 30 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: false,
    }
  );

  // Adım 3: getPosts query'si ekleniyor
  const utils = trpc.useUtils();
  const { data: postsData, refetch: refetchPosts } = trpc.post.getPosts.useQuery({
    author_id: user?.id,
    limit: 50,
    offset: 0,
  }, {
    enabled: !!user?.id && !!user.id,
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Post silme mutation'ı
  const deletePostMutation = trpc.post.deletePost.useMutation({
    onSuccess: async () => {
      Alert.alert('Başarılı', 'Gönderi silindi');
      await utils.post.getPosts.invalidate();
      await refetchPosts();
      await utils.user.getFollowStats.invalidate();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Gönderi silinemedi';
      Alert.alert('Hata', message);
    },
  });

  const handleDeletePost = (postId: string) => {
    deletePostMutation.mutate({ postId });
  };

  const totalPosts = postsData?.posts?.length || 0;
  const followersCount = followStats?.followers_count || 0;
  const followingCount = followStats?.following_count || 0;

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        utils.post.getPosts.invalidate(),
        utils.user.getFollowStats.invalidate(),
        refetchPosts(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const quickActions: QuickAction[] = [
    { id: 'edit', label: 'Profili Düzenle', icon: Edit3, onPress: () => handleNavigate('/profile/edit') },
    { id: 'myskor', label: 'Karma Skorum', icon: Target, onPress: () => {
      // Karma Skorum sayfasına yönlendirme - henüz sayfa yoksa alert göster
      Alert.alert('Karma Skorum', 'Karma Skorum özelliği yakında eklenecek!');
    } },
    { id: 'donate', label: 'Destekle', icon: Heart, onPress: () => handleNavigate('/support/donate') },
    { id: 'support', label: 'Destek Talebi', icon: HelpCircle, onPress: () => handleNavigate('/support/create') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, SPACING.md) : 0 }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? SPACING.lg : 0 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.card, paddingTop: Math.max(insets.top, SPACING.md) }]}>
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: theme.colors.card }]} 
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical size={18} color={theme.colors.text} />
          </TouchableOpacity>
          
          {/* Profil Avatar - Merkezi ve Büyük */}
          <View style={styles.profileTopSection}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity 
                onLongPress={() => setAvatarModalVisible(true)}
                delayLongPress={300}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarWrapper, { borderColor: theme.colors.primary }]}>
                  <Image
                    source={{ uri: displayProfile.avatar_url || 'https://via.placeholder.com/120' }}
                    style={styles.avatar}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* İstatistikler - Modern Kart Tasarımı */}
            <View style={styles.statsContainer}>
              <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{totalPosts}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>Gönderi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => router.push('/profile/followers' as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{followersCount}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>Takipçi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => router.push('/profile/following' as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{followingCount}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>Takip</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Kullanıcı Bilgileri */}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text }]}>{displayProfile.full_name}</Text>
              {showGender && (
                <GenderIcon 
                  gender={displayProfile.gender as 'male' | 'female' | 'other'} 
                  size={18} 
                />
              )}
              {displayProfile.verified && <VerifiedBadgeIcon size={18} />}
              {displayProfile.supporter_badge && displayProfile.supporter_badge_visible && (
                <SupporterBadge 
                  visible={true} 
                  size="small" 
                  color={displayProfile.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
                />
              )}
            </View>
            {displayProfile.username && (
              <Text style={[styles.username, { color: theme.colors.textLight }]}>@{displayProfile.username}</Text>
            )}
            {displayProfile.bio && (
              <Text style={[styles.bio, { color: theme.colors.text }]} numberOfLines={3}>
                {displayProfile.bio}
              </Text>
            )}
            {displayProfile.district && (
              <View style={styles.locationRow}>
                <Text style={[styles.locationText, { color: theme.colors.textLight }]}>
                  {DISTRICT_BADGES[displayProfile.district as keyof typeof DISTRICT_BADGES] || '📍'} {displayProfile.district}
                </Text>
              </View>
            )}

            {/* Sosyal Medya Linkleri - Kompakt ve Modern */}
            {showSocialMedia && Object.keys(socialMedia).length > 0 && (
              <View style={styles.socialMediaContainer}>
                {socialMedia.instagram && (
                  <TouchableOpacity
                    style={[styles.socialMediaButton, { backgroundColor: theme.colors.background }]}
                    onPress={() => openSocialMedia('instagram', socialMedia.instagram!)}
                    activeOpacity={0.7}
                  >
                    <Instagram size={16} color="#E4405F" />
                  </TouchableOpacity>
                )}
                {socialMedia.twitter && (
                  <TouchableOpacity
                    style={[styles.socialMediaButton, { backgroundColor: theme.colors.background }]}
                    onPress={() => openSocialMedia('twitter', socialMedia.twitter!)}
                    activeOpacity={0.7}
                  >
                    <Twitter size={16} color="#1DA1F2" />
                  </TouchableOpacity>
                )}
                {socialMedia.facebook && (
                  <TouchableOpacity
                    style={[styles.socialMediaButton, { backgroundColor: theme.colors.background }]}
                    onPress={() => openSocialMedia('facebook', socialMedia.facebook!)}
                    activeOpacity={0.7}
                  >
                    <Facebook size={16} color="#1877F2" />
                  </TouchableOpacity>
                )}
                {socialMedia.linkedin && (
                  <TouchableOpacity
                    style={[styles.socialMediaButton, { backgroundColor: theme.colors.background }]}
                    onPress={() => openSocialMedia('linkedin', socialMedia.linkedin!)}
                    activeOpacity={0.7}
                  >
                    <Linkedin size={16} color="#0A66C2" />
                  </TouchableOpacity>
                )}
                {socialMedia.youtube && (
                  <TouchableOpacity
                    style={[styles.socialMediaButton, { backgroundColor: theme.colors.background }]}
                    onPress={() => openSocialMedia('youtube', socialMedia.youtube!)}
                    activeOpacity={0.7}
                  >
                    <Youtube size={16} color="#FF0000" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Quick Actions - Kompakt ve Estetik */}
          <View style={[styles.quickActions, { backgroundColor: theme.colors.card }]}>
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              const isDisabled = action.disabled;
              const toneColor =
                action.tone === 'danger'
                  ? theme.colors.error
                  : action.tone === 'success'
                  ? theme.colors.success
                  : theme.colors.primary;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.quickActionCardCompact, 
                    { 
                      backgroundColor: theme.colors.background, 
                      borderColor: theme.colors.border,
                      shadowColor: theme.colors.text,
                    }, 
                    isDisabled && styles.quickActionCardDisabled
                  ]}
                  onPress={action.onPress}
                  disabled={isDisabled || !action.onPress}
                  activeOpacity={isDisabled ? 1 : 0.7}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: toneColor + '15' }]}>
                    <IconComponent size={14} color={toneColor} />
                  </View>
                  <Text
                    style={[
                      styles.quickActionLabelCompact,
                      { color: theme.colors.text },
                      isDisabled && styles.quickActionLabelDisabled,
                    ]}
                    numberOfLines={2}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Posts Section - Adım 9: Post Grid */}
        {postsData?.posts && postsData.posts.length > 0 ? (
          <View style={styles.postsGrid}>
            {postsData.posts.map((post: any) => {
              const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
              return (
                <PostGridItem
                  key={post.id}
                  post={post}
                  firstMedia={firstMedia}
                  router={router}
                  onDelete={handleDeletePost}
                />
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyPostsContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.emptyPostsIllustration}>
              <Text style={styles.emptyPostsEmoji}>🎨</Text>
            </View>
            <Text style={[styles.emptyPostsTitle, { color: theme.colors.text }]}>İlk gönderini oluştur</Text>
            <Text style={[styles.emptyPostsSubtitle, { color: theme.colors.textLight }]}>
              Bu alanı kendine özel hale getir.
            </Text>
            <TouchableOpacity
              style={[styles.createPostButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push('/create-post')}
            >
              <Text style={styles.createPostButtonText}>Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}

        <Footer />
      </ScrollView>

      {/* Menu Modal - Basit */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.menuBackdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.menuContent, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.menuHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Profil menüsü</Text>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                style={styles.menuCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.menuCloseText, { color: theme.colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.menuOption, { borderTopColor: theme.colors.border }]}
              onPress={() => {
                setMenuVisible(false);
                handleNavigate('/profile/settings');
              }}
            >
              <Settings size={18} color={theme.colors.text} />
              <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Ayarlar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuOption, { borderTopColor: theme.colors.border }]}
              onPress={() => {
                setMenuVisible(false);
                handleNavigate('/all-users');
              }}
            >
              <Search size={18} color={theme.colors.text} />
              <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Kullanıcı Ara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuOption, { borderTopColor: theme.colors.border }]}
              onPress={() => {
                setMenuVisible(false);
                handleNavigate('/profile/my-matches');
              }}
            >
              <Trophy size={18} color={theme.colors.text} />
              <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Paylaşılan Maçlar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuOption, { borderTopColor: theme.colors.border }]}
              onPress={() => {
                setMenuVisible(false);
                handleNavigate('/ride/search');
              }}
            >
              <Car size={18} color={theme.colors.text} />
              <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Yolculuklarım</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.menuOption, { borderTopColor: theme.colors.border }]}
                onPress={() => {
                  setMenuVisible(false);
                  handleNavigate('/admin/dashboard');
                }}
              >
                <Shield size={18} color={theme.colors.success} />
                <Text style={[styles.menuOptionText, { color: theme.colors.success }]}>Admin Panel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.menuOption, { borderTopColor: theme.colors.border }]}
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
            >
              <LogOut size={18} color={theme.colors.error} />
              <Text style={[styles.menuOptionText, { color: theme.colors.error }]}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Avatar Modal - Büyük Profil Resmi */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.avatarModalOverlay}>
          <TouchableWithoutFeedback onPress={() => setAvatarModalVisible(false)}>
            <View style={styles.avatarModalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.avatarModalContent} pointerEvents="box-none">
            <Image
              source={{ uri: displayProfile.avatar_url || 'https://via.placeholder.com/400' }}
              style={styles.avatarModalImage}
              contentFit="contain"
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    position: 'relative',
  },
  menuButton: {
    position: 'absolute',
    top: SPACING.lg + SPACING.md,
    right: SPACING.md,
    padding: SPACING.sm,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  profileTopSection: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    padding: 2.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 47.5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    width: '100%',
    paddingHorizontal: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 60,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs / 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  username: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  bio: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  locationRow: {
    marginTop: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  quickActionCardCompact: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.xs / 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    minHeight: 64,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionCardDisabled: {
    opacity: 0.5,
  },
  quickActionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  quickActionLabelCompact: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
  },
  quickActionLabelDisabled: {
    opacity: 0.5,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postGridItem: {
    width: '33.333%',
    aspectRatio: 1,
    position: 'relative',
  },
  postGridImage: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  postGridPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  postGridText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  postGridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  postGridOverlayVisible: {
    opacity: 1,
  },
  postGridStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  postGridStatText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  postGridBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  postGridBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  videoBadge: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  videoBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
  },
  emptyPostsContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  emptyPostsIllustration: {
    marginBottom: SPACING.md,
  },
  emptyPostsEmoji: {
    fontSize: 64,
  },
  emptyPostsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptyPostsSubtitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  createPostButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 8,
  },
  createPostButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    flex: 1,
  },
  menuContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: SPACING.xl,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  menuCloseButton: {
    padding: SPACING.xs,
  },
  menuCloseText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  menuOptionDanger: {
    borderTopColor: COLORS.error + '20',
  },
  menuOptionDisabled: {
    opacity: 0.5,
  },
  menuOptionText: {
    fontSize: FONT_SIZES.md,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  socialMediaContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialMediaButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatarModalContent: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
});
