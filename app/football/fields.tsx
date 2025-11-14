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
import { ArrowLeft, MapPin, Star, Phone, Clock, ChevronRight } from 'lucide-react-native';

export default function FieldsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [city, setCity] = useState<'Trabzon' | 'Giresun'>('Trabzon');
  const [refreshing, setRefreshing] = useState(false);

  // Saha listesini getir
  const { data: fieldsData, isLoading, refetch } = trpc.football.getFields.useQuery(
    { city, limit: 100, offset: 0 },
    { enabled: !!user }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderField = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.fieldCard}
      onPress={() => router.push(`/football/field/${item.id}` as any)}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.fieldImage} />
      )}
      
      <View style={styles.fieldInfo}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldName}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <Star size={14} color={COLORS.warning} fill={COLORS.warning} />
            <Text style={styles.rating}>{item.rating?.toFixed(1) || '0.0'}</Text>
          </View>
        </View>

        <View style={styles.fieldMeta}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={COLORS.textLight} />
            <Text style={styles.metaText}>{item.district}</Text>
          </View>
          {item.phone && (
            <View style={styles.metaItem}>
              <Phone size={14} color={COLORS.textLight} />
              <Text style={styles.metaText}>{item.phone}</Text>
            </View>
          )}
        </View>

        {item.address && (
          <Text style={styles.fieldAddress}>{item.address}</Text>
        )}

        {item.price_per_hour && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Saatlik:</Text>
            <Text style={styles.price}>{item.price_per_hour} ₺</Text>
          </View>
        )}

        <ChevronRight size={20} color={COLORS.textLight} style={styles.chevron} />
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
        }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Saha Rehberi</Text>
        <View style={styles.citySelector}>
          {(['Trabzon', 'Giresun'] as const).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.cityButton, city === c && styles.cityButtonActive]}
              onPress={() => setCity(c)}
            >
              <Text
                style={[
                  styles.cityButtonText,
                  city === c && styles.cityButtonTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : fieldsData && fieldsData.fields.length > 0 ? (
        <FlatList
          data={fieldsData.fields}
          renderItem={renderField}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MapPin size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>
            {city} şehrinde saha bulunmuyor
          </Text>
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
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  citySelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cityButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cityButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  cityButtonTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  fieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  fieldImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.background,
  },
  fieldInfo: {
    padding: SPACING.md,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  fieldName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rating: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  fieldMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  fieldAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  priceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  price: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chevron: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md,
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
    textAlign: 'center',
  },
});

