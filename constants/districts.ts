import { District, City } from '@/types/database';

export const TRABZON_DISTRICTS: District[] = [
  'Ortahisar',
  'Akçaabat',
  'Araklı',
  'Arsin',
  'Beşikdüzü',
  'Çarşıbaşı',
  'Çaykara',
  'Dernekpazarı',
  'Düzköy',
  'Hayrat',
  'Köprübaşı',
  'Maçka',
  'Of',
  'Sürmene',
  'Şalpazarı',
  'Tonya',
  'Vakfıkebir',
  'Yomra',
];

export const GIRESUN_DISTRICTS: District[] = [
  'Alucra',
  'Bulancak',
  'Çamoluk',
  'Çanakçı',
  'Dereli',
  'Doğankent',
  'Espiye',
  'Eynesil',
  'Görele',
  'Güce',
  'Keşap',
  'Merkez',
  'Piraziz',
  'Şebinkarahisar',
  'Tirebolu',
  'Yağlıdere',
];

export const DISTRICTS: District[] = [
  ...TRABZON_DISTRICTS,
  ...GIRESUN_DISTRICTS,
];

export const getDistrictsByCity = (city: City): District[] => {
  if (city === 'Trabzon') return TRABZON_DISTRICTS;
  if (city === 'Giresun') return GIRESUN_DISTRICTS;
  return [];
};

export const DISTRICT_BADGES: Record<District, string> = {
  'Ortahisar': '🏛️',
  'Akçaabat': '🥙',
  'Araklı': '🏔️',
  'Arsin': '🌊',
  'Beşikdüzü': '⛰️',
  'Çarşıbaşı': '🏞️',
  'Çaykara': '☕',
  'Dernekpazarı': '🌲',
  'Düzköy': '🌾',
  'Hayrat': '🎣',
  'Köprübaşı': '🌉',
  'Maçka': '🏞️',
  'Of': '🌿',
  'Sürmene': '⚓',
  'Şalpazarı': '🌳',
  'Tonya': '🥜',
  'Vakfıkebir': '🎋',
  'Yomra': '🏖️',
  'Alucra': '⛰️',
  'Bulancak': '🌊',
  'Çamoluk': '🏔️',
  'Çanakçı': '🌲',
  'Dereli': '🌳',
  'Doğankent': '🏞️',
  'Espiye': '⚓',
  'Eynesil': '🎣',
  'Görele': '🌊',
  'Güce': '🌾',
  'Keşap': '🥜',
  'Merkez': '🏛️',
  'Piraziz': '🏖️',
  'Şebinkarahisar': '🏰',
  'Tirebolu': '⚓',
  'Yağlıdere': '🌿',
};
