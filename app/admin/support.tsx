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
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MessageSquare, CheckCircle2, XCircle, Clock, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';

export default function AdminSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed' | undefined>(undefined);

  const { data, isLoading, refetch } = trpc.admin.getSupportTickets.useQuery({
    status: selectedStatus,
    limit: 50,
    offset: 0,
  });

  const updateTicketMutation = trpc.admin.updateSupportTicket.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Ticket güncellendi');
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

  const handleStatusChange = (ticketId: string, newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    updateTicketMutation.mutate({
      ticketId,
      status: newStatus,
    });
  };

  const statusLabels: Record<string, string> = {
    open: 'Açık',
    in_progress: 'İşlemde',
    resolved: 'Çözüldü',
    closed: 'Kapatıldı',
  };

  const statusColors: Record<string, string> = {
    open: COLORS.warning,
    in_progress: COLORS.primary,
    resolved: COLORS.success,
    closed: COLORS.textLight,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Text style={styles.headerTitle}>Destek Ticket'ları</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterButton, !selectedStatus && styles.filterButtonActive]}
            onPress={() => setSelectedStatus(undefined)}
          >
            <Text style={[styles.filterButtonText, !selectedStatus && styles.filterButtonTextActive]}>Tümü</Text>
          </TouchableOpacity>
          {Object.entries(statusLabels).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterButton, selectedStatus === key && styles.filterButtonActive]}
              onPress={() => setSelectedStatus(key as any)}
            >
              <Text style={[styles.filterButtonText, selectedStatus === key && styles.filterButtonTextActive]}>
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
        {data?.tickets && data.tickets.length > 0 ? (
          data.tickets.map((ticket: any) => (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={styles.ticketUserInfo}>
                  <User size={20} color={COLORS.textLight} />
                  <Text style={styles.ticketUserName}>
                    {ticket.user?.full_name || 'İsimsiz Kullanıcı'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[ticket.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColors[ticket.status] }]}>
                    {statusLabels[ticket.status] || ticket.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.ticketMessage}>{ticket.message}</Text>

              {ticket.admin_response && (
                <View style={styles.adminResponseContainer}>
                  <Text style={styles.adminResponseLabel}>Admin Yanıtı:</Text>
                  <Text style={styles.adminResponseText}>{ticket.admin_response}</Text>
                </View>
              )}

              <View style={styles.ticketFooter}>
                <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                <View style={styles.ticketActions}>
                  {ticket.status === 'open' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.inProgressButton]}
                      onPress={() => handleStatusChange(ticket.id, 'in_progress')}
                    >
                      <Clock size={16} color={COLORS.primary} />
                      <Text style={styles.actionButtonText}>İşleme Al</Text>
                    </TouchableOpacity>
                  )}
                  {ticket.status === 'in_progress' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.resolveButton]}
                      onPress={() => handleStatusChange(ticket.id, 'resolved')}
                    >
                      <CheckCircle2 size={16} color={COLORS.success} />
                      <Text style={styles.actionButtonText}>Çözüldü</Text>
                    </TouchableOpacity>
                  )}
                  {ticket.status !== 'closed' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.closeButton]}
                      onPress={() => handleStatusChange(ticket.id, 'closed')}
                    >
                      <XCircle size={16} color={COLORS.textLight} />
                      <Text style={styles.actionButtonText}>Kapat</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Ticket bulunamadı</Text>
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
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  ticketCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ticketUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ticketUserName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  ticketSubject: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ticketMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  adminResponseContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  adminResponseLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  adminResponseText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ticketDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  ticketActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    borderWidth: 1,
  },
  inProgressButton: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  resolveButton: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  closeButton: {
    backgroundColor: COLORS.textLight + '20',
    borderColor: COLORS.textLight,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
});

