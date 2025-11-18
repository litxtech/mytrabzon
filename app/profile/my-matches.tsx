import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy, MapPin, Clock, Users } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function MyMatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: userMatchesData, isLoading, refetch } = (trpc as any).football.getUserMatches.useQuery(
    {
      user_id: user?.id || '',
      limit: 100,
      offset: 0,
    },
    {
      enabled: !!user?.id,
    }
  );

  // Geçmiş maçları filtrele (süresi geçmiş olanlar)
  const pastMatches = useMemo(() => {
    if (!userMatchesData?.matches || !Array.isArray(userMatchesData.matches)) return [];
    const now = Date.now();
    const gracePeriod = 5 * 60 * 1000; // 5 dakika tolerans
    
    return userMatchesData.matches.filter((match: any) => {
      let matchDateTime: string | null = null;
      
      if (match.match_date_time) {
        matchDateTime = match.match_date_time;
      } else if (match.match_date && match.start_time) {
        matchDateTime = `${match.match_date}T${match.start_time}+03:00`;
      }
      
      if (!matchDateTime) return false;
      
      const start = new Date(matchDateTime).getTime();
      // Süresi geçmiş maçlar (başlangıç + 5 dakika < şimdi)
      return start + gracePeriod < now;
    });
  }, [userMatchesData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDateTime = (match: any) => {
    let matchDateTime: string | null = null;
    if (match.match_date_time) {
      matchDateTime = match.match_date_time;
    } else if (match.match_date && match.start_time) {
      matchDateTime = `${match.match_date}T${match.start_time}+03:00`;
    }
    
    if (!matchDateTime) return 'Tarih belirtilmemiş';
    
    const date = new Date(matchDateTime);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMatch = ({ item }: { item: any }) => {
    const field = item.field as any;
    const team1 = item.team1 as any;
    const team2 = item.team2 as any;
    
    return (
      <TouchableOpacity
        style={[styles.matchCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/football/match/${item.id}` as any)}
      >
        <View style={styles.matchHeader}>
          <Trophy size={20} color={COLORS.primary} />
          <Text style={[styles.matchTitle, { color: theme.colors.text }]}>
            {team1?.name || 'Takım 1'} vs {team2?.name || 'Rakip Takım'}
          </Text>
        </View>

        <View style={styles.matchInfo}>
          <View style={styles.matchInfoRow}>
            <Clock size={16} color={theme.colors.textLight} />
            <Text style={[styles.matchInfoText, { color: theme.colors.text }]}>
              {formatDateTime(item)}
            </Text>
          </View>

          {field && (
            <View style={styles.matchInfoRow}>
              <MapPin size={16} color={theme.colors.textLight} />
              <Text style={[styles.matchInfoText, { color: theme.colors.text }]}>
                {field.name} - {field.district}
              </Text>
            </View>
          )}

          <View style={styles.matchInfoRow}>
            <Users size={16} color={theme.colors.textLight} />
            <Text style={[styles.matchInfoText, { color: theme.colors.text }]}>
              {item.current_players_count || 0} / {item.max_players || 10} oyuncu
            </Text>
          </View>
        </View>

        <View style={[styles.matchStatus, { backgroundColor: COLORS.primary + '20' }]}>
          <Text style={[styles.matchStatusText, { color: COLORS.primary }]}>
            {item.status === 'completed' ? 'Tamamlandı' : 
             item.status === 'cancelled' ? 'İptal Edildi' : 
             'Geçmiş Maç'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
          title: 'Paylaşılan Maçlar',
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : pastMatches.length > 0 ? (
        <FlatList
          data={pastMatches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Trophy size={64} color={theme.colors.textLight} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            Henüz paylaşılan maç yok
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>
            Maç paylaştığınızda burada görünecek
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  matchCard: {
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  matchTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    flex: 1,
  },
  matchInfo: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  matchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  matchInfoText: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  matchStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  matchStatusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
});

