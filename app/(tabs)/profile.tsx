import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, FlatList } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, HelpCircle, Trash2, Edit3, Heart, MessageCircle, Share2, MoreVertical, Shield, CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { DISTRICT_BADGES } from '../../constants/districts';
import { useRouter } from 'expo-router';
import { Footer } from '../../components/Footer';
import { SupportPanel } from '../../components/SupportPanel';
import { trpc } from '../../lib/trpc';
import { Post } from '../../types/database';
export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);

  const deleteAccountMutation = trpc.user.requestAccountDeletion.useMutation();
  
  // Admin kontrolü - Sadece belirli kullanıcı görecek (UID: 98542f02-11f8-4ccd-b38d-4dd42066daa7)
  const ADMIN_USER_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
  const isAdmin = user?.id === ADMIN_USER_ID;

  // KYC durumu kontrolü
  const { data: kycData } = trpc.kyc.get.useQuery(undefined, {
    enabled: !!user?.id,
  });

  // Kullanıcının gönderilerini getir
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = trpc.post.getPosts.useQuery({
    author_id: user?.id,
    limit: 50,
    offset: 0,
  }, {
    enabled: !!user?.id, // Sadece user varsa query çalışsın
  });

  const deletePostMutation = trpc.post.deletePost.useMutation({
    onSuccess: () => {
      refetchPosts();
    },
  });

  const sharePostMutation = trpc.post.sharePost.useMutation();

  // İstatistikleri hesapla
  const totalPosts = postsData?.posts?.length || 0;
  const totalLikes = postsData?.posts?.reduce((sum: number, post: Post) => sum + (post.like_count || 0), 0) || 0;
  const totalComments = postsData?.posts?.reduce((sum: number, post: Post) => sum + (post.comment_count || 0), 0) || 0;

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

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      'Gönderiyi Sil',
      'Bu gönderiyi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deletePostMutation.mutateAsync({ postId });
              if (result?.softDeleted) {
                Alert.alert(
                  'Gönderi Arşivlendi',
                  'Bu gönderi paylaşıldığı için arşivlendi. Paylaşımlar devam edecek.'
                );
              } else {
                Alert.alert('Başarılı', 'Gönderi silindi');
              }
              refetchPosts();
            } catch (error: any) {
              const errorMessage = error?.message || 'Gönderi silinirken bir hata oluştu';
              Alert.alert('Hata', errorMessage);
              console.error('Delete post error:', error);
            }
          }
        }
      ]
    );
  };

  const handleSharePost = async (postId: string) => {
    try {
      await sharePostMutation.mutateAsync({ post_id: postId, share_to: 'feed' });
      Alert.alert('Başarılı', 'Gönderi paylaşıldı');
      refetchPosts();
    } catch (error) {
      Alert.alert('Hata', 'Gönderi paylaşılırken bir hata oluştu');
      console.error('Share post error:', error);
    }
  };

  const formatPostTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Image
            source={{ uri: profile.avatar_url || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{profile.full_name}</Text>
          <View style={styles.districtBadge}>
            <Text style={styles.districtEmoji}>{DISTRICT_BADGES[profile.district as keyof typeof DISTRICT_BADGES] || '📍'}</Text>
            <Text style={styles.districtText}>{profile.district}</Text>
          </View>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalPosts}</Text>
              <Text style={styles.statLabel}>Gönderi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalLikes}</Text>
              <Text style={styles.statLabel}>Beğeni</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalComments}</Text>
              <Text style={styles.statLabel}>Yorum</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/edit')}>
            <Edit3 size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Profili Düzenle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/settings')}>
            <Settings size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Ayarlar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setSupportVisible(true)}>
            <HelpCircle size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Destek</Text>
          </TouchableOpacity>

          {/* KYC Butonu */}
          {profile?.is_verified ? (
            <View style={[styles.menuItem, styles.verifiedItem]}>
              <CheckCircle2 size={20} color={COLORS.success} />
              <Text style={[styles.menuText, { color: COLORS.success, fontWeight: '600' }]}>Kimlik Doğrulandı ✓</Text>
            </View>
          ) : kycData?.status === 'pending' ? (
            <View style={[styles.menuItem, styles.pendingItem]}>
              <Clock size={20} color={COLORS.warning} />
              <Text style={[styles.menuText, { color: COLORS.warning }]}>Kimlik Doğrulama Beklemede</Text>
            </View>
          ) : kycData?.status === 'rejected' ? (
            <TouchableOpacity 
              style={[styles.menuItem, styles.rejectedItem]} 
              onPress={() => router.push('/kyc/verify')}
            >
              <XCircle size={20} color={COLORS.error} />
              <Text style={[styles.menuText, { color: COLORS.error }]}>Kimlik Doğrulama Reddedildi - Tekrar Dene</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.menuItem, styles.verifyItem]} 
              onPress={() => router.push('/kyc/verify')}
            >
              <Shield size={20} color={COLORS.primary} />
              <Text style={[styles.menuText, { color: COLORS.primary, fontWeight: '600' }]}>Kimliği Doğrula</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity 
              style={[styles.menuItem, styles.adminMenuItem]} 
              onPress={() => router.push('/admin/dashboard')}
            >
              <Shield size={20} color={COLORS.primary} />
              <Text style={[styles.menuText, { color: COLORS.primary, fontWeight: '700' }]}>Admin Paneli</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <Trash2 size={20} color={COLORS.error} />
            <Text style={[styles.menuText, { color: COLORS.error }]}>Hesabı Sil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <LogOut size={20} color={COLORS.error} />
            <Text style={[styles.menuText, { color: COLORS.error }]}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.postsSection}
          onPress={() => router.push('/profile/posts')}
        >
          <View style={styles.postsSectionHeader}>
            <Text style={styles.postsSectionTitle}>Gönderilerim</Text>
            {postsData?.posts && postsData.posts.length > 0 && (
              <Text style={styles.postsCount}>({postsData.posts.length})</Text>
            )}
          </View>
          {postsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          ) : postsData?.posts && postsData.posts.length > 0 ? (
            <View style={styles.postsPreview}>
              <FlatList
                data={postsData.posts.slice(0, 3)}
                renderItem={({ item }) => {
                  const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
                  return (
                    <TouchableOpacity 
                      style={styles.postPreviewCard}
                      onPress={() => router.push(`/post/${item.id}` as any)}
                    >
                      {firstMedia ? (
                        <Image
                          source={{ uri: firstMedia.path }}
                          style={styles.postPreviewImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.postPreviewImage, styles.postPreviewPlaceholder]}>
                          <Text style={styles.postPreviewText} numberOfLines={2}>
                            {item.content}
                          </Text>
                        </View>
                      )}
                      {item.media && item.media.length > 1 && (
                        <View style={styles.postPreviewBadge}>
                          <Text style={styles.postPreviewBadgeText}>+{item.media.length - 1}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
              />
              {postsData.posts.length > 3 && (
                <Text style={styles.viewAllText}>Tümünü gör ({postsData.posts.length})</Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz gönderi yok</Text>
              <Text style={styles.emptySubtext}>İlk paylaşımı yapan sen ol!</Text>
            </View>
          )}
        </TouchableOpacity>

        <Footer />
      </ScrollView>

      <SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    alignItems: 'center' as const,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.md,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  districtBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  districtEmoji: {
    fontSize: FONT_SIZES.md,
  },
  districtText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  bio: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center' as const,
    marginBottom: SPACING.md,
  },
  stats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    width: '100%',
    marginTop: SPACING.md,
  },
  statItem: {
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  adminMenuItem: {
    backgroundColor: COLORS.primaryLight + '20',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  verifyItem: {
    backgroundColor: COLORS.primaryLight + '20',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  verifiedItem: {
    backgroundColor: COLORS.success + '20',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  pendingItem: {
    backgroundColor: COLORS.warning + '20',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  rejectedItem: {
    backgroundColor: COLORS.error + '20',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  menuText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
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
});
