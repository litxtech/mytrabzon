// KTÜ (Karadeniz Teknik Üniversitesi) Constants

export type KTUFaculty = {
  id: string;
  name: string;
  code: string;
  description?: string;
};

export type KTUDepartment = {
  id: string;
  faculty_id: string;
  name: string;
  code: string;
  description?: string;
};

export type KTUEventType = 'seminar' | 'concert' | 'sports' | 'academic' | 'social' | 'club' | 'general';

export type KTUAnnouncementCategory = 'general' | 'faculty' | 'department' | 'club' | 'event' | 'exam' | 'academic';

export type KTUVerificationStatus = 'pending' | 'verified' | 'rejected';

export type KTUClubRole = 'member' | 'board' | 'president';

// Fakülteler (varsayılan)
export const KTU_FACULTIES: Omit<KTUFaculty, 'id'>[] = [
  { name: 'Mühendislik Fakültesi', code: 'MUH', description: 'Karadeniz Teknik Üniversitesi Mühendislik Fakültesi' },
  { name: 'Fen Fakültesi', code: 'FEN', description: 'Karadeniz Teknik Üniversitesi Fen Fakültesi' },
  { name: 'İktisadi ve İdari Bilimler Fakültesi', code: 'IIBF', description: 'Karadeniz Teknik Üniversitesi İİBF' },
  { name: 'Mimarlık Fakültesi', code: 'MIM', description: 'Karadeniz Teknik Üniversitesi Mimarlık Fakültesi' },
  { name: 'Orman Fakültesi', code: 'ORM', description: 'Karadeniz Teknik Üniversitesi Orman Fakültesi' },
  { name: 'Tıp Fakültesi', code: 'TIP', description: 'Karadeniz Teknik Üniversitesi Tıp Fakültesi' },
  { name: 'Eğitim Fakültesi', code: 'EGT', description: 'Karadeniz Teknik Üniversitesi Eğitim Fakültesi' },
  { name: 'Güzel Sanatlar Fakültesi', code: 'GSF', description: 'Karadeniz Teknik Üniversitesi Güzel Sanatlar Fakültesi' },
];

// Etkinlik tipleri
export const KTU_EVENT_TYPES: { value: KTUEventType; label: string }[] = [
  { value: 'seminar', label: 'Seminer' },
  { value: 'concert', label: 'Konser' },
  { value: 'sports', label: 'Spor' },
  { value: 'academic', label: 'Akademik' },
  { value: 'social', label: 'Sosyal' },
  { value: 'club', label: 'Kulüp' },
  { value: 'general', label: 'Genel' },
];

// Duyuru kategorileri
export const KTU_ANNOUNCEMENT_CATEGORIES: { value: KTUAnnouncementCategory; label: string }[] = [
  { value: 'general', label: 'Genel' },
  { value: 'faculty', label: 'Fakülte' },
  { value: 'department', label: 'Bölüm' },
  { value: 'club', label: 'Kulüp' },
  { value: 'event', label: 'Etkinlik' },
  { value: 'exam', label: 'Sınav' },
  { value: 'academic', label: 'Akademik' },
];

// Sınıf seçenekleri
export const KTU_CLASS_YEARS = [1, 2, 3, 4, 5, 6, 7, 8];

// Doğrulama durumları
export const KTU_VERIFICATION_STATUSES: { value: KTUVerificationStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Beklemede', color: '#FFA500' },
  { value: 'verified', label: 'Doğrulandı', color: '#00C853' },
  { value: 'rejected', label: 'Reddedildi', color: '#D32F2F' },
];

