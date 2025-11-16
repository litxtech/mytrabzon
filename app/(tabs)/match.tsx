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
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Footer } from '@/components/Footer';

export default function MatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { theme } = useTheme();
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

  const gradientColors = theme.mode === 'dark' 
    ? [theme.colors.background, theme.colors.surface]
    : ['#F6F9FF', '#EEF2FF'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.header}>
          <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>Sınırsız eşleşme</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Görüntülü Eşleşme</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textLight }]}>
            Karşı cinsle gerçek zamanlı görüntülü görüş, beğenmezsen tek dokunuşta geç!
          </Text>
        </View>

        <View style={styles.previewWrapper}>
          <Animated.View style={[styles.pulseRing, pulseStyle, { backgroundColor: theme.colors.primary + '30' }]} />
          <View style={[styles.previewCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.statusPill, { backgroundColor: searching ? theme.colors.error + '15' : theme.colors.primary + '15' }, searching && styles.statusPillSearching]}>
              <Sparkles size={16} color={searching ? theme.colors.error : theme.colors.primary} />
              <Text
                style={[
                  styles.statusPillText,
                  { color: searching ? theme.colors.error : theme.colors.primary },
                  searching && styles.statusPillTextSearching,
                ]}
              >
                {searching ? 'Eşleşme aranıyor' : 'Hazırsın'}
              </Text>
            </View>

            <View style={[styles.cameraIconContainer, { backgroundColor: theme.colors.surface }]}>
              <Camera size={48} color={theme.colors.primary} />
            </View>

            <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
              {searching ? 'Yeni eşleşme sıraya alındı' : 'Kamera önizlemesine hazır mısın?'}
            </Text>
            <Text style={[styles.previewDescription, { color: theme.colors.textLight }]}>
              Eşleşme sınırı kaldırıldı. İstediğin kadar eşleş, sohbet et, geçiş yap.
            </Text>
          </View>
        </View>

        <BlurView intensity={60} tint={theme.mode === 'dark' ? 'dark' : 'light'} style={[styles.controlPanel, { backgroundColor: theme.colors.card + '80' }]}>
          <View style={styles.controlHeader}>
            <Text style={[styles.controlTitle, { color: theme.colors.text }]}>Kontroller</Text>
            <Text style={[styles.controlSubtitle, { color: theme.colors.textLight }]}>Görüşme başlamadan önce ayarlarını yap.</Text>
          </View>
          <View style={styles.controlActions}>
            <TouchableOpacity
              onPress={() => setCameraReady((prev) => !prev)}
              style={[
                styles.toggleButton,
                { backgroundColor: cameraReady ? theme.colors.primary : theme.colors.textLight + '20' },
                cameraReady && styles.toggleButtonActive,
              ]}
            >
              {cameraReady ? (
                <Video size={18} color={COLORS.white} />
              ) : (
                <VideoOff size={18} color={theme.colors.text} />
              )}
              <Text style={[styles.toggleText, { color: cameraReady ? COLORS.white : theme.colors.text }]}>Kamera {cameraReady ? 'Açık' : 'Kapalı'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMicReady((prev) => !prev)}
              style={[
                styles.toggleButton,
                { backgroundColor: micReady ? theme.colors.primary : theme.colors.textLight + '20' },
                micReady && styles.toggleButtonActive,
              ]}
            >
              {micReady ? (
                <Mic size={18} color={COLORS.white} />
              ) : (
                <MicOff size={18} color={theme.colors.text} />
              )}
              <Text style={[styles.toggleText, { color: micReady ? COLORS.white : theme.colors.text }]}>Mikrofon {micReady ? 'Açık' : 'Kapalı'}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        <View style={styles.featuresGrid}>
          <FeatureChip
            icon={<Shield size={18} color={theme.colors.primary} />}
            title="Güvenli alan"
            description="Kötü davranışları tek dokunuşla bildir"
          />
          <FeatureChip
            icon={<Heart size={18} color={theme.colors.primary} />}
            title="Gerçek zamanlı"
            description="Saniyeler içinde görüntülü eşleşme"
          />
          <FeatureChip
            icon={<Sparkles size={18} color={theme.colors.primary} />}
            title="Sınırsız eşleşme"
            description="Limiti kaldırdık, eşleşmeye devam"
          />
        </View>

        <View style={styles.ctaWrapper}>
          {searching ? (
            <TouchableOpacity style={[styles.primaryButton, styles.stopButton, { backgroundColor: theme.colors.error }]} onPress={handleStopMatch}>
              <X size={20} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Beklemeyi Durdur</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
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
            <Text style={[styles.helperText, { color: theme.colors.textLight }]}>
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
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Sparkles size={48} color={theme.colors.primary} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Eşleşme Bulundu!</Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textLight }]}>
                Karşı taraf seni bekliyor
              </Text>
            </View>

            <View style={[styles.modalInfo, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalInfoText, { color: theme.colors.text }]}>
                Görüntülü görüşmeye başlamak için hazır mısın?
              </Text>
              <Text style={[styles.modalWarning, { color: theme.colors.warning }]}>
                30 saniye içinde otomatik başlayacak
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButtonReject, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}
                onPress={handleRejectMatch}
              >
                <X size={20} color={theme.colors.error} />
                <Text style={[styles.modalButtonRejectText, { color: theme.colors.error }]}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonAccept, { backgroundColor: theme.colors.primary }]}
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
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.featureChip, { backgroundColor: theme.colors.card }]}>
      {icon}
      <View style={styles.featureChipText}>
        <Text style={[styles.featureChipTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.featureChipDescription, { color: theme.colors.textLight }]}>{description}</Text>
      </View>
    </View>
  );
};

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

