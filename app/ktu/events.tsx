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
import { ArrowLeft, Calendar, MapPin, Users, ArrowRight } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { KTU_EVENT_TYPES } from '@/constants/ktu';
import { KTUEvent } from '@/types/ktu';

export default function KTUEventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = trpc.ktu.getEvents.useQuery({
    event_type: selectedType as any,
    limit: 20,
    offset: (page - 1) * 20,
  });

  const events = data?.events || [];
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEvent = ({ item }: { item: KTUEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => router.push(`/ktu/events/${item.id}` as any)}
    >
      {item.image_url && (
        <View style={styles.eventImageContainer}>
          <Text style={styles.eventImagePlaceholder}>📅</Text>
        </View>
      )}
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.eventTypeBadge}>
            <Text style={styles.eventTypeText}>
              {KTU_EVENT_TYPES.find((t) => t.value === item.event_type)?.label || item.event_type}
            </Text>
          </View>
          {item.is_attending && (
            <View style={styles.attendingBadge}>
              <Text style={styles.attendingText}>Katılıyorum</Text>
            </View>
          )}
        </View>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.eventDetails}>
          <View style={styles.eventDetailRow}>
            <Calendar size={16} color={COLORS.primary} />
            <Text style={styles.eventDetailText}>{formatDate(item.start_date)}</Text>
          </View>
          {item.location && (
            <View style={styles.eventDetailRow}>
              <MapPin size={16} color={COLORS.textLight} />
              <Text style={styles.eventDetailText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
          <View style={styles.eventDetailRow}>
            <Users size={16} color={COLORS.textLight} />
            <Text style={styles.eventDetailText}>
              {item.attendee_count} katılımcı
              {item.max_attendees && ` / ${item.max_attendees} max`}
            </Text>
          </View>
        </View>
      </View>
      <ArrowRight size={20} color={COLORS.textLight} style={styles.arrowIcon} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'KTÜ Etkinlikleri',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Type Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ value: undefined, label: 'Tümü' }, ...KTU_EVENT_TYPES]}
          keyExtractor={(item) => item.value || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedType === item.value && styles.filterButtonActive,
              ]}
              onPress={() => {
                setSelectedType(item.value);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedType === item.value && styles.filterButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterContent}
        />
      </View>

      {/* Events List */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Yaklaşan etkinlik bulunmuyor</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
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
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  eventImageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImagePlaceholder: {
    fontSize: 48,
  },
  eventContent: {
    padding: SPACING.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  eventTypeBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventTypeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  attendingBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  attendingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  eventDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  eventDetails: {
    gap: SPACING.xs,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  eventDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  arrowIcon: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
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

