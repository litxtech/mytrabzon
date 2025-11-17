import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { Calendar, MapPin, Clock, AlertCircle, ChevronRight, Plus } from 'lucide-react-native';
import { Footer } from '@/components/Footer';

export default function FootballScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCity, setSelectedCity] = useState<'all' | 'Trabzon' | 'Giresun'>('all');

  // Kullanıcı profilini getir (şehir bilgisi için)
  const { data: userProfile } = trpc.user.getProfile.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  const queryCity = selectedCity === 'all' ? undefined : selectedCity;

  // Bugünün maçlarını getir
  const { data: todayMatches, isLoading, refetch } = (trpc as any).football.getTodayMatches.useQuery(
    { city: queryCity },
    { 
      enabled: !!user,
      staleTime: 30 * 1000, // 30 saniye
      refetchOnMount: true, // Her mount'ta refetch yap
      refetchOnWindowFocus: true, // Pencere focus olduğunda refetch yap
    }
  );

  const visibleMatches = useMemo(() => {
    if (!todayMatches?.matches || !Array.isArray(todayMatches.matches)) return [];
    const now = Date.now();
    const gracePeriod = 5 * 60 * 1000; // 5 dakika tolerans
    
    return todayMatches.matches.filter((match: any) => {
      // match_date_time varsa onu kullan, yoksa match_date ve start_time'i birleştir
      let matchDateTime: string | null = null;
      
      if (match.match_date_time) {
        matchDateTime = match.match_date_time;
      } else if (match.match_date && match.start_time) {
        // Tarih ve saati birleştir (Türkiye saati UTC+3)
        matchDateTime = `${match.match_date}T${match.start_time}+03:00`;
      }
      
      if (!matchDateTime) return false;
      
      const start = new Date(matchDateTime).getTime();
      // Maç başlangıç zamanı + 5 dakika geçmişse listeden kaldır
      return start + gracePeriod >= now;
    });
  }, [todayMatches]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (match: any) => {
    // match_date_time varsa onu kullan, yoksa match_date ve start_time'i birleştir
    let matchDateTime: string | null = null;
    
    if (match.match_date_time) {
      matchDateTime = match.match_date_time;
    } else if (match.match_date && match.start_time) {
      matchDateTime = `${match.match_date}T${match.start_time}+03:00`;
    }
    
    if (!matchDateTime) return '--:--';
    
    return new Date(matchDateTime).toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Istanbul',
    });
  };

  const renderMatch = ({ item }: { item: any }) => {
    const isLookingForOpponent = item.status === 'looking_for_opponent';
    const isLookingForPlayers = item.status === 'looking_for_players';
    
    return (
      <TouchableOpacity
        style={[styles.matchCard, { backgroundColor: theme.colors.card }]}
        onPress={() => router.push(`/football/match/${item.id}` as any)}
      >
        <View style={styles.matchHeader}>
          <View style={styles.matchTimeContainer}>
            <Clock size={16} color={theme.colors.primary} />
            <Text style={[styles.matchTime, { color: theme.colors.text }]}>{formatTime(item)}</Text>
          </View>
          <View style={styles.matchFieldContainer}>
            <MapPin size={14} color={theme.colors.textLight} />
            <Text style={[styles.matchField, { color: theme.colors.textLight }]}>{item.field?.name}</Text>
          </View>
        </View>

        {isLookingForOpponent ? (
          <View style={[styles.opponentSearchCard, { backgroundColor: theme.colors.warning + '20' }]}>
            <AlertCircle size={20} color={theme.colors.warning} />
            <Text style={[styles.opponentSearchText, { color: theme.colors.text }]}>Halısaha Rakibi Aranıyor</Text>
            <Text style={[styles.opponentSearchSubtext, { color: theme.colors.textLight }]}>
              {item.organizer?.full_name || 'Organizatör'} rakip takım arıyor
            </Text>
          </View>
        ) : (
          <View style={styles.matchTeams}>
            <View style={styles.teamContainer}>
              <Text style={[styles.teamName, { color: theme.colors.text }]}>{item.team1?.name || 'Takım 1'}</Text>
              {item.team1?.logo_url && (
                <Image source={{ uri: item.team1.logo_url }} style={styles.teamLogo} />
              )}
            </View>
            <Text style={[styles.vsText, { color: theme.colors.textLight }]}>VS</Text>
            <View style={styles.teamContainer}>
              <Text style={[styles.teamName, { color: theme.colors.text }]}>{item.team2?.name || 'Takım 2'}</Text>
              {item.team2?.logo_url && (
                <Image source={{ uri: item.team2.logo_url }} style={styles.teamLogo} />
              )}
            </View>
          </View>
        )}

        {isLookingForPlayers && item.missing_players_count > 0 && (
          <View style={[styles.missingPlayersBadge, { backgroundColor: theme.colors.error + '20' }]}>
            <AlertCircle size={14} color={theme.colors.error} />
            <Text style={[styles.missingPlayersText, { color: theme.colors.error }]}>
              {item.missing_players_count} oyuncu eksik
            </Text>
          </View>
        )}

        <ChevronRight size={20} color={theme.colors.textLight} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, SPACING.md) }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <AppLogo size="medium" />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/football/create-match' as any)}
        >
          <Plus size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.cityFilterContainer}>
        {(['all', 'Trabzon', 'Giresun'] as const).map((cityOption) => (
          <TouchableOpacity
            key={cityOption}
            style={[
              styles.cityFilterChip,
              selectedCity === cityOption && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
            ]}
            onPress={() => setSelectedCity(cityOption)}
          >
            <Text
              style={[
                styles.cityFilterText,
                selectedCity === cityOption ? { color: COLORS.white } : { color: theme.colors.text },
              ]}
            >
              {cityOption === 'all' ? 'Tüm Şehirler' : cityOption}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.titleContainer}>
        <Calendar size={24} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Bugün Maç Var mı?</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : visibleMatches.length > 0 ? (
        <FlatList
          data={visibleMatches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: SPACING.xl * 2 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          ListFooterComponent={<Footer />}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            {todayMatches?.matches && Array.isArray(todayMatches.matches) && todayMatches.matches.length > 0
              ? 'Planlanan maçlar tamamlandı'
              : 'Bugün maç yok'}
          </Text>
          <TouchableOpacity
            style={[styles.createMatchButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/football/create-match' as any)}
          >
            <Plus size={20} color={COLORS.white} />
            <Text style={styles.createMatchButtonText}>Maç Oluştur</Text>
          </TouchableOpacity>
        </View>
      )}

      {visibleMatches.length === 0 && <Footer />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityFilterContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  cityFilterChip: {
    flex: 1,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  cityFilterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  matchCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchHeader: {
    flex: 1,
    marginBottom: SPACING.sm,
  },
  matchTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  matchTime: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  matchFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  matchField: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  matchTeams: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  teamContainer: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  vsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginHorizontal: SPACING.md,
  },
  missingPlayersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  missingPlayersText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    fontWeight: '600',
  },
  opponentSearchCard: {
    flex: 2,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  opponentSearchText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.warning,
    textAlign: 'center',
  },
  opponentSearchSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  chevron: {
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
  },
  createMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  createMatchButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    flexShrink: 0, // Android'de metinlerin tam görünmesi için
  },
});

