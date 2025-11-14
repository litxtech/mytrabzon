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
import { useRouter, Stack } from 'expo-router';
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
  ArrowLeft,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function GiresunUniversityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Öğrenci bilgilerini getir (KTÜ backend'i kullanılabilir, aynı yapı)
  const { data: studentInfo, isLoading: studentLoading, refetch: refetchStudent } = trpc.ktu.getStudentInfo.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchStudent();
    setRefreshing(false);
  };

  const renderVerificationStatus = () => {
    if (studentLoading) {
      return (
        <View style={styles.statusCard}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }

    if (!studentInfo) {
      return (
        <View style={[styles.statusCard, styles.statusCardPending]}>
          <AlertCircle size={24} color={COLORS.warning} />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Öğrenci Doğrulaması Gerekli</Text>
            <Text style={styles.statusDescription}>
              Giresun Üniversitesi öğrencisi olduğunuzu doğrulayın
            </Text>
          </View>
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => router.push('/ktu/verify' as any)}
          >
            <Text style={styles.verifyButtonText}>Doğrula</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const isVerified = studentInfo.verification_status === 'verified';
    const isPending = studentInfo.verification_status === 'pending';
    const isRejected = studentInfo.verification_status === 'rejected';

    return (
      <View
        style={[
          styles.statusCard,
          isVerified && styles.statusCardVerified,
          isPending && styles.statusCardPending,
          isRejected && styles.statusCardRejected,
        ]}
      >
        {isVerified ? (
          <CheckCircle size={24} color={COLORS.success} />
        ) : isPending ? (
          <Clock size={24} color={COLORS.warning} />
        ) : (
          <AlertCircle size={24} color={COLORS.error} />
        )}
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>
            {isVerified
              ? 'Doğrulandı'
              : isPending
              ? 'Doğrulama Bekleniyor'
              : 'Doğrulama Reddedildi'}
          </Text>
          <Text style={styles.statusDescription}>
            {isVerified
              ? `Fakülte: ${studentInfo.faculty?.name || 'Bilinmiyor'}`
              : isPending
              ? 'Doğrulama işleminiz inceleniyor'
              : 'Lütfen tekrar başvurun'}
          </Text>
        </View>
      </View>
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
          <Bell size={24} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Duyurular</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/ktu/events' as any)}
        >
          <Calendar size={24} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Etkinlikler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/ktu/clubs' as any)}
        >
          <Users size={24} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Kulüpler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/ktu/notes' as any)}
        >
          <FileText size={24} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Ders Notları</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <GraduationCap size={32} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Giresun Üniversitesi</Text>
          <Text style={styles.headerSubtitle}>Üniversite Topluluğu</Text>
        </View>

        {/* Verification Status */}
        {renderVerificationStatus()}

        {/* Quick Actions */}
        {renderQuickActions()}
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
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
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
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  verifyButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  quickActionsContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quickActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
});

