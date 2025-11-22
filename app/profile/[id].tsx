import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Linking,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICT_BADGES } from '@/constants/districts';
import {
  ArrowLeft,
  MessageCircle,
  Heart,
  Edit3,
  Settings,
  Clock,
  MapPin,
  Users,
  Star,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Music,
  Venus,
  Mars,
  Link as LinkIcon,
  Target,
  MoreVertical,
  Ban,
  Flag,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CallButtons } from '@/components/CallButtons';
import { SupporterBadge } from '@/components/SupporterBadge';
import { Footer } from '@/components/Footer';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { OptimizedImage } from '@/components/OptimizedImage';

// Mesaj butonu component'i
function MessageButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const createRoomMutation = trpc.chat.createRoom.useMutation();

  const handleMessage = async () => {
    try {
      const room = await createRoomMutation.mutateAsync({
        type: 'direct',
        memberIds: [targetUserId],
      });
      router.push(`/chat/${room.id}` as any);
    } catch (error: any) {
      console.error('Chat oluşturma hatası:', error);
      Alert.alert('Hata', error?.message || 'Mesaj gönderilemedi');
    }
  };

  return (
    <TouchableOpacity
      style={styles.messageButton}
      onPress={handleMessage}
      disabled={createRoomMutation.isPending}
    >
      <MessageCircle size={18} color={COLORS.white} />
    </TouchableOpacity>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser?.id === id;

  // Kullanıcı profilini getir
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = trpc.user.getProfile.useQuery(
    { userId: id! },
    { enabled: !!id }
  );

  // KTÜ öğrenci bilgilerini getir
  const { data: ktuStudent } = (trpc as any).ktu.getStudentInfo.useQuery(undefined, {
    enabled: !!id && id === currentUser?.id, // Sadece kendi bilgilerini göster
  });

  // Kullanıcının gönderilerini getir
  const { data: postsData, isLoading: postsLoading } = trpc.post.getPosts.useQuery(
    {
      author_id: id!,
      limit: 50,
      offset: 0,
    },
    {
      enabled: !!id,
      staleTime: 0, // Cache kullanma, her zaman fresh data al
      refetchOnMount: true, // Sayfa açıldığında her zaman fetch yap
      refetchOnWindowFocus: true, // Pencere focus olduğunda fetch yap
      refetchOnReconnect: true, // Bağlantı yenilendiğinde fetch yap
    }
  );

  // Takip durumunu kontrol et
  const { data: followStatus, refetch: refetchFollowStatus } = trpc.user.checkFollowStatus.useQuery(
    { user_id: id! },
    { enabled: !!id && !!currentUser && !isOwnProfile }
  );

  // Takipçi ve takip sayılarını getir
  const { data: followStats, refetch: refetchFollowStats } = trpc.user.getFollowStats.useQuery(
    { user_id: id! },
    { enabled: !!id }
  );

  const [showRideHistory, setShowRideHistory] = useState(false);
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDescription, setReportDescription] = useState('');
  
  // Engelle ve şikayet mutation'ları
  const blockUserMutation = (trpc as any).chat.blockUser.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Kullanıcı engellendi');
      setShowMenuModal(false);
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Kullanıcı engellenemedi');
    },
  });

  const reportUserMutation = trpc.user.reportUser.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Şikayetiniz admin paneline iletildi. Teşekkürler!');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Şikayet gönderilemedi');
    },
  });

  const { data: driverRides, isLoading: driverRidesLoading } = trpc.ride.getDriverRides.useQuery(
    { driver_id: id!, includePast: true },
    { enabled: !!id }
  );
  const { data: driverReviews } = (trpc as any).ride.getDriverReviews.useQuery(
    { driver_id: id!, limit: 20 },
    { enabled: !!id }
  );

  // Query client ve utils
  const utils = trpc.useUtils();
  const scrollRef = useRef<ScrollView>(null);
  const rideHistorySectionY = useRef(0);

  // Takip/Takipten çık mutation'ları
  const updateFollowStatusCache = (value: boolean) => {
    if (!currentUser || isOwnProfile) return;
    utils.user.checkFollowStatus.setData({ user_id: id! }, { is_following: value });
  };

  const followMutation = trpc.user.follow.useMutation({
    onMutate: async () => {
      updateFollowStatusCache(true);

      // Optimistic update - anında güncelle (takip edilen kullanıcının takipçi sayısı)
      utils.user.getFollowStats.setData({ user_id: id! }, (old) => {
        if (!old) return { followers_count: 1, following_count: 0 };
        return {
          ...old,
          followers_count: (old.followers_count || 0) + 1,
        };
      });
      
      // Kendi profilimizin takip sayısını da güncelle
      if (currentUser?.id) {
        utils.user.getFollowStats.setData({ user_id: currentUser.id }, (old) => {
          if (!old) return { followers_count: 0, following_count: 1 };
          return {
            ...old,
            following_count: (old.following_count || 0) + 1,
          };
        });
      }
    },
    onSuccess: () => {
      // Sadece invalidate et, refetch yapma (optimistic update zaten yapıldı)
      utils.user.checkFollowStatus.invalidate({ user_id: id! });
      utils.user.getFollowStats.invalidate({ user_id: id! });
      if (currentUser?.id) {
        utils.user.getFollowStats.invalidate({ user_id: currentUser.id });
      }
      // Liste query'lerini background'da güncelle
      utils.user.getFollowers.invalidate({ user_id: id! });
      utils.user.getFollowing.invalidate({ user_id: id! });
      if (currentUser?.id) {
        utils.user.getFollowers.invalidate({ user_id: currentUser.id });
        utils.user.getFollowing.invalidate({ user_id: currentUser.id });
      }
    },
    onError: () => {
      // Hata durumunda optimistic update'i geri al
      utils.user.getFollowStats.invalidate({ user_id: id! });
      if (currentUser?.id) {
        utils.user.getFollowStats.invalidate({ user_id: currentUser.id });
      }
      updateFollowStatusCache(false);
      refetchFollowStatus();
    },
  });

  const unfollowMutation = trpc.user.unfollow.useMutation({
    onMutate: async () => {
      updateFollowStatusCache(false);

      // Optimistic update - anında güncelle (takip edilen kullanıcının takipçi sayısı)
      utils.user.getFollowStats.setData({ user_id: id! }, (old) => {
        if (!old) return { followers_count: 0, following_count: 0 };
        return {
          ...old,
          followers_count: Math.max((old.followers_count || 0) - 1, 0),
        };
      });
      
      // Kendi profilimizin takip sayısını da güncelle
      if (currentUser?.id) {
        utils.user.getFollowStats.setData({ user_id: currentUser.id }, (old) => {
          if (!old) return { followers_count: 0, following_count: 0 };
          return {
            ...old,
            following_count: Math.max((old.following_count || 0) - 1, 0),
          };
        });
      }
    },
    onSuccess: async () => {
      // Önce takip durumunu güncelle
      await refetchFollowStatus();
      
      // Sonra istatistikleri güncelle
      await refetchFollowStats();
      
      // Profil bilgisini güncelle
      await refetchProfile();
      
      // Liste query'lerini invalidate et (takipçi/takip listeleri için)
      utils.user.getFollowers.invalidate({ user_id: id! });
      utils.user.getFollowing.invalidate({ user_id: id! });
      if (currentUser?.id) {
        utils.user.getFollowers.invalidate({ user_id: currentUser.id });
        utils.user.getFollowing.invalidate({ user_id: currentUser.id });
      }
      
      // Takip durumu query'sini de invalidate et
      utils.user.checkFollowStatus.invalidate({ user_id: id! });
    },
    onError: () => {
      // Hata durumunda optimistic update'i geri al
      utils.user.getFollowStats.invalidate({ user_id: id! });
      if (currentUser?.id) {
        utils.user.getFollowStats.invalidate({ user_id: currentUser.id });
      }
      updateFollowStatusCache(true);
    },
  });

  const isFollowing = followStatus?.is_following || false;
  const followersCount = followStats?.followers_count || 0;
  const followingCount = followStats?.following_count || 0;

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Profil' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profileError || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Hata' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profil bulunamadı</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const districtBadge = profile.district
    ? DISTRICT_BADGES[profile.district as keyof typeof DISTRICT_BADGES]
    : null;

  const totalPosts = postsData?.posts?.length || 0;
  const rideHistoryAvailable =
    (driverRides?.upcoming?.length || 0) + (driverRides?.past?.length || 0) > 0;

  const formatRideDate = (isoString: string) =>
    new Date(isoString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleRideHistoryPress = () => {
    if (!rideHistoryAvailable) return;
    setShowRideHistory(true);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const target = Math.max(rideHistorySectionY.current - 80, 0);
        scrollRef.current.scrollTo({ y: target, animated: true });
      }
    });
  };

  const renderRideCard = (ride: any, isPast: boolean) => (
    <View key={ride.id} style={styles.rideHistoryCard}>
      <View style={styles.rideHistoryRow}>
        <MapPin size={16} color={COLORS.primary} />
        <View style={styles.rideHistoryTextGroup}>
          <Text style={styles.rideHistoryTitle}>{ride.departure_title}</Text>
          <Text style={styles.rideHistorySubtitle}>→ {ride.destination_title}</Text>
        </View>
      </View>
      <View style={styles.rideHistoryRow}>
        <Clock size={16} color={COLORS.textLight} />
        <Text style={styles.rideHistoryDate}>{formatRideDate(ride.departure_time)}</Text>
      </View>
      <View style={styles.rideHistoryRow}>
        <Users size={16} color={COLORS.textLight} />
        <Text style={styles.rideHistoryMeta}>
          {ride.available_seats}/{ride.total_seats} koltuk
        </Text>
      </View>
      <Text style={[styles.rideHistoryStatus, isPast ? styles.rideHistoryStatusPast : styles.rideHistoryStatusUpcoming]}>
        {isPast ? 'Tamamlandı' : 'Yaklaşan yolculuk'}
      </Text>
    </View>
  );

  const averageRating =
    driverReviews && driverReviews.length > 0
      ? driverReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / driverReviews.length
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: profile.full_name || 'Profil',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            isOwnProfile ? (
              <TouchableOpacity
                onPress={() => router.push('/profile/settings')}
                style={styles.headerButton}
              >
                <Settings size={24} color={COLORS.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setShowMenuModal(true)}
                style={styles.headerButton}
              >
                <MoreVertical size={24} color={COLORS.text} />
              </TouchableOpacity>
            ),
        }}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: profile.avatar_url || 'https://via.placeholder.com/150',
              }}
              style={styles.avatar}
            />
            {districtBadge && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{districtBadge}</Text>
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.full_name || 'İsimsiz'}</Text>
            {/* GenderIcon component removed */}
            {profile.verified && <VerifiedBadgeIcon size={20} />}
            {profile.supporter_badge && profile.supporter_badge_visible && (
              <SupporterBadge 
                visible={true} 
                size="small" 
                color={profile.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
              />
            )}
            {profile.gender === 'female' && (
              <Venus size={18} color="#E91E63" style={{ marginLeft: 6 }} />
            )}
            {profile.gender === 'male' && (
              <Mars size={18} color="#2196F3" style={{ marginLeft: 6 }} />
            )}
          </View>
          {profile.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          
          {/* Sosyal Medya Hesapları */}
          {profile.social_media && profile.privacy_settings?.show_social_media !== false && (
            <View style={styles.socialMediaContainer}>
              {profile.social_media.instagram && (
                <TouchableOpacity
                  style={styles.socialMediaButton}
                  onPress={() => {
                    const url = profile.social_media.instagram.startsWith('http') 
                      ? profile.social_media.instagram 
                      : `https://instagram.com/${profile.social_media.instagram.replace('@', '')}`;
                    Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Instagram size={18} color="#E4405F" />
                </TouchableOpacity>
              )}
              {profile.social_media.twitter && (
                <TouchableOpacity
                  style={styles.socialMediaButton}
                  onPress={() => {
                    const url = profile.social_media.twitter.startsWith('http') 
                      ? profile.social_media.twitter 
                      : `https://twitter.com/${profile.social_media.twitter.replace('@', '')}`;
                    require('react-native').Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Twitter size={18} color="#1DA1F2" />
                </TouchableOpacity>
              )}
              {profile.social_media.facebook && (
                <TouchableOpacity
                  style={styles.socialMediaButton}
                  onPress={() => {
                    const url = profile.social_media.facebook.startsWith('http') 
                      ? profile.social_media.facebook 
                      : `https://facebook.com/${profile.social_media.facebook.replace('@', '')}`;
                    require('react-native').Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Facebook size={18} color="#1877F2" />
                </TouchableOpacity>
              )}
              {profile.social_media.linkedin && (
                <TouchableOpacity
                  style={styles.socialMediaButton}
                  onPress={() => {
                    const url = profile.social_media.linkedin.startsWith('http') 
                      ? profile.social_media.linkedin 
                      : `https://linkedin.com/in/${profile.social_media.linkedin.replace('@', '')}`;
                    require('react-native').Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Linkedin size={18} color="#0077B5" />
                </TouchableOpacity>
              )}
              {profile.social_media.tiktok && (
                <TouchableOpacity
                  style={styles.socialMediaButton}
                  onPress={() => {
                    const url = profile.social_media.tiktok.startsWith('http') 
                      ? profile.social_media.tiktok 
                      : `https://tiktok.com/@${profile.social_media.tiktok.replace('@', '')}`;
                    require('react-native').Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Music size={18} color="#000000" />
                </TouchableOpacity>
              )}
              {profile.social_media.youtube && (
                <TouchableOpacity
                  style={styles.socialMediaButton}
                  onPress={() => {
                    const url = profile.social_media.youtube.startsWith('http') 
                      ? profile.social_media.youtube 
                      : `https://youtube.com/@${profile.social_media.youtube.replace('@', '')}`;
                    require('react-native').Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Youtube size={18} color="#FF0000" />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* KTÜ Bilgileri */}
          {ktuStudent && ktuStudent.verification_status === 'verified' && (
            <View style={styles.ktuInfo}>
              <Text style={styles.ktuText}>
                🎓 {ktuStudent.faculty?.name} - {ktuStudent.department?.name}
              </Text>
              {ktuStudent.class_year && (
                <Text style={styles.ktuText}>
                  {ktuStudent.class_year}. Sınıf
                </Text>
              )}
            </View>
          )}

          {/* İstatistikler */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalPosts}</Text>
              <Text style={styles.statLabel}>Gönderi</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/profile/followers?id=${id}` as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/profile/following?id=${id}` as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton
                ]}
                onPress={() => {
                  if (isFollowing) {
                    unfollowMutation.mutate({ following_id: id! });
                  } else {
                    followMutation.mutate({ following_id: id! });
                  }
                }}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText
                ]}>
                  {isFollowing ? 'Takipten Çık' : 'Takip Et'}
                </Text>
              </TouchableOpacity>
              <MessageButton targetUserId={id!} />
              <CallButtons
                targetUserId={id!}
                targetUserName={profile.full_name || 'Kullanıcı'}
                targetUserAvatar={profile.avatar_url}
                variant="compact"
              />
              <TouchableOpacity
                style={styles.skorumButton}
                onPress={() => {
                  // Skorum bilgisini göster
                  const karmaScore = profile.karma_score || 50;
                  const karmaLevel = profile.karma_level || 'neutral';
                  Alert.alert(
                    'Skorum',
                    `${profile.full_name || 'Kullanıcı'} karma skoru: ${karmaScore}\nSeviye: ${karmaLevel === 'noble' ? 'Asil' : karmaLevel === 'good' ? 'İyi' : karmaLevel === 'neutral' ? 'Nötr' : karmaLevel === 'bad' ? 'Kötü' : 'Yasaklı'}`
                  );
                }}
                activeOpacity={0.7}
              >
                <Target size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}

          {rideHistoryAvailable && (
            <TouchableOpacity
              style={[
                styles.rideHistoryButton,
                showRideHistory && styles.rideHistoryButtonActive,
              ]}
              onPress={handleRideHistoryPress}
            >
              <Clock
                size={18}
                color={showRideHistory ? COLORS.white : COLORS.primary}
              />
              <Text
                style={[
                  styles.rideHistoryButtonText,
                  showRideHistory && styles.rideHistoryButtonTextActive,
                ]}
              >
                Yolculuklar
              </Text>
            </TouchableOpacity>
          )}

          {driverReviews && driverReviews.length > 0 && (
            <View style={styles.reviewSummaryCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>Değerlendirmeler</Text>
                <View style={styles.ratingRow}>
                  <Star size={18} color={COLORS.warning} fill={COLORS.warning} />
                  <Text style={styles.ratingValue}>
                    {averageRating?.toFixed(1)}
                  </Text>
                  <Text style={styles.ratingCount}>
                    ({driverReviews.length})
                  </Text>
                </View>
              </View>
              {driverReviews.slice(0, 3).map((review: any) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeaderRow}>
                    <Text style={styles.reviewName}>
                      {review.passenger?.full_name || 'Kullanıcı'}
                    </Text>
                    <View style={styles.ratingRow}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          color={index < review.rating ? COLORS.warning : COLORS.border}
                          fill={index < review.rating ? COLORS.warning : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment ? (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  ) : null}
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              ))}
              {driverReviews.length > 3 && (
                <Text style={styles.reviewMoreText}>
                  {driverReviews.length - 3} yorumu görmek için yakında!
                </Text>
              )}
            </View>
          )}

          {isOwnProfile && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/profile/edit')}
            >
              <Edit3 size={20} color={COLORS.primary} />
              <Text style={styles.editButtonText}>Profili Düzenle</Text>
            </TouchableOpacity>
          )}

          {rideHistoryAvailable && (
            <View
              style={styles.rideHistorySection}
              onLayout={(event) => {
                rideHistorySectionY.current = event.nativeEvent.layout.y;
              }}
            >
              <TouchableOpacity
                style={styles.rideHistoryToggle}
                onPress={() => setShowRideHistory((prev) => !prev)}
              >
                <Text style={styles.rideHistoryTitleText}>
                  Geçmiş Yolculuklar
                  {driverRides?.past?.length ? ` (${driverRides.past.length})` : ''}
                </Text>
                <Text style={styles.rideHistoryToggleText}>
                  {showRideHistory ? 'Gizle' : 'Göster'}
                </Text>
              </TouchableOpacity>
              {showRideHistory && (
                driverRidesLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : (
                  <View style={styles.rideHistoryList}>
                    {driverRides?.upcoming?.length ? (
                      <>
                        <Text style={styles.rideHistorySectionLabel}>Yaklaşan Yolculuklar</Text>
                        {driverRides.upcoming.map((ride) => renderRideCard(ride, false))}
                      </>
                    ) : null}
                    {driverRides?.past?.length ? (
                      <>
                        <Text style={styles.rideHistorySectionLabel}>Geçmiş Yolculuklar</Text>
                        {driverRides.past.map((ride) => renderRideCard(ride, true))}
                      </>
                    ) : null}
                    {!driverRides?.upcoming?.length && !driverRides?.past?.length && (
                      <Text style={styles.rideHistoryEmptyText}>Henüz yolculuk paylaşmadınız.</Text>
                    )}
                  </View>
                )
              )}
            </View>
          )}
        </View>

        {/* Gönderiler */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Gönderiler</Text>
          {postsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : postsData?.posts && postsData.posts.length > 0 ? (
            <FlatList
              data={postsData.posts}
              renderItem={({ item }) => {
                const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
                const isVideo = firstMedia && (firstMedia.type === 'video' || firstMedia.path?.match(/\.(mp4|mov|avi|webm)$/i));
                return (
                  <TouchableOpacity
                    style={styles.postCard}
                    onPress={() => {
                      if (isVideo) {
                        router.push(`/video-feed?postId=${item.id}` as any);
                      } else {
                        router.push(`/post/${item.id}` as any);
                      }
                    }}
                  >
                    {firstMedia ? (
                      isVideo ? (
                        <Video
                          source={{ uri: firstMedia.path, overrideFileExtensionAndroid: 'mp4' }}
                          style={styles.postImage}
                          resizeMode={ResizeMode.COVER}
                          isLooping
                          isMuted
                          shouldPlay={true}
                          useNativeControls={false}
                        />
                      ) : (
                        <Image
                          source={{ uri: firstMedia.path }}
                          style={styles.postImage}
                        />
                      )
                    ) : (
                      <View style={[styles.postImage, styles.postPlaceholder]}>
                        <View style={styles.postTextContainer}>
                          <Text style={styles.postText}>
                            {item.content}
                          </Text>
                        </View>
                      </View>
                    )}
                    <View style={styles.postOverlay}>
                      <View style={styles.postStats}>
                        <Heart size={16} color={COLORS.white} />
                        <Text style={styles.postStatText}>{item.like_count || 0}</Text>
                        <MessageCircle size={16} color={COLORS.white} style={styles.postStatIcon} />
                        <Text style={styles.postStatText}>{item.comment_count || 0}</Text>
                      </View>
                    </View>
                    {isVideo && (
                      <View style={styles.videoBadge}>
                        <Text style={styles.videoBadgeText}>▶</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz gönderi yok</Text>
            </View>
          )}
        </View>
        
        <Footer />
      </ScrollView>

      {/* Takipçiler Modal */}
      <Modal
        visible={followersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setFollowersModalVisible(false)}
          />
          <View style={styles.followersModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Takipçiler</Text>
              <TouchableOpacity onPress={() => setFollowersModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {id ? <FollowersList userId={id} /> : null}
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
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setFollowingModalVisible(false)}
          />
          <View style={styles.followersModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Takip Edilenler</Text>
              <TouchableOpacity onPress={() => setFollowingModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {id ? <FollowingList userId={id} /> : null}
          </View>
        </View>
      </Modal>

      {/* Menü Modal */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuModalContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                Alert.alert(
                  'Kullanıcıyı Engelle',
                  `${profile?.full_name || 'Bu kullanıcıyı'} engellemek istediğinizden emin misiniz? Engellediğiniz kullanıcı size mesaj gönderemez ve sizi göremez.`,
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Engelle',
                      style: 'destructive',
                      onPress: () => {
                        if (id) {
                          blockUserMutation.mutate({ blockedUserId: id });
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ban size={20} color={COLORS.error} />
              <Text style={styles.menuItemText}>Engelle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setShowReportModal(true);
              }}
            >
              <Flag size={20} color={COLORS.warning} />
              <Text style={styles.menuItemText}>Şikayet Et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowMenuModal(false)}
            >
              <Text style={styles.menuItemCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Şikayet Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportModalContent}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Kullanıcıyı Şikayet Et</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setReportDescription('');
                }}
              >
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Şikayet Edilen Kullanıcı Bilgileri */}
            {profile && (
              <View style={styles.reportedUserInfo}>
                <Image
                  source={{ uri: profile.avatar_url || 'https://via.placeholder.com/50' }}
                  style={styles.reportedUserAvatar}
                />
                <View style={styles.reportedUserDetails}>
                  <Text style={styles.reportedUserName}>{profile.full_name || 'İsimsiz'}</Text>
                  {profile.username && (
                    <Text style={styles.reportedUserUsername}>@{profile.username}</Text>
                  )}
                  {profile.district && (
                    <Text style={styles.reportedUserDistrict}>{profile.district}</Text>
                  )}
                </View>
              </View>
            )}

            <ScrollView style={styles.reportScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.reportLabel}>Şikayet Nedeni *</Text>
              <View style={styles.reportReasonsContainer}>
                {[
                  { value: 'spam', label: 'Spam / Gereksiz İçerik' },
                  { value: 'harassment', label: 'Taciz / Rahatsız Edici' },
                  { value: 'inappropriate', label: 'Uygunsuz İçerik' },
                  { value: 'fake', label: 'Sahte Hesap' },
                  { value: 'other', label: 'Diğer' },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.reportReasonChip,
                      reportReason === r.value && styles.reportReasonChipSelected,
                    ]}
                    onPress={() => setReportReason(r.value)}
                  >
                    <Text
                      style={[
                        styles.reportReasonText,
                        reportReason === r.value && styles.reportReasonTextSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.reportLabel}>Açıklama (Opsiyonel)</Text>
              <TextInput
                style={[styles.reportInput, styles.reportTextArea]}
                placeholder="Şikayetinizi detaylı olarak açıklayın..."
                placeholderTextColor={COLORS.textLight}
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.reportSubmitButton,
                (!reportReason || reportUserMutation.isPending) && styles.reportSubmitButtonDisabled,
              ]}
              onPress={() => {
                if (!id || !reportReason) return;
                reportUserMutation.mutate({
                  reported_user_id: id,
                  reason: reportReason as any,
                  description: reportDescription.trim() || undefined,
                });
              }}
              disabled={!reportReason || reportUserMutation.isPending}
            >
              {reportUserMutation.isPending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.reportSubmitButtonText}>Şikayet Et</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Takipçiler Listesi Component
function FollowersList({ userId }: { userId: string }) {
  const router = useRouter();
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
          onPress={() => {
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
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.modalListContent}
    />
  );
}

// Takip Edilenler Listesi Component
function FollowingList({ userId }: { userId: string }) {
  const router = useRouter();
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
        <Text style={styles.emptyText}>Henüz kimseyi takip etmiyor</Text>
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
          onPress={() => {
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
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.modalListContent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.error,
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  headerButton: {
    padding: SPACING.sm,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.border,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  badgeText: {
    fontSize: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  name: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  username: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  bio: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  socialMediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    justifyContent: 'center',
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
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center' as const,
  },
  rideHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  rideHistoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  rideHistoryButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  rideHistoryButtonTextActive: {
    color: COLORS.white,
  },
  reviewSummaryCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reviewTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  ratingCount: {
    color: COLORS.textLight,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewName: {
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewComment: {
    color: COLORS.text,
    marginTop: 4,
    lineHeight: 20,
  },
  reviewDate: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    marginTop: 4,
  },
  reviewMoreText: {
    marginTop: SPACING.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  messageButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skorumButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.secondary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    flexShrink: 1,
  },
  followButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 44,
  },
  followingButton: {
    backgroundColor: COLORS.border,
  },
  followButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  followingButtonText: {
    color: COLORS.text,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  rideHistorySection: {
    marginTop: SPACING.md,
    width: '100%',
    gap: SPACING.sm,
  },
  rideHistoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  rideHistoryTitleText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  rideHistoryToggleText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  rideHistoryList: {
    gap: SPACING.sm,
  },
  rideHistorySectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
  rideHistoryCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.xs,
  },
  rideHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rideHistoryTextGroup: {
    flex: 1,
  },
  rideHistoryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  rideHistorySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  rideHistoryDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  rideHistoryMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  rideHistoryStatus: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  rideHistoryStatusUpcoming: {
    color: COLORS.success,
  },
  rideHistoryStatusPast: {
    color: COLORS.textLight,
  },
  rideHistoryEmptyText: {
    textAlign: 'center',
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postsSection: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  postCard: {
    width: '31%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postPlaceholder: {
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  postTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  postText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: SPACING.xs,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
  postStatIcon: {
    marginLeft: SPACING.md,
  },
  videoBadge: {
    position: 'absolute',
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
    fontWeight: '600',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  ktuInfo: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  socialMediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  socialMediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ktuText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  followersModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.lg,
    maxHeight: '90%',
    minHeight: '50%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseText: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textLight,
    fontWeight: '300',
  },
  modalLoadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalListContent: {
    padding: SPACING.md,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  followerUsername: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    width: '80%',
    maxWidth: 300,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemCancel: {
    borderBottomWidth: 0,
    marginTop: SPACING.sm,
  },
  menuItemText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuItemCancelText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  reportModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: SPACING.lg,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  reportModalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  reportedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  reportedUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  reportedUserDetails: {
    flex: 1,
  },
  reportedUserName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  reportedUserUsername: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  reportedUserDistrict: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  reportScrollView: {
    maxHeight: 400,
  },
  reportLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  reportReasonsContainer: {
    gap: SPACING.sm,
  },
  reportReasonChip: {
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportReasonChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reportReasonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  reportReasonTextSelected: {
    color: COLORS.white,
  },
  reportInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportTextArea: {
    minHeight: 120,
    paddingTop: SPACING.md,
  },
  reportSubmitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    marginTop: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitButtonDisabled: {
    opacity: 0.5,
  },
  reportSubmitButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

