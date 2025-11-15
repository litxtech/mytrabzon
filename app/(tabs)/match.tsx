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
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Video, VideoOff, Mic, MicOff, X, MessageCircle, AlertCircle } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = 200;

export default function MatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [isMatching, setIsMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [currentSession, setCurrentSession] = useState<any>(null);
  
  // Taşınabilir kart animasyonları
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH - CARD_WIDTH - 20)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  const joinQueueMutation = trpc.match.joinQueue.useMutation({
    onSuccess: (data) => {
      if (data.matched) {
        setCurrentSession(data.session);
        setMatchStatus('matched');
        setIsMatching(false);
        // Görüntülü görüşme ekranına yönlendir
        router.push(`/match/video/${data.session.id}` as any);
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
    if (checkMatchQuery.data?.matched && checkMatchQuery.data.session) {
      setCurrentSession(checkMatchQuery.data.session);
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

  const onCardGesture = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onCardHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, translationY } = event.nativeEvent;
      
      // Kartı ekranın kenarına yapıştır
      let finalX = translationX;
      let finalY = translationY;

      // X ekseninde sınırlar
      if (finalX < 0) finalX = 0;
      if (finalX > SCREEN_WIDTH - CARD_WIDTH) finalX = SCREEN_WIDTH - CARD_WIDTH;

      // Y ekseninde sınırlar
      if (finalY < 0) finalY = 0;
      if (finalY > 400) finalY = 400;

      Animated.spring(translateX, {
        toValue: finalX,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      Animated.spring(translateY, {
        toValue: finalY,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  };

  const toggleCard = () => {
    setIsCardExpanded(!isCardExpanded);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Ana içerik */}
        <View style={styles.mainContent}>
          {matchStatus === 'idle' && (
            <View style={styles.idleContainer}>
              <View style={styles.cameraPreview}>
                <Camera size={64} color={COLORS.primary} />
                <Text style={styles.previewText}>Kamera Önizlemesi</Text>
              </View>
              <Text style={styles.title}>Görüntülü Eşleşme</Text>
              <Text style={styles.subtitle}>
                Karşı cinsle hızlıca eşleş, görüntülü görüş, beğenmezsen geç!
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartMatch}
                disabled={isMatching}
              >
                <Video size={24} color={COLORS.white} />
                <Text style={styles.startButtonText}>Eşleşmeye Başla</Text>
              </TouchableOpacity>
            </View>
          )}

          {matchStatus === 'searching' && (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.searchingText}>Eşleşme aranıyor...</Text>
              <Text style={styles.searchingSubtext}>
                Karşı cinsle eşleşme bekleniyor
              </Text>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopMatch}
              >
                <X size={20} color={COLORS.white} />
                <Text style={styles.stopButtonText}>Durdur</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Taşınabilir Kontrol Kartı */}
        <PanGestureHandler
          onGestureEvent={onCardGesture}
          onHandlerStateChange={onCardHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.controlCard,
              {
                transform: [{ translateX }, { translateY }],
                height: isCardExpanded ? CARD_HEIGHT + 100 : CARD_HEIGHT,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={toggleCard}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeaderContent}>
                <View style={styles.cardIndicator} />
                <Text style={styles.cardTitle}>
                  {isCardExpanded ? 'Kontroller' : 'Kontroller'}
                </Text>
              </View>
            </TouchableOpacity>

            {isCardExpanded && (
              <View style={styles.cardContent}>
                <View style={styles.controlRow}>
                  <TouchableOpacity style={styles.controlButton}>
                    <Video size={20} color={COLORS.text} />
                    <Text style={styles.controlButtonText}>Kamera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton}>
                    <Mic size={20} color={COLORS.text} />
                    <Text style={styles.controlButtonText}>Mikrofon</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.controlRow}>
                  <TouchableOpacity style={styles.controlButton}>
                    <MessageCircle size={20} color={COLORS.text} />
                    <Text style={styles.controlButtonText}>Mesaj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton}>
                    <AlertCircle size={20} color={COLORS.error} />
                    <Text style={[styles.controlButtonText, { color: COLORS.error }]}>
                      Şikayet
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  idleContainer: {
    alignItems: 'center',
    width: '100%',
  },
  cameraPreview: {
    width: 200,
    height: 300,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  previewText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 30,
    gap: SPACING.sm,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  searchingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  searchingText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  searchingSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.xl,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 30,
    gap: SPACING.sm,
  },
  stopButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  controlCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardIndicator: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: SPACING.md,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  controlButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
});

