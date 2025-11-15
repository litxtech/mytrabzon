import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, HelpCircle, Trash2, Edit3, Heart, Shield, CheckCircle2, Clock, XCircle, Sparkles } from 'lucide-react-native';
import { DISTRICT_BADGES } from '../../constants/districts';
import { useRouter } from 'expo-router';
import { Footer } from '../../components/Footer';
import { SupportPanel } from '../../components/SupportPanel';
import { trpc } from '../../lib/trpc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);
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

  // İstatistikleri hesapla
  const totalPosts = postsData?.posts?.length || 0;

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


  if (!profile) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header - Resimdeki gibi */}
        <View style={[styles.profileHeader, { paddingTop: Math.max(insets.top, SPACING.md) }]}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileLeft}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: profile.avatar_url || 'https://via.placeholder.com/100' }}
                  style={styles.avatar}
                />
                <TouchableOpacity style={styles.storyAddButton}>
                  <Text style={styles.storyAddIcon}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.profileRight}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalPosts}</Text>
                  <Text style={styles.statLabel}>gönderi</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>takipçi</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>takip</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.full_name}</Text>
              {profile.verified && (
                <View style={styles.verifiedDot}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>
            {profile.username && (
              <Text style={styles.username}>@{profile.username}</Text>
            )}
            {profile.bio && (
              <Text style={styles.bio} numberOfLines={3}>
                {profile.bio}
              </Text>
            )}
            {profile.district && (
              <View style={styles.locationRow}>
                <Text style={styles.locationText}>
                  {DISTRICT_BADGES[profile.district as keyof typeof DISTRICT_BADGES] || '📍'} {profile.district}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => Alert.alert('Paylaş', 'Profil paylaşma özelliği yakında eklenecek')}
            >
              <Text style={styles.shareButtonText}>Profili paylaş</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation - Grid, Reels, Tagged */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity style={[styles.tab, styles.tabActive]}>
            <View style={styles.tabIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <View style={[styles.tabIcon, styles.tabIconReels]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <View style={[styles.tabIcon, styles.tabIconTagged]} />
          </TouchableOpacity>
        </View>

        {/* Posts Grid - Resimdeki gibi boş durum */}
        {postsLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        ) : postsData?.posts && postsData.posts.length > 0 ? (
          <View style={styles.postsGrid}>
            {postsData.posts.map((post) => {
              const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postGridItem}
                  onPress={() => router.push(`/post/${post.id}` as any)}
                >
                  {firstMedia ? (
                    <Image
                      source={{ uri: firstMedia.path }}
                      style={styles.postGridImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.postGridImage, styles.postGridPlaceholder]}>
                      <Text style={styles.postGridText} numberOfLines={3}>
                        {post.content}
                      </Text>
                    </View>
                  )}
                  {post.media && post.media.length > 1 && (
                    <View style={styles.postGridBadge}>
                      <Text style={styles.postGridBadgeText}>+{post.media.length - 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyPostsContainer}>
            <View style={styles.emptyPostsIllustration}>
              <Text style={styles.emptyPostsEmoji}>🎨</Text>
            </View>
            <Text style={styles.emptyPostsTitle}>İlk gönderini oluştur</Text>
            <Text style={styles.emptyPostsSubtitle}>
              Bu alanı kendine özel hale getir.
            </Text>
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => router.push('/create-post')}
            >
              <Text style={styles.createPostButtonText}>Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/edit')}>
            <Edit3 size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Profili Düzenle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/settings')}>
            <Settings size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Ayarlar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/lazgpt/chat')}>
            <Sparkles size={20} color={COLORS.primary} />
            <Text style={[styles.menuText, { color: COLORS.primary, fontWeight: '600' }]}>LazGPT ile Sohbet</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: COLORS.primary + '20', borderLeftWidth: 3, borderLeftColor: COLORS.primary }]} 
            onPress={() => router.push('/support/donate')}
          >
            <Heart size={20} color={COLORS.primary} />
            <Text style={[styles.menuText, { color: COLORS.primary, fontWeight: '700' }]}>❤️ MyTrabzon&apos;u Destekle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setSupportVisible(true)}>
            <HelpCircle size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Destek</Text>
          </TouchableOpacity>

          {/* KYC Butonu */}
          {profile?.verified ? (
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
  profileHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
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
  verifiedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
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
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  shareButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shareButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
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
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: COLORS.text,
  },
  tabIconReels: {
    borderRadius: 4,
  },
  tabIconTagged: {
    borderRadius: 12,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.white,
  },
  postGridItem: {
    width: '33.333%',
    aspectRatio: 1,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    position: 'relative',
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
    backgroundColor: COLORS.primary + '20',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  verifyItem: {
    backgroundColor: COLORS.primary + '20',
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
