import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  ShieldCheck,
  MessageSquare,
  BadgeCheck,
  BarChart3,
  Settings,
  Filter,
  BellRing,
  Globe,
  CheckCircle2,
  XCircle,
  Ban,
  Clock3,
  ArrowRight,
  Radio
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const CARD_SCALE_ACTIVE = 1.04;
const CARD_SCALE_INACTIVE = 1;

const sectionBackgrounds = {
  users: ['#0f172a', '#1e293b'],
  verification: ['#0f766e', '#0ea5e9'],
  chat: ['#1d4ed8', '#7c3aed'],
  blueTick: ['#0f172a', '#1d4ed8'],
  analytics: ['#f97316', '#ec4899'],
  settings: ['#1f2937', '#111827'],
} as const;

type AdminQuickAction = {
  id: string;
  label: string;
  description: string;
  cta: string;
};

type AdminMetric = {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendPositive: boolean;
};

type AdminSection = {
  id: keyof typeof sectionBackgrounds;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  metrics: AdminMetric[];
  quickActions: AdminQuickAction[];
  highlights: string[];
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<AdminSection['id']>('users');
  const scaleAnimation = useRef<Record<AdminSection['id'], Animated.Value>>({
    users: new Animated.Value(CARD_SCALE_ACTIVE),
    verification: new Animated.Value(CARD_SCALE_INACTIVE),
    chat: new Animated.Value(CARD_SCALE_INACTIVE),
    blueTick: new Animated.Value(CARD_SCALE_INACTIVE),
    analytics: new Animated.Value(CARD_SCALE_INACTIVE),
    settings: new Animated.Value(CARD_SCALE_INACTIVE),
  }).current;

  const sections = useMemo<AdminSection[]>(() => [
    {
      id: 'users',
      title: 'Kullanıcı Yönetimi',
      subtitle: 'Topluluğun nabzını tutun ve kritik aksiyonları hızla alın.',
      icon: Users,
      metrics: [
        { id: 'totalUsers', label: 'Toplam Kullanıcı', value: '18.452', trend: '+3.4% haftalık', trendPositive: true },
        { id: 'verified', label: 'Doğrulanmış', value: '2.310', trend: '+12 yeni', trendPositive: true },
        { id: 'blocked', label: 'Blokeli', value: '87', trend: '−4 bugün', trendPositive: true },
      ],
      quickActions: [
        { id: 'listAll', label: 'Tüm Kullanıcıları Listele', description: 'Detaylı filtreleme ve segmentleme araçları', cta: 'Yönet' },
        { id: 'manualApprove', label: 'Manuel Doğrula/Reddet', description: 'Bekleyen kullanıcı doğrulamalarını tamamlayın', cta: 'Aksiyon Al' },
        { id: 'blockUser', label: 'Kullanıcıyı Engelle', description: 'Geçici veya kalıcı erişim kısıtlama', cta: 'Engelle' },
      ],
      highlights: [
        'Aktif kullanıcı oranı %78 ile yüksek performans gösteriyor.',
        'Toplu bildirim göndermek için segment filtresini kullanın.',
      ],
    },
    {
      id: 'verification',
      title: 'Kimlik Doğrulama',
      subtitle: 'Kimlik süreçlerini tek ekrandan takip edin ve yönetin.',
      icon: ShieldCheck,
      metrics: [
        { id: 'pendingVerifications', label: 'Bekleyen Başvuru', value: '56', trend: '48 saat içinde', trendPositive: false },
        { id: 'verifiedUsers', label: 'Doğrulanmış Kullanıcı', value: '2.310', trend: '+22 bugün', trendPositive: true },
        { id: 'rejected', label: 'Reddedilen', value: '14', trend: '−2 hafta', trendPositive: true },
      ],
      quickActions: [
        { id: 'pendingQueue', label: 'Bekleyen Başvurular', description: 'Kimlik ve selfie eşleştirmesini gözden geçirin', cta: 'İncele' },
        { id: 'aiAssist', label: 'AI Destekli İnceleme', description: 'Otomatik önerileri gözden geçirip onaylayın', cta: 'Başlat' },
        { id: 'manualReview', label: 'Manuel İnceleme', description: 'Riskli dosyaları detaylı kontrol edin', cta: 'İncele' },
      ],
      highlights: [
        'Risk motoru: %12 başvuru manuel inceleme gerektiriyor.',
        'Kimlik + selfie eşleşmesinde başarı oranı %94.',
      ],
    },
    {
      id: 'chat',
      title: 'Sohbet & Mesaj Moderasyonu',
      subtitle: 'Odaları, üyelikleri ve mesaj akışlarını güvenli tutun.',
      icon: MessageSquare,
      metrics: [
        { id: 'rooms', label: 'Aktif Oda', value: '142', trend: '+8 bugün', trendPositive: true },
        { id: 'reports', label: 'Raporlanan Mesaj', value: '23', trend: '+4 saatlik', trendPositive: false },
        { id: 'closures', label: 'Kapatılan Oda', value: '3', trend: '0 bugün', trendPositive: true },
      ],
      quickActions: [
        { id: 'roomsOverview', label: 'Oda Kontrol Paneli', description: 'Üyelikleri yönetin ve izinleri düzenleyin', cta: 'Aç' },
        { id: 'moderateMessages', label: 'Mesajları Modere Et', description: 'Spam ve uygunsuz içerikleri temizleyin', cta: 'Moderasyon' },
        { id: 'spamReports', label: 'Rapor Havuzu', description: 'Topluluk bildirimlerini hızla değerlendirin', cta: 'Kontrol Et' },
      ],
      highlights: [
        'Otomatik spam filtresi bu hafta %18 daha fazla mesaj yakaladı.',
        'Topluluk standartları rehberini güncel tutun.',
      ],
    },
    {
      id: 'blueTick',
      title: 'Mavi Tik Sistemi',
      subtitle: 'Güven skorlarını, süreleri ve otomasyon kurallarını yönetin.',
      icon: BadgeCheck,
      metrics: [
        { id: 'eligible', label: 'Uygun Aday', value: '482', trend: '+31 potansiyel', trendPositive: true },
        { id: 'expiring', label: 'Süresi Dolacak', value: '19', trend: '7 gün içinde', trendPositive: false },
        { id: 'autoApproved', label: 'Otomatik Onay', value: '68%', trend: '+5 puan', trendPositive: true },
      ],
      quickActions: [
        { id: 'ruleEngine', label: 'Kural Motoru', description: 'Otomatik doğrulama koşullarını güncelleyin', cta: 'Düzenle' },
        { id: 'scoreboard', label: 'Güven Skoru Paneli', description: 'Davranış + kimlik metriklerini birleştirin', cta: 'Analiz' },
        { id: 'manualAssign', label: 'Manuel Tik Atama', description: 'Özel hesaplar için yöneticiden onay verin', cta: 'Atayın' },
      ],
      highlights: [
        'Mavi tik yenilemesi için hatırlatma e-postaları planlandı.',
        'Yeni AI destekli risk kuralı devrede.',
      ],
    },
    {
      id: 'analytics',
      title: 'Raporlama & Analitik',
      subtitle: 'Yetkilendirilmiş raporlarla performansı izleyin.',
      icon: BarChart3,
      metrics: [
        { id: 'dailyActive', label: 'Günlük Aktif', value: '6.324', trend: '+9% günlük', trendPositive: true },
        { id: 'conversion', label: 'Doğrulama Başarı', value: '74%', trend: '+3 puan', trendPositive: true },
        { id: 'latency', label: 'API Yanıt Süresi', value: '220ms', trend: '−18ms', trendPositive: true },
      ],
      quickActions: [
        { id: 'realtime', label: 'Canlı Gösterge Paneli', description: 'Son 24 saati inceleyin', cta: 'İzle' },
        { id: 'export', label: 'CSV / PDF Dışa Aktar', description: 'Tüm metrikleri paylaşılabilir formatta alın', cta: 'Dışa Aktar' },
        { id: 'logs', label: 'Hata Logları', description: 'Performans sorunlarını yakından izleyin', cta: 'İncele' },
      ],
      highlights: [
        'Yeni risk skor raporu hazır: litxtech.com/risk üzerinden erişilebilir.',
        'Trendler sekmesi, haftalık bazda otomatik güncelleniyor.',
      ],
    },
    {
      id: 'settings',
      title: 'Sistem Ayarları',
      subtitle: 'Bildirimlerden bakım moduna kadar tüm yapı taşları.',
      icon: Settings,
      metrics: [
        { id: 'templates', label: 'E-posta Şablonu', value: '12 aktif', trend: '2 taslak', trendPositive: true },
        { id: 'maintenance', label: 'Bakım Planı', value: 'Aktif değil', trend: 'Son bakım 12g', trendPositive: true },
        { id: 'apiKeys', label: 'API Anahtarı', value: '5 entegre', trend: '+1 hafta', trendPositive: true },
      ],
      quickActions: [
        { id: 'brand', label: 'Uygulama Bilgileri', description: 'Marka kimliği ve meta verileri güncelleyin', cta: 'Güncelle' },
        { id: 'notifications', label: 'Bildirim Ayarları', description: 'Email, push ve SMS senaryolarını düzenleyin', cta: 'Konfigüre' },
        { id: 'maintenanceToggle', label: 'Bakım Modu', description: 'Sistem duyurularını zamanlayın', cta: 'Yönet' },
      ],
      highlights: [
        'API anahtarı rotasyonu için hatırlatıcı planlandı.',
        'Yeni domain yönlendirmesi litxtech.com/risk olarak aktif.',
      ],
    },
  ], []);

  useEffect(() => {
    console.log('📊 Admin dashboard initialized with sections:', sections.map((section) => section.id));
  }, [sections]);

  useEffect(() => {
    console.log('🎯 Selected admin section changed:', selectedSectionId);
  }, [selectedSectionId]);

  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length === 0) {
      return sections;
    }
    return sections.filter((section) => section.title.toLowerCase().includes(term) || section.quickActions.some((action) => action.label.toLowerCase().includes(term)));
  }, [search, sections]);

  const selectedSection = useMemo(() => sections.find((section) => section.id === selectedSectionId) ?? sections[0], [sections, selectedSectionId]);
  const SelectedIcon = selectedSection.icon;

  useEffect(() => {
    Object.entries(scaleAnimation).forEach(([key, value]) => {
      const typedKey = key as AdminSection['id'];
      const targetScale = typedKey === selectedSectionId ? CARD_SCALE_ACTIVE : CARD_SCALE_INACTIVE;
      Animated.spring(value, {
        toValue: targetScale,
        useNativeDriver: true,
        friction: 7,
        tension: 90,
      }).start();
    });
  }, [selectedSectionId, scaleAnimation]);

  const handleSelectSection = useCallback((id: AdminSection['id']) => {
    console.log('🧭 Admin section tapped:', id);
    setSelectedSectionId(id);
  }, []);

  const handleQuickAction = useCallback((action: AdminQuickAction, sectionId: AdminSection['id']) => {
    console.log('⚡ Quick action triggered:', action.id, 'from section:', sectionId);
    alert(`${action.label} özelliği yakında burada olacak.`);
  }, []);

  const handleSyncSnapshot = useCallback(async () => {
    try {
      console.log('🔄 Risk domain snapshot syncing...');
      const { data, error } = await supabase.rpc('fetch_admin_snapshot');
      if (error) {
        console.log('⚠️ Snapshot fetch error:', error.message);
        alert('Risk verilerini çekerken bir sorun oluştu');
        return;
      }
      console.log('✅ Snapshot fetched:', data);
      alert('Sistem verileri güncellendi');
    } catch (error) {
      console.log('💥 Snapshot sync failure:', error);
      alert('Veri yenileme başarısız oldu');
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="admin-dashboard-root">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#020617', '#0f172a']} style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <Radio size={18} color={COLORS.white} />
              <Text style={styles.heroBadgeText}>MyTrabzon Yönetim Katmanı</Text>
            </View>
            <TouchableOpacity onPress={handleSyncSnapshot} style={styles.syncButton} testID="admin-dashboard-sync-button">
              <BellRing size={18} color={COLORS.white} />
              <Text style={styles.syncButtonText}>Anlık Risk Snapshot</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>Admin Paneli · litxtech.com/risk</Text>
          <Text style={styles.heroSubtitle}>Trabzon’un dijital sesini güvenle yönetmek için sezgisel bir yönetim alanı.</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Users size={22} color={COLORS.white} />
              <Text style={styles.heroStatValue}>18.452</Text>
              <Text style={styles.heroStatLabel}>Toplam Kullanıcı</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <ShieldCheck size={22} color={COLORS.white} />
              <Text style={styles.heroStatValue}>2.310</Text>
              <Text style={styles.heroStatLabel}>Doğrulanmış Hesap</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <MessageSquare size={22} color={COLORS.white} />
              <Text style={styles.heroStatValue}>142</Text>
              <Text style={styles.heroStatLabel}>Aktif Sohbet Odası</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.searchSection}>
          <View style={styles.searchLabel}>
            <Filter size={18} color={COLORS.text} />
            <Text style={styles.sectionHeading}>Panoda Ara</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Kullanıcı yönetimi, mavi tik, raporlama..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={setSearch}
            testID="admin-dashboard-search-input"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionTabs}
          testID="admin-dashboard-section-tabs"
        >
          {filteredSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <AnimatedTouchable
                key={section.id}
                style={[styles.sectionTab, selectedSectionId === section.id && styles.sectionTabActive, { transform: [{ scale: scaleAnimation[section.id] }] }]}
                onPress={() => handleSelectSection(section.id)}
                testID={`admin-dashboard-section-tab-${section.id}`}
              >
                <IconComponent size={20} color={selectedSectionId === section.id ? COLORS.white : COLORS.text} />
                <Text style={[styles.sectionTabText, selectedSectionId === section.id && styles.sectionTabTextActive]}>
                  {section.title}
                </Text>
              </AnimatedTouchable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionContent} testID={`admin-dashboard-section-${selectedSection.id}`}>
          <LinearGradient colors={sectionBackgrounds[selectedSection.id]} style={styles.sectionHero}>
            <View style={styles.sectionHeroHeader}>
              <SelectedIcon size={28} color={COLORS.white} />
              <Text style={styles.sectionHeroTitle}>{selectedSection.title}</Text>
            </View>
            <Text style={styles.sectionHeroSubtitle}>{selectedSection.subtitle}</Text>
            <View style={styles.sectionHeroHighlights}>
              {selectedSection.highlights.map((highlight) => (
                <View key={highlight} style={styles.highlightRow}>
                  <Globe size={16} color={COLORS.white} />
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <View style={styles.metricsGrid}>
            {selectedSection.metrics.map((metric) => (
              <View key={metric.id} style={styles.metricCard} testID={`admin-dashboard-metric-${metric.id}`}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <View style={styles.metricTrend}>
                  {metric.trendPositive ? (
                    <CheckCircle2 size={16} color={COLORS.success} />
                  ) : (
                    <XCircle size={16} color={COLORS.warning} />
                  )}
                  <Text style={[styles.metricTrendText, metric.trendPositive ? styles.trendPositive : styles.trendNegative]}>
                    {metric.trend}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.quickActions}>
            {selectedSection.quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => handleQuickAction(action, selectedSection.id)}
                testID={`admin-dashboard-action-${action.id}`}
              >
                <View style={styles.actionHeader}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <ArrowRight size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.actionDescription}>{action.description}</Text>
                <View style={styles.actionFooter}>
                  <Clock3 size={16} color={COLORS.secondary} />
                  <Text style={styles.actionCta}>{action.cta}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statusBoard}>
            <View style={styles.statusCard} testID="admin-dashboard-status-risk">
              <View style={styles.statusIcon}>
                <ShieldCheck size={22} color={COLORS.white} />
              </View>
              <View style={styles.statusContent}>
                <Text style={styles.statusTitle}>Risk İzleme</Text>
                <Text style={styles.statusSubtitle}>litxtech.com/risk endpointi aktif. Son senkronizasyon 8 dk önce.</Text>
              </View>
              <TouchableOpacity style={styles.statusAction} onPress={handleSyncSnapshot}>
                <Text style={styles.statusActionText}>Yenile</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statusCard} testID="admin-dashboard-status-violations">
              <View style={[styles.statusIcon, styles.statusIconWarning]}>
                <Ban size={22} color={COLORS.white} />
              </View>
              <View style={styles.statusContent}>
                <Text style={styles.statusTitle}>Politika İhlalleri</Text>
                <Text style={styles.statusSubtitle}>Son 24 saatte 23 raporlandı, 7’si çözüme kavuştu.</Text>
              </View>
              <TouchableOpacity style={styles.statusActionMuted} onPress={() => alert('Moderasyon rapor havuzu yakında.')}>
                <Text style={styles.statusActionTextMuted}>İncele</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  hero: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: SPACING.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(59,130,246,0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
  },
  syncButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderRadius: 18,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  heroStat: {
    alignItems: 'center',
    gap: 4,
  },
  heroStatValue: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: FONT_SIZES.sm,
  },
  heroDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  searchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionHeading: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#111a2c',
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: Platform.OS === 'web' ? SPACING.sm : SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
  },
  sectionTabs: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTab: {
    backgroundColor: '#0f172a',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTabActive: {
    backgroundColor: COLORS.primary,
  },
  sectionTabText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: COLORS.white,
  },
  sectionContent: {
    marginTop: SPACING.lg,
    gap: SPACING.lg,
  },
  sectionHero: {
    marginHorizontal: SPACING.lg,
    borderRadius: 24,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionHeroTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  sectionHeroSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  sectionHeroHighlights: {
    gap: SPACING.xs,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  highlightText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  metricCard: {
    flexBasis: '48%',
    backgroundColor: '#0b1220',
    borderRadius: 20,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  metricLabel: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  metricValue: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '700',
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metricTrendText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  trendPositive: {
    color: COLORS.success,
  },
  trendNegative: {
    color: COLORS.warning,
  },
  quickActions: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionCta: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  statusBoard: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  statusCard: {
    backgroundColor: '#0b1220',
    borderRadius: 20,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconWarning: {
    backgroundColor: COLORS.warning,
  },
  statusContent: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  statusSubtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  statusAction: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
  },
  statusActionText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statusActionMuted: {
    backgroundColor: 'rgba(148,163,184,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
  },
  statusActionTextMuted: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});