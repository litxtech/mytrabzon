/**
 * Crash Prevention Utilities
 * 100K kullanıcı için optimize edilmiş crash önleme mekanizmaları
 */

import { Platform } from 'react-native';

/**
 * Global error handler - yakalanmamış hataları yakalar
 */
export const setupGlobalErrorHandler = () => {
  // React Native error handler
  const originalHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('🚨 Global Error Handler:', error);
    console.error('🚨 Is Fatal:', isFatal);
    
    // Production'da crash reporting servisine gönder
    if (!__DEV__) {
      // TODO: Sentry veya başka bir crash reporting servisine gönder
      // Sentry.captureException(error, { level: isFatal ? 'fatal' : 'error' });
    }
    
    // Orijinal handler'ı çağır
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  // Promise rejection handler
  const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    
    if (!__DEV__) {
      // TODO: Crash reporting
    }
    
    // Default davranışı engelle (crash'i önle)
    event.preventDefault();
  };

  // React Native'de Promise rejection'ları yakala
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
  }
};

// React hooks burada değil - hooks klasöründe olmalı

/**
 * Rate limiter - API çağrılarını sınırla
 */
export class RateLimiter {
  private calls: Map<string, number[]> = new Map();
  private maxCalls: number;
  private windowMs: number;

  constructor(maxCalls: number = 10, windowMs: number = 1000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  canCall(key: string): boolean {
    const now = Date.now();
    const callTimes = this.calls.get(key) || [];

    // Eski çağrıları temizle
    const recentCalls = callTimes.filter(time => now - time < this.windowMs);
    this.calls.set(key, recentCalls);

    return recentCalls.length < this.maxCalls;
  }

  recordCall(key: string): void {
    const now = Date.now();
    const callTimes = this.calls.get(key) || [];
    callTimes.push(now);
    this.calls.set(key, callTimes);
  }

  reset(key?: string): void {
    if (key) {
      this.calls.delete(key);
    } else {
      this.calls.clear();
    }
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter(20, 1000); // 20 çağrı/saniye

/**
 * Güvenli navigation wrapper
 */
export const safeNavigate = (
  router: any,
  path: string,
  params?: any,
  options?: { retries?: number; delay?: number }
) => {
  const { retries = 3, delay = 100 } = options || {};

  const attemptNavigate = (attempt: number): void => {
    if (!router) {
      console.warn('Router is not available');
      return;
    }

    try {
      if (params) {
        router.push({ pathname: path, params } as any);
      } else {
        router.push(path as any);
      }
    } catch (error) {
      console.error(`Navigation attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        setTimeout(() => attemptNavigate(attempt + 1), delay * attempt);
      }
    }
  };

  attemptNavigate(1);
};

/**
 * Memory monitor - memory leak'leri tespit et
 */
export const createMemoryMonitor = () => {
  if (__DEV__ && Platform.OS === 'ios') {
    // iOS'ta memory kullanımını izle
    const checkMemory = () => {
      try {
        const memoryInfo = (performance as any).memory;
        if (memoryInfo) {
          const usedMB = memoryInfo.usedJSHeapSize / 1048576;
          const totalMB = memoryInfo.totalJSHeapSize / 1048576;
          
          if (usedMB > 100) {
            console.warn(`⚠️ High memory usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB`);
          }
        }
      } catch (error) {
        // Memory monitoring hatası - sessizce devam et
      }
    };

    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkMemory, 30000);

    return () => clearInterval(interval);
  }

  return () => {}; // No-op cleanup
};

