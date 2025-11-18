import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Clock, Users, DollarSign, FileText, CheckCircle, XCircle } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function RideDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const { data, isLoading, refetch } = trpc.ride.getRideDetail.useQuery(
    { rideId: id! },
    { enabled: !!id }
  );

  const bookRideMutation = trpc.ride.bookRide.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Rezervasyon talebiniz gönderildi! Sürücü onayladığında bildirim alacaksınız.');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Rezervasyon oluşturulamadı');
    },
  });

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

  const handleBookRide = () => {
    if (!id) return;
    
    Alert.alert(
      'Rezervasyon Onayı',
      'Bu yolculuğa rezervasyon yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Rezervasyon Yap',
          onPress: () => {
            bookRideMutation.mutate({
              ride_offer_id: id,
              seats_requested: 1,
            });
          },
        },
      ]
    );
  };

  if (isLoading || !data) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const { ride, userBooking } = data;
  const driver = ride.driver as any;
  const isDriver = user?.id === ride.driver_id;
  const hasBooking = userBooking !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          title: 'Yolculuk Detayı',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Sürücü Bilgisi */}
        <View style={styles.driverCard}>
          <Image
            source={{ uri: driver?.avatar_url || 'https://via.placeholder.com/60' }}
            style={styles.driverAvatar}
          />
          <View style={styles.driverInfo}>
            <View style={styles.driverHeader}>
              <Text style={styles.driverName}>{driver?.full_name || 'İsimsiz'}</Text>
              {driver?.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>
            {driver?.bio && (
              <Text style={styles.driverBio}>{driver.bio}</Text>
            )}
          </View>
        </View>

        {/* Rota */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rota</Text>
          
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={styles.routeDot} />
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Kalkış</Text>
                <Text style={styles.routeTitle}>{ride.departure_title}</Text>
                {ride.departure_description && (
                  <Text style={styles.routeDescription}>{ride.departure_description}</Text>
                )}
              </View>
            </View>

            {ride.stops_text && ride.stops_text.length > 0 && (
              <View style={styles.stopsContainer}>
                <Text style={styles.stopsTitle}>Uğranacak Yerler:</Text>
                {ride.stops_text.map((stop: string, index: number) => (
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
                <Text style={styles.routeLabel}>Varış</Text>
                <Text style={styles.routeTitle}>{ride.destination_title}</Text>
                {ride.destination_description && (
                  <Text style={styles.routeDescription}>{ride.destination_description}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Detaylar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detaylar</Text>
          
          <View style={styles.detailRow}>
            <Clock size={20} color={COLORS.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Kalkış Zamanı</Text>
              <Text style={styles.detailValue}>{formatDateTime(ride.departure_time)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Users size={20} color={COLORS.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Boş Koltuk</Text>
              <Text style={styles.detailValue}>
                {ride.available_seats} / {ride.total_seats}
              </Text>
            </View>
          </View>

          {ride.price_per_seat && (
            <View style={styles.detailRow}>
              <DollarSign size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Kişi Başı Fiyat</Text>
                <Text style={styles.detailValue}>{ride.price_per_seat} TL</Text>
              </View>
            </View>
          )}
        </View>

        {/* Kurallar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kurallar</Text>
          
          <View style={styles.ruleRow}>
            {ride.allow_smoking ? (
              <CheckCircle size={20} color={COLORS.success} />
            ) : (
              <XCircle size={20} color={COLORS.error} />
            )}
            <Text style={styles.ruleText}>
              {ride.allow_smoking ? 'Sigara içilir' : 'Sigara içilmez'}
            </Text>
          </View>

          <View style={styles.ruleRow}>
            {ride.allow_pets ? (
              <CheckCircle size={20} color={COLORS.success} />
            ) : (
              <XCircle size={20} color={COLORS.error} />
            )}
            <Text style={styles.ruleText}>
              {ride.allow_pets ? 'Evcil hayvan olabilir' : 'Evcil hayvan kabul edilmez'}
            </Text>
          </View>
        </View>

        {/* Notlar */}
        {ride.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <View style={styles.notesContainer}>
              <FileText size={20} color={COLORS.textLight} />
              <Text style={styles.notesText}>{ride.notes}</Text>
            </View>
          </View>
        )}

        {/* Rezervasyon Durumu */}
        {hasBooking && userBooking && (
          <View style={styles.bookingStatusCard}>
            <Text style={styles.bookingStatusTitle}>Rezervasyon Durumunuz</Text>
            <Text style={styles.bookingStatusText}>
              Durum: {userBooking.status === 'pending' ? 'Beklemede' : 
                      userBooking.status === 'approved' ? 'Onaylandı' :
                      userBooking.status === 'rejected' ? 'Reddedildi' : 'İptal Edildi'}
            </Text>
            {userBooking.notes && (
              <Text style={styles.bookingNotes}>{userBooking.notes}</Text>
            )}
          </View>
        )}

        {/* Beni de Al Butonu */}
        {!isDriver && !hasBooking && ride.available_seats > 0 && (
          <TouchableOpacity
            style={[styles.bookButton, bookRideMutation.isPending && styles.bookButtonDisabled]}
            onPress={handleBookRide}
            disabled={bookRideMutation.isPending}
          >
            {bookRideMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.bookButtonText}>Beni de Al</Text>
            )}
          </TouchableOpacity>
        )}

        {isDriver && (
          <View style={styles.driverMessageCard}>
            <Text style={styles.driverMessageText}>
              Bu yolculuk ilanını siz oluşturdunuz
            </Text>
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
  backButton: {
    padding: SPACING.sm,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  driverCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverInfo: {
    flex: 1,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  driverName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  driverBio: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  routeContainer: {
    gap: SPACING.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  routeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  routeDotEnd: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    marginTop: 4,
  },
  routeStopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.textLight,
    marginTop: 6,
    marginLeft: 3,
  },
  routeContent: {
    flex: 1,
  },
  routeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 2,
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
    marginLeft: 8,
    paddingLeft: SPACING.md,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  stopsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  stopText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  ruleText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  notesText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  bookingStatusCard: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  bookingStatusTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  bookingStatusText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  bookingNotes: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  driverMessageCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  driverMessageText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

