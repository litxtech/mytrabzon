/**
 * Security Utilities
 * Güvenlik kontrolleri ve validasyonlar için yardımcı fonksiyonlar
 */

/**
 * SQL injection koruması - string sanitization
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // SQL injection karakterlerini temizle
  return input
    .replace(/['";\\]/g, '') // SQL özel karakterleri
    .replace(/--/g, '') // SQL yorumları
    .replace(/\/\*/g, '') // SQL yorumları
    .replace(/\*\//g, '') // SQL yorumları
    .trim();
};

/**
 * XSS koruması - HTML escape
 */
export const escapeHtml = (text: string): string => {
  if (typeof text !== 'string') {
    return '';
  }
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Rate limiting için basit token bucket
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canProceed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Eski istekleri temizle
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }
}

/**
 * Password strength validator
 */
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push('Şifre en az 8 karakter olmalıdır');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Şifre en az bir büyük harf içermelidir');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Şifre en az bir küçük harf içermelidir');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Şifre en az bir rakam içermelidir');
  }
  
  // Zorunlu değil ama önerilir
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push('Şifre en az bir özel karakter içermelidir');
  // }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

/**
 * Phone number validation (Turkish format)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Türkiye telefon numarası formatı: +90XXXXXXXXXX veya 0XXXXXXXXXX
  const cleaned = phone.replace(/\s+/g, '').replace(/[()-]/g, '');
  const turkishPhoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
  
  return turkishPhoneRegex.test(cleaned);
};

/**
 * Input length validator
 */
export const validateInputLength = (
  input: string,
  minLength: number = 1,
  maxLength: number = 1000
): boolean => {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  const length = input.trim().length;
  return length >= minLength && length <= maxLength;
};

/**
 * URL validation
 */
export const validateUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Content moderation - basit profanity filter
 */
export const containsProfanity = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Basit kelime listesi - production'da daha kapsamlı bir servis kullanılmalı
  const profanityWords = [
    // Türkçe küfürler (örnek - gerçek liste daha kapsamlı olmalı)
    // Bu liste production'da bir moderation servisi ile değiştirilmeli
  ];
  
  const lowerText = text.toLowerCase();
  return profanityWords.some(word => lowerText.includes(word));
};

/**
 * Secure random string generator
 */
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  return Array.from(randomValues)
    .map(value => chars[value % chars.length])
    .join('');
};

