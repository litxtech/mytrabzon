/**
 * Görüntülü Eşleşme Ekranı
 * Hızlı görüntülü eşleşme sistemi
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Modal,
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
  const { profile } = useAuth();
  const [isMatching, setIsMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [cameraReady, setCameraReady] = useState(true);
  const [micReady, setMicReady] = useState(true);
  const [showMatchFoundModal, setShowMatchFoundModal] = useState(false);
  const [foundSession, setFoundSession] = useState<any>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const matchFoundTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const joinQueueMutation = (trpc as any).match.joinQueue.useMutation({
    onSuccess: (data: any) => {
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
    onError: (error: any) => {
      setIsMatching(false);
      setMatchStatus('idle');
      Alert.alert('Hata', error.message);
    },
  });

  const leaveQueueMutation = (trpc as any).match.leaveQueue.useMutation({
    onSuccess: () => {
      setIsMatching(false);
      setMatchStatus('idle');
      stopPolling();
    },
  });

  const checkMatchQuery = (trpc as any).match.checkMatch.useQuery(undefined, {
    enabled: matchStatus === 'searching',
    refetchInterval: 2000, // 2 saniyede bir kontrol et
  });

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleAcceptMatch = useCallback(() => {
    if (matchFoundTimeout.current) {
      clearTimeout(matchFoundTimeout.current);
    }
    setShowMatchFoundModal(false);
    if (foundSession?.id) {
      router.push(`/match/video/${foundSession.id}` as any);
    }
  }, [foundSession, router]);

  useEffect(() => {
    if (checkMatchQuery.data?.matched && checkMatchQuery.data.session?.id) {
      setMatchStatus('matched');
      setIsMatching(false);
      stopPolling();
      
      // Eşleşme bulundu - onay modalı göster
      setFoundSession(checkMatchQuery.data.session);
      setShowMatchFoundModal(true);
      
      // 30 saniye sonra otomatik başlat
      matchFoundTimeout.current = setTimeout(() => {
        handleAcceptMatch();
      }, 30000);
    }
  }, [checkMatchQuery.data, handleAcceptMatch]);

  useEffect(() => {
    return () => {
      stopPolling();
      if (matchFoundTimeout.current) {
        clearTimeout(matchFoundTimeout.current);
      }
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

  const handleRejectMatch = () => {
    if (matchFoundTimeout.current) {
      clearTimeout(matchFoundTimeout.current);
    }
    setShowMatchFoundModal(false);
    setFoundSession(null);
    setMatchStatus('idle');
    setIsMatching(false);
    leaveQueueMutation.mutate();
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

      {/* Eşleşme Bulundu Modalı */}
      <Modal
        visible={showMatchFoundModal}
        transparent
        animationType="fade"
        onRequestClose={handleRejectMatch}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Sparkles size={48} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Eşleşme Bulundu!</Text>
              <Text style={styles.modalSubtitle}>
                Karşı taraf seni bekliyor
              </Text>
            </View>

            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoText}>
                Görüntülü görüşmeye başlamak için hazır mısın?
              </Text>
              <Text style={styles.modalWarning}>
                30 saniye içinde otomatik başlayacak
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonReject}
                onPress={handleRejectMatch}
              >
                <X size={20} color={COLORS.error} />
                <Text style={styles.modalButtonRejectText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonAccept}
                onPress={handleAcceptMatch}
              >
                <Video size={20} color={COLORS.white} />
                <Text style={styles.modalButtonAcceptText}>Başla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center' as const,
  },
  modalHeader: {
    alignItems: 'center' as const,
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center' as const,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    textAlign: 'center' as const,
  },
  modalInfo: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  modalInfoText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center' as const,
    marginBottom: SPACING.sm,
  },
  modalWarning: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
  modalButtons: {
    flexDirection: 'row' as const,
    gap: SPACING.md,
    width: '100%',
  },
  modalButtonReject: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  modalButtonRejectText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: COLORS.error,
  },
  modalButtonAccept: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  modalButtonAcceptText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
});

