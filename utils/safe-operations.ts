/**
 * Güvenli Operasyonlar - 100K Kullanıcı İçin Optimize Edilmiş
 * Tüm kritik operasyonları null-safe ve crash-proof hale getirir
 */

/**
 * Güvenli array işlemleri
 */
export const safeArray = {
  /**
   * Null-safe map işlemi
   */
  map: <T, R>(arr: T[] | null | undefined, fn: (item: T, index: number) => R): R[] => {
    if (!arr || !Array.isArray(arr)) return [];
    try {
      return arr.map(fn);
    } catch (error) {
      console.error('Safe array map error:', error);
      return [];
    }
  },

  /**
   * Null-safe filter işlemi
   */
  filter: <T>(arr: T[] | null | undefined, fn: (item: T, index: number) => boolean): T[] => {
    if (!arr || !Array.isArray(arr)) return [];
    try {
      return arr.filter(fn);
    } catch (error) {
      console.error('Safe array filter error:', error);
      return [];
    }
  },

  /**
   * Null-safe forEach işlemi
   */
  forEach: <T>(arr: T[] | null | undefined, fn: (item: T, index: number) => void): void => {
    if (!arr || !Array.isArray(arr)) return;
    try {
      arr.forEach(fn);
    } catch (error) {
      console.error('Safe array forEach error:', error);
    }
  },

  /**
   * Null-safe reduce işlemi
   */
  reduce: <T, R>(
    arr: T[] | null | undefined,
    fn: (acc: R, item: T, index: number) => R,
    initialValue: R
  ): R => {
    if (!arr || !Array.isArray(arr)) return initialValue;
    try {
      return arr.reduce(fn, initialValue);
    } catch (error) {
      console.error('Safe array reduce error:', error);
      return initialValue;
    }
  },

  /**
   * Null-safe find işlemi
   */
  find: <T>(arr: T[] | null | undefined, fn: (item: T) => boolean): T | undefined => {
    if (!arr || !Array.isArray(arr)) return undefined;
    try {
      return arr.find(fn);
    } catch (error) {
      console.error('Safe array find error:', error);
      return undefined;
    }
  },

  /**
   * Null-safe length kontrolü
   */
  length: (arr: any[] | null | undefined): number => {
    if (!arr || !Array.isArray(arr)) return 0;
    return arr.length;
  },
};

/**
 * Güvenli object işlemleri
 */
export const safeObject = {
  /**
   * Null-safe Object.keys
   */
  keys: (obj: any): string[] => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    try {
      return Object.keys(obj);
    } catch (error) {
      console.error('Safe Object.keys error:', error);
      return [];
    }
  },

  /**
   * Null-safe Object.values
   */
  values: <T>(obj: Record<string, T> | null | undefined): T[] => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    try {
      return Object.values(obj);
    } catch (error) {
      console.error('Safe Object.values error:', error);
      return [];
    }
  },

  /**
   * Null-safe Object.entries
   */
  entries: <T>(obj: Record<string, T> | null | undefined): [string, T][] => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    try {
      return Object.entries(obj);
    } catch (error) {
      console.error('Safe Object.entries error:', error);
      return [];
    }
  },

  /**
   * Güvenli property erişimi
   */
  get: <T>(obj: any, path: string, defaultValue: T): T => {
    if (!obj || typeof obj !== 'object') return defaultValue;
    try {
      const keys = path.split('.');
      let current = obj;
      for (const key of keys) {
        if (current == null || typeof current !== 'object') return defaultValue;
        current = current[key];
      }
      return current !== undefined ? current : defaultValue;
    } catch (error) {
      console.error('Safe object get error:', error);
      return defaultValue;
    }
  },
};

/**
 * Güvenli async işlemler
 */
export const safeAsync = {
  /**
   * Try-catch ile sarılmış async işlem
   */
  wrap: async <T>(
    fn: () => Promise<T>,
    fallback?: T,
    errorHandler?: (error: Error) => void
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (errorHandler) {
        errorHandler(err);
      } else {
        console.error('Safe async error:', err);
      }
      return fallback;
    }
  },

  /**
   * Retry mekanizması ile async işlem
   */
  retry: async <T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; delay?: number; onRetry?: (attempt: number) => void } = {}
  ): Promise<T> => {
    const { maxRetries = 3, delay = 1000, onRetry } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          if (onRetry) onRetry(attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Retry failed');
  },

  /**
   * Timeout ile async işlem
   */
  timeout: async <T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      console.error('Safe async timeout error:', error);
      return fallback;
    }
  },
};

// React import'u gerekli değil - bu utility dosyası

/**
 * Debounce utility - performans için
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      try {
        fn(...args);
      } catch (error) {
        console.error('Debounced function error:', error);
      }
    }, delay);
  };
};

/**
 * Throttle utility - rate limiting için
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      try {
        fn(...args);
      } catch (error) {
        console.error('Throttled function error:', error);
      }
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        try {
          fn(...args);
        } catch (error) {
          console.error('Throttled function error:', error);
        }
      }, delay - timeSinceLastCall);
    }
  };
};

/**
 * Memory-safe JSON parse
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Safe JSON parse error:', error);
    return fallback;
  }
};

/**
 * Memory-safe JSON stringify
 */
export const safeJsonStringify = (obj: any, fallback: string = '{}'): string => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('Safe JSON stringify error:', error);
    return fallback;
  }
};

/**
 * Güvenli string işlemleri
 */
export const safeString = {
  /**
   * Null-safe substring
   */
  substring: (str: string | null | undefined, start: number, end?: number): string => {
    if (!str || typeof str !== 'string') return '';
    try {
      return str.substring(start, end);
    } catch (error) {
      console.error('Safe string substring error:', error);
      return '';
    }
  },

  /**
   * Null-safe split
   */
  split: (str: string | null | undefined, separator: string): string[] => {
    if (!str || typeof str !== 'string') return [];
    try {
      return str.split(separator);
    } catch (error) {
      console.error('Safe string split error:', error);
      return [];
    }
  },

  /**
   * Null-safe trim
   */
  trim: (str: string | null | undefined): string => {
    if (!str || typeof str !== 'string') return '';
    try {
      return str.trim();
    } catch (error) {
      console.error('Safe string trim error:', error);
      return '';
    }
  },
};

