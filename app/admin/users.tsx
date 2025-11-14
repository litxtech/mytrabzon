import React, { useState } from 'react';
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
import { ArrowLeft, Search, Ban, ShieldCheck, XCircle, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.admin.getUsers.useQuery({
    search: search || undefined,
    limit: 50,
    offset: 0,
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

  const giveBlueTickMutation = trpc.admin.giveBlueTick.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Mavi tik verildi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const removeBlueTickMutation = trpc.admin.removeBlueTick.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Mavi tik kaldırıldı');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
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
        <View style={styles.placeholder} />
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {data?.users && data.users.length > 0 ? (
          data.users.map((user: any) => {
            const isBanned = user.user_bans && user.user_bans.length > 0 && user.user_bans[0]?.is_active;
            const hasBlueTick = user.blue_ticks && user.blue_ticks.length > 0 && user.blue_ticks[0]?.is_active;

            return (
              <View key={user.id} style={styles.userCard}>
                <Image
                  source={{ uri: user.avatar_url || 'https://via.placeholder.com/50' }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={styles.userName}>{user.full_name || 'İsimsiz'}</Text>
                    {hasBlueTick && (
                      <View style={styles.blueTickBadge}>
                        <ShieldCheck size={16} color={COLORS.primary} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail}>{user.email || 'Email yok'}</Text>
                  <Text style={styles.userDistrict}>{user.district || 'İlçe belirtilmemiş'}</Text>
                  {isBanned && (
                    <View style={styles.bannedBadge}>
                      <Ban size={14} color={COLORS.error} />
                      <Text style={styles.bannedText}>Banlı</Text>
                    </View>
                  )}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.blueTickButton]}
                    onPress={() => handleBlueTick(user.id, hasBlueTick)}
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
                      onPress={() => handleUnban(user.id, user.full_name)}
                    >
                      <CheckCircle2 size={18} color={COLORS.success} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.banButton]}
                      onPress={() => handleBan(user.id, user.full_name)}
                    >
                      <Ban size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
          </View>
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
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    padding: 2,
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
});

