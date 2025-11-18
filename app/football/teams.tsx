import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Users, Trophy, Plus } from 'lucide-react-native';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';

export default function TeamsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Takımları getir
  const { data: teamsData, isLoading, refetch } = (trpc as any).football.getTeams.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !!user }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderTeam = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => router.push(`/football/team/${item.id}` as any)}
    >
      {item.logo_url ? (
        <Image source={{ uri: item.logo_url }} style={styles.teamLogo} />
      ) : (
        <View style={[styles.teamLogo, styles.teamLogoPlaceholder]}>
          <Users size={32} color={COLORS.textLight} />
        </View>
      )}
      
      <View style={styles.teamInfo}>
        <View style={styles.teamHeader}>
          <Text style={styles.teamName}>{item.name}</Text>
          {item.is_verified && <VerifiedBadgeIcon size={18} />}
        </View>
        
        <View style={styles.teamStats}>
          <View style={styles.statItem}>
            <Users size={14} color={COLORS.textLight} />
            <Text style={styles.statText}>{item.member_count || 0} üye</Text>
          </View>
          <View style={styles.statItem}>
            <Trophy size={14} color={COLORS.textLight} />
            <Text style={styles.statText}>{item.total_wins || 0} galibiyet</Text>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.teamDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/football/create-team' as any)}
              style={styles.headerButton}
            >
              <Plus size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Takımlar</Text>
        <Text style={styles.subtitle}>Trabzon ve Giresun takımları</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : teamsData && teamsData.length > 0 ? (
        <FlatList
          data={teamsData}
          renderItem={renderTeam}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Users size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Henüz takım bulunmuyor</Text>
          <TouchableOpacity
            style={styles.createTeamButton}
            onPress={() => router.push('/football/create-team' as any)}
          >
            <Plus size={20} color={COLORS.white} />
            <Text style={styles.createTeamButtonText}>Takım Oluştur</Text>
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
  headerButton: {
    padding: SPACING.xs,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  teamCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: SPACING.md,
  },
  teamLogoPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  teamName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: SPACING.xs,
  },
  teamStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  teamDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
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
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  createTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  createTeamButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

