import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, X, Filter, MoreVertical, Check, XCircle } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import { formatTimeAgo } from '@/lib/time-utils';
import { Footer } from '@/components/Footer';
import { Video, ResizeMode } from 'expo-av';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { RideReviewModal } from '@/components/RideReviewModal';

type NotificationType = 'EVENT' | 'SYSTEM' | 'MESSAGE' | 'RESERVATION' | 'FOOTBALL' | 'all';

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType>('all');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewedUserName, setReviewedUserName] = useState<string>('');

  const { data: notificationsData, isLoading, refetch } = trpc.notification.getNotifications.useQuery(
    { type: filterType !== 'all' ? filterType : undefined },
    { enabled: true }
  );

  const { data: unreadCount } = trpc.notification.getUnreadCount.useQuery();

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteNotificationMutation = trpc.notification.deleteNotification.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteAllNotificationsMutation = trpc.notification.deleteAllNotifications.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const approveBookingMutation = trpc.ride.approveBooking.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Rezervasyon onaylandı');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Rezervasyon onaylanamadı');
    },
  });

  const rejectBookingMutation = trpc.ride.rejectBooking.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Rezervasyon reddedildi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Rezervasyon reddedilemedi');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: any) => {
    // Okundu olarak işaretle
    if (!notification.read_at) {
      markAsReadMutation.mutate({ notification_id: notification.id });
    }

    // Admin bildirimleri (SYSTEM tipi ve sender mytrabzonteam) için detay modal'ı göster
    if (notification.type === 'SYSTEM' && notification.data?.sender === 'mytrabzonteam') {
      setSelectedNotification(notification);
      setDetailModalVisible(true);
      return;
    }

    // Bildirim tipine göre yönlendir
    if (notification.type === 'EVENT' && notification.event_id) {
      router.push(`/event/${notification.event_id}` as any);
    } else if (notification.type === 'MESSAGE' && notification.data?.room_id) {
      router.push(`/chat/${notification.data.room_id}` as any);
    } else if (notification.type === 'RESERVATION' && notification.data?.match_id) {
      router.push(`/football/match/${notification.data.match_id}` as any);
    } else if (notification.type === 'RESERVATION' && notification.data?.type === 'RIDE_COMPLETED') {
      // Yolculuk tamamlandı bildirimi - rating modalını göster
      if (notification.data?.booking_id) {
        setReviewBookingId(notification.data.booking_id);
        setReviewedUserName(notification.data?.driver_name || 'Sürücü');
        setReviewModalVisible(true);
      } else {
        router.push(`/ride/${notification.data?.ride_offer_id}` as any);
      }
    } else if (notification.type === 'RESERVATION' && notification.data?.match_id) {
      router.push(`/football/match/${notification.data.match_id}` as any);
    } else if (notification.data?.type === 'PROXIMITY' && notification.data?.pair_id) {
      // Yakındaki kişi bildirimi - proximity modal'ı gösterilecek
      // ProximityManager component'i bunu handle edecek
    } else if (notification.data?.type === 'KYC_REQUEST' && notification.data?.kyc_id) {
      // Admin için KYC başvurusu bildirimi
      router.push('/admin/kyc' as any);
    } else if (notification.data?.type === 'KYC_APPROVED' || notification.data?.type === 'KYC_REJECTED') {
      // KYC onay/red bildirimi - profil sayfasına yönlendir
      router.push('/(tabs)/profile' as any);
    } else if (notification.data?.type === 'LIKE' && notification.data?.post_id) {
      router.push(`/post/${notification.data.post_id}` as any);
    } else if (notification.data?.type === 'COMMENT' && notification.data?.post_id) {
      router.push(`/post/${notification.data.post_id}` as any);
    }
  };

  const handleDelete = (notificationId: string) => {
    Alert.alert(
      'Bildirimi Sil',
      'Bu bildirimi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deleteNotificationMutation.mutate({ notification_id: notificationId });
          },
        },
      ]
    );
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Tümünü Sil',
      'Tüm bildirimleri silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tümünü Sil',
          style: 'destructive',
          onPress: () => {
            deleteAllNotificationsMutation.mutate();
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string, data?: any) => {
    // Data içindeki type'a göre ikon belirle
    if (data?.type === 'PROXIMITY') {
      return '📍';
    } else if (data?.type === 'KYC_REQUEST' || data?.type === 'KYC_APPROVED' || data?.type === 'KYC_REJECTED') {
      return '🆔';
    } else if (data?.type === 'LIKE') {
      return '❤️';
    } else if (data?.type === 'COMMENT') {
      return '💬';
    } else if (data?.type === 'FOLLOW') {
      return '👥';
    }
    
    switch (type) {
      case 'EVENT':
        return '🔔';
      case 'MESSAGE':
        return '💬';
      case 'RESERVATION':
        return '📅';
      case 'FOOTBALL':
        return '⚽';
      case 'SYSTEM':
        // Admin bildirimleri için özel ikon
        return '✅';
      default:
        return '📢';
    }
  };


  const notifications = notificationsData?.notifications || [];

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL':
        return theme.colors.error;
      case 'HIGH':
        return theme.colors.warning;
      case 'NORMAL':
        return theme.colors.primary;
      default:
        return theme.colors.textLight;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Bildirimler</Text>
          {unreadCount && unreadCount.count > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
              <Text style={styles.badgeText}>{unreadCount.count}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              const types: NotificationType[] = ['all', 'EVENT', 'MESSAGE', 'RESERVATION', 'FOOTBALL', 'SYSTEM'];
              const currentIndex = types.indexOf(filterType);
              const nextIndex = (currentIndex + 1) % types.length;
              setFilterType(types[nextIndex]);
            }}
          >
            <Filter size={18} color={theme.colors.primary} />
            <Text style={[styles.filterText, { color: theme.colors.primary }]}>
              {filterType === 'all' ? 'Tümü' : filterType}
            </Text>
          </TouchableOpacity>
          
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Alert.alert(
                  'İşlemler',
                  'Ne yapmak istersiniz?',
                  [
                    {
                      text: 'Tümünü Okundu İşaretle',
                      onPress: handleMarkAllAsRead,
                    },
                    {
                      text: 'Tümünü Sil',
                      style: 'destructive',
                      onPress: handleDeleteAll,
                    },
                    { text: 'İptal', style: 'cancel' },
                  ]
                );
              }}
            >
              <MoreVertical size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.notificationItem,
                { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
                !item.read_at && { backgroundColor: theme.colors.primary + '08' },
              ]}
              onPress={() => handleNotificationPress(item)}
              onLongPress={() => handleDelete(item.id)}
            >
              <View style={styles.notificationIcon}>
                <Text style={styles.iconEmoji}>{getNotificationIcon(item.type, item.data)}</Text>
                {item.event?.severity && (
                  <View style={[styles.severityDot, { backgroundColor: getSeverityColor(item.event.severity) }]} />
                )}
              </View>
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={styles.titleRow}>
                    <Text style={[
                      styles.notificationTitle,
                      { color: theme.colors.text },
                      !item.read_at && { color: theme.colors.text, fontWeight: '700' },
                    ]}>
                      {item.data?.sender === 'mytrabzonteam' 
                        ? 'MyTrabzonTeam' 
                        : item.data?.sender_name || item.title}
                    </Text>
                    {/* Admin bildirimleri için mavi tik */}
                    {item.type === 'SYSTEM' && item.data?.sender === 'mytrabzonteam' && (
                      <VerifiedBadgeIcon size={16} style={styles.adminVerifiedBadge} />
                    )}
                    {/* Diğer bildirimlerde gönderen kişinin verified durumu */}
                    {item.data?.sender !== 'mytrabzonteam' && item.data?.sender_verified && (
                      <VerifiedBadgeIcon size={16} style={styles.adminVerifiedBadge} />
                    )}
                  </View>
                  {!item.read_at && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
                </View>
                <Text style={[styles.notificationMessage, { color: theme.colors.textLight }]} numberOfLines={3}>
                  {item.body || item.message}
                </Text>
                
                {/* Rezervasyon onay/red butonları */}
                {item.type === 'RESERVATION' && item.data?.type === 'RIDE_BOOKING' && item.data?.status === 'pending' && (
                  <View style={styles.reservationActions}>
                    <TouchableOpacity
                      style={[styles.approveButton, { backgroundColor: COLORS.success }]}
                      onPress={() => {
                        if (item.data?.booking_id) {
                          approveBookingMutation.mutate({ booking_id: item.data.booking_id });
                        }
                      }}
                      disabled={approveBookingMutation.isPending || rejectBookingMutation.isPending}
                    >
                      {approveBookingMutation.isPending ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Check size={16} color={COLORS.white} />
                          <Text style={styles.actionButtonText}>Onayla</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectButton, { backgroundColor: COLORS.error }]}
                      onPress={() => {
                        if (item.data?.booking_id) {
                          rejectBookingMutation.mutate({ booking_id: item.data.booking_id });
                        }
                      }}
                      disabled={approveBookingMutation.isPending || rejectBookingMutation.isPending}
                    >
                      {rejectBookingMutation.isPending ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <XCircle size={16} color={COLORS.white} />
                          <Text style={styles.actionButtonText}>Reddet</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Event medya önizlemesi */}
                {item.type === 'EVENT' && item.event?.media_urls && item.event.media_urls.length > 0 && (
                  <View style={styles.mediaPreview}>
                    {(() => {
                      const firstMedia = item.event.media_urls[0];
                      const isVideo = firstMedia?.match(/\.(mp4|mov|avi|webm)$/i);
                      
                      if (isVideo) {
                        return (
                          <Video
                            source={{ uri: firstMedia }}
                            style={styles.previewVideo}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isMuted={true}
                            useNativeControls={false}
                          />
                        );
                      } else {
                        return (
                          <Image
                            source={{ uri: firstMedia }}
                            style={styles.previewImage}
                            contentFit="cover"
                          />
                        );
                      }
                    })()}
                  </View>
                )}
                
                {/* Data'dan medya URL'leri kontrol et (fallback) */}
                {item.type === 'EVENT' && !item.event?.media_urls && item.data?.media_urls && item.data.media_urls.length > 0 && (
                  <View style={styles.mediaPreview}>
                    {(() => {
                      const firstMedia = item.data.media_urls[0];
                      const isVideo = firstMedia?.match(/\.(mp4|mov|avi|webm)$/i);
                      
                      if (isVideo) {
                        return (
                          <Video
                            source={{ uri: firstMedia }}
                            style={styles.previewVideo}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isMuted={true}
                            useNativeControls={false}
                          />
                        );
                      } else {
                        return (
                          <Image
                            source={{ uri: firstMedia }}
                            style={styles.previewImage}
                            contentFit="cover"
                          />
                        );
                      }
                    })()}
                  </View>
                )}
                
                <View style={styles.notificationFooter}>
                  <Text style={[styles.notificationTime, { color: theme.colors.textLight }]}>
                    {formatTimeAgo(item.created_at)}
                  </Text>
                  {item.event?.district && (
                    <Text style={[styles.notificationLocation, { color: theme.colors.textLight }]}>
                      • {item.event.district}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => {
                  if (menuVisible === item.id) {
                    setMenuVisible(null);
                  } else {
                    setMenuVisible(item.id);
                    Alert.alert(
                      'Bildirim İşlemleri',
                      'Ne yapmak istersiniz?',
                      [
                        {
                          text: item.read_at ? 'Okunmadı İşaretle' : 'Okundu İşaretle',
                          onPress: () => {
                            if (!item.read_at) {
                              markAsReadMutation.mutate({ notification_id: item.id });
                            }
                            setMenuVisible(null);
                          },
                        },
                        {
                          text: 'Sil',
                          style: 'destructive',
                          onPress: () => {
                            handleDelete(item.id);
                            setMenuVisible(null);
                          },
                        },
                        { text: 'İptal', style: 'cancel', onPress: () => setMenuVisible(null) },
                      ]
                    );
                  }
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MoreVertical size={18} color={theme.colors.textLight} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={48} color={theme.colors.textLight} />
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>Henüz bildirim yok</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>
                Yeni bildirimler burada görünecek
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <ScrollView>
        <Footer />
      </ScrollView>

      {/* Admin Bildirim Detay Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {selectedNotification?.data?.sender === 'mytrabzonteam' 
                    ? 'MyTrabzonTeam' 
                    : selectedNotification?.data?.sender_name || selectedNotification?.title}
                </Text>
                {/* Admin bildirimleri için mavi tik */}
                {selectedNotification?.type === 'SYSTEM' && selectedNotification?.data?.sender === 'mytrabzonteam' && (
                  <VerifiedBadgeIcon size={20} style={styles.modalVerifiedBadge} />
                )}
                {/* Diğer bildirimlerde gönderen kişinin verified durumu */}
                {selectedNotification?.data?.sender !== 'mytrabzonteam' && selectedNotification?.data?.sender_verified && (
                  <VerifiedBadgeIcon size={20} style={styles.modalVerifiedBadge} />
                )}
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalSubtitle, { color: theme.colors.text }]}>
                {selectedNotification?.title}
              </Text>
              
              <Text style={[styles.modalMessage, { color: theme.colors.textLight }]}>
                {selectedNotification?.body || selectedNotification?.message}
              </Text>

              {selectedNotification?.data?.mediaUrl && (
                <View style={styles.modalMediaContainer}>
                  <Image
                    source={{ uri: selectedNotification.data.mediaUrl }}
                    style={styles.modalMediaImage}
                    contentFit="cover"
                  />
                </View>
              )}

              <View style={styles.modalFooter}>
                <Text style={[styles.modalTime, { color: theme.colors.textLight }]}>
                  {selectedNotification?.created_at && formatTimeAgo(selectedNotification.created_at)}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseButtonBottom, { backgroundColor: theme.colors.primary }]}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <RideReviewModal
        visible={reviewModalVisible}
        onClose={() => {
          setReviewModalVisible(false);
          setReviewBookingId(null);
          setReviewedUserName('');
        }}
        bookingId={reviewBookingId || ''}
        reviewedUserName={reviewedUserName}
        onSuccess={() => {
          refetch();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionButton: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationUnread: {
    backgroundColor: COLORS.primary + '08',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    position: 'relative',
  },
  iconEmoji: {
    fontSize: 24,
  },
  severityDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  readCheck: {
    marginLeft: SPACING.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  notificationMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 4,
    lineHeight: 18,
  },
  mediaPreview: {
    width: '100%',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  previewVideo: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  notificationTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  notificationLocation: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  menuButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    padding: SPACING.xxl,
    paddingTop: SPACING.xxl * 3,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminVerifiedBadge: {
    marginLeft: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalVerifiedBadge: {
    marginLeft: SPACING.xs,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalBody: {
    padding: SPACING.md,
    maxHeight: 500,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  modalMediaContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalMediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  modalFooter: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  modalCloseButtonBottom: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  reservationActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
