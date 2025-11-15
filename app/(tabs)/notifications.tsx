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
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Trash2, Check, X, Filter } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import { formatTimeAgo } from '@/lib/time-utils';
import { Footer } from '@/components/Footer';

type NotificationType = 'EVENT' | 'SYSTEM' | 'MESSAGE' | 'RESERVATION' | 'FOOTBALL' | 'all';

export default function NotificationsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType>('all');

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

    // Bildirim tipine göre yönlendir
    if (notification.type === 'EVENT' && notification.event_id) {
      router.push(`/event/${notification.event_id}` as any);
    } else if (notification.type === 'MESSAGE' && notification.data?.room_id) {
      router.push(`/chat/${notification.data.room_id}` as any);
    } else if (notification.type === 'RESERVATION' && notification.data?.match_id) {
      router.push(`/football/match/${notification.data.match_id}` as any);
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVENT':
        return '🔔';
      case 'MESSAGE':
        return '💬';
      case 'RESERVATION':
        return '📅';
      case 'FOOTBALL':
        return '⚽';
      default:
        return '📢';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL':
        return COLORS.error;
      case 'HIGH':
        return COLORS.warning;
      case 'NORMAL':
        return COLORS.primary;
      default:
        return COLORS.textLight;
    }
  };

  const notifications = notificationsData?.notifications || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount && unreadCount.count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount.count}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              const types: NotificationType[] = ['all', 'EVENT', 'MESSAGE', 'RESERVATION', 'FOOTBALL', 'SYSTEM'];
              const currentIndex = types.indexOf(filterType);
              const nextIndex = (currentIndex + 1) % types.length;
              setFilterType(types[nextIndex]);
            }}
          >
            <Filter size={18} color={COLORS.primary} />
            <Text style={styles.filterText}>
              {filterType === 'all' ? 'Tümü' : filterType}
            </Text>
          </TouchableOpacity>
          
          {notifications.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDeleteAll}
                disabled={deleteAllNotificationsMutation.isPending}
              >
                <Trash2 size={18} color={COLORS.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.notificationItem,
                !item.read_at && styles.notificationUnread,
              ]}
              onPress={() => handleNotificationPress(item)}
              onLongPress={() => handleDelete(item.id)}
            >
              <View style={styles.notificationIcon}>
                <Text style={styles.iconEmoji}>{getNotificationIcon(item.type)}</Text>
                {item.event?.severity && (
                  <View style={[styles.severityDot, { backgroundColor: getSeverityColor(item.event.severity) }]} />
                )}
              </View>
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={[
                    styles.notificationTitle,
                    !item.read_at && styles.notificationTitleUnread,
                  ]}>
                    {item.title}
                  </Text>
                  {!item.read_at && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {item.body}
                </Text>
                <View style={styles.notificationFooter}>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(item.created_at)}
                  </Text>
                  {item.event?.district && (
                    <Text style={styles.notificationLocation}>
                      • {item.event.district}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Henüz bildirim yok</Text>
              <Text style={styles.emptySubtext}>
                Yeni bildirimler burada görünecek
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <ScrollView>
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
  deleteButton: {
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
});
