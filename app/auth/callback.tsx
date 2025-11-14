import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL'den access_token ve refresh_token'ı al
        const initialUrl = await Linking.getInitialURL();
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        if (initialUrl) {
          try {
            const url = new URL(initialUrl);
            accessToken = url.searchParams.get('access_token');
            refreshToken = url.searchParams.get('refresh_token');
          } catch (urlError) {
            // URL parse hatası - params'dan dene
            accessToken = params.access_token as string | null;
            refreshToken = params.refresh_token as string | null;
          }
        } else {
          // Params'dan al
          accessToken = params.access_token as string | null;
          refreshToken = params.refresh_token as string | null;
        }

        if (accessToken && refreshToken) {
          // Session'ı set et
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }

          if (data.session?.user) {
            // Profil kontrolü ve yönlendirme
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single();

            if (profile) {
              // Profil varsa ana sayfaya yönlendir
              router.replace('/(tabs)/feed');
            } else {
              // Profil yoksa onboarding'e yönlendir
              router.replace('/auth/onboarding');
            }
          }
        } else {
          // Deep link listener (uygulama açıkken link'e tıklanırsa)
          const subscription = Linking.addEventListener('url', async (event) => {
            try {
              const url = new URL(event.url);
              const token = url.searchParams.get('access_token');
              const refresh = url.searchParams.get('refresh_token');

              if (token && refresh) {
                const { data, error: sessionError } = await supabase.auth.setSession({
                  access_token: token,
                  refresh_token: refresh,
                });

                if (sessionError) {
                  throw sessionError;
                }

                if (data.session?.user) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.session.user.id)
                    .single();

                  if (profile) {
                    router.replace('/(tabs)/feed');
                  } else {
                    router.replace('/auth/onboarding');
                  }
                }
              }
            } catch (urlError) {
              console.error('URL handling error:', urlError);
              setError('Kimlik doğrulama hatası');
              setLoading(false);
            }
          });

          // Eğer token yoksa, session kontrolü yap
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              router.replace('/(tabs)/feed');
            } else {
              router.replace('/auth/onboarding');
            }
          } else {
            setError('Kimlik doğrulama başarısız');
            setLoading(false);
            setTimeout(() => {
              router.replace('/auth/login');
            }, 2000);
          }

          return () => {
            subscription.remove();
          };
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
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

