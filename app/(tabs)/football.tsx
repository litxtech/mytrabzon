import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { Calendar, Users, MapPin, Clock, AlertCircle, ChevronRight, Plus } from 'lucide-react-native';
import { Image } from 'react-native';

export default function FootballScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Bugünün maçlarını getir
  const { data: todayMatches, isLoading, refetch } = trpc.football.getTodayMatches.useQuery(
    { city: 'Trabzon' },
    { enabled: !!user }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Istanbul',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderMatch = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => router.push(`/football/match/${item.id}` as any)}
    >
      <View style={styles.matchHeader}>
        <View style={styles.matchTimeContainer}>
          <Clock size={16} color={COLORS.primary} />
          <Text style={styles.matchTime}>{formatTime(item.match_date)}</Text>
        </View>
        <View style={styles.matchFieldContainer}>
          <MapPin size={14} color={COLORS.textLight} />
          <Text style={styles.matchField}>{item.field?.name}</Text>
        </View>
      </View>

      <View style={styles.matchTeams}>
        <View style={styles.teamContainer}>
          <Text style={styles.teamName}>{item.team1?.name || 'Takım 1'}</Text>
          {item.team1?.logo_url && (
            <Image source={{ uri: item.team1.logo_url }} style={styles.teamLogo} />
          )}
        </View>
        <Text style={styles.vsText}>VS</Text>
        <View style={styles.teamContainer}>
          <Text style={styles.teamName}>{item.team2?.name || 'Takım 2'}</Text>
          {item.team2?.logo_url && (
            <Image source={{ uri: item.team2.logo_url }} style={styles.teamLogo} />
          )}
        </View>
      </View>

      {item.missing_players_count > 0 && (
        <View style={styles.missingPlayersBadge}>
          <AlertCircle size={14} color={COLORS.error} />
          <Text style={styles.missingPlayersText}>
            {item.missing_players_count} oyuncu eksik
          </Text>
        </View>
      )}

      <ChevronRight size={20} color={COLORS.textLight} style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, SPACING.md) }]}>
      <View style={styles.header}>
        <AppLogo size="medium" />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/football/create-match' as any)}
        >
          <Plus size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Calendar size={24} color={COLORS.primary} />
        <Text style={styles.title}>Bugün Maç Var mı?</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : todayMatches && todayMatches.length > 0 ? (
        <FlatList
          data={todayMatches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bugün maç yok</Text>
          <TouchableOpacity
            style={styles.createMatchButton}
            onPress={() => router.push('/football/create-match' as any)}
          >
            <Plus size={20} color={COLORS.white} />
            <Text style={styles.createMatchButtonText}>Maç Oluştur</Text>
          </TouchableOpacity>
        </View>
      )}
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
  },
});

