import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Share, Platform, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, Settings, HelpCircle, Trash2, Edit3, Heart, Shield, CheckCircle2, Clock, XCircle, MoreVertical, Share2, Users, MessageCircle, Trophy } from 'lucide-react-native';
import { DISTRICT_BADGES } from '../../constants/districts';
import { useRouter } from 'expo-router';
import { Footer } from '../../components/Footer';
import { SupportPanel } from '../../components/SupportPanel';
import { SupporterBadge } from '../../components/SupporterBadge';
import VerifiedBadgeIcon from '../../components/VerifiedBadge';
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

// Post Grid Item Component (Instagram benzeri overlay ile) - Video desteği ile
function PostGridItem({ post, firstMedia, router }: { post: any; firstMedia: any; router: any }) {
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

  return (
    <TouchableOpacity
      style={styles.postGridItem}
      onPress={handlePress}
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
function FollowersList({ userId }: { userId: string }) {
  const router = useRouter();
  const { data, isLoading } = trpc.user.getFollowers.useQuery(
    { user_id: userId, limit: 100, offset: 0 },
    { enabled: !!userId }
  );

  if (isLoading) {
    return (
      <View style={styles.modalLoadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!data?.followers || data.followers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Users size={48} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Henüz takipçi yok</Text>
        <Text style={styles.emptySubtext}>
          Paylaşımlarınızı artırarak daha fazla takipçi kazanabilirsiniz
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data.followers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.followerItem}
          onPress={() => router.push(`/profile/${item.id}` as any)}
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
  );
}

// Takip Edilenler Listesi Component
function FollowingList({ userId }: { userId: string }) {
  const router = useRouter();
  const { data, isLoading } = trpc.user.getFollowing.useQuery(
    { user_id: userId, limit: 100, offset: 0 },
    { enabled: !!userId }
  );

  if (isLoading) {
    return (
      <View style={styles.modalLoadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!data?.following || data.following.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Users size={48} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Henüz kimseyi takip etmiyorsunuz</Text>
        <Text style={styles.emptySubtext}>
          İlginizi çeken kullanıcıları takip ederek içeriklerini görebilirsiniz
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data.following}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.followerItem}
          onPress={() => router.push(`/profile/${item.id}` as any)}
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
  );
}

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

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
  const { data: postsData, isLoading: postsLoading } = trpc.post.getPosts.useQuery({
    author_id: user?.id,
    limit: 50,
    offset: 0,
  }, {
    enabled: !!user?.id, // Sadece user varsa query çalışsın
  });

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
    { id: 'matches', label: 'Paylaşılan Maçlar', icon: Trophy, onPress: () => {
      setMenuVisible(false);
      router.push('/profile/my-matches' as any);
    }, disabled: pastMatches.length === 0 },
  ];

  // Menüye eklenecek butonlar
  const menuActions: QuickAction[] = [
    { id: 'share', label: 'Profili Paylaş', icon: Share2, onPress: handleShareProfile },
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
          <View style={[styles.menuContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Profil menüsü</Text>
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

      {/* Takipçiler Modal */}
      <Modal
        visible={followersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.followersModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Takipçiler</Text>
              <TouchableOpacity onPress={() => setFollowersModalVisible(false)}>
                <Text style={[styles.modalCloseText, { color: theme.colors.textLight }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <FollowersList userId={user?.id || ''} />
          </View>
        </View>
      </Modal>

      {/* Takip Edilenler Modal */}
      <Modal
        visible={followingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.followersModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Takip Edilenler</Text>
              <TouchableOpacity onPress={() => setFollowingModalVisible(false)}>
                <Text style={[styles.modalCloseText, { color: theme.colors.textLight }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <FollowingList userId={user?.id || ''} />
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
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center' as const,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: SPACING.sm,
  },
  menuTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
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
});
