import React, { useEffect, useMemo, useState } from 'react';
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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Calendar, Car, Download, Phone, RefreshCcw, FileText, Eye } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Linking } from 'react-native';

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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const adminCheck = trpc.admin.checkAdmin.useQuery();
  const ridesQuery = trpc.admin.getRideList.useQuery({ limit: 50 }, { enabled: adminCheck.data?.isAdmin === true });
  const rideDetailQuery = trpc.admin.getRideDetail.useQuery(
    { ride_id: selectedRideId! },
    { enabled: !!selectedRideId && adminCheck.data?.isAdmin === true }
  );
  const rides = useMemo(() => ridesQuery.data || [], [ridesQuery.data]);

  useEffect(() => {
    if (!rides || rides.length === 0) {
      if (selectedRideId) {
        setSelectedRideId(null);
      }
      return;
    }

    const exists = selectedRideId && rides.some((ride) => ride.id === selectedRideId);
    if (!exists) {
      setSelectedRideId(rides[0].id);
    }
  }, [rides, selectedRideId]);

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

  const generatePdfMutation = (trpc as any).admin.generateRidePdf.useMutation({
    onSuccess: async (data: any) => {
      setGeneratingPdf(false);
      if (data.pdfUrl) {
        setPdfUrl(data.pdfUrl);
        Alert.alert('Başarılı', 'PDF oluşturuldu ve kaydedildi. İndirmek için butona tıklayın.');
      } else if (data.pdfBase64) {
        // Eğer URL yoksa base64'ten dosya oluştur
        const fileUri = `${FileSystem.documentDirectory}${data.fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, data.pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { dialogTitle: 'Yolculuk PDF İndir' });
        } else {
          Alert.alert('PDF Oluşturuldu', `Dosya kaydedildi: ${fileUri}`);
        }
      } else if (data.rideData && rideDetailQuery.data) {
        // Client-side'da PDF oluştur
        await generatePdfClientSide(rideDetailQuery.data);
      } else if (rideDetailQuery.data) {
        // Edge Function'dan veri gelmediyse mevcut veriyi kullan
        await generatePdfClientSide(rideDetailQuery.data);
      }
    },
    onError: (error: any) => {
      setGeneratingPdf(false);
      // Hata durumunda client-side'da PDF oluşturmayı dene
      if (rideDetailQuery.data) {
        generatePdfClientSide(rideDetailQuery.data).catch((err: any) => {
          Alert.alert('Hata', error.message || 'PDF oluşturulamadı');
        });
      } else {
        Alert.alert('Hata', error.message || 'PDF oluşturulamadı');
      }
    },
  });

  const generatePdfClientSide = async (rideData: any) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      const { width, height } = page.getSize();
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let y = height - 50;
      const margin = 50;
      const lineHeight = 16;
      
      // Başlık
      page.drawText('YOLCULUK ANLAŞMASI', {
        x: margin,
        y,
        size: 20,
        font: fontBold,
      });
      y -= 40;
      
      // Yolculuk bilgileri
      const addLine = (label: string, value: string | number) => {
        if (y < 100) {
          pdfDoc.addPage([595, 842]);
          y = height - 50;
        }
        const currentPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
        currentPage.drawText(`${label}:`, {
          x: margin,
          y,
          size: 11,
          font: fontBold,
        });
        currentPage.drawText(String(value), {
          x: margin + 150,
          y,
          size: 11,
          font: font,
        });
        y -= lineHeight;
      };
      
      addLine('Yolculuk ID', rideData.id?.substring(0, 8) || '-');
      addLine('Kalkış', rideData.departure_title || rideData.from_location || '-');
      addLine('Varış', rideData.destination_title || rideData.to_location || '-');
      addLine('Tarih', formatDateTime(rideData.departure_time || rideData.departure_date));
      addLine('Durum', rideData.status || '-');
      addLine('Fiyat', `${rideData.price_per_seat || rideData.price || 0} TL`);
      addLine('Koltuk', `${rideData.available_seats || rideData.seats || 0}`);
      
      if (rideData.driver_full_name || rideData.driver?.full_name) {
        addLine('Sürücü', rideData.driver_full_name || rideData.driver?.full_name);
        addLine('Telefon', rideData.driver_phone || rideData.driver?.phone || '-');
        if (rideData.driver?.email) {
          addLine('Email', rideData.driver.email);
        }
      }
      
      // PDF'i kaydet
      const pdfBytes = await pdfDoc.save();
      const fileUri = `${FileSystem.documentDirectory}yolculuk-${selectedRideId}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, Buffer.from(pdfBytes).toString('base64'), {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      setPdfUrl(fileUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { dialogTitle: 'Yolculuk PDF İndir' });
      } else {
        Alert.alert('PDF Oluşturuldu', `Dosya kaydedildi: ${fileUri}`);
      }
    } catch (error: any) {
      console.error('PDF generation error:', error);
      Alert.alert('Hata', 'PDF oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const handleGeneratePdf = async () => {
    if (!selectedRideId) {
      Alert.alert('Bilgi', 'Lütfen önce bir yolculuk seçin.');
      return;
    }

    setGeneratingPdf(true);
    setPdfUrl(null);
    generatePdfMutation.mutate({ ride_id: selectedRideId });
  };

  const handleDownloadPdf = async () => {
    if (pdfUrl) {
      // URL'den indir - React Native için
      try {
        const fileUri = `${FileSystem.documentDirectory}yolculuk-${selectedRideId}.pdf`;
        const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri);
        
        if (downloadResult.status === 200) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, { dialogTitle: 'Yolculuk PDF İndir' });
          } else {
            Alert.alert('PDF İndirildi', `Dosya kaydedildi: ${fileUri}`);
          }
        } else {
          throw new Error('İndirme başarısız');
        }
      } catch (error: any) {
        console.error('PDF download error:', error);
        Alert.alert('Hata', 'PDF indirilemedi: ' + (error.message || 'Bilinmeyen hata'));
      }
    } else {
      // Eğer PDF yoksa oluştur
      handleGeneratePdf();
    }
  };

  const handleViewPdf = () => {
    if (pdfUrl) {
      // PDF'i web view'de aç
      Linking.openURL(pdfUrl).catch((err: any) => {
        Alert.alert('Hata', 'PDF açılamadı');
      });
    } else {
      Alert.alert('Bilgi', 'Önce PDF oluşturun');
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
        <View style={styles.detailWrapper}>
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

            <View style={styles.pdfButtonsContainer}>
              <TouchableOpacity
                style={[styles.pdfButton, (generatingPdf || rideDetailQuery.isFetching) && styles.pdfButtonDisabled]}
                disabled={generatingPdf || rideDetailQuery.isFetching}
                onPress={handleGeneratePdf}
              >
                {generatingPdf ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <FileText size={18} color={COLORS.white} />
                    <Text style={styles.pdfButtonText}>PDF Oluştur</Text>
                  </>
                )}
              </TouchableOpacity>

              {pdfUrl && (
                <>
                  <TouchableOpacity
                    style={[styles.pdfButton, styles.pdfViewButton]}
                    onPress={handleViewPdf}
                  >
                    <Eye size={18} color={COLORS.white} />
                    <Text style={styles.pdfButtonText}>Görüntüle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pdfButton, styles.pdfDownloadButton]}
                    onPress={handleDownloadPdf}
                  >
                    <Download size={18} color={COLORS.white} />
                    <Text style={styles.pdfButtonText}>İndir</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
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
  detailWrapper: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
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
    marginBottom: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 2,
    elevation: 3,
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
  pdfButtonsContainer: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  pdfViewButton: {
    backgroundColor: COLORS.secondary,
  },
  pdfDownloadButton: {
    backgroundColor: COLORS.success,
  },
  pdfButtonDisabled: {
    opacity: 0.6,
  },
  pdfButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});

