import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  ShieldCheck,
  MessageSquare,
  FileText,
  Building2,
  BarChart3,
  Ticket,
  Ban,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Gerçek verileri çek
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.admin.getStats.useQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  };

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const statCards = [
    {
      id: 'users',
      title: 'Toplam Kullanıcı',
      value: formatCount(stats?.totalUsers),
      icon: Users,
      color: COLORS.primary,
      route: '/admin/users',
    },
    {
      id: 'posts',
      title: 'Toplam Gönderi',
      value: formatCount(stats?.totalPosts),
      icon: MessageSquare,
      color: COLORS.secondary,
    },
    {
      id: 'banned',
      title: 'Banlı Kullanıcı',
      value: formatCount(stats?.bannedUsers),
      icon: Ban,
      color: COLORS.error,
      route: '/admin/users',
    },
    {
      id: 'blueTick',
      title: 'Mavi Tikli',
      value: formatCount(stats?.blueTickUsers),
      icon: ShieldCheck,
      color: COLORS.success,
      route: '/admin/users',
    },
    {
      id: 'todayReg',
      title: 'Bugünkü Kayıt',
      value: formatCount(stats?.todayRegistrations),
      icon: Users,
      color: COLORS.primary,
    },
    {
      id: 'todayReports',
      title: 'Bugünkü Şikayet',
      value: formatCount(stats?.todayReports),
      icon: AlertCircle,
      color: COLORS.warning,
    },
    {
      id: 'pendingTickets',
      title: 'Bekleyen Ticket',
      value: formatCount(stats?.pendingTickets),
      icon: Ticket,
      color: COLORS.warning,
      route: '/admin/support',
    },
    {
      id: 'pendingReports',
      title: 'Bekleyen Şikayet',
      value: formatCount(stats?.pendingReports),
      icon: AlertCircle,
      color: COLORS.error,
    },
  ];

  const quickActions = [
    {
      id: 'users',
      title: 'Kullanıcı Yönetimi',
      description: 'Kullanıcıları görüntüle, banla, mavi tik ver',
      icon: Users,
      route: '/admin/users',
      color: COLORS.primary,
    },
    {
      id: 'policies',
      title: 'Politika Yönetimi',
      description: 'Politikaları ekle, düzenle, sil',
      icon: FileText,
      route: '/admin/policies',
      color: COLORS.secondary,
    },
    {
      id: 'company',
      title: 'Şirket Bilgileri',
      description: 'Telefon, email, adres güncelle',
      icon: Building2,
      route: '/admin/company-info',
      color: COLORS.success,
    },
    {
      id: 'support',
      title: 'Destek Ticket\'ları',
      description: 'Ticket\'ları görüntüle ve yönet',
      icon: Ticket,
      route: '/admin/support',
      color: COLORS.warning,
    },
    {
      id: 'kyc',
      title: 'KYC Başvuruları',
      description: 'Kimlik doğrulama başvurularını incele',
      icon: Shield,
      route: '/admin/kyc',
      color: COLORS.primary,
    },
  ];

  if (statsLoading && !stats) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Paneli</Text>
        <Text style={styles.headerSubtitle}>Yönetim Dashboard</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* İstatistik Kartları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İstatistikler</Text>
          <View style={styles.statsGrid}>
            {statCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <TouchableOpacity
                  key={card.id}
                  style={styles.statCard}
                  onPress={card.route ? () => router.push(card.route as any) : undefined}
                  disabled={!card.route}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: card.color + '20' }]}>
                    <IconComponent size={24} color={card.color} />
                  </View>
                  <Text style={styles.statValue}>{card.value}</Text>
                  <Text style={styles.statLabel}>{card.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Hızlı Erişim */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          <View style={styles.quickActionsList}>
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionCard}
                  onPress={() => router.push(action.route as any)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                    <IconComponent size={28} color={action.color} />
                  </View>
                  <View style={styles.quickActionContent}>
                    <Text style={styles.quickActionTitle}>{action.title}</Text>
                    <Text style={styles.quickActionDescription}>{action.description}</Text>
                  </View>
                  <ArrowRight size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  quickActionsList: {
    gap: SPACING.md,
  },
  quickActionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  quickActionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
});
