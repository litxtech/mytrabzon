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
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Pin, AlertCircle, ArrowRight } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { KTU_ANNOUNCEMENT_CATEGORIES } from '@/constants/ktu';
import { KTUAnnouncement } from '@/types/ktu';

export default function KTUAnnouncementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = trpc.ktu.getAnnouncements.useQuery({
    category: selectedCategory as any,
    limit: 20,
    offset: (page - 1) * 20,
  });

  const announcements = data?.announcements || [];
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

  const renderAnnouncement = ({ item }: { item: KTUAnnouncement }) => (
    <TouchableOpacity
      style={styles.announcementCard}
      onPress={() => router.push(`/ktu/announcements/${item.id}` as any)}
    >
      <View style={styles.announcementHeader}>
        {item.is_pinned && (
          <View style={styles.pinnedBadge}>
            <Pin size={14} color={COLORS.white} />
            <Text style={styles.pinnedText}>Sabitlenmiş</Text>
          </View>
        )}
        {item.is_important && (
          <View style={styles.importantBadge}>
            <AlertCircle size={14} color={COLORS.white} />
            <Text style={styles.importantText}>Önemli</Text>
          </View>
        )}
      </View>
      <Text style={styles.announcementTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.announcementContent} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.announcementFooter}>
        <Text style={styles.announcementCategory}>
          {KTU_ANNOUNCEMENT_CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
        </Text>
        <Text style={styles.announcementDate}>
          {new Date(item.created_at).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      <ArrowRight size={20} color={COLORS.textLight} style={styles.arrowIcon} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'KTÜ Duyuruları',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ value: undefined, label: 'Tümü' }, ...KTU_ANNOUNCEMENT_CATEGORIES]}
          keyExtractor={(item) => item.value || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedCategory === item.value && styles.filterButtonActive,
              ]}
              onPress={() => {
                setSelectedCategory(item.value);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedCategory === item.value && styles.filterButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterContent}
        />
      </View>

      {/* Announcements List */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : announcements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz duyuru bulunmuyor</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
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
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.lg,
  },
  announcementCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  announcementHeader: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  pinnedText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  importantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  importantText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  announcementTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  announcementContent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementCategory: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  announcementDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  arrowIcon: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md,
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

