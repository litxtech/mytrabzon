import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, MapPin, Star, Phone, Clock, Calendar } from 'lucide-react-native';

export default function FieldDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: field, isLoading, refetch } = trpc.football.getField.useQuery(
    { field_id: id! },
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

  if (!field) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Saha bulunamadı</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCall = () => {
    if (field.phone) {
      Linking.openURL(`tel:${field.phone}`);
    }
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
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {field.image_url && (
          <Image source={{ uri: field.image_url }} style={styles.fieldImage} />
        )}

        <View style={styles.header}>
          <Text style={styles.title}>{field.name}</Text>
          <View style={styles.ratingContainer}>
            <Star size={20} color={COLORS.warning} fill={COLORS.warning} />
            <Text style={styles.ratingText}>{field.rating?.toFixed(1) || 'N/A'}</Text>
            <Text style={styles.reviewCount}>({field.review_count || 0} yorum)</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {field.district}, {field.city}
            </Text>
          </View>
          {field.address && (
            <View style={styles.infoRow}>
              <MapPin size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>{field.address}</Text>
            </View>
          )}
          {field.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <Phone size={20} color={COLORS.primary} />
              <Text style={[styles.infoText, styles.phoneText]}>{field.phone}</Text>
            </TouchableOpacity>
          )}
          {field.opening_hours && (
            <View style={styles.infoRow}>
              <Clock size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>Açılış: {field.opening_hours}</Text>
            </View>
          )}
          {field.price_per_hour && (
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Saatlik Ücret: {field.price_per_hour} TL</Text>
            </View>
          )}
        </View>

        {field.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>Açıklama</Text>
            <Text style={styles.descriptionText}>{field.description}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.reserveButton}
          onPress={() => router.push(`/football/create-match?field_id=${field.id}` as any)}
        >
          <Calendar size={20} color={COLORS.white} />
          <Text style={styles.reserveButtonText}>Rezervasyon Yap</Text>
        </TouchableOpacity>
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
    paddingBottom: SPACING.xl,
  },
  backButton: {
    padding: SPACING.sm,
  },
  fieldImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,
  },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.warning,
  },
  reviewCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
  phoneText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  descriptionCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginTop: SPACING.md,
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
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    margin: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  reserveButtonText: {
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

