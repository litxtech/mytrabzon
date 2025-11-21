/**
 * Media Upload Utility Module
 * Handles video compression, size validation, and direct upload to Supabase Storage via signed URLs
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

// Dynamic import for ffmpeg-kit to avoid issues if not installed
let FFmpegKit: any;
let ReturnCode: any;

try {
  // Use dynamic import for better compatibility
  const ffmpegModule = require('ffmpeg-kit-react-native');
  if (ffmpegModule && ffmpegModule.FFmpegKit && ffmpegModule.ReturnCode) {
    FFmpegKit = ffmpegModule.FFmpegKit;
    ReturnCode = ffmpegModule.ReturnCode;
  }
} catch (error) {
  console.warn('⚠️ ffmpeg-kit-react-native not available, video compression will be skipped:', error);
}

// Supabase Storage limiti: 50MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

export interface CompressedVideoResult {
  uri: string;
  size: number;
  duration?: number;
}

export interface UploadUrlResult {
  uploadUrl: string;
  path: string;
  publicUrl: string;
}

/**
 * Compress video using ffmpeg to fit within 50MB Supabase limit
 * - Max resolution: 1080p (longest side)
 * - Codec: H.264 (libx264)
 * - Adaptive bitrate: Starts with 2000k, reduces if still >50MB
 * - Audio bitrate: 96k
 */
export async function compressVideo(inputUri: string): Promise<CompressedVideoResult> {
  // Check if FFmpegKit is available
  if (!FFmpegKit || !ReturnCode) {
    console.warn('⚠️ FFmpegKit not available, skipping compression');
    const fileInfo = await FileSystem.getInfoAsync(inputUri);
    if (fileInfo.exists) {
      const size = fileInfo.size || 0;
      if (size > MAX_VIDEO_SIZE) {
        throw new Error(`Video çok büyük (${(size / (1024 * 1024)).toFixed(2)}MB). FFmpeg gerekli.`);
      }
      return {
        uri: inputUri,
        size,
      };
    }
    throw new Error('Video dosyası bulunamadı');
  }

  try {
    console.log('🎬 Video sıkıştırma başlıyor:', inputUri.substring(0, 50));
    
    // Get original file size and duration estimate
    const originalInfo = await FileSystem.getInfoAsync(inputUri);
    const originalSize = (originalInfo as any).size || 0;
    const originalSizeMB = originalSize / (1024 * 1024);
    console.log(`📏 Orijinal dosya boyutu: ${originalSizeMB.toFixed(2)}MB`);
    
    // Output file path in cache directory
    const outputFileName = `compressed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
    const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;
    
    // Adaptive compression: Try different bitrates and resolutions until file is <50MB
    // Start with 2000k (2 Mbps) - good balance for most videos
    // For very large files (>100MB), start with lower bitrate and resolution
    const bitrateLevels = [
      // Level 1: Orta kalite (1080p)
      { videoBitrate: '2000k', maxrate: '2500k', bufsize: '3000k', audioBitrate: '96k', resolution: 1080, label: 'Orta (1080p)' },
      // Level 2: Düşük kalite (1080p)
      { videoBitrate: '1500k', maxrate: '1800k', bufsize: '2200k', audioBitrate: '64k', resolution: 1080, label: 'Düşük (1080p)' },
      // Level 3: Çok düşük kalite (720p) - resolution düşürülüyor
      { videoBitrate: '1000k', maxrate: '1200k', bufsize: '1500k', audioBitrate: '64k', resolution: 720, label: 'Çok Düşük (720p)' },
      // Level 4: Minimum kalite (720p)
      { videoBitrate: '800k', maxrate: '1000k', bufsize: '1200k', audioBitrate: '48k', resolution: 720, label: 'Minimum (720p)' },
      // Level 5: Çok agresif (480p) - büyük dosyalar için
      { videoBitrate: '600k', maxrate: '750k', bufsize: '900k', audioBitrate: '48k', resolution: 480, label: 'Agresif (480p)' },
      // Level 6: Son çare (480p) - maksimum compression
      { videoBitrate: '400k', maxrate: '500k', bufsize: '600k', audioBitrate: '32k', resolution: 480, label: 'Maksimum (480p)' },
    ];
    
    // Eğer dosya çok büyükse (>100MB), daha düşük seviyeden başla
    const startLevel = originalSizeMB > 100 ? 2 : 0;
    
    let lastOutputUri = outputUri;
    let lastSize = 0;
    
    for (let i = startLevel; i < bitrateLevels.length; i++) {
      const level = bitrateLevels[i];
      const currentOutputUri = i === startLevel ? outputUri : `${FileSystem.cacheDirectory}compressed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
      
      // FFmpeg command: scale to target resolution, H.264 codec, adaptive bitrate
      // Resolution'ı level'a göre ayarla (1080p, 720p, veya 480p)
      const ffmpegCommand = `-y -i "${inputUri}" -vf "scale='min(${level.resolution},iw)':-2" -c:v libx264 -preset fast -b:v ${level.videoBitrate} -maxrate ${level.maxrate} -bufsize ${level.bufsize} -c:a aac -b:a ${level.audioBitrate} -movflags +faststart "${currentOutputUri}"`;
      
      console.log(`📹 FFmpeg compression (${level.label}): bitrate ${level.videoBitrate}, resolution ${level.resolution}p`);
      
      const session = await FFmpegKit.execute(ffmpegCommand);
      const returnCode = await session.getReturnCode();
      
      if (ReturnCode.isSuccess(returnCode)) {
        // Check if output file exists and get its size
        const fileInfo = await FileSystem.getInfoAsync(currentOutputUri);
        
        if (!fileInfo.exists) {
          throw new Error('Sıkıştırılmış video dosyası oluşturulamadı');
        }
        
        const size = fileInfo.size || 0;
        const sizeMB = size / (1024 * 1024);
        console.log(`✅ Compression (${level.label}) başarılı: ${sizeMB.toFixed(2)}MB`);
        
        // If file is under 50MB, we're done
        if (size <= MAX_VIDEO_SIZE) {
          // Clean up previous attempts
          if (i > 0 && lastOutputUri !== currentOutputUri) {
            try {
              await FileSystem.deleteAsync(lastOutputUri, { idempotent: true });
            } catch (e) {
              // Ignore cleanup errors
            }
          }
          
          console.log(`✅ Video 50MB limitinin altında: ${sizeMB.toFixed(2)}MB`);
          return {
            uri: currentOutputUri,
            size,
          };
        }
        
        // If this is the last attempt, use it anyway
        if (i === bitrateLevels.length - 1) {
          console.warn(`⚠️ Video hala 50MB'dan büyük (${sizeMB.toFixed(2)}MB), ancak minimum kalite kullanıldı`);
          if (lastOutputUri !== currentOutputUri) {
            try {
              await FileSystem.deleteAsync(lastOutputUri, { idempotent: true });
            } catch (e) {
              // Ignore cleanup errors
            }
          }
          return {
            uri: currentOutputUri,
            size,
          };
        }
        
        // Clean up this attempt and try next level
        lastOutputUri = currentOutputUri;
        lastSize = size;
      } else {
        const output = await session.getOutput();
        console.error(`❌ FFmpeg hatası (${level.label}):`, output);
        
        // If this is the last attempt, throw error
        if (i === bitrateLevels.length - 1) {
          throw new Error(`Video sıkıştırma başarısız: ${output || 'Bilinmeyen hata'}`);
        }
        // Otherwise, continue to next level
        continue;
      }
    }
    
    // Should not reach here, but just in case
    throw new Error('Video sıkıştırma tamamlanamadı');
  } catch (error: any) {
    console.error('❌ Video sıkıştırma hatası:', error);
    // Fallback: return original file if it's small enough
    const fileInfo = await FileSystem.getInfoAsync(inputUri);
    if (fileInfo.exists) {
      const size = fileInfo.size || 0;
      if (size <= MAX_VIDEO_SIZE) {
        console.warn('⚠️ Orijinal dosya kullanılıyor (sıkıştırma başarısız ama dosya küçük)');
        return {
          uri: inputUri,
          size,
        };
      }
      throw new Error(`Video çok büyük (${(size / (1024 * 1024)).toFixed(2)}MB) ve sıkıştırılamadı.`);
    }
    throw error;
  }
}

/**
 * Assert that video file size is within 50MB limit
 */
export async function assertVideoSizeOK(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  
  if (!info.exists) {
    throw new Error('Video dosyası bulunamadı');
  }
  
  const sizeMB = (info.size || 0) / (1024 * 1024);
  if (info.size && info.size > MAX_VIDEO_SIZE) {
    throw new Error(`VIDEO_TOO_LARGE: Video ${sizeMB.toFixed(2)}MB, maksimum 50MB olmalı`);
  }
  
  console.log(`✅ Video boyutu OK: ${sizeMB.toFixed(2)}MB`);
}

/**
 * Upload file directly to Supabase Storage using filePath
 * Uses FileSystem.uploadAsync for better timeout handling and large file support
 * This avoids loading entire file into memory (better for large files)
 */
export async function uploadViaSignedUrl(
  filePath: string, // Path returned from getUploadUrl (e.g., "user-id/file-name.mp4")
  fileUri: string,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    const { supabase } = await import('./supabase');
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('Dosya bulunamadı');
    }
    
    const fileSize = (fileInfo as any).size || 0;
    const fileSizeMB = fileSize / (1024 * 1024);
    
    console.log('📤 Uploading file:', fileUri);
    console.log('📏 File size:', fileSizeMB.toFixed(2), 'MB');
    console.log('📁 File path:', filePath);
    console.log('📄 Content-Type:', contentType);
    
    // Ensure file path doesn't have leading/trailing slashes
    const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
    
    // Get session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
    }
    
    // Get Supabase project URL
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || 'https://xcvcplwimicylaxghiak.supabase.co';
    
    // Encode file path for URL (handle special characters)
    const encodedPath = encodeURIComponent(cleanPath).replace(/%2F/g, '/');
    
    // Supabase Storage REST API endpoint: POST /storage/v1/object/{bucket}/{path}
    const storageUrl = `${supabaseUrl}/storage/v1/object/posts/${encodedPath}`;
    
    console.log('📤 Uploading via REST API:', storageUrl);
    console.log('⏱️ Starting upload (this may take a while for large files)...');
    
    // Use FileSystem.uploadAsync for direct upload
    // This handles large files better by streaming the file directly
    // FileSystem.uploadAsync handles large files efficiently without loading into memory
    const uploadResult = await FileSystem.uploadAsync(storageUrl, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${session.access_token}`,
        'x-upsert': 'false',
        'Cache-Control': '3600',
      },
    });
    
    console.log('📊 Upload response status:', uploadResult.status);
    console.log('📊 Upload response body:', uploadResult.body?.substring(0, 200));
    
    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      let errorMessage = `Upload başarısız: HTTP ${uploadResult.status}`;
      
      // Try to parse error message from response body
      try {
        if (uploadResult.body) {
          const errorData = JSON.parse(uploadResult.body);
          if (errorData?.error?.message) {
            errorMessage = `Upload başarısız: ${errorData.error.message}`;
          } else if (errorData?.message) {
            errorMessage = `Upload başarısız: ${errorData.message}`;
          }
        }
      } catch (e) {
        // If parsing fails, use default message
      }
      
      console.error('❌ Upload error:', errorMessage);
      console.error('❌ Status:', uploadResult.status);
      console.error('❌ Response body:', uploadResult.body);
      console.error('❌ File path:', cleanPath);
      console.error('❌ Content-Type:', contentType);
      console.error('❌ File size:', fileSizeMB.toFixed(2), 'MB');
      
      // Provide more helpful error messages
      if (uploadResult.status === 400) {
        throw new Error('Upload başarısız: Geçersiz istek. Dosya formatını kontrol edin.');
      } else if (uploadResult.status === 413) {
        throw new Error(`Upload başarısız: Dosya çok büyük (${fileSizeMB.toFixed(2)}MB). Lütfen daha küçük bir dosya seçin.`);
      } else if (uploadResult.status === 401 || uploadResult.status === 403) {
        throw new Error('Upload başarısız: Yetkilendirme hatası. Lütfen tekrar giriş yapın.');
      } else if (uploadResult.status === 0 || uploadResult.status === undefined) {
        // Network error or timeout
        throw new Error('Upload başarısız: Ağ hatası veya zaman aşımı. İnternet bağlantınızı kontrol edin ve tekrar deneyin.');
      }
      
      throw new Error(errorMessage);
    }
    
    if (onProgress) {
      onProgress(100);
    }
    
    console.log('✅ File uploaded successfully via REST API');
    console.log('📁 Uploaded path:', cleanPath);
  } catch (error: any) {
    console.error('❌ Upload hatası:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    
    // Handle network/timeout errors specifically
    const errorMessage = error?.message || String(error || '');
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Failed to connect')
    ) {
      throw new Error('Upload başarısız: Ağ hatası. İnternet bağlantınızı kontrol edin ve tekrar deneyin.');
    }
    
    // Re-throw with better error message if not already formatted
    if (error?.message && !error.message.includes('Upload başarısız')) {
      throw new Error(`Upload başarısız: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Get user-friendly error message in Turkish
 */
export function getFriendlyErrorMessage(error: any): string {
  const errorMessage = error?.message || String(error || '');
  
  // VIDEO_TOO_LARGE hatası artık gösterilmiyor - boyut limiti kaldırıldı
  // if (errorMessage.includes('VIDEO_TOO_LARGE')) {
  //   ...
  // }
  
  if (errorMessage.includes('maximum allowed size') || 
      errorMessage.includes('exceeded') ||
      errorMessage.includes('too large') ||
      errorMessage.includes('413')) {
    return 'Video yükleme hatası. Lütfen tekrar deneyin veya daha kısa bir video seçin.';
  }
  
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')) {
    return 'Video yükleme başarısız oldu, internet bağlantınızı kontrol edin.';
  }
  
  if (errorMessage.includes('Sunucu hatası') || 
      errorMessage.includes('server error') ||
      errorMessage.includes('500')) {
    return 'Sunucu hatası. Lütfen tekrar deneyin.';
  }
  
  if (errorMessage.includes('Unauthorized') || 
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401')) {
    return 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.';
  }
  
  return errorMessage || 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.';
}

