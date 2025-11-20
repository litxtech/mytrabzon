import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Ban, XCircle, CheckCircle2, EyeOff, Square, CheckSquare, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';

type FilterType = 'all' | 'today' | 'banned' | 'blueTick' | 'hidden' | 'live';

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const limit = 100;
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  const { data, isLoading, refetch, error } = trpc.admin.getUsers.useQuery({
    search: debouncedSearch || undefined,
    filter: filter,
    limit: limit,
    offset: offset,
  }, {
    retry: 1,
  });

  const banUserMutation = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Kullanıcı banlandı');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const unbanUserMutation = trpc.admin.unbanUser.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Kullanıcının banı kaldırıldı');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const utils = trpc.useUtils();

  const giveBlueTickMutation = trpc.admin.giveBlueTick.useMutation({
    onSuccess: async (_data: any, variables: { userId: string }) => {
      // Tüm ilgili cache'leri invalidate et
      await Promise.all([
        (utils.user.getProfile as any).invalidate({ userId: variables.userId }),
        utils.user.getAllUsers.invalidate(),
        utils.user.getFollowers.invalidate({ user_id: variables.userId }),
        utils.user.getFollowing.invalidate({ user_id: variables.userId }),
        utils.post.getComments.invalidate(),
        utils.post.getPosts.invalidate(),
        (utils.post.getPostDetail as any)?.invalidate(),
        (utils.chat.getRooms as any)?.invalidate(),
        (utils.event as any).getEventComments.invalidate(),
        utils.event.getEvents.invalidate(),
      ]);
      refetch();
      Alert.alert('Başarılı', 'Mavi tik verildi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const removeBlueTickMutation = trpc.admin.removeBlueTick.useMutation({
    onSuccess: async (_data: any, variables: { userId: string }) => {
      // Tüm ilgili cache'leri invalidate et
      await Promise.all([
        (utils.user.getProfile as any).invalidate({ userId: variables.userId }),
        utils.user.getAllUsers.invalidate(),
        utils.user.getFollowers.invalidate({ user_id: variables.userId }),
        utils.user.getFollowing.invalidate({ user_id: variables.userId }),
        utils.post.getComments.invalidate(),
        utils.post.getPosts.invalidate(),
        (utils.post.getPostDetail as any)?.invalidate(),
        (utils.chat.getRooms as any)?.invalidate(),
        (utils.event as any).getEventComments.invalidate(),
        utils.event.getEvents.invalidate(),
      ]);
      refetch();
      Alert.alert('Başarılı', 'Mavi tik kaldırıldı');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const deleteUsersMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: (resp) => {
      refetch();
      setSelectedUsers(new Set());
      Alert.alert('Başarılı', `${resp.deleted} kullanıcı silindi`);
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    setOffset(0);
    setAllUsers([]);
    await refetch();
    setRefreshing(false);
  };

  // Data geldiğinde allUsers'ı güncelle
  useEffect(() => {
    if (data?.users) {
      if (offset === 0) {
        // İlk yükleme veya filtre değiştiğinde listeyi sıfırla
        setAllUsers(data.users);
      } else {
        // Sayfalama ile yeni kullanıcıları ekle
        setAllUsers((prev) => {
          const existingIds = new Set(prev.map((u: any) => u.id));
          const newUsers = data.users.filter((u: any) => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });
      }
    }
  }, [data?.users, offset]);

  // Filter veya debouncedSearch değiştiğinde offset'i sıfırla ve listeyi temizle
  useEffect(() => {
    setOffset(0);
    setAllUsers([]);
    setSelectedUsers(new Set());
  }, [filter, debouncedSearch]);

  const handleBan = (userId: string, fullName: string) => {
    Alert.alert(
      'Kullanıcıyı Banla',
      `${fullName} kullanıcısını banlamak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Banla',
          style: 'destructive',
          onPress: () => {
            banUserMutation.mutate({
              userId,
              reason: 'Admin tarafından banlandı',
              banType: 'permanent',
            });
          },
        },
      ]
    );
  };

  const handleUnban = (userId: string, fullName: string) => {
    Alert.alert(
      'Banı Kaldır',
      `${fullName} kullanıcısının banını kaldırmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          onPress: () => {
            unbanUserMutation.mutate({ userId });
          },
        },
      ]
    );
  };

  const handleBlueTick = (userId: string, hasBlueTick: boolean) => {
    if (hasBlueTick) {
      removeBlueTickMutation.mutate({ userId });
    } else {
      giveBlueTickMutation.mutate({ userId, verificationType: 'manual' });
    }
  };

  const toggleSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedUsers.size === 0) return;
    const ids = Array.from(selectedUsers);
    Alert.alert(
      'Kullanıcıları Sil',
      `${ids.length} kullanıcıyı tamamen silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteUsersMutation.mutate({ userIds: ids }),
        },
      ],
    );
  };

  const stats = data?.stats;
  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'today', label: 'Bugün' },
    { key: 'live', label: 'Canlı' },
    { key: 'banned', label: 'Banlı' },
    { key: 'blueTick', label: 'Mavi Tik' },
    { key: 'hidden', label: 'Gizli' },
  ];

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={[styles.loadingText, { color: COLORS.error }]}>Hata: {error.message}</Text>
        <TouchableOpacity
          style={[styles.loadMoreButton, { marginTop: SPACING.md }]}
          onPress={() => refetch()}
        >
          <Text style={styles.loadMoreText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kullanıcı Yönetimi</Text>
        {selectedUsers.size > 0 ? (
          <TouchableOpacity
            style={[styles.deleteButton, deleteUsersMutation.isPending && styles.buttonDisabled]}
            onPress={handleDeleteSelected}
            disabled={deleteUsersMutation.isPending}
          >
            {deleteUsersMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Trash2 size={16} color={COLORS.white} />
                <Text style={styles.deleteButtonText}>Sil ({selectedUsers.size})</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.statsContainer}>
        {[
          { label: 'Toplam', value: stats?.totalUsers ?? 0 },
          { label: 'Canlı', value: stats?.liveUsers ?? 0 },
          { label: 'Banlı', value: stats?.bannedUsers ?? 0 },
          { label: 'Gizli', value: stats?.hiddenUsers ?? 0 },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Kullanıcı ara (isim, email)..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterButton, filter === key && styles.filterButtonActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterButtonText, filter === key && styles.filterButtonTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {allUsers && allUsers.length > 0 ? (
          [...allUsers].sort((a: any, b: any) => {
            // created_at'e göre sırala (yeni → eski)
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          }).map((user: any) => {
            // user_bans, blue_ticks ve hidden_users array veya object olabilir
            const userBans = Array.isArray(user.user_bans) ? user.user_bans : (user.user_bans ? [user.user_bans] : []);
            const blueTicks = Array.isArray(user.blue_ticks) ? user.blue_ticks : (user.blue_ticks ? [user.blue_ticks] : []);
            const hiddenUsers = Array.isArray(user.hidden_users) ? user.hidden_users : (user.hidden_users ? [user.hidden_users] : []);
            const isBanned = userBans.length > 0 && userBans[0]?.is_active;
            const hasBlueTick = blueTicks.length > 0 && blueTicks[0]?.is_active;
            const isHidden = hiddenUsers.length > 0;
            const isSelected = selectedUsers.has(user.id);

            return (
              <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                onPress={() => router.push(`/admin/user-detail/${user.id}` as any)}
              >
                <TouchableOpacity
                  style={styles.selectionColumn}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleSelection(user.id);
                  }}
                >
                  {isSelected ? (
                    <CheckSquare size={20} color={COLORS.primary} />
                  ) : (
                    <Square size={20} color={COLORS.textLight} />
                  )}
                </TouchableOpacity>
                <Image
                  source={{ uri: user.avatar_url || 'https://via.placeholder.com/50' }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={styles.userName}>{user.full_name || 'İsimsiz'}</Text>
                    {hasBlueTick && (
                      <View style={styles.blueTickBadge}>
                        <VerifiedBadgeIcon size={18} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail}>{user.email || 'Email yok'}</Text>
                  <Text style={styles.userDistrict}>{user.district || 'İlçe belirtilmemiş'}</Text>
                  <Text style={styles.userDate}>
                    Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                  {isBanned && userBans[0] && (
                    <View style={styles.bannedBadge}>
                      <Ban size={14} color={COLORS.error} />
                      <Text style={styles.bannedText}>
                        Banlı - {userBans[0].ban_type === 'permanent' ? 'Kalıcı' : 'Geçici'}
                        {userBans[0].ban_until && ` (${new Date(userBans[0].ban_until).toLocaleDateString('tr-TR')})`}
                      </Text>
                    </View>
                  )}
                  {isHidden && (
                    <View style={styles.hiddenBadge}>
                      <EyeOff size={14} color="#FFA500" />
                      <Text style={styles.hiddenText}>
                        Gizli - {hiddenUsers[0]?.hidden_at ? new Date(hiddenUsers[0].hidden_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.blueTickButton]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleBlueTick(user.id, hasBlueTick);
                    }}
                  >
                    {hasBlueTick ? (
                      <XCircle size={18} color={COLORS.primary} />
                    ) : (
                      <CheckCircle2 size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                  {isBanned ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.unbanButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUnban(user.id, user.full_name);
                      }}
                    >
                      <CheckCircle2 size={18} color={COLORS.success} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.banButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleBan(user.id, user.full_name);
                      }}
                    >
                      <Ban size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
          </View>
        )}

        {/* Daha Fazla Yükle Butonu */}
        {data && data.total > allUsers.length && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => {
              setOffset((prev) => prev + limit);
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.loadMoreText}>
                Daha Fazla Yükle ({data.total - allUsers.length} kullanıcı kaldı)
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  deleteButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.md,
  },
  selectionColumn: {
    paddingRight: SPACING.sm,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  blueTickBadge: {
    marginLeft: SPACING.xs,
  },
  userEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  userDistrict: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  bannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bannedText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    fontWeight: '600',
  },
  hiddenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    backgroundColor: '#FFA50020',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  hiddenText: {
    fontSize: FONT_SIZES.xs,
    color: '#FFA500',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  blueTickButton: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  banButton: {
    backgroundColor: COLORS.error + '20',
    borderColor: COLORS.error,
  },
  unbanButton: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  userDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  loadMoreButton: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

