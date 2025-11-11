export const CITIES = [
  { label: 'Trabzon', value: 'Trabzon' },
  { label: 'Giresun', value: 'Giresun' },
] as const;

export type City = typeof CITIES[number]['value'];

export const GENDERS = [
  { label: 'Erkek', value: 'male' },
  { label: 'Kadın', value: 'female' },
  { label: 'Belirtmek İstemiyorum', value: 'other' },
] as const;

export type Gender = typeof GENDERS[number]['value'];

export const SOCIAL_MEDIA_PLATFORMS = [
  { label: 'Instagram', value: 'instagram', icon: '📷' },
  { label: 'Twitter/X', value: 'twitter', icon: '🐦' },
  { label: 'Facebook', value: 'facebook', icon: '👤' },
  { label: 'LinkedIn', value: 'linkedin', icon: '💼' },
  { label: 'TikTok', value: 'tiktok', icon: '🎵' },
  { label: 'YouTube', value: 'youtube', icon: '▶️' },
] as const;

export type SocialMediaPlatform = typeof SOCIAL_MEDIA_PLATFORMS[number]['value'];
