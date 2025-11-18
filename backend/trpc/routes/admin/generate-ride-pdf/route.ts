import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const generateRidePdfProcedure = protectedProcedure
  .input(
    z.object({
      ride_id: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

    // Admin kontrolü
    const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
    let isAdmin = false;

    if (user.id === SPECIAL_ADMIN_ID) {
      isAdmin = true;
    } else {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (adminUser) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Unauthorized: Admin access required',
      });
    }

    // Yolculuk detaylarını getir
    const { data: rideData, error: rideError } = await supabase
      .from('ride_offers')
      .select(`
        *,
        driver:profiles(id, full_name, avatar_url, phone, email),
        bookings:ride_bookings(
          *,
          passenger:profiles(id, full_name, phone, email)
        )
      `)
      .eq('id', input.ride_id)
      .single();

    if (rideError || !rideData) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Yolculuk bulunamadı',
      });
    }

    // PDF oluştur
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 boyutu
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    const margin = 50;
    const lineHeight = 16;
    const sectionSpacing = 25;

    // Başlık
    page.drawText('YOLCULUK ANLAŞMASI', {
      x: margin,
      y,
      size: 20,
      font: fontTitle,
      color: rgb(0, 0.4, 0.8),
    });
    y -= 30;

    // Tarih
    const now = new Date();
    page.drawText(`Oluşturulma Tarihi: ${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`, {
      x: margin,
      y,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= sectionSpacing;

    // Yolculuk Bilgileri
    page.drawText('YOLCULUK BİLGİLERİ', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight * 1.5;

    const formatDateTime = (value?: string | null) => {
      if (!value) return '-';
      return new Date(value).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const addLine = (label: string, value: string | number, bold = false) => {
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
      const valueText = String(value);
      const valueWidth = font.widthOfTextAtSize(valueText, 11);
      currentPage.drawText(valueText, {
        x: width - margin - valueWidth,
        y,
        size: 11,
        font: bold ? fontBold : font,
      });
      y -= lineHeight;
    };

    addLine('Yolculuk ID', rideData.id.substring(0, 8) + '...');
    addLine('Kalkış Noktası', rideData.departure_title);
    if (rideData.departure_description) {
      addLine('Kalkış Açıklaması', rideData.departure_description);
    }
    addLine('Varış Noktası', rideData.destination_title);
    if (rideData.destination_description) {
      addLine('Varış Açıklaması', rideData.destination_description);
    }
    addLine('Kalkış Zamanı', formatDateTime(rideData.departure_time));
    addLine('Durum', rideData.status.toUpperCase());
    addLine('Toplam Koltuk', rideData.total_seats);
    addLine('Boş Koltuk', rideData.available_seats);
    addLine('Koltuk Başına Fiyat', `${rideData.price_per_seat || 0} TL`);

    y -= sectionSpacing;

    y -= sectionSpacing;

    // Sürücü Bilgileri
    const currentPageDriver = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    if (y < 100) {
      pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
    const currentPageDriver2 = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    currentPageDriver2.drawText('SÜRÜCÜ BİLGİLERİ', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight * 1.5;

    addLine('Ad Soyad', rideData.driver_full_name || rideData.driver?.full_name || '-');
    addLine('Telefon', rideData.driver_phone || rideData.driver?.phone || '-');
    if (rideData.driver?.email) {
      addLine('E-posta', rideData.driver.email);
    }
    addLine('Araç Markası', rideData.vehicle_brand || '-');
    addLine('Araç Modeli', rideData.vehicle_model || '-');
    if (rideData.vehicle_color) {
      addLine('Araç Rengi', rideData.vehicle_color);
    }
    if (rideData.vehicle_plate) {
      addLine('Plaka', rideData.vehicle_plate);
    }

    y -= sectionSpacing;

    // Rezervasyonlar
    const currentPage1 = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    currentPage1.drawText('REZERVASYONLAR', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight * 1.5;

    const bookings = rideData.bookings || [];
    if (bookings.length === 0) {
      addLine('Rezervasyon', 'Rezervasyon bulunmamaktadır');
    } else {
      bookings.forEach((booking: any, index: number) => {
        if (y < 100) {
          pdfDoc.addPage([595, 842]);
          y = height - 50;
        }
        const currentPage2 = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
        currentPage2.drawText(`${index + 1}. Yolcu:`, {
          x: margin,
          y,
          size: 11,
          font: fontBold,
        });
        y -= lineHeight;
        addLine('  Ad Soyad', booking.passenger_name || booking.passenger?.full_name || '-');
        addLine('  Telefon', booking.passenger_phone || booking.passenger?.phone || '-');
        addLine('  Koltuk Sayısı', booking.seats_requested);
        addLine('  Durum', booking.status.toUpperCase());
        if (booking.notes) {
          addLine('  Not', booking.notes);
        }
        y -= 5;
      });
    }

    // Sürücü Notu
    if (rideData.notes) {
      y -= sectionSpacing;
      if (y < 100) {
        pdfDoc.addPage([595, 842]);
        y = height - 50;
      }
      const currentPage3 = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
      currentPage3.drawText('SÜRÜCÜ NOTU', {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight * 1.5;
      
      // Notu satırlara böl
      const notesLines = rideData.notes.split('\n');
      notesLines.forEach((line: string) => {
        if (y < 100) {
          pdfDoc.addPage([595, 842]);
          y = height - 50;
        }
        const currentPage4 = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
        currentPage4.drawText(line, {
          x: margin,
          y,
          size: 11,
          font: font,
        });
        y -= lineHeight;
      });
    }

    // PDF'i base64'e çevir
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    // Supabase Storage'a kaydet
    const fileName = `ride-agreements/${input.ride_id}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('posts') // Mevcut bucket'ı kullan, veya 'ride-pdfs' bucket'ı oluşturulabilir
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      // Upload hatası olsa bile PDF'i base64 olarak döndür
      return {
        pdfBase64,
        pdfUrl: null,
        fileName: `yolculuk-${input.ride_id}.pdf`,
      };
    }

    // Public URL oluştur
    const { data: { publicUrl } } = supabase.storage
      .from('posts')
      .getPublicUrl(uploadData.path);

    return {
      pdfBase64,
      pdfUrl: publicUrl,
      fileName: `yolculuk-${input.ride_id}.pdf`,
      storagePath: uploadData.path,
    };
  });

