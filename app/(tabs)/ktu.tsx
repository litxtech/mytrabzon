import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GraduationCap,
  Bell,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function KTUScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Öğrenci bilgilerini getir
  const { data: studentInfo, isLoading: studentLoading, refetch: refetchStudent } = trpc.ktu.getStudentInfo.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  // Son duyuruları getir
  const { data: announcementsData, isLoading: announcementsLoading, refetch: refetchAnnouncements } = trpc.ktu.getAnnouncements.useQuery({
    limit: 5,
    offset: 0,
  });

  // Yaklaşan etkinlikleri getir
  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = trpc.ktu.getEvents.useQuery({
    limit: 5,
    offset: 0,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStudent(),
      refetchAnnouncements(),
      refetchEvents(),
    ]);
    setRefreshing(false);
  };

  const renderVerificationStatus = () => {
    if (!user) return null;

    if (studentLoading) {
      return (
        <View style={[styles.statusCard, { backgroundColor: theme.colors.card }]}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.statusText, { color: theme.colors.text }]}>Yükleniyor...</Text>
        </View>
      );
    }

    if (!studentInfo) {
      return (
        <TouchableOpacity
          style={[styles.statusCard, styles.statusCardPending, { backgroundColor: theme.colors.card }]}
          onPress={() => router.push('/ktu/verify' as any)}
        >
          <AlertCircle size={24} color={theme.colors.warning} />
          <View style={styles.statusContent}>
            <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Öğrenci Doğrulaması Gerekli</Text>
            <Text style={[styles.statusDescription, { color: theme.colors.textLight }]}>
              KTÜ özelliklerini kullanmak için öğrenci doğrulaması yapın
            </Text>
          </View>
          <ArrowRight size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      );
    }

    const status = studentInfo.verification_status;
    if (status === 'verified') {
      return (
        <View style={[styles.statusCard, styles.statusCardVerified, { backgroundColor: theme.colors.card }]}>
          <CheckCircle size={24} color={theme.colors.success} />
          <View style={styles.statusContent}>
            <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Doğrulanmış Öğrenci</Text>
            <Text style={[styles.statusDescription, { color: theme.colors.textLight }]}>
              {studentInfo.faculty?.name} - {studentInfo.department?.name}
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'pending') {
      return (
        <View style={[styles.statusCard, styles.statusCardPending, { backgroundColor: theme.colors.card }]}>
          <Clock size={24} color={theme.colors.warning} />
          <View style={styles.statusContent}>
            <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Doğrulama Bekleniyor</Text>
            <Text style={[styles.statusDescription, { color: theme.colors.textLight }]}>
              Başvurunuz inceleniyor, lütfen bekleyin
            </Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.statusCard, styles.statusCardRejected, { backgroundColor: theme.colors.card }]}
        onPress={() => router.push('/ktu/verify' as any)}
      >
        <AlertCircle size={24} color={theme.colors.error} />
        <View style={styles.statusContent}>
          <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Doğrulama Reddedildi</Text>
          <Text style={[styles.statusDescription, { color: theme.colors.textLight }]}>
            Tekrar başvuru yapabilirsiniz
          </Text>
        </View>
        <ArrowRight size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    );
  };

  const renderQuickActions = () => (
    <View style={[styles.quickActionsContainer, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Hızlı Erişim</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => router.push('/ktu/announcements' as any)}
        >
          <Bell size={28} color={theme.colors.primary} />
          <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Duyurular</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => router.push('/ktu/events' as any)}
        >
          <Calendar size={28} color={theme.colors.primary} />
          <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Etkinlikler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => router.push('/ktu/clubs' as any)}
        >
          <Users size={28} color={theme.colors.primary} />
          <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Kulüpler</Text>
        </TouchableOpacity>

        {studentInfo?.verification_status === 'verified' && (
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => router.push('/ktu/notes' as any)}
          >
            <FileText size={28} color={theme.colors.primary} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Ders Notları</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAnnouncements = () => {
    if (announcementsLoading) {
      return (
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Son Duyurular</Text>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }

    const announcements = announcementsData?.announcements || [];

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Son Duyurular</Text>
          {announcements.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/ktu/announcements' as any)}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>Tümünü Gör</Text>
            </TouchableOpacity>
          )}
        </View>
        {announcements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textLight }]}>Henüz duyuru yok</Text>
          </View>
        ) : (
          announcements.slice(0, 3).map((announcement: any) => (
            <TouchableOpacity
              key={announcement.id}
              style={[styles.announcementCard, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
              onPress={() => router.push(`/ktu/announcements/${announcement.id}` as any)}
            >
              <View style={styles.announcementContent}>
                {announcement.is_pinned && (
                  <View style={[styles.pinnedBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.pinnedText, { color: theme.colors.primary }]}>Sabitlenmiş</Text>
                  </View>
                )}
                <Text style={[styles.announcementTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {announcement.title}
                </Text>
                <Text style={[styles.announcementDate, { color: theme.colors.textLight }]}>
                  {new Date(announcement.created_at).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <ArrowRight size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  const renderEvents = () => {
    if (eventsLoading) {
      return (
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Yaklaşan Etkinlikler</Text>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }

    const events = eventsData?.events || [];

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Yaklaşan Etkinlikler</Text>
          {events.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/ktu/events' as any)}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>Tümünü Gör</Text>
            </TouchableOpacity>
          )}
        </View>
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textLight }]}>Yaklaşan etkinlik yok</Text>
          </View>
        ) : (
          events.slice(0, 3).map((event: any) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventCard, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
              onPress={() => router.push(`/ktu/events/${event.id}` as any)}
            >
              <View style={styles.eventContent}>
                <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {event.title}
                </Text>
                <Text style={[styles.eventDate, { color: theme.colors.textLight }]}>
                  {new Date(event.start_date).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                {event.location && (
                  <Text style={[styles.eventLocation, { color: theme.colors.textLight }]} numberOfLines={1}>
                    📍 {event.location}
                  </Text>
                )}
              </View>
              <ArrowRight size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <GraduationCap size={32} color={theme.colors.primary} />
          <View style={styles.universitySelector}>
            <TouchableOpacity
              style={[styles.universityButton, styles.universityButtonActive, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.universityButtonText, styles.universityButtonTextActive, { color: COLORS.white }]}>
                KTÜ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.universityButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/university/giresun' as any)}
            >
              <Text style={[styles.universityButtonText, { color: theme.colors.text }]}>
                Giresun Üniversitesi
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textLight }]}>Karadeniz Teknik Üniversitesi</Text>
        </View>

        {/* Verification Status */}
        {renderVerificationStatus()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Announcements */}
        {renderAnnouncements()}

        {/* Events */}
        {renderEvents()}
      </ScrollView>
    </View>
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
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  universitySelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  universityButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  universityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  universityButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  universityButtonTextActive: {
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    margin: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.md,
  },
  statusCardVerified: {
    borderColor: COLORS.success,
    backgroundColor: '#F1F8F4',
  },
  statusCardPending: {
    borderColor: COLORS.warning,
    backgroundColor: '#FFF8E1',
  },
  statusCardRejected: {
    borderColor: COLORS.error,
    backgroundColor: '#FFEBEE',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statusDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  quickActionsContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
  },
  section: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  quickActionCard: {
    width: '47%',
    aspectRatio: 1.2,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  announcementContent: {
    flex: 1,
  },
  pinnedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  pinnedText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  announcementTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  announcementDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  eventDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  eventLocation: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
});

