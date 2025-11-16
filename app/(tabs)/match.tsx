/**
 * Görüntülü Eşleşme Ekranı
 * Hızlı görüntülü eşleşme sistemi
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Video, VideoOff, Mic, MicOff, X, Sparkles, Shield, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Footer } from '@/components/Footer';

export default function MatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [isMatching, setIsMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [cameraReady, setCameraReady] = useState(true);
  const [micReady, setMicReady] = useState(true);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const joinQueueMutation = trpc.match.joinQueue.useMutation({
    onSuccess: (data) => {
      if (data.matched && data.session?.id) {
        setMatchStatus('matched');
        setIsMatching(false);
        // Görüntülü görüşme ekranına yönlendir
        router.push(`/match/video/${data.session.id}` as any);
      } else if (data.matched && !data.session?.id) {
        // Eşleşme var ama session yok - hata
        setIsMatching(false);
        setMatchStatus('idle');
        Alert.alert('Hata', 'Eşleşme oturumu oluşturulamadı');
      } else {
        setMatchStatus('searching');
        // Polling başlat
        startPolling();
      }
    },
    onError: (error) => {
      setIsMatching(false);
      setMatchStatus('idle');
      Alert.alert('Hata', error.message);
    },
  });

  const leaveQueueMutation = trpc.match.leaveQueue.useMutation({
    onSuccess: () => {
      setIsMatching(false);
      setMatchStatus('idle');
      stopPolling();
    },
  });

  const checkMatchQuery = trpc.match.checkMatch.useQuery(undefined, {
    enabled: matchStatus === 'searching',
    refetchInterval: 2000, // 2 saniyede bir kontrol et
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      checkMatchQuery.refetch();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (checkMatchQuery.data?.matched && checkMatchQuery.data.session?.id) {
      setMatchStatus('matched');
      setIsMatching(false);
      stopPolling();
      router.push(`/match/video/${checkMatchQuery.data.session.id}` as any);
    }
  }, [checkMatchQuery.data, router]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleStartMatch = async () => {
    if (!profile?.gender || (profile.gender !== 'male' && profile.gender !== 'female')) {
      Alert.alert(
        'Cinsiyet Seçimi Gerekli',
        'Eşleşmeye başlamak için profilinde cinsiyet seçmelisin (Erkek/Kadın).',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Profili Düzenle',
            onPress: () => router.push('/profile/edit'),
          },
        ]
      );
      return;
    }

    setIsMatching(true);
    setMatchStatus('searching');
    joinQueueMutation.mutate();
  };

  const handleStopMatch = () => {
    setIsMatching(false);
    setMatchStatus('idle');
    leaveQueueMutation.mutate();
    stopPolling();
  };

  const searching = matchStatus === 'searching';
  const pulseStyle = {
    transform: [
      {
        scale: pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.5],
        }),
      },
    ],
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0],
    }),
  };

  return (
    <LinearGradient
      colors={['#F6F9FF', '#EEF2FF']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.header}>
          <Text style={styles.sectionLabel}>Sınırsız eşleşme</Text>
          <Text style={styles.title}>Görüntülü Eşleşme</Text>
          <Text style={styles.subtitle}>
            Karşı cinsle gerçek zamanlı görüntülü görüş, beğenmezsen tek dokunuşta geç!
          </Text>
        </View>

        <View style={styles.previewWrapper}>
          <Animated.View style={[styles.pulseRing, pulseStyle]} />
          <View style={styles.previewCard}>
            <View style={[styles.statusPill, searching && styles.statusPillSearching]}>
              <Sparkles size={16} color={searching ? COLORS.error : COLORS.primary} />
              <Text
                style={[
                  styles.statusPillText,
                  searching && styles.statusPillTextSearching,
                ]}
              >
                {searching ? 'Eşleşme aranıyor' : 'Hazırsın'}
              </Text>
            </View>

            <View style={styles.cameraIconContainer}>
              <Camera size={48} color={COLORS.primary} />
            </View>

            <Text style={styles.previewTitle}>
              {searching ? 'Yeni eşleşme sıraya alındı' : 'Kamera önizlemesine hazır mısın?'}
            </Text>
            <Text style={styles.previewDescription}>
              Eşleşme sınırı kaldırıldı. İstediğin kadar eşleş, sohbet et, geçiş yap.
            </Text>
          </View>
        </View>

        <BlurView intensity={60} tint="light" style={styles.controlPanel}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlTitle}>Kontroller</Text>
            <Text style={styles.controlSubtitle}>Görüşme başlamadan önce ayarlarını yap.</Text>
          </View>
          <View style={styles.controlActions}>
            <TouchableOpacity
              onPress={() => setCameraReady((prev) => !prev)}
              style={[
                styles.toggleButton,
                cameraReady && styles.toggleButtonActive,
              ]}
            >
              {cameraReady ? (
                <Video size={18} color={COLORS.white} />
              ) : (
                <VideoOff size={18} color={COLORS.white} />
              )}
              <Text style={styles.toggleText}>Kamera {cameraReady ? 'Açık' : 'Kapalı'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMicReady((prev) => !prev)}
              style={[
                styles.toggleButton,
                micReady && styles.toggleButtonActive,
              ]}
            >
              {micReady ? (
                <Mic size={18} color={COLORS.white} />
              ) : (
                <MicOff size={18} color={COLORS.white} />
              )}
              <Text style={styles.toggleText}>Mikrofon {micReady ? 'Açık' : 'Kapalı'}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        <View style={styles.featuresGrid}>
          <FeatureChip
            icon={<Shield size={18} color={COLORS.primary} />}
            title="Güvenli alan"
            description="Kötü davranışları tek dokunuşla bildir"
          />
          <FeatureChip
            icon={<Heart size={18} color={COLORS.primary} />}
            title="Gerçek zamanlı"
            description="Saniyeler içinde görüntülü eşleşme"
          />
          <FeatureChip
            icon={<Sparkles size={18} color={COLORS.primary} />}
            title="Sınırsız eşleşme"
            description="Limiti kaldırdık, eşleşmeye devam"
          />
        </View>

        <View style={styles.ctaWrapper}>
          {searching ? (
            <TouchableOpacity style={[styles.primaryButton, styles.stopButton]} onPress={handleStopMatch}>
              <X size={20} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Beklemeyi Durdur</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartMatch}
              disabled={isMatching}
            >
              {isMatching ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Video size={20} color={COLORS.white} />
                  <Text style={styles.primaryButtonText}>Eşleşmeye Başla</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!searching && (
            <Text style={styles.helperText}>
              Her eşleşme öncesi eşleşme sınırı yok – istediğin kadar dene.
            </Text>
          )}
        </View>
        
        <Footer />
      </ScrollView>
    </LinearGradient>
  );
}

const FeatureChip = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <View style={styles.featureChip}>
    {icon}
    <View style={styles.featureChipText}>
      <Text style={styles.featureChipTitle}>{title}</Text>
      <Text style={styles.featureChipDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginTop: SPACING.xl,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  previewWrapper: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.primary + '30',
  },
  previewCard: {
    width: '100%',
    borderRadius: 32,
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    elevation: 10,
    shadowColor: '#1C2340',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  statusPillSearching: {
    backgroundColor: COLORS.error + '15',
  },
  statusPillText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  statusPillTextSearching: {
    color: COLORS.error,
  },
  cameraIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  previewTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  previewDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  controlPanel: {
    borderRadius: 24,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  controlHeader: {
    marginBottom: SPACING.md,
  },
  controlTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  controlSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 4,
  },
  controlActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 18,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.textLight + '20',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    color: COLORS.white,
    fontWeight: '600',
    flexShrink: 1,
  },
  featuresGrid: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  featureChip: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#1C2340',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  featureChipText: {
    flex: 1,
  },
  featureChipTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  featureChipDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
    lineHeight: 18,
  },
  ctaWrapper: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  helperText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
});

