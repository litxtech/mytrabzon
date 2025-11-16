import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Trophy, MessageCircle, AlertCircle } from 'lucide-react-native';
import { Footer } from '@/components/Footer';

export default function MatchDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: match, isLoading, refetch } = (trpc as any).football.getMatchDetails.useQuery(
    { match_id: id! },
    { enabled: !!id }
  );

  const createReservationMutation = trpc.football.createReservation.useMutation({
    onSuccess: async () => {
      Alert.alert(
        'Başarılı', 
        'Rezervasyon yapıldı! Organizatöre bildirim gönderildi. Mesaj göndermek ister misiniz?',
        [
          { text: 'Hayır', style: 'cancel', onPress: () => refetch() },
          {
            text: 'Mesaj Gönder',
            onPress: async () => {
              try {
                const createRoomMutation = trpc.chat.createRoom.useMutation();
                const room = await createRoomMutation.mutateAsync({
                  type: 'direct',
                  memberIds: [match!.organizer_id],
                });
                router.push(`/chat/${room.id}` as any);
              } catch (error: any) {
                console.error('Chat oluşturma hatası:', error);
                Alert.alert('Hata', 'Chat oluşturulamadı');
              }
              refetch();
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Rezervasyon yapılamadı');
    },
  });

  const handleReservation = () => {
    if (!match || !user) return;
    
    Alert.alert(
      'Rezervasyon Yap',
      'Bu maç için rezervasyon yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Rezervasyon Yap',
          onPress: async () => {
            try {
              // Rezervasyon için tarih ve saat formatını hazırla
              const reservationDate = match.match_date; // YYYY-MM-DD formatında
              const startTime = match.start_time; // HH:MM:SS formatında
              
              // End time hesapla (varsayılan 1 saat)
              const [hours, minutes] = startTime.split(':').map(Number);
              const endHours = (hours + 1) % 24;
              const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
              
              await createReservationMutation.mutateAsync({
                field_id: match.field_id,
                reservation_date: reservationDate,
                start_time: startTime,
                end_time: endTime,
                match_id: match.id,
                notes: `Maç rezervasyonu - ${match.field?.name}`,
              });
            } catch (error) {
              console.error('Reservation error:', error);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Maç bulunamadı</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Trophy size={32} color={COLORS.primary} />
          <Text style={styles.title}>Maç Detayı</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Calendar size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {match.match_date 
                ? new Date(match.match_date).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Tarih belirtilmemiş'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {match.start_time 
                ? match.start_time.substring(0, 5) // HH:MM formatında göster
                : 'Saat belirtilmemiş'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {match.field?.name} ({match.field?.district})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Users size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>Durum: {match.status}</Text>
          </View>
        </View>

        <View style={styles.teamsCard}>
          <View style={styles.teamContainer}>
            <Text style={styles.teamName}>{match.team1?.name || 'Takım 1'}</Text>
            <Text style={styles.teamScore}>{match.team1_score || 0}</Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.teamContainer}>
            <Text style={styles.teamName}>{match.team2?.name || 'Takım 2'}</Text>
            <Text style={styles.teamScore}>{match.team2_score || 0}</Text>
          </View>
        </View>

        {match.missing_players_count > 0 && (
          <View style={styles.missingPlayersCard}>
            <Text style={styles.missingPlayersTitle}>
              {match.missing_players_count} Oyuncu Eksik
            </Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => router.push('/football/missing-players' as any)}
            >
              <Text style={styles.joinButtonText}>Eksik Oyuncu İlanlarına Bak</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rezervasyon Butonu - Sadece organizatör değilse göster */}
        {match.organizer_id !== user?.id && match.status !== 'completed' && match.status !== 'cancelled' && (
          <View style={styles.reservationCard}>
            <View style={styles.reservationHeader}>
              <AlertCircle size={20} color={COLORS.primary} />
              <Text style={styles.reservationTitle}>Rezervasyon Yap</Text>
            </View>
            <Text style={styles.reservationText}>
              Bu maç için rezervasyon yaparak organizatöre mesaj gönderebilirsiniz.
            </Text>
            <TouchableOpacity
              style={[styles.reservationButton, createReservationMutation.isPending && styles.reservationButtonDisabled]}
              onPress={handleReservation}
              disabled={createReservationMutation.isPending}
            >
              {createReservationMutation.isPending ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <MessageCircle size={18} color={COLORS.white} />
                  <Text style={styles.reservationButtonText}>Rezervasyon Yap</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Rakip Aranıyor Durumu */}
        {match.status === 'looking_for_opponent' && (
          <View style={styles.opponentSearchCard}>
            <AlertCircle size={24} color={COLORS.warning} />
            <Text style={styles.opponentSearchTitle}>Halısaha Rakibi Aranıyor</Text>
            <Text style={styles.opponentSearchText}>
              {match.organizer?.full_name || 'Organizatör'} rakip takım arıyor. Rezervasyon yaparak iletişime geçebilirsiniz.
            </Text>
          </View>
        )}
        
        <Footer />
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  teamsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  teamContainer: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  teamScore: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  vsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginHorizontal: SPACING.md,
  },
  missingPlayersCard: {
    backgroundColor: COLORS.warning + '20',
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  missingPlayersTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: SPACING.md,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  joinButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    marginBottom: SPACING.lg,
  },
  backButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  reservationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reservationTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  reservationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  reservationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  reservationButtonDisabled: {
    opacity: 0.6,
  },
  reservationButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  opponentSearchCard: {
    backgroundColor: COLORS.warning + '20',
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  opponentSearchTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.warning,
  },
  opponentSearchText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
  },
});

