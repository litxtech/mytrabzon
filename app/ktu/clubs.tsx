import React, { useState } from 'react';
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
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Crown, ArrowRight } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { KTUClub } from '@/types/ktu';

export default function KTUClubsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = trpc.ktu.getClubs.useQuery({
    limit: 20,
    offset: (page - 1) * 20,
  });

  const clubs = data?.clubs || [];
  const hasMore = data?.hasMore || false;

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    refetch();
  };

  const renderClub = ({ item }: { item: KTUClub }) => (
    <TouchableOpacity
      style={styles.clubCard}
      onPress={() => router.push(`/ktu/clubs/${item.id}` as any)}
    >
      {item.logo_url ? (
        <Image source={{ uri: item.logo_url }} style={styles.clubLogo} />
      ) : (
        <View style={styles.clubLogoPlaceholder}>
          <Users size={32} color={COLORS.primary} />
        </View>
      )}
      <View style={styles.clubContent}>
        <View style={styles.clubHeader}>
          <Text style={styles.clubName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.is_member && (
            <View style={styles.memberBadge}>
              <Text style={styles.memberText}>Üye</Text>
            </View>
          )}
        </View>
        {item.description && (
          <Text style={styles.clubDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.clubFooter}>
          <View style={styles.clubInfoRow}>
            <Users size={16} color={COLORS.textLight} />
            <Text style={styles.clubInfoText}>{item.member_count} üye</Text>
          </View>
          {item.faculty && (
            <Text style={styles.clubFaculty}>{item.faculty.name}</Text>
          )}
        </View>
      </View>
      <ArrowRight size={20} color={COLORS.textLight} style={styles.arrowIcon} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Öğrenci Kulüpleri',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : clubs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz kulüp bulunmuyor</Text>
        </View>
      ) : (
        <FlatList
          data={clubs}
          renderItem={renderClub}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading && page === 1} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
        />
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
    padding: SPACING.sm,
  },
  listContent: {
    padding: SPACING.lg,
  },
  clubCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  clubLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.border,
  },
  clubLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubContent: {
    flex: 1,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  clubName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  memberBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: SPACING.sm,
  },
  memberText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  clubDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  clubFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  clubInfoText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  clubFaculty: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  arrowIcon: {
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  footer: {
    padding: SPACING.md,
    alignItems: 'center',
  },
});

