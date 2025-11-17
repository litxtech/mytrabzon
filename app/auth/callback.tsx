import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // loading state'i kullanılıyor ama linter görmüyor - bu yüzden burada bırakıyoruz

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔐 [AuthCallback] Starting callback handling...');
        
        // URL'i al - önce initial URL, sonra params
        let callbackUrl: string | null = null;
        
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && (initialUrl.includes('auth/callback') || initialUrl.includes('callback'))) {
            callbackUrl = initialUrl;
            console.log('🔐 [AuthCallback] Using initial URL:', callbackUrl);
          }
        } catch (e) {
          console.warn('🔐 [AuthCallback] Could not get initial URL:', e);
        }

        // Eğer initial URL yoksa, params'dan URL oluştur
        if (!callbackUrl) {
          // Deep link formatı: mytrabzon://auth/callback?code=xxx veya mytrabzon://auth/callback#access_token=xxx
          const scheme = Platform.OS === 'ios' ? 'mytrabzon' : 'mytrabzon';
          const code = params.code as string | undefined;
          const accessToken = params.access_token as string | undefined;
          const refreshToken = params.refresh_token as string | undefined;
          
          if (code || accessToken) {
            const queryParams: string[] = [];
            if (code) queryParams.push(`code=${encodeURIComponent(code)}`);
            if (accessToken) queryParams.push(`access_token=${encodeURIComponent(accessToken)}`);
            if (refreshToken) queryParams.push(`refresh_token=${encodeURIComponent(refreshToken)}`);
            
            callbackUrl = `${scheme}://auth/callback?${queryParams.join('&')}`;
            console.log('🔐 [AuthCallback] Constructed URL from params:', callbackUrl);
          }
        }

        if (!callbackUrl) {
          console.error('🔐 [AuthCallback] No callback URL found');
          setError('Kimlik doğrulama URL\'si bulunamadı');
          setLoading(false);
          setTimeout(() => {
            router.replace('/auth/login');
          }, 2000);
          return;
        }

        console.log('🔐 [AuthCallback] Processing URL:', callbackUrl);

        // URL'den code veya token'ları çıkar
        const urlObj = new URL(callbackUrl.replace('mytrabzon://', 'https://').replace('litxtech://', 'https://'));
        const code = urlObj.searchParams.get('code');
        const accessToken = urlObj.searchParams.get('access_token') || urlObj.hash.match(/access_token=([^&]+)/)?.[1];
        const refreshToken = urlObj.searchParams.get('refresh_token') || urlObj.hash.match(/refresh_token=([^&]+)/)?.[1];

        console.log('🔐 [AuthCallback] Extracted params:', { 
          hasCode: !!code, 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken 
        });

        // Önce code exchange dene (Supabase'in önerdiği yöntem)
        if (code) {
          console.log('🔐 [AuthCallback] Exchanging code for session...');
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('🔐 [AuthCallback] Code exchange error:', exchangeError);
              throw exchangeError;
            }

            if (data.session?.user) {
              console.log('✅ [AuthCallback] Session created from code exchange');
              
              // Profil kontrolü
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.session.user.id)
                .single();

              setLoading(false);
              
              if (profile?.full_name) {
                router.replace('/(tabs)/feed');
              } else {
                router.replace('/auth/onboarding');
              }
              return;
            }
          } catch (exchangeErr: any) {
            console.error('🔐 [AuthCallback] Code exchange failed:', exchangeErr);
            // Code exchange başarısız olursa token'lara geç
          }
        }

        // Code yoksa veya exchange başarısız olduysa, token'larla session set et
        if (accessToken && refreshToken) {
          console.log('🔐 [AuthCallback] Setting session from tokens...');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('🔐 [AuthCallback] Session set error:', sessionError);
            throw sessionError;
          }

          if (data.session?.user) {
            console.log('✅ [AuthCallback] Session set successfully');
            
            // Profil kontrolü
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single();

            setLoading(false);
            
            if (profile?.full_name) {
              router.replace('/(tabs)/feed');
            } else {
              router.replace('/auth/onboarding');
            }
            return;
          }
        }

        // Hiçbir yöntem çalışmadıysa, mevcut session'ı kontrol et
        console.log('🔐 [AuthCallback] No code or tokens found, checking existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ [AuthCallback] Found existing session');
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setLoading(false);
          
          if (profile?.full_name) {
            router.replace('/(tabs)/feed');
          } else {
            router.replace('/auth/onboarding');
          }
          return;
        }

        // Hiçbir şey çalışmadı
        console.error('🔐 [AuthCallback] No valid authentication found');
        setError('Kimlik doğrulama başarısız');
        setLoading(false);
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);

      } catch (err: any) {
        console.error('🔐 [AuthCallback] Error:', err);
        setError(err.message || 'Kimlik doğrulama hatası');
        setLoading(false);
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [params, router]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.redirectText}>Giriş sayfasına yönlendiriliyorsunuz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Kimlik doğrulanıyor...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  redirectText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

