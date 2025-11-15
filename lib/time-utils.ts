/**
 * Zaman formatlama yardımcı fonksiyonları
 * Instagram benzeri canlı zaman gösterimi
 */

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Şimdi (1 dakikadan az)
  if (diffSeconds < 60) {
    return 'Şimdi';
  }

  // Dakikalar (1 saatten az)
  if (diffMins < 60) {
    return `${diffMins} dakika önce`;
  }

  // Saatler (24 saatten az)
  if (diffHours < 24) {
    return `${diffHours} saat önce`;
  }

  // Günler (7 günden az)
  if (diffDays < 7) {
    if (diffDays === 1) {
      return 'Dün';
    }
    return `${diffDays} gün önce`;
  }

  // Haftalar (4 haftadan az)
  if (diffWeeks < 4) {
    if (diffWeeks === 1) {
      return '1 hafta önce';
    }
    return `${diffWeeks} hafta önce`;
  }

  // Aylar (12 aydan az)
  if (diffMonths < 12) {
    if (diffMonths === 1) {
      return '1 ay önce';
    }
    return `${diffMonths} ay önce`;
  }

  // Yıllar
  if (diffYears === 1) {
    return '1 yıl önce';
  }
  return `${diffYears} yıl önce`;
}

