import React from 'react';
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
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CallButtons } from '@/components/CallButtons';
import { SupporterBadge } from '@/components/SupporterBadge';
import { Footer } from '@/components/Footer';

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
  const { data: profile, isLoading: profileLoading, error: profileError } = trpc.user.getProfile.useQuery(
    { userId: id! },
    { enabled: !!id }
  );

  // KTÜ öğrenci bilgilerini getir
  const { data: ktuStudent } = trpc.ktu.getStudentInfo.useQuery(undefined, {
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

  // Query client ve utils
  const utils = trpc.useUtils();

  // Takip/Takipten çık mutation'ları
  const followMutation = trpc.user.follow.useMutation({
    onMutate: async () => {
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
    onSuccess: async () => {
      // Takip durumunu güncelle
      await refetchFollowStatus();
      
      // Tüm ilgili query'leri invalidate et ve refetch yap
      await Promise.all([
        utils.user.getFollowStats.invalidate({ user_id: id! }),
        currentUser?.id ? utils.user.getFollowStats.invalidate({ user_id: currentUser.id }) : Promise.resolve(),
        refetchFollowStats(),
        utils.user.getProfile.invalidate({ userId: id! }),
        refetchProfile(),
      ]);
    },
    onError: () => {
      // Hata durumunda optimistic update'i geri al
      utils.user.getFollowStats.invalidate({ user_id: id! });
      if (currentUser?.id) {
        utils.user.getFollowStats.invalidate({ user_id: currentUser.id });
      }
    },
  });

  const unfollowMutation = trpc.user.unfollow.useMutation({
    onMutate: async () => {
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
      // Takip durumunu güncelle
      await refetchFollowStatus();
      
      // Tüm ilgili query'leri invalidate et ve refetch yap
      await Promise.all([
        utils.user.getFollowStats.invalidate({ user_id: id! }),
        currentUser?.id ? utils.user.getFollowStats.invalidate({ user_id: currentUser.id }) : Promise.resolve(),
        refetchFollowStats(),
        utils.user.getProfile.invalidate({ userId: id! }),
      ]);
    },
    onError: () => {
      // Hata durumunda optimistic update'i geri al
      utils.user.getFollowStats.invalidate({ user_id: id! });
      if (currentUser?.id) {
        utils.user.getFollowStats.invalidate({ user_id: currentUser.id });
      }
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
  const totalLikes =
    postsData?.posts?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0;

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
            ) : null,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.badgeText}>{districtBadge.emoji}</Text>
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.full_name || 'İsimsiz'}</Text>
            {profile.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
            {profile.supporter_badge && profile.supporter_badge_visible && (
              <SupporterBadge 
                visible={true} 
                size="small" 
                color={profile.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
              />
            )}
          </View>
          {profile.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          
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
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </View>
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
                          resizeMode="cover"
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
                        <Text style={styles.postStatText}>{item.likes_count || 0}</Text>
                        <MessageCircle size={16} color={COLORS.white} style={styles.postStatIcon} />
                        <Text style={styles.postStatText}>{item.comments_count || 0}</Text>
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
    </SafeAreaView>
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
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  verifiedText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
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
  messageButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.primary,
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
  ktuText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

