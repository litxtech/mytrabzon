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
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function KTUScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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
        <View style={styles.statusCard}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>Yükleniyor...</Text>
        </View>
      );
    }

    if (!studentInfo) {
      return (
        <TouchableOpacity
          style={[styles.statusCard, styles.statusCardPending]}
          onPress={() => router.push('/ktu/verify' as any)}
        >
          <AlertCircle size={24} color={COLORS.warning} />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Öğrenci Doğrulaması Gerekli</Text>
            <Text style={styles.statusDescription}>
              KTÜ özelliklerini kullanmak için öğrenci doğrulaması yapın
            </Text>
          </View>
          <ArrowRight size={20} color={COLORS.primary} />
        </TouchableOpacity>
      );
    }

    const status = studentInfo.verification_status;
    if (status === 'verified') {
      return (
        <View style={[styles.statusCard, styles.statusCardVerified]}>
          <CheckCircle size={24} color={COLORS.success} />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Doğrulanmış Öğrenci</Text>
            <Text style={styles.statusDescription}>
              {studentInfo.faculty?.name} - {studentInfo.department?.name}
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'pending') {
      return (
        <View style={[styles.statusCard, styles.statusCardPending]}>
          <Clock size={24} color={COLORS.warning} />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Doğrulama Bekleniyor</Text>
            <Text style={styles.statusDescription}>
              Başvurunuz inceleniyor, lütfen bekleyin
            </Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.statusCard, styles.statusCardRejected]}
        onPress={() => router.push('/ktu/verify' as any)}
      >
        <AlertCircle size={24} color={COLORS.error} />
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>Doğrulama Reddedildi</Text>
          <Text style={styles.statusDescription}>
            Tekrar başvuru yapabilirsiniz
          </Text>
        </View>
        <ArrowRight size={20} color={COLORS.primary} />
      </TouchableOpacity>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/ktu/announcements' as any)}
        >
          <Bell size={28} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Duyurular</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/ktu/events' as any)}
        >
          <Calendar size={28} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Etkinlikler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/ktu/clubs' as any)}
        >
          <Users size={28} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Kulüpler</Text>
        </TouchableOpacity>

        {studentInfo?.verification_status === 'verified' && (
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/ktu/notes' as any)}
          >
            <FileText size={28} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Ders Notları</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAnnouncements = () => {
    if (announcementsLoading) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Son Duyurular</Text>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }

    const announcements = announcementsData?.announcements || [];

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Duyurular</Text>
          {announcements.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/ktu/announcements' as any)}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          )}
        </View>
        {announcements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz duyuru yok</Text>
          </View>
        ) : (
          announcements.slice(0, 3).map((announcement: any) => (
            <TouchableOpacity
              key={announcement.id}
              style={styles.announcementCard}
              onPress={() => router.push(`/ktu/announcements/${announcement.id}` as any)}
            >
              <View style={styles.announcementContent}>
                {announcement.is_pinned && (
                  <View style={styles.pinnedBadge}>
                    <Text style={styles.pinnedText}>Sabitlenmiş</Text>
                  </View>
                )}
                <Text style={styles.announcementTitle} numberOfLines={2}>
                  {announcement.title}
                </Text>
                <Text style={styles.announcementDate}>
                  {new Date(announcement.created_at).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <ArrowRight size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  const renderEvents = () => {
    if (eventsLoading) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }

    const events = eventsData?.events || [];

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
          {events.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/ktu/events' as any)}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          )}
        </View>
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Yaklaşan etkinlik yok</Text>
          </View>
        ) : (
          events.slice(0, 3).map((event: any) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/ktu/events/${event.id}` as any)}
            >
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                <Text style={styles.eventDate}>
                  {new Date(event.start_date).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                {event.location && (
                  <Text style={styles.eventLocation} numberOfLines={1}>
                    📍 {event.location}
                  </Text>
                )}
              </View>
              <ArrowRight size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <GraduationCap size={32} color={COLORS.primary} />
          <View style={styles.universitySelector}>
            <TouchableOpacity
              style={[styles.universityButton, styles.universityButtonActive]}
            >
              <Text style={[styles.universityButtonText, styles.universityButtonTextActive]}>
                KTÜ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.universityButton}
              onPress={() => router.push('/university/giresun' as any)}
            >
              <Text style={styles.universityButtonText}>
                Giresun Üniversitesi
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Karadeniz Teknik Üniversitesi</Text>
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

