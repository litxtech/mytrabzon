import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function RideSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.ride.searchRides.useQuery(
    {
      from_text: fromText.trim() || null,
      to_text: toText.trim() || null,
      date: selectedDate ? selectedDate.toISOString() : null,
    },
    {
      enabled: false, // Manual trigger
    }
  );

  const handleSearch = async () => {
    if (!fromText.trim() || !toText.trim()) {
      return;
    }
    await refetch();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRide = ({ item }: { item: any }) => {
    const driver = item.driver as any;
    
    return (
      <TouchableOpacity
        style={styles.rideCard}
        onPress={() => router.push(`/ride/${item.id}` as any)}
      >
        <View style={styles.rideHeader}>
          <Image
            source={{ uri: driver?.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.driverAvatar}
          />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver?.full_name || 'İsimsiz'}</Text>
            {driver?.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          {item.price_per_seat && (
            <View style={styles.priceBadge}>
              <DollarSign size={16} color={COLORS.primary} />
              <Text style={styles.priceText}>{item.price_per_seat} TL</Text>
            </View>
          )}
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={styles.routeDot} />
            <View style={styles.routeContent}>
              <Text style={styles.routeTitle}>{item.departure_title}</Text>
              {item.departure_description && (
                <Text style={styles.routeDescription}>{item.departure_description}</Text>
              )}
            </View>
          </View>

          {item.stops_text && item.stops_text.length > 0 && (
            <View style={styles.stopsContainer}>
              {item.stops_text.map((stop: string, index: number) => (
                <View key={index} style={styles.routePoint}>
                  <View style={styles.routeStopDot} />
                  <Text style={styles.stopText}>{stop}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.routePoint}>
            <View style={styles.routeDotEnd} />
            <View style={styles.routeContent}>
              <Text style={styles.routeTitle}>{item.destination_title}</Text>
              {item.destination_description && (
                <Text style={styles.routeDescription}>{item.destination_description}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.rideFooter}>
          <View style={styles.rideInfo}>
            <Clock size={16} color={COLORS.textLight} />
            <Text style={styles.rideInfoText}>{formatDateTime(item.departure_time)}</Text>
          </View>
          <View style={styles.rideInfo}>
            <Users size={16} color={COLORS.textLight} />
            <Text style={styles.rideInfoText}>
              {item.available_seats} / {item.total_seats} boş
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          title: 'Yolculuk Ara',
        }}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <MapPin size={20} color={COLORS.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nereden? (Örn: Trabzon, Meydan)"
            placeholderTextColor={COLORS.textLight}
            value={fromText}
            onChangeText={setFromText}
          />
        </View>

        <View style={styles.searchRow}>
          <MapPin size={20} color={COLORS.error} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nereye? (Örn: Ordu, Giresun)"
            placeholderTextColor={COLORS.textLight}
            value={toText}
            onChangeText={setToText}
          />
        </View>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={20} color={COLORS.primary} />
          <Text style={styles.dateButtonText}>
            {selectedDate
              ? selectedDate.toLocaleDateString('tr-TR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Tarih seçin (Opsiyonel)'}
          </Text>
        </TouchableOpacity>

          {showDatePicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={(event: any, date?: Date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) {
                  setSelectedDate(date);
                }
              }}
            />
          )}

        <TouchableOpacity
          style={[styles.searchButton, (!fromText.trim() || !toText.trim()) && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={!fromText.trim() || !toText.trim()}
        >
          <Search size={20} color={COLORS.white} />
          <Text style={styles.searchButtonText}>Ara</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : data?.rides && data.rides.length > 0 ? (
        <FlatList
          data={data.rides}
          keyExtractor={(item) => item.id}
          renderItem={renderRide}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      ) : data?.rides && data.rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Yolculuk bulunamadı</Text>
          <Text style={styles.emptySubtext}>
            Farklı bir tarih veya rota deneyin
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: SPACING.sm,
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
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
  rideCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  driverInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  driverName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    borderRadius: 20,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  priceText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  routeContainer: {
    marginBottom: SPACING.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  routeDotEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
    marginTop: 4,
  },
  routeStopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textLight,
    marginTop: 6,
    marginLeft: 2,
  },
  routeContent: {
    flex: 1,
  },
  routeTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  routeDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  stopsContainer: {
    marginLeft: 6,
    paddingLeft: SPACING.md,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  stopText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  rideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rideInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
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
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

