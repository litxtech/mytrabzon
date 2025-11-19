import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Share, Platform, FlatList, ActivityIndicator, TouchableWithoutFeedback, Animated, PanResponder, Dimensions, TextInput, Linking, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, Settings, HelpCircle, Trash2, Edit3, Heart, Shield, CheckCircle2, Clock, XCircle, MoreVertical, Share2, Users, MessageCircle, Trophy, Search, UserPlus, X, Instagram, Twitter, Facebook, Linkedin, Youtube, Music } from 'lucide-react-native';
import { DISTRICT_BADGES } from '../../constants/districts';
import { SOCIAL_MEDIA_PLATFORMS } from '../../constants/cities';
import { useRouter, useFocusEffect } from 'expo-router';
import { Footer } from '../../components/Footer';
import { SupportPanel } from '../../components/SupportPanel';
import { SupporterBadge } from '../../components/SupporterBadge';
import VerifiedBadgeIcon from '../../components/VerifiedBadge';
import { trpc } from '../../lib/trpc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.9; // Çentik bölümüne kadar
const BOTTOM_SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.5; // Minimum yükseklik

type QuickAction = {
  id: string;
  label: string;
  icon: any;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'danger' | 'success';
};

// Post Grid Item Component (Instagram benzeri overlay ile) - Video desteği ile
function PostGridItem({ post, firstMedia, router, onDelete }: { post: any; firstMedia: any; router: any; onDelete?: (postId: string) => void }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const videoRef = React.useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  React.useEffect(() => {
    if (firstMedia) {
      const isVideoFile = firstMedia.type === 'video' || firstMedia.path?.match(/\.(mp4|mov|avi|webm)$/i);
      setIsVideo(isVideoFile);
    }
  }, [firstMedia]);

  // Video otomatik oynatma
  React.useEffect(() => {
    if (isVideo && videoRef.current && !isPressed) {
      videoRef.current?.playAsync?.().catch(console.error);
      setIsPlaying(true);
    } else if (isVideo && videoRef.current && isPressed) {
      videoRef.current?.pauseAsync?.().catch(console.error);
      setIsPlaying(false);
    }
  }, [isVideo, isPressed]);

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
        isVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: firstMedia.path, overrideFileExtensionAndroid: 'mp4' }}
            style={styles.postGridImage}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted
            shouldPlay={isPlaying}
            useNativeControls={false}
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
      {/* Instagram benzeri overlay */}
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
      {isVideo && (
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeText}>▶</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Takipçiler Listesi Component
function FollowersList({ userId, onClose }: { userId: string; onClose?: () => void }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, error } = trpc.user.getFollowers.useQuery(
    { user_id: userId, limit: 100, offset: 0 },
    { enabled: !!userId }
  );

  // Debug log
  React.useEffect(() => {
    if (error) {
      console.error('FollowersList error:', error);
    }
    if (data) {
      console.log('FollowersList data:', data?.followers?.length || 0, 'followers');
    }
  }, [data, error]);

  const filteredFollowers = useMemo(() => {
    if (!data?.followers) return [];
    if (!searchQuery.trim()) return data.followers;
    
    const query = searchQuery.toLowerCase().trim();
    return data.followers.filter((follower: any) => 
      follower.full_name?.toLowerCase().includes(query) ||
      follower.username?.toLowerCase().includes(query)
    );
  }, [data?.followers, searchQuery]);

  if (isLoading) {
    return (
      <View style={styles.modalLoadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {/* Arama Input */}
      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Kullanıcı ara..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {filteredFollowers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz takipçi yok'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery 
              ? 'Farklı bir arama terimi deneyin'
              : 'Paylaşımlarınızı artırarak daha fazla takipçi kazanabilirsiniz'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFollowers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.followerItem}
              onPress={() => {
                if (onClose) onClose();
                router.push(`/profile/${item.id}` as any);
              }}
            >
              <Image
                source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
                style={styles.followerAvatar}
              />
              <View style={styles.followerInfo}>
                <Text style={styles.followerName}>{item.full_name}</Text>
                {item.username && (
                  <Text style={styles.followerUsername}>@{item.username}</Text>
                )}
              </View>
              {item.supporter_badge && item.supporter_badge_visible && (
                <SupporterBadge
                  visible={true}
                  size="small"
                  color={item.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
                />
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.modalListContent}
        />
      )}
    </View>
  );
}

// Takip Edilenler Listesi Component
function FollowingList({ userId, onClose }: { userId: string; onClose?: () => void }) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, error } = trpc.user.getFollowing.useQuery(
    { user_id: userId, limit: 100, offset: 0 },
    { enabled: !!userId }
  );

  // Debug log
  React.useEffect(() => {
    if (error) {
      console.error('FollowingList error:', error);
    }
    if (data) {
      console.log('FollowingList data:', data?.following?.length || 0, 'following');
    }
  }, [data, error]);

  const followMutation = trpc.user.follow.useMutation();
  const unfollowMutation = trpc.user.unfollow.useMutation();

  const filteredFollowing = useMemo(() => {
    if (!data?.following) return [];
    if (!searchQuery.trim()) return data.following;
    
    const query = searchQuery.toLowerCase().trim();
    return data.following.filter((following: any) => 
      following.full_name?.toLowerCase().includes(query) ||
      following.username?.toLowerCase().includes(query)
    );
  }, [data?.following, searchQuery]);

  const handleFollowToggle = async (targetUserId: string, isFollowing: boolean) => {
    if (!currentUser) return;
    
    try {
      if (isFollowing) {
        await unfollowMutation.mutateAsync({ following_id: targetUserId });
      } else {
        await followMutation.mutateAsync({ following_id: targetUserId });
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.modalLoadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {/* Arama Input */}
      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Kullanıcı ara..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {filteredFollowing.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz kimseyi takip etmiyorsunuz'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery 
              ? 'Farklı bir arama terimi deneyin'
              : 'İlginizi çeken kullanıcıları takip ederek içeriklerini görebilirsiniz'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFollowing}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.followerItem}
              onPress={() => {
                if (onClose) onClose();
                router.push(`/profile/${item.id}` as any);
              }}
            >
              <Image
                source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
                style={styles.followerAvatar}
              />
              <View style={styles.followerInfo}>
                <Text style={styles.followerName}>{item.full_name}</Text>
                {item.username && (
                  <Text style={styles.followerUsername}>@{item.username}</Text>
                )}
              </View>
              {item.supporter_badge && item.supporter_badge_visible && (
                <SupporterBadge
                  visible={true}
                  size="small"
                  color={item.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
                />
              )}
              {currentUser?.id !== item.id && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleFollowToggle(item.id, true);
                  }}
                >
                  <UserPlus size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.modalListContent}
        />
      )}
    </View>
  );
}

// Bottom Sheet Modal Component
function BottomSheetModal({ 
  visible, 
  onClose, 
  title, 
  children 
}: { 
  visible: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        translateY.setOffset((translateY as any)._value);
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = gestureState.dy;
        if (newValue > 0) {
          translateY.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        const shouldClose = gestureState.dy > 100 || gestureState.vy > 0.5;
        
        if (shouldClose) {
          Animated.spring(translateY, {
            toValue: BOTTOM_SHEET_MAX_HEIGHT,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(BOTTOM_SHEET_MAX_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.spring(translateY, {
        toValue: BOTTOM_SHEET_MAX_HEIGHT,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable 
        style={styles.bottomSheetOverlay}
        onPress={onClose}
      />
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={[
            styles.bottomSheetContainer,
            {
              maxHeight: BOTTOM_SHEET_MAX_HEIGHT,
              paddingBottom: insets.bottom,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.bottomSheetHandle} />
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.bottomSheetCloseButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }} pointerEvents="auto">
            {children}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Profil sayfasına focus olduğunda profili yenile
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        refreshProfile();
      }
    }, [user?.id, refreshProfile])
  );

  const deleteAccountMutation = trpc.user.requestAccountDeletion.useMutation();
  const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
  
  // Admin kontrolü - admin_users tablosundan direkt kontrol et
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }
    
    // Supabase'den direkt kontrol et
    const checkAdmin = async () => {
      if (user.id === SPECIAL_ADMIN_ID) {
        setIsAdmin(true);
        return;
      }

      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      setIsAdmin(!!data && !error);
    };
    
    checkAdmin();
  }, [user?.id]);

  // KYC durumu kontrolü
  const { data: kycData } = trpc.kyc.get.useQuery(undefined, {
    enabled: !!user?.id,
  });

  // Kullanıcının gönderilerini getir
  const utils = trpc.useUtils();
  const { data: postsData, isLoading: postsLoading } = trpc.post.getPosts.useQuery({
    author_id: user?.id,
    limit: 50,
    offset: 0,
  }, {
    enabled: !!user?.id, // Sadece user varsa query çalışsın
  });

  // Gönderi silme mutation'ı
  const deletePostMutation = trpc.post.deletePost.useMutation({
    onSuccess: () => {
      // Gönderileri yeniden yükle
      utils.post.getPosts.invalidate({ author_id: user?.id });
      Alert.alert('Başarılı', 'Gönderi silindi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Gönderi silinemedi');
    },
  });

  const handleDeletePost = (postId: string) => {
    deletePostMutation.mutate({ postId });
  };

  // Kullanıcının geçmiş maçlarını getir
  const { data: userMatchesData } = (trpc as any).football.getUserMatches.useQuery(
    {
      user_id: user?.id || '',
      limit: 20,
      offset: 0,
    },
    {
      enabled: !!user?.id,
    }
  );

  // Geçmiş maçları filtrele (süresi geçmiş olanlar)
  const pastMatches = useMemo(() => {
    if (!userMatchesData?.matches || !Array.isArray(userMatchesData.matches)) return [];
    const now = Date.now();
    const gracePeriod = 5 * 60 * 1000; // 5 dakika tolerans
    
    return userMatchesData.matches.filter((match: any) => {
      let matchDateTime: string | null = null;
      
      if (match.match_date_time) {
        matchDateTime = match.match_date_time;
      } else if (match.match_date && match.start_time) {
        matchDateTime = `${match.match_date}T${match.start_time}+03:00`;
      }
      
      if (!matchDateTime) return false;
      
      const start = new Date(matchDateTime).getTime();
      // Süresi geçmiş maçlar (başlangıç + 5 dakika < şimdi)
      return start + gracePeriod < now;
    });
  }, [userMatchesData]);

  // İstatistikleri hesapla
  const totalPosts = postsData?.posts?.length || 0;
  
  // Takipçi ve takip sayılarını getir - gerçek zamanlı güncelleme için refetch
  const { data: followStats, refetch: refetchFollowStats } = trpc.user.getFollowStats.useQuery(
    { user_id: user?.id || '' },
    { enabled: !!user?.id }
  );
  
  const followersCount = followStats?.followers_count || 0;
  const followingCount = followStats?.following_count || 0;

  // Takip/takipçi sayılarını periyodik olarak güncelle (her 5 saniyede bir)
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      refetchFollowStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.id, refetchFollowStats]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı silmek istediğinizden emin misiniz?\n\nHesabınız 7 gün süreyle askıya alınacak ve bu süre sonunda kalıcı olarak silinecektir. Bu süre içinde giriş yaparsanız hesabınızı geri yükleyebilirsiniz.\n\nSilinen veriler:\n• Profil bilgileriniz\n• Paylaşımlarınız\n• Yorumlarınız\n• Mesajlarınız\n• Tüm kişisel verileriniz',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountMutation.mutateAsync();
              Alert.alert(
                'Hesap Silme İsteği Alındı',
                'Hesabınız 7 gün içinde kalıcı olarak silinecektir. Bu süre içinde giriş yaparsanız hesabınızı geri yükleyebilirsiniz.',
                [
                  {
                    text: 'Tamam',
                    onPress: () => {
                      signOut();
                      router.replace('/auth/login');
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Hata', 'Hesap silme işlemi sırasında bir hata oluştu.');
              console.error('Delete account error:', error);
            }
          }
        }
      ]
    );
  };

  const handleShareProfile = async () => {
    try {
      const message = `MyTrabzon profilimi keşfet: ${profile?.full_name || 'Kullanıcı'}`;
      await Share.share({ message });
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Paylaşım yapılamadı');
    } finally {
      setMenuVisible(false);
    }
  };

  const handleNavigate = (path: string) => {
    setMenuVisible(false);
    router.push(path as any);
  };

  const kycAction = (() => {
    if (profile?.verified) {
      return {
        id: 'kyc-verified',
        label: 'Kimlik Onaylı',
        icon: CheckCircle2,
        disabled: true,
        tone: 'success',
      };
    }

    if (kycData?.status === 'pending') {
      return {
        id: 'kyc-pending',
        label: 'Onay Bekleniyor',
        icon: Clock,
        disabled: true,
      };
    }

    if (kycData?.status === 'rejected') {
      return {
        id: 'kyc-retry',
        label: 'Tekrar Doğrula',
        icon: XCircle,
        onPress: () => handleNavigate('/kyc/verify'),
        tone: 'danger',
      };
    }

    return {
      id: 'kyc-start',
      label: 'Kimliği Doğrula',
      icon: Shield,
      onPress: () => handleNavigate('/kyc/verify'),
    };
  })();

  // Sadece "Profili Düzenle" ve "Destekle" butonları grid'de kalacak
  const quickActions: QuickAction[] = [
    { id: 'edit', label: 'Profili Düzenle', icon: Edit3, onPress: () => handleNavigate('/profile/edit') },
    { id: 'donate', label: 'Destekle', icon: Heart, onPress: () => handleNavigate('/support/donate') },
  ];

  // Menüye eklenecek butonlar
  const menuActions: QuickAction[] = [
    { id: 'share', label: 'Profili Paylaş', icon: Share2, onPress: handleShareProfile },
    { id: 'matches', label: 'Paylaşılan Maçlar', icon: Trophy, onPress: () => {
      setMenuVisible(false);
      router.push('/profile/my-matches' as any);
    }, disabled: pastMatches.length === 0 },
    { id: 'settings', label: 'Ayarlar', icon: Settings, onPress: () => handleNavigate('/profile/settings') },
    { id: 'support', label: 'Destek', icon: HelpCircle, onPress: () => { setMenuVisible(false); setSupportVisible(true); } },
    kycAction as QuickAction,
    { id: 'logout', label: 'Çıkış Yap', icon: LogOut, onPress: () => { setMenuVisible(false); handleLogout(); }, tone: 'danger' },
    { id: 'delete', label: 'Hesabı Sil', icon: Trash2, onPress: () => { setMenuVisible(false); handleDeleteAccount(); }, tone: 'danger' },
  ];

  if (isAdmin) {
    menuActions.splice(4, 0, {
      id: 'admin',
      label: 'Admin Paneli',
      icon: Shield,
      onPress: () => handleNavigate('/admin/dashboard'),
    });
  }


  if (!profile) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, SPACING.md) : 0 }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? SPACING.lg : 0 }}
      >
        {/* Header - Resimdeki gibi */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.card, paddingTop: Math.max(insets.top, SPACING.md) }]}>
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: theme.colors.card }]} 
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.profileTopRow}>
            <View style={styles.profileLeft}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity 
                  onPress={() => router.push('/profile/edit')}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: profile.avatar_url || 'https://via.placeholder.com/100' }}
                    style={styles.avatar}
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.storyAddButton}
                  onPress={() => router.push('/profile/edit')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.storyAddIcon}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.profileRight}>
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.statItem} onPress={() => {}}>
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{totalPosts}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>gönderi</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={() => setFollowersModalVisible(true)}
                >
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{followersCount}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>takipçi</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={() => setFollowingModalVisible(true)}
                >
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{followingCount}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>takip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text }]}>{profile.full_name}</Text>
              {(() => {
                const privacySettings = profile.privacy_settings as any;
                // GenderIcon component removed
                return null;
              })()}
              {profile.verified && <VerifiedBadgeIcon size={20} />}
              {profile.supporter_badge && profile.supporter_badge_visible && (
                <SupporterBadge 
                  visible={true} 
                  size="small" 
                  color={profile.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
                />
              )}
            </View>
            {profile.username && (
              <Text style={[styles.username, { color: theme.colors.textLight }]}>@{profile.username}</Text>
            )}
            {profile.bio && (
              <Text style={[styles.bio, { color: theme.colors.text }]} numberOfLines={3}>
                {profile.bio}
              </Text>
            )}
            {profile.district && (
              <View style={styles.locationRow}>
                <Text style={[styles.locationText, { color: theme.colors.textLight }]}>
                  {DISTRICT_BADGES[profile.district as keyof typeof DISTRICT_BADGES] || '📍'} {profile.district}
                </Text>
              </View>
            )}
            
            {/* Sosyal Medya Linkleri */}
            {(() => {
              const privacySettings = profile.privacy_settings as any;
              const showSocialMedia = privacySettings?.show_social_media !== false;
              const socialMedia = profile.social_media as any;
              
              // Debug log
              console.log('🔍 Social Media Debug:', {
                showSocialMedia,
                socialMedia,
                privacySettings,
                hasSocialMedia: !!socialMedia,
              });
              
              if (!showSocialMedia || !socialMedia) return null;
              
              const socialMediaLinks = [
                { key: 'instagram', label: 'Instagram', icon: Instagram, url: socialMedia.instagram },
                { key: 'twitter', label: 'Twitter/X', icon: Twitter, url: socialMedia.twitter },
                { key: 'facebook', label: 'Facebook', icon: Facebook, url: socialMedia.facebook },
                { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, url: socialMedia.linkedin },
                { key: 'tiktok', label: 'TikTok', icon: Music, url: socialMedia.tiktok },
                { key: 'youtube', label: 'YouTube', icon: Youtube, url: socialMedia.youtube },
              ].filter(item => item.url && item.url.trim() !== '');
              
              if (socialMediaLinks.length === 0) return null;
              
              const handleSocialMediaPress = (platform: string, username: string) => {
                let url = '';
                const cleanUsername = username.trim().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
                
                switch (platform) {
                  case 'instagram':
                    url = `instagram://user?username=${cleanUsername}`;
                    Linking.canOpenURL(url).then(supported => {
                      if (supported) {
                        Linking.openURL(url);
                      } else {
                        Linking.openURL(`https://www.instagram.com/${cleanUsername}`);
                      }
                    });
                    break;
                  case 'twitter':
                    url = `twitter://user?screen_name=${cleanUsername}`;
                    Linking.canOpenURL(url).then(supported => {
                      if (supported) {
                        Linking.openURL(url);
                      } else {
                        Linking.openURL(`https://twitter.com/${cleanUsername}`);
                      }
                    });
                    break;
                  case 'facebook':
                    url = `fb://profile/${cleanUsername}`;
                    Linking.canOpenURL(url).then(supported => {
                      if (supported) {
                        Linking.openURL(url);
                      } else {
                        Linking.openURL(`https://www.facebook.com/${cleanUsername}`);
                      }
                    });
                    break;
                  case 'linkedin':
                    url = `linkedin://profile/${cleanUsername}`;
                    Linking.canOpenURL(url).then(supported => {
                      if (supported) {
                        Linking.openURL(url);
                      } else {
                        Linking.openURL(`https://www.linkedin.com/in/${cleanUsername}`);
                      }
                    });
                    break;
                  case 'tiktok':
                    url = `snssdk1233://user/profile/${cleanUsername}`;
                    Linking.canOpenURL(url).then(supported => {
                      if (supported) {
                        Linking.openURL(url);
                      } else {
                        Linking.openURL(`https://www.tiktok.com/@${cleanUsername}`);
                      }
                    });
                    break;
                  case 'youtube':
                    url = `vnd.youtube://channel/${cleanUsername}`;
                    Linking.canOpenURL(url).then(supported => {
                      if (supported) {
                        Linking.openURL(url);
                      } else {
                        Linking.openURL(`https://www.youtube.com/@${cleanUsername}`);
                      }
                    });
                    break;
                }
              };
              
              return (
                <View style={styles.socialMediaContainer}>
                  {socialMediaLinks.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.socialMediaButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                        onPress={() => handleSocialMediaPress(item.key, item.url)}
                      >
                        <IconComponent size={18} color={theme.colors.primary} />
                        <Text style={[styles.socialMediaButtonText, { color: theme.colors.text }]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}
            {/* Mesaj Butonu - Kendi profiline mesaj göndermek mantıklı değil, bu yüzden kaldırıldı */}
          </View>

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
                style={[styles.quickActionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, isDisabled && styles.quickActionCardDisabled]}
                onPress={action.onPress}
                disabled={isDisabled || !action.onPress}
                activeOpacity={isDisabled ? 1 : 0.8}
              >
                <IconComponent size={18} color={toneColor} />
                <Text
                  style={[
                    styles.quickActionLabel,
                    { color: theme.colors.text },
                    isDisabled && styles.quickActionLabelDisabled,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        </View>

        {/* Tab Navigation - Grid, Tagged */}
        <View style={[styles.tabNavigation, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity style={[styles.tab, styles.tabActive]}>
            <View style={[styles.tabIcon, { backgroundColor: theme.colors.primary }]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <View style={[styles.tabIcon, styles.tabIconTagged, { backgroundColor: theme.colors.textLight }]} />
          </TouchableOpacity>
        </View>

        {/* Posts Grid - Resimdeki gibi boş durum */}
        {postsLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Yükleniyor...</Text>
          </View>
        ) : postsData?.posts && postsData.posts.length > 0 ? (
          <View style={styles.postsGrid}>
            {postsData.posts.map((post) => {
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

        {/* Geçmiş Maçlar Bölümü */}
        {pastMatches.length > 0 && (
          <View style={[styles.matchesSection, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Geçmiş Maçlar</Text>
            </View>
            <View style={styles.matchesList}>
              {pastMatches.map((match: any) => {
                let matchDateTime: string | null = null;
                if (match.match_date_time) {
                  matchDateTime = match.match_date_time;
                } else if (match.match_date && match.start_time) {
                  matchDateTime = `${match.match_date}T${match.start_time}+03:00`;
                }
                
                const formattedDate = matchDateTime 
                  ? new Date(matchDateTime).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Tarih bilgisi yok';
                
                const formattedTime = matchDateTime
                  ? new Date(matchDateTime).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--';

                return (
                  <TouchableOpacity
                    key={match.id}
                    style={[styles.matchItem, { backgroundColor: theme.colors.surface }]}
                    onPress={() => router.push(`/football/match/${match.id}` as any)}
                  >
                    <View style={styles.matchItemContent}>
                      <Text style={[styles.matchItemField, { color: theme.colors.text }]}>{match.field?.name || 'Halı Saha'}</Text>
                      <Text style={[styles.matchItemDate, { color: theme.colors.textLight }]}>{formattedDate}</Text>
                      <Text style={[styles.matchItemTime, { color: theme.colors.primary }]}>{formattedTime}</Text>
                      {match.district && (
                        <Text style={[styles.matchItemDistrict, { color: theme.colors.textLight }]}>{match.district}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Footer />
      </ScrollView>

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
            {menuActions.map((action) => {
              const IconComponent = action.icon;
              const isDisabled = action.disabled;
              const toneColor =
                action.tone === 'danger'
                  ? theme.colors.error
                  : action.tone === 'success'
                  ? theme.colors.success
                  : theme.colors.text;
              
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.menuOption,
                    { borderTopColor: theme.colors.border },
                    action.tone === 'danger' && styles.menuOptionDanger,
                    isDisabled && styles.menuOptionDisabled
                  ]}
                  onPress={() => {
                    if (!isDisabled && action.onPress) {
                      action.onPress();
                    }
                  }}
                  disabled={isDisabled || !action.onPress}
                >
                  <IconComponent size={18} color={toneColor} />
                  <Text
                    style={[
                      styles.menuOptionText,
                      { color: theme.colors.text },
                      action.tone === 'danger' && { color: theme.colors.error },
                      isDisabled && { color: theme.colors.textLight }
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />

      {/* Takipçiler Bottom Sheet */}
      <BottomSheetModal
        visible={followersModalVisible}
        onClose={() => setFollowersModalVisible(false)}
        title="Takipçiler"
      >
        {user?.id ? (
          <FollowersList 
            userId={user.id} 
            onClose={() => setFollowersModalVisible(false)}
          />
        ) : null}
      </BottomSheetModal>

      {/* Takip Edilenler Bottom Sheet */}
      <BottomSheetModal
        visible={followingModalVisible}
        onClose={() => setFollowingModalVisible(false)}
        title="Takip Edilenler"
      >
        {user?.id ? (
          <FollowingList 
            userId={user.id} 
            onClose={() => setFollowingModalVisible(false)}
          />
        ) : null}
      </BottomSheetModal>
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
  profileTopRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  profileLeft: {
    marginRight: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  storyAddButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAddIcon: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    lineHeight: 20,
  },
  profileRight: {
    flex: 1,
    justifyContent: 'center',
    marginTop: SPACING.md, // 3 nokta menü butonundan aşağı al
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  profileInfo: {
    marginBottom: SPACING.md,
  },
  quickActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  quickActionCardDisabled: {
    opacity: 0.6,
  },
  quickActionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickActionLabelDisabled: {
    color: COLORS.textLight,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  name: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  bio: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    lineHeight: 16,
    marginBottom: SPACING.xs,
  },
  locationRow: {
    marginTop: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  socialMediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  socialMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  socialMediaButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  menuButton: {
    position: 'absolute',
    top: SPACING.lg + SPACING.md, // Aşağı kaydırıldı
    right: SPACING.md,
    padding: SPACING.sm,
    minWidth: 36,
    minHeight: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 10,
    elevation: 3, // Android için
    shadowColor: '#000', // iOS için
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.text,
  },
  tabIcon: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.text,
  },
  tabIconTagged: {
    borderRadius: 12,
  },
  postsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    width: '100%',
    backgroundColor: COLORS.white,
  },
  postGridItem: {
    width: '33.333%',
    aspectRatio: 1,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  postGridImage: {
    width: '100%',
    height: '100%',
  },
  postGridPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xs,
  },
  postGridText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  postGridBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  postGridBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  postGridOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    opacity: 0,
  },
  postGridOverlayVisible: {
    opacity: 1,
  },
  postGridStats: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
  },
  postGridStatText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700' as const,
    marginLeft: 2,
  },
  emptyPostsContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    minHeight: 400,
  },
  emptyPostsIllustration: {
    width: 120,
    height: 120,
    marginBottom: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPostsEmoji: {
    fontSize: 80,
  },
  emptyPostsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyPostsSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  createPostButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    minWidth: 120,
  },
  createPostButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    backgroundColor: COLORS.white,
    alignItems: 'center' as const,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  username: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  badgesRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  districtBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  supporterBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  supporterBadgeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '700' as const,
  },
  districtEmoji: {
    fontSize: FONT_SIZES.md,
  },
  districtText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  stats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    width: '100%',
    marginTop: SPACING.md,
  },
  postsSection: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  postsSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  postsSectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  postsCount: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  postsPreview: {
    paddingHorizontal: SPACING.md,
  },
  postPreviewCard: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: SPACING.sm,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  postPreviewImage: {
    width: '100%',
    height: '100%',
  },
  postPreviewPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: SPACING.xs,
  },
  postPreviewText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center' as const,
  },
  postPreviewBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  postPreviewBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
  },
  viewAllText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginTop: SPACING.md,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuContent: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: SPACING.sm,
    zIndex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  menuCloseButton: {
    padding: SPACING.xs,
  },
  menuCloseText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  menuOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  menuOptionDanger: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  menuOptionDangerText: {
    color: COLORS.error,
  },
  menuOptionDisabled: {
    opacity: 0.5,
  },
  menuOptionTextDisabled: {
    color: COLORS.textLight,
  },
  messageButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 20,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  messageButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
  followersModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseText: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textLight,
    fontWeight: '300' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalLoadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center' as const,
  },
  modalListContent: {
    padding: SPACING.md,
  },
  followerItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  followerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  followerUsername: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  matchesSection: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  matchesList: {
    padding: SPACING.md,
  },
  matchItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  matchItemContent: {
    gap: SPACING.xs,
  },
  matchItemField: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  matchItemDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  matchItemTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  matchItemDistrict: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  videoBadge: {
    position: 'absolute' as const,
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  videoBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  bottomSheetHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bottomSheetTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  bottomSheetCloseButton: {
    padding: SPACING.xs,
  },
  // List Container Styles
  listContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    padding: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center' as const,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    textAlign: 'center' as const,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
