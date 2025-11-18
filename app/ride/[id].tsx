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
import { ArrowLeft, Clock, Users, FileText, CheckCircle, XCircle, Car } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function RideDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);

  const { data: rideData, isLoading, refetch } = trpc.ride.getRideDetail.useQuery(
    { ride_id: id! },
    { enabled: !!id }
  );
  const approveBookingMutation = trpc.ride.approveBooking.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Rezervasyon onaylandı!');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Rezervasyon onaylanamadı');
    },
    onSettled: () => setActionBookingId(null),
  });

  const rejectBookingMutation = trpc.ride.rejectBooking.useMutation({
    onSuccess: () => {
      Alert.alert('Bilgi', 'Rezervasyon reddedildi.');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Rezervasyon reddedilemedi');
    },
    onSettled: () => setActionBookingId(null),
  });


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
    const passengerPhone = profile?.phone?.trim();
    if (!passengerPhone) {
      Alert.alert(
        'Telefon Gerekli',
        'Rezervasyon yapabilmek için profil ayarlarından telefon numaranızı ekleyin.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Profilim', onPress: () => router.push('/profile/edit' as any) },
        ]
      );
      return;
    }

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
              passenger_phone: passengerPhone,
            });
          },
        },
      ]
    );
  };

  if (isLoading || !rideData) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const ride = rideData?.ride || rideData;
  const userBooking = rideData?.userBooking || null;
  const driverBookings = rideData?.bookings || [];
  const driver = ride?.driver as any;
  const isDriverFromApi = rideData?.isDriver ?? false;
  const isDriver = isDriverFromApi || user?.id === ride?.driver_id;
  const hasBooking = userBooking !== null;

  const handleApproveBooking = (bookingId: string) => {
    Alert.alert(
      'Rezervasyonu Onayla',
      'Bu yolculuk talebini onaylamak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: () => {
            setActionBookingId(bookingId);
            approveBookingMutation.mutate({ booking_id: bookingId });
          },
        },
      ]
    );
  };

  const handleRejectBooking = (bookingId: string) => {
    Alert.alert(
      'Rezervasyonu Reddet',
      'Bu yolculuk talebini reddetmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: () => {
            setActionBookingId(bookingId);
            rejectBookingMutation.mutate({ booking_id: bookingId });
          },
        },
      ]
    );
  };

  const handleDriverPress = () => {
    if (driver?.id) {
      router.push(`/profile/${driver.id}` as any);
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
          title: 'Yolculuk Detayı',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Sürücü Bilgisi */}
        <TouchableOpacity style={styles.driverCard} activeOpacity={0.85} onPress={handleDriverPress}>
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
            {ride.driver_full_name && ride.driver_full_name !== driver?.full_name && (
              <Text style={styles.driverMeta}>İlan sahibi: {ride.driver_full_name}</Text>
            )}
            {driver?.bio && <Text style={styles.driverBio}>{driver.bio}</Text>}
            {(ride.vehicle_brand || ride.vehicle_model) && (
              <Text style={styles.driverMeta}>
                Araç: {[ride.vehicle_brand, ride.vehicle_model].filter(Boolean).join(' ')}
                {ride.vehicle_color ? ` • ${ride.vehicle_color}` : ''}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {(ride.vehicle_brand || ride.vehicle_plate || ride.vehicle_color) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Araç Bilgileri</Text>

            {ride.vehicle_brand && ride.vehicle_model && (
              <View style={styles.detailRow}>
                <Car size={20} color={COLORS.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Marka & Model</Text>
                  <Text style={styles.detailValue}>
                    {ride.vehicle_brand} {ride.vehicle_model}
                  </Text>
                </View>
              </View>
            )}

            {ride.vehicle_color && (
              <View style={styles.detailRow}>
                <FileText size={20} color={COLORS.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Renk</Text>
                  <Text style={styles.detailValue}>{ride.vehicle_color}</Text>
                </View>
              </View>
            )}

            {ride.vehicle_plate && (
              <View style={styles.detailRow}>
                <FileText size={20} color={COLORS.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Plaka</Text>
                  <Text style={styles.plateValue}>{ride.vehicle_plate}</Text>
                </View>
              </View>
            )}
          </View>
        )}

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
              <Text style={styles.currencyIcon}>₺</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Kişi Başı Fiyat</Text>
                <Text style={styles.detailValue}>
                  {ride.price_per_seat} {ride.currency || 'TL'}
                </Text>
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
        {hasBooking && userBooking && ride && (
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

        {isDriver && driverBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rezervasyon Talepleri</Text>
            {driverBookings.map((booking: any) => {
              const passenger = booking.passenger || {};
              const isActionPending =
                actionBookingId === booking.id &&
                (approveBookingMutation.isPending || rejectBookingMutation.isPending);
              const isApproving =
                actionBookingId === booking.id && approveBookingMutation.isPending;
              const isRejecting =
                actionBookingId === booking.id && rejectBookingMutation.isPending;

              return (
                <View key={booking.id} style={styles.bookingRequestCard}>
                  <View style={styles.bookingPassengerRow}>
                    <Image
                      source={{ uri: passenger.avatar_url || 'https://via.placeholder.com/48' }}
                      style={styles.bookingAvatar}
                    />
                    <View style={styles.bookingPassengerInfo}>
                      <Text style={styles.bookingPassengerName}>{passenger.full_name || 'Kullanıcı'}</Text>
                      <Text style={styles.bookingPassengerMeta}>
                        {booking.seats_requested} koltuk ·{' '}
                        {booking.status === 'pending'
                          ? 'Beklemede'
                          : booking.status === 'approved'
                          ? 'Onaylandı'
                          : booking.status === 'rejected'
                          ? 'Reddedildi'
                          : 'İptal Edildi'}
                      </Text>
                    </View>
                  </View>

                  {booking.status === 'pending' && (
                    <View style={styles.bookingActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.rejectButton,
                          isActionPending && styles.actionButtonDisabled,
                        ]}
                        disabled={isActionPending}
                        onPress={() => handleRejectBooking(booking.id)}
                      >
                        {isRejecting ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <Text style={styles.actionButtonText}>Reddet</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.approveButton,
                          isActionPending && styles.actionButtonDisabled,
                        ]}
                        disabled={isActionPending}
                        onPress={() => handleApproveBooking(booking.id)}
                      >
                        {isApproving ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <Text style={styles.actionButtonText}>Onayla</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Beni de Al Butonu */}
        {!isDriver && !hasBooking && ride && ride.available_seats > 0 && (
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
  driverMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
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
  currencyIcon: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  plateValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
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
  bookingRequestCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  bookingPassengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bookingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  bookingPassengerInfo: {
    flex: 1,
  },
  bookingPassengerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  bookingPassengerMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  actionButtonDisabled: {
    opacity: 0.5,
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

