import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Ban, XCircle, Shield, CheckCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../../constants/theme';
import { trpc } from '../../../lib/trpc';
import { Footer } from '@/components/Footer';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';

export default function AdminUserDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = (trpc as any).admin.getUserDetail.useQuery({
    userId: id!,
  });

  const banUserMutation = (trpc as any).admin.banUser.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Kullanıcı banlandı');
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Kullanıcı banlanamadı');
    },
  });

  const unbanUserMutation = (trpc as any).admin.unbanUser.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Kullanıcının banı kaldırıldı');
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Ban kaldırılamadı');
    },
  });

  const utils = trpc.useUtils();

  const giveBlueTickMutation = (trpc as any).admin.giveBlueTick.useMutation({
    onSuccess: async (_data: any, variables: { userId: string }) => {
      // Tüm ilgili cache'leri invalidate et
      await Promise.all([
        (utils.user.getProfile as any).invalidate({ userId: variables.userId }),
        utils.user.getFollowers.invalidate({ user_id: variables.userId }),
        utils.user.getFollowing.invalidate({ user_id: variables.userId }),
        utils.post.getComments.invalidate(),
        (utils.event as any).getEventComments.invalidate(),
        utils.post.getPosts.invalidate(),
        utils.event.getEvents.invalidate(),
      ]);
      refetch();
      Alert.alert('Başarılı', 'Mavi tik verildi');
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Mavi tik verilemedi');
    },
  });

  const removeBlueTickMutation = (trpc as any).admin.removeBlueTick.useMutation({
    onSuccess: async (_data: any, variables: { userId: string }) => {
      // Tüm ilgili cache'leri invalidate et
      await Promise.all([
        (utils.user.getProfile as any).invalidate({ userId: variables.userId }),
        utils.user.getFollowers.invalidate({ user_id: variables.userId }),
        utils.user.getFollowing.invalidate({ user_id: variables.userId }),
        utils.post.getComments.invalidate(),
        (utils.event as any).getEventComments.invalidate(),
        utils.post.getPosts.invalidate(),
        utils.event.getEvents.invalidate(),
      ]);
      refetch();
      Alert.alert('Başarılı', 'Mavi tik kaldırıldı');
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Mavi tik kaldırılamadı');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBan = () => {
    Alert.alert(
      'Kullanıcıyı Banla',
      'Ban türünü seçin:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Geçici Ban',
          onPress: () => {
            Alert.prompt(
              'Ban Süresi',
              'Ban süresini gün olarak girin (örn: 7, 30)',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Banla',
                  onPress: (days?: string) => {
                    if (days && !isNaN(Number(days))) {
                      const banUntil = new Date();
                      banUntil.setDate(banUntil.getDate() + Number(days));
                      banUserMutation.mutate({
                        userId: id!,
                        banType: 'temporary',
                        banUntil: banUntil.toISOString(),
                        reason: 'Admin tarafından banlandı',
                      });
                    } else {
                      Alert.alert('Hata', 'Geçerli bir sayı girin');
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
        {
          text: 'Kalıcı Ban',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Kalıcı Ban',
              'Bu kullanıcıyı kalıcı olarak banlamak istediğinizden emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Banla',
                  style: 'destructive',
                  onPress: () => {
                    banUserMutation.mutate({
                      userId: id!,
                      banType: 'permanent',
                      reason: 'Admin tarafından kalıcı banlandı',
                    });
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleUnban = () => {
    Alert.alert(
      'Banı Kaldır',
      'Bu kullanıcının banını kaldırmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          onPress: () => {
            unbanUserMutation.mutate({ userId: id! });
          },
        },
      ]
    );
  };

  const handleGiveBlueTick = () => {
    Alert.alert(
      'Mavi Tik Ver',
      'Bu kullanıcıya mavi tik vermek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ver',
          onPress: () => {
            giveBlueTickMutation.mutate({ userId: id! });
          },
        },
      ]
    );
  };

  const handleRemoveBlueTick = () => {
    Alert.alert(
      'Mavi Tik Kaldır',
      'Bu kullanıcının mavi tikini kaldırmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            removeBlueTickMutation.mutate({ userId: id! });
          },
        },
      ]
    );
  };

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!data?.profile) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Kullanıcı bulunamadı</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profile = data.profile;
  const hasBlueTick = profile.blue_ticks && profile.blue_ticks.length > 0;
  const isBanned = profile.user_bans && profile.user_bans.length > 0;
  const currentBan = isBanned ? profile.user_bans[0] : null;
  const hasSupporterBadge = profile.supporter_badge && profile.supporter_badge_visible;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kullanıcı Detayı</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: profile.avatar_url || 'https://via.placeholder.com/80' }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{profile.full_name || 'İsimsiz'}</Text>
                {hasBlueTick && (
                  <View style={styles.blueTickBadge}>
                    <VerifiedBadgeIcon size={20} />
                  </View>
                )}
                {hasSupporterBadge && (
                  <View style={[styles.supporterBadge, { backgroundColor: profile.supporter_badge_color || COLORS.primary }]}>
                    <Shield size={16} color={COLORS.white} fill={COLORS.white} />
                  </View>
                )}
              </View>
              <Text style={styles.profileUsername}>@{profile.username || 'kullanıcı'}</Text>
              {profile.bio && <Text style={styles.profileBio}>{profile.bio}</Text>}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.postCount || 0}</Text>
              <Text style={styles.statLabel}>Gönderi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.commentCount || 0}</Text>
              <Text style={styles.statLabel}>Yorum</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {new Date(profile.created_at).toLocaleDateString('tr-TR')}
              </Text>
              <Text style={styles.statLabel}>Kayıt Tarihi</Text>
            </View>
          </View>

          {isBanned && currentBan && (
            <View style={styles.banInfo}>
              <Ban size={20} color={COLORS.error} />
              <View style={styles.banInfoText}>
                <Text style={styles.banType}>
                  {currentBan.ban_type === 'permanent' ? 'Kalıcı Ban' : 'Geçici Ban'}
                </Text>
                {currentBan.ban_until && (
                  <Text style={styles.banUntil}>
                    Bitiş: {new Date(currentBan.ban_until).toLocaleDateString('tr-TR')}
                  </Text>
                )}
                {currentBan.reason && (
                  <Text style={styles.banReason}>Sebep: {currentBan.reason}</Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-posta:</Text>
              <Text style={styles.infoValue}>{profile.email || 'Belirtilmemiş'}</Text>
            </View>
            {profile.district && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>İlçe:</Text>
                <Text style={styles.infoValue}>{profile.district}</Text>
              </View>
            )}
            {profile.city && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Şehir:</Text>
                <Text style={styles.infoValue}>{profile.city}</Text>
              </View>
            )}
            {profile.age && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Yaş:</Text>
                <Text style={styles.infoValue}>{profile.age}</Text>
              </View>
            )}
            {profile.gender && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cinsiyet:</Text>
                <Text style={styles.infoValue}>
                  {profile.gender === 'male' ? 'Erkek' : profile.gender === 'female' ? 'Kadın' : 'Diğer'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Yönetim İşlemleri</Text>
            
            {isBanned ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.unbanButton]}
                onPress={handleUnban}
              >
                <XCircle size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Banı Kaldır</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.banButton]}
                onPress={handleBan}
              >
                <Ban size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Kullanıcıyı Banla</Text>
              </TouchableOpacity>
            )}

            {hasBlueTick ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.removeBlueTickButton]}
                onPress={handleRemoveBlueTick}
              >
                <XCircle size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Mavi Tik Kaldır</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.giveBlueTickButton]}
                onPress={handleGiveBlueTick}
              >
                <CheckCircle size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Mavi Tik Ver</Text>
              </TouchableOpacity>
            )}

            {hasSupporterBadge && (
              <View style={styles.supporterInfo}>
                <Text style={styles.supporterInfoText}>
                  Destekçi Rozeti: {profile.supporter_badge_color || 'Renk belirtilmemiş'}
                </Text>
                <Text style={styles.supporterInfoText}>
                  {profile.supporter_badge_expires_at
                    ? `Bitiş: ${new Date(profile.supporter_badge_expires_at).toLocaleDateString('tr-TR')}`
                    : 'Süresiz'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Footer />
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
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    marginBottom: SPACING.md,
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
  backButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: SPACING.md,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  profileName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  blueTickBadge: {
    marginLeft: SPACING.xs,
  },
  supporterBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: SPACING.xs,
  },
  profileUsername: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  profileBio: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  banInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '20',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  banInfoText: {
    flex: 1,
  },
  banType: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  banUntil: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  banReason: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  infoSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textLight,
    width: 100,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  actionsSection: {
    marginTop: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  banButton: {
    backgroundColor: COLORS.error,
  },
  unbanButton: {
    backgroundColor: COLORS.success,
  },
  giveBlueTickButton: {
    backgroundColor: COLORS.primary,
  },
  removeBlueTickButton: {
    backgroundColor: COLORS.warning,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  supporterInfo: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  supporterInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
});

