import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const params = useLocalSearchParams();

  // URL parametrelerini ve deep link'i kontrol et
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Supabase session kontrolü - eğer zaten recovery session varsa devam et
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setInitializing(false);
          return;
        }

        // Deep link'ten gelen parametreleri kontrol et
        const initialUrl = await Linking.getInitialURL();
        
        if (initialUrl && (initialUrl.includes('reset-password') || initialUrl.includes('mytrabzon://') || initialUrl.includes('litxtech://'))) {
          // URL'den token'ı parse et
          try {
            // Manuel URL parsing (custom scheme'ler için)
            const parseDeepLink = (urlString: string) => {
              const params: Record<string, string> = {};
              
              // Query string'i bul
              const queryIndex = urlString.indexOf('?');
              if (queryIndex === -1) return params;
              
              const queryString = urlString.substring(queryIndex + 1);
              const pairs = queryString.split('&');
              
              for (const pair of pairs) {
                const [key, value] = pair.split('=');
                if (key && value) {
                  params[decodeURIComponent(key)] = decodeURIComponent(value);
                }
              }
              
              return params;
            };
            
            const params = parseDeepLink(initialUrl);
            const accessToken = params.access_token;
            const refreshToken = params.refresh_token;
            const type = params.type;
            
            console.log('Reset password URL params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
            
            if (accessToken && refreshToken) {
              // Session'ı set et
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (error) {
                console.error('Session set error:', error);
                Alert.alert('Hata', 'Geçersiz veya süresi dolmuş link');
                router.replace('/auth/login');
                return;
              } else {
                console.log('Session set successfully');
              }
            }
          } catch (urlError: any) {
            // URL parse hatası - alternatif yöntem dene
            console.log('URL parse error, trying alternative method:', urlError.message);
            
            // Manuel parsing dene
            const accessTokenMatch = initialUrl.match(/access_token=([^&]+)/);
            const refreshTokenMatch = initialUrl.match(/refresh_token=([^&]+)/);
            
            if (accessTokenMatch && refreshTokenMatch) {
              const accessToken = decodeURIComponent(accessTokenMatch[1]);
              const refreshToken = decodeURIComponent(refreshTokenMatch[1]);
              
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (error) {
                console.error('Session set error (alternative):', error);
                Alert.alert('Hata', 'Geçersiz veya süresi dolmuş link');
                router.replace('/auth/login');
                return;
              }
            }
          }
        }
        
        // Local search params'dan da kontrol et (web için)
        if (params.access_token && params.refresh_token && params.type === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token as string,
            refresh_token: params.refresh_token as string,
          });
          
          if (error) {
            console.error('Session set error:', error);
            Alert.alert('Hata', 'Geçersiz veya süresi dolmuş link');
            router.replace('/auth/login');
            return;
          }
        }
        
        // Deep link listener (uygulama açıkken link'e tıklanırsa)
        const subscription = Linking.addEventListener('url', async (event) => {
          if (event.url.includes('reset-password') || event.url.includes('mytrabzon://') || event.url.includes('litxtech://')) {
            try {
              // Manuel URL parsing
              const parseDeepLink = (urlString: string) => {
                const params: Record<string, string> = {};
                
                const queryIndex = urlString.indexOf('?');
                if (queryIndex === -1) return params;
                
                const queryString = urlString.substring(queryIndex + 1);
                const pairs = queryString.split('&');
                
                for (const pair of pairs) {
                  const [key, value] = pair.split('=');
                  if (key && value) {
                    params[decodeURIComponent(key)] = decodeURIComponent(value);
                  }
                }
                
                return params;
              };
              
              const params = parseDeepLink(event.url);
              const accessToken = params.access_token;
              const refreshToken = params.refresh_token;
              const type = params.type;
              
              console.log('Reset password listener params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
              
              if (accessToken && refreshToken) {
                const { error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                
                if (error) {
                  Alert.alert('Hata', 'Geçersiz veya süresi dolmuş link');
                } else {
                  // Session başarıyla set edildi, sayfayı yenile
                  router.replace('/auth/reset-password');
                }
              } else {
                // Manuel parsing dene
                const accessTokenMatch = event.url.match(/access_token=([^&]+)/);
                const refreshTokenMatch = event.url.match(/refresh_token=([^&]+)/);
                
                if (accessTokenMatch && refreshTokenMatch) {
                  const accessToken = decodeURIComponent(accessTokenMatch[1]);
                  const refreshToken = decodeURIComponent(refreshTokenMatch[1]);
                  
                  const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  });
                  
                  if (!error) {
                    router.replace('/auth/reset-password');
                  }
                }
              }
            } catch (urlError: any) {
              console.error('URL parse error:', urlError.message);
              
              // Son çare: Manuel parsing
              try {
                const accessTokenMatch = event.url.match(/access_token=([^&]+)/);
                const refreshTokenMatch = event.url.match(/refresh_token=([^&]+)/);
                
                if (accessTokenMatch && refreshTokenMatch) {
                  const accessToken = decodeURIComponent(accessTokenMatch[1]);
                  const refreshToken = decodeURIComponent(refreshTokenMatch[1]);
                  
                  const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  });
                  
                  if (!error) {
                    router.replace('/auth/reset-password');
                  }
                }
              } catch (manualError) {
                console.error('Manual parsing also failed:', manualError);
              }
            }
          }
        });
        
        setInitializing(false);
        
        return () => {
          subscription.remove();
        };
      } catch (error: any) {
        console.error('Initialization error:', error);
        setInitializing(false);
      }
    };
    
    initializeAuth();
  }, [params, router]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    // Güçlü şifre kontrolü
    if (password.length < 8) {
      Alert.alert('Hata', 'Şifre en az 8 karakter olmalıdır');
      return;
    }
    
    // Şifre güçlülük kontrolü
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      Alert.alert(
        'Güvenlik Uyarısı',
        'Şifreniz en az bir büyük harf, bir küçük harf ve bir rakam içermelidir'
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi!', [
        {
          text: 'Tamam',
          onPress: () => router.replace('/auth/login'),
        },
      ]);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  if (initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.subtitle}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>🔐</Text>
          <Text style={styles.title}>Yeni Şifre Belirle</Text>
          <Text style={styles.subtitle}>Güçlü bir şifre seçin</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Yeni Şifre"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre Tekrar"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.buttonText}>Şifreyi Değiştir</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center' as const,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: SPACING.xxl,
  },
  logo: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    opacity: 0.8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md + 2,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: SPACING.md,
  },
  buttonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
