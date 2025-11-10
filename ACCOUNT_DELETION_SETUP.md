# Hesap Silme Özelliği - Veritabanı Güncellemesi

## Supabase SQL Editor'da Çalıştırılacak Komut

Aşağıdaki SQL komutunu Supabase Dashboard'da SQL Editor'da çalıştırın:

```sql
-- User profiles tablosuna hesap silme alanlarını ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;
```

## Özellik Detayları

### Kullanıcı Perspektifi
1. Profil ekranında "Hesabı Sil" butonu
2. Silme onayı dialogu ile detaylı bilgilendirme
3. 7 günlük geri alma süresi
4. Bu süre içinde giriş yapılırsa hesap geri yüklenebilir

### Teknik Detaylar
- **deletion_requested_at**: Kullanıcının hesap silme talebinde bulunduğu tarih
- **deletion_scheduled_at**: Hesabın kalıcı olarak silineceği tarih (talep + 7 gün)

### Backend API
- `trpc.user.requestAccountDeletion.useMutation()`: Hesap silme talebi
- `trpc.user.cancelAccountDeletion.useMutation()`: Hesap silme iptali

### Silinecek Veriler
- Profil bilgileri
- Paylaşımlar
- Yorumlar  
- Mesajlar
- Tüm kişisel veriler

## Önemli Not
Bu SQL komutunu çalıştırdıktan sonra hesap silme özelliği aktif olacaktır. Kullanıcılar profil sayfasından hesaplarını silebileceklerdir.

## Geri Yükleme İşlemi
Kullanıcı 7 gün içinde giriş yaparsa:
```typescript
// AuthContext.tsx içinde login sonrası kontrol eklenebilir
if (profile.deletion_scheduled_at) {
  // Hesap silmeyi iptal et
  await trpc.user.cancelAccountDeletion.mutate();
  Alert.alert('Hoş Geldiniz', 'Hesabınız geri yüklendi.');
}
```

## Otomatik Silme (Opsiyonel)
7 gün sonunda hesapları otomatik silmek için Supabase Edge Function veya cron job kurulabilir.
