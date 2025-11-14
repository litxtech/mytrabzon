import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Users, Trophy, MapPin, Plus } from 'lucide-react-native';

export default function TeamDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: team, isLoading, refetch } = trpc.football.getTeam.useQuery(
    { team_id: id! },
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

  if (!team) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Takım bulunamadı</Text>
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
          {team.logo_url ? (
            <Image source={{ uri: team.logo_url }} style={styles.teamLogo} />
          ) : (
            <View style={styles.teamLogoPlaceholder}>
              <Trophy size={40} color={COLORS.primary} />
            </View>
          )}
          <Text style={styles.teamName}>{team.name}</Text>
          {team.city && team.district && (
            <View style={styles.locationRow}>
              <MapPin size={16} color={COLORS.textLight} />
              <Text style={styles.locationText}>
                {team.district}, {team.city}
              </Text>
            </View>
          )}
        </View>

        {team.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>Açıklama</Text>
            <Text style={styles.descriptionText}>{team.description}</Text>
          </View>
        )}

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Users size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{team.member_count || 0}</Text>
            <Text style={styles.statLabel}>Üye</Text>
          </View>
          <View style={styles.statItem}>
            <Trophy size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>{team.score || 0}</Text>
            <Text style={styles.statLabel}>Puan</Text>
          </View>
        </View>

        <View style={styles.membersCard}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>Takım Üyeleri</Text>
            <TouchableOpacity
              style={styles.addMemberButton}
              onPress={() => {
                // TODO: Add member functionality
                console.log('Add member');
              }}
            >
              <Plus size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {team.members && team.members.length > 0 ? (
            <View style={styles.membersList}>
              {team.members.map((member: any) => (
                <View key={member.id} style={styles.memberItem}>
                  <Image
                    source={{ uri: member.avatar_url || 'https://via.placeholder.com/40' }}
                    style={styles.memberAvatar}
                  />
                  <Text style={styles.memberName}>{member.full_name}</Text>
                  {member.is_captain && (
                    <Text style={styles.captainBadge}>Kaptan</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Henüz üye yok</Text>
          )}
        </View>
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
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  teamLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.md,
  },
  teamLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  teamName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  descriptionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  descriptionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  descriptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    lineHeight: 22,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs / 2,
  },
  membersCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  membersTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  addMemberButton: {
    padding: SPACING.xs,
  },
  membersList: {
    gap: SPACING.md,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  memberName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  captainBadge: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    padding: SPACING.lg,
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

