import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Calendar, Car, Download, Phone, RefreshCcw } from 'lucide-react-native';

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminRidesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);

  const adminCheck = trpc.admin.checkAdmin.useQuery();
  const ridesQuery = trpc.admin.getRideList.useQuery({ limit: 50 }, { enabled: adminCheck.data?.isAdmin === true });
  const rideDetailQuery = trpc.admin.getRideDetail.useQuery(
    { ride_id: selectedRideId! },
    { enabled: !!selectedRideId && adminCheck.data?.isAdmin === true }
  );

  const selectedRide = useMemo(() => {
    if (!selectedRideId) return null;
    return ridesQuery.data?.find((ride) => ride.id === selectedRideId) ?? null;
  }, [selectedRideId, ridesQuery.data]);

  const handleRefresh = () => {
    ridesQuery.refetch();
    if (selectedRideId) {
      rideDetailQuery.refetch();
    }
  };

  const handleDownloadPdf = async () => {
    if (!rideDetailQuery.data) {
      Alert.alert('Bilgi', 'Lütfen önce bir yolculuk seçin.');
      return;
    }

    try {
      const detail = rideDetailQuery.data;
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let cursorY = height - 40;
      const lineHeight = 18;

      const addLine = (text: string, bold = false) => {
        if (cursorY < 60) {
          cursorY = height - 40;
          pdfDoc.addPage();
        }
        page.drawText(text, {
          x: 40,
          y: cursorY,
          size: 12,
          font: bold ? fontBold : font,
        });
        cursorY -= lineHeight;
      };

      addLine('Yolculuk Özeti', true);
      addLine(`Yolculuk ID: ${detail.ride.id}`);
      addLine(`Kalkış: ${detail.ride.departure_title}`);
      if (detail.ride.departure_description) {
        addLine(`Tarif: ${detail.ride.departure_description}`);
      }
      addLine(`Varış: ${detail.ride.destination_title}`);
      if (detail.ride.destination_description) {
        addLine(`Varış Tarifi: ${detail.ride.destination_description}`);
      }
      addLine(`Zaman: ${formatDateTime(detail.ride.departure_time)}`);
      addLine(`Durum: ${detail.ride.status}`);
      addLine('');

      addLine('Sürücü Bilgileri', true);
      addLine(`Ad Soyad: ${detail.ride.driver_full_name}`);
      addLine(`Telefon: ${detail.ride.driver_phone || '-'}`);
      addLine(`Araç: ${detail.ride.vehicle_brand || '-'} ${detail.ride.vehicle_model || ''}`.trim());
      if (detail.ride.vehicle_color) addLine(`Renk: ${detail.ride.vehicle_color}`);
      if (detail.ride.vehicle_plate) addLine(`Plaka: ${detail.ride.vehicle_plate}`);
      addLine('');

      addLine('Rezervasyonlar', true);
      if (detail.bookings.length === 0) {
        addLine('Rezervasyon yok.');
      } else {
        detail.bookings.forEach((booking: any, index: number) => {
          addLine(`${index + 1}. ${booking.passenger_name} • ${booking.seats_requested} koltuk`);
          addLine(`   Telefon: ${booking.passenger_phone || '-'}`);
          addLine(`   Durum: ${booking.status}`);
          if (booking.notes) {
            addLine(`   Not: ${booking.notes}`);
          }
          addLine('');
        });
      }

      if (detail.ride.notes) {
        addLine('Sürücü Notu', true);
        addLine(detail.ride.notes);
      }

      const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });
      const fileUri = `${FileSystem.documentDirectory}yolculuk-${detail.ride.id}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { dialogTitle: 'Yolculuk PDF İndir' });
      } else {
        Alert.alert('PDF Oluşturuldu', `Dosya kaydedildi: ${fileUri}`);
      }
    } catch (error: any) {
      console.error('PDF generation error:', error);
      Alert.alert('Hata', error?.message || 'PDF oluşturulamadı');
    }
  };

  if (adminCheck.isLoading || ridesQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!adminCheck.data?.isAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Bu sayfayı görüntülemek için admin yetkisi gerekir.</Text>
      </View>
    );
  }

  const rides = ridesQuery.data || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'Yolculuk Yönetimi' }} />
      <View style={styles.header}>
        <Text style={styles.title}>Tüm Yolculuklar</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <RefreshCcw size={18} color={COLORS.primary} />
          <Text style={styles.refreshText}>Yenile</Text>
        </TouchableOpacity>
      </View>

      {rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Yolculuk bulunamadı</Text>
          <Text style={styles.emptyText}>Yeni bir yolculuk oluşturulduğunda burada görünecek.</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.rideCard,
                selectedRideId === item.id && styles.rideCardSelected,
              ]}
              onPress={() => setSelectedRideId(item.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {item.departure_title} → {item.destination_title}
                </Text>
                <Text style={styles.statusBadge}>{item.status}</Text>
              </View>
              <View style={styles.cardRow}>
                <Calendar size={16} color={COLORS.textLight} />
                <Text style={styles.cardMeta}>{formatDateTime(item.departure_time)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Car size={16} color={COLORS.textLight} />
                <Text style={styles.cardMeta}>
                  {item.driver_full_name} ({item.driver_phone || '-'})
                </Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>
                  {item.available_seats}/{item.total_seats} koltuk • {item.bookings_count} rezervasyon
                </Text>
                <Text style={styles.cardFooterText}>
                  {item.price_per_seat?.toLocaleString('tr-TR')} TL
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {selectedRide && rideDetailQuery.data && (
        <ScrollView style={styles.detailCard} showsVerticalScrollIndicator={false}>
          <Text style={styles.detailTitle}>Seçilen Yolculuk</Text>
          <Text style={styles.detailPrimary}>
            {selectedRide.departure_title} → {selectedRide.destination_title}
          </Text>
          <Text style={styles.detailMeta}>{formatDateTime(selectedRide.departure_time)}</Text>
          <Text style={styles.detailMeta}>Durum: {selectedRide.status}</Text>
          <Text style={styles.detailMeta}>Sürücü: {selectedRide.driver_full_name}</Text>
          <Text style={styles.detailMeta}>Telefon: {selectedRide.driver_phone || '-'}</Text>
          <Text style={styles.detailMeta}>Araç: {selectedRide.vehicle_brand || '-'} {selectedRide.vehicle_model || ''}</Text>
          {selectedRide.vehicle_plate && <Text style={styles.detailMeta}>Plaka: {selectedRide.vehicle_plate}</Text>}

          <Text style={[styles.detailTitle, styles.sectionSpacing]}>Rezervasyonlar</Text>
          {rideDetailQuery.data.bookings.length === 0 ? (
            <Text style={styles.detailMeta}>Rezervasyon bulunamadı.</Text>
          ) : (
            rideDetailQuery.data.bookings.map((booking: any, index: number) => (
              <View key={booking.id} style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingName}>
                    {index + 1}. {booking.passenger_name}
                  </Text>
                  <Text style={styles.bookingMeta}>
                    {booking.seats_requested} koltuk • {booking.status}
                  </Text>
                  <View style={styles.phoneRow}>
                    <Phone size={14} color={COLORS.textLight} />
                    <Text style={styles.bookingMeta}>{booking.passenger_phone || '-'}</Text>
                  </View>
                  {booking.notes ? <Text style={styles.bookingNote}>Not: {booking.notes}</Text> : null}
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={[styles.pdfButton, rideDetailQuery.isFetching && styles.pdfButtonDisabled]}
            disabled={rideDetailQuery.isFetching}
            onPress={handleDownloadPdf}
          >
            {rideDetailQuery.isFetching ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Download size={18} color={COLORS.white} />
                <Text style={styles.pdfButtonText}>PDF İndir</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  refreshText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    color: COLORS.textLight,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  rideCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rideCardSelected: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    backgroundColor: COLORS.primary + '20',
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  cardMeta: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  cardFooterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  detailPrimary: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailMeta: {
    color: COLORS.textLight,
    marginTop: 2,
  },
  sectionSpacing: {
    marginTop: SPACING.lg,
  },
  bookingRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  bookingName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  bookingMeta: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  bookingNote: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  pdfButton: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  pdfButtonDisabled: {
    opacity: 0.6,
  },
  pdfButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});

