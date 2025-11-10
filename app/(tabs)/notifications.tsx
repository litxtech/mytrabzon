import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';

export default function NotificationsScreen() {
  const { profile } = useAuth();

  const mockNotifications = [
    {
      id: '1',
      title: 'Hoş Geldin!',
      message: 'MyTrabzon ailesine katıldığın için teşekkürler',
      type: 'general',
      time: '2 sa önce',
      read: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bildirimler</Text>
      </View>

      <FlatList
        data={mockNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notificationItem, !item.read && styles.notificationUnread]}
          >
            <View style={styles.notificationIcon}>
              <Bell size={20} color={COLORS.primary} />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationMessage}>{item.message}</Text>
              <Text style={styles.notificationTime}>{item.time}</Text>
            </View>
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
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.primary,
  },
  notificationItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationUnread: {
    backgroundColor: '#F0F8FF',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: SPACING.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  emptyContainer: {
    padding: SPACING.xxl,
    paddingTop: SPACING.xxl * 3,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center' as const,
  },
});
