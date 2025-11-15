import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Trophy } from 'lucide-react-native';

export default function MatchDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: match, isLoading, refetch } = trpc.football.getMatch.useQuery(
    { match_id: id! },
    { enabled: !!id && !!user }
  );

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
              {new Date(match.match_date).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {new Date(match.match_date).toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'Europe/Istanbul',
              })}
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
});

