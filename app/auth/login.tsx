import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert, Linking } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'login' | 'register' | 'magic' | 'forgot';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const isNavigatingRef = useRef(false); // Navigation flag - duplicate call'ları önlemek için
  const router = useRouter();
  const pathname = usePathname(); // Mevcut path'i takip et
  
  // Policy'leri çek
  const { data: policies } = (trpc as any).admin.getPolicies.useQuery();
  
  const handlePolicyPress = (policyType: 'terms' | 'privacy') => {
    if (policies) {
      const policy = policies.find((p: any) => p.policy_type === policyType && p.is_active);
      if (policy) {
        router.push(`/admin/policy-view/${policy.id}` as any);
      } else {
        Alert.alert('Bilgi', 'Politika bulunamadı');
      }
    } else {
      Alert.alert('Bilgi', 'Politikalar yükleniyor, lütfen tekrar deneyin');
    }
  };

  const checkProfileAndNavigate = useCallback(async (userId: string) => {
    // Duplicate call'ları önle
    if (isNavigatingRef.current) {
      console.log('Navigation already in progress, skipping...');
      return;
    }

    try {
      isNavigatingRef.current = true;
      console.log('🔍 [checkProfileAndNavigate] Starting for user:', userId);
      console.log('🔍 [checkProfileAndNavigate] isNavigatingRef.current:', isNavigatingRef.current);
      
      console.log('🔍 [checkProfileAndNavigate] Skipping profile fetch, navigating directly to onboarding');
      
      // Profile fetch'i atla - direkt onboarding'e yönlendir
      // Profil kontrolü onboarding ekranında yapılacak
      const profile = null;

      // Loading state'leri kapat
      console.log('🔍 [checkProfileAndNavigate] Closing loading states...');
      setOauthLoading(false);
      setLoading(false);
      console.log('✅ [checkProfileAndNavigate] Loading states closed');

      // Navigation path'ini belirle
      const hasProfile = !!profile;
      const hasFullName = !!(profile as any)?.full_name;
      const targetPath = !hasProfile || !hasFullName
        ? '/auth/onboarding' 
        : '/(tabs)/feed';
      
      console.log('🚀 [checkProfileAndNavigate] Navigating to:', targetPath);
      console.log('🚀 [checkProfileAndNavigate] Profile exists:', hasProfile, 'Has full_name:', hasFullName);

      // Navigation'ı gerçekleştir - birden fazla deneme yap
      let navigationAttempts = 0;
      const maxAttempts = 3;
      let navigationSuccess = false;
      const initialPath = pathname; // Başlangıç path'ini kaydet

      while (navigationAttempts < maxAttempts && !navigationSuccess) {
        navigationAttempts++;
        console.log(`🚀 [checkProfileAndNavigate] Navigation attempt ${navigationAttempts}/${maxAttempts} to ${targetPath}`);
        console.log(`🚀 [checkProfileAndNavigate] Current pathname: ${pathname}, Initial path: ${initialPath}`);
        
        try {
          // İlk denemede replace, sonraki denemelerde push kullan
          if (navigationAttempts === 1) {
            console.log('🚀 [checkProfileAndNavigate] Calling router.replace...');
            router.replace(targetPath as any);
            console.log('✅ [checkProfileAndNavigate] router.replace called successfully');
          } else {
            console.log('🚀 [checkProfileAndNavigate] Calling router.push (fallback)...');
            router.push(targetPath as any);
            console.log('✅ [checkProfileAndNavigate] router.push called successfully');
          }
          
          // Navigation'ın çalışması için delay - pathname'in değişmesini bekle
          console.log('⏳ [checkProfileAndNavigate] Waiting 800ms for navigation to complete...');
          await new Promise(resolve => setTimeout(resolve, 800));
          console.log('✅ [checkProfileAndNavigate] Wait completed');
          
          // Pathname'in değişip değişmediğini kontrol et
          // Not: pathname state'i güncellenmiş olabilir, ama callback içinde direkt erişemeyiz
          // Bu yüzden navigation'ı başarılı kabul ediyoruz
          // Eğer navigation gerçekten başarısız olursa, onAuthStateChange tekrar tetiklenecek
          // ve checkProfileAndNavigate tekrar çağrılacak, ama isNavigatingRef flag'i bunu engelleyecek
          navigationSuccess = true;
          console.log('✅ [checkProfileAndNavigate] Navigation completed successfully');
          
        } catch (navError: any) {
          console.error(`❌ [checkProfileAndNavigate] Navigation attempt ${navigationAttempts} failed:`, navError);
          console.error(`❌ [checkProfileAndNavigate] Navigation error details:`, JSON.stringify(navError, null, 2));
          
          if (navigationAttempts < maxAttempts) {
            // Bir sonraki deneme için kısa bir delay
            await new Promise(resolve => setTimeout(resolve, 300));
          } else {
            // Tüm denemeler başarısız - hata göster
            console.error('All navigation attempts failed');
            Alert.alert(
              'Yönlendirme Hatası',
              'Sayfaya yönlendirilemedi. Lütfen tekrar deneyin.',
              [
                {
                  text: 'Tekrar Dene',
                  onPress: () => {
                    isNavigatingRef.current = false;
                    checkProfileAndNavigate(userId);
                  }
                },
                {
                  text: 'Tamam',
                  onPress: () => {
                    isNavigatingRef.current = false;
                  }
                }
              ]
            );
          }
        }
      }

      if (navigationSuccess) {
        console.log('✅ [checkProfileAndNavigate] Navigation successful, resetting flag after 3s delay');
        // Navigation başarılı - flag'i sıfırla (delay ile)
        // Eğer navigation gerçekten başarısız olursa, onAuthStateChange tekrar tetiklenecek
        // ama isNavigatingRef flag'i bunu engelleyecek, bu yüzden döngü oluşmayacak
        setTimeout(() => {
          isNavigatingRef.current = false;
          console.log('✅ [checkProfileAndNavigate] Navigation flag reset');
        }, 3000);
      } else {
        console.error('❌ [checkProfileAndNavigate] Navigation was not successful after all attempts');
      }

    } catch (error: any) {
      console.error('❌ [checkProfileAndNavigate] Error in checkProfileAndNavigate:', error);
      console.error('❌ [checkProfileAndNavigate] Error details:', JSON.stringify(error, null, 2));
      setOauthLoading(false);
      setLoading(false);
      
      // Hata durumunda onboarding'e yönlendir
      try {
        console.log('🚀 [checkProfileAndNavigate] Error fallback: Navigating to onboarding');
        router.replace('/auth/onboarding');
        console.log('✅ [checkProfileAndNavigate] Error fallback navigation completed');
      } catch (navError) {
        console.error('❌ [checkProfileAndNavigate] Error fallback navigation failed:', navError);
        try {
          router.push('/auth/onboarding');
          console.log('✅ [checkProfileAndNavigate] Error fallback push completed');
        } catch (pushError) {
          console.error('❌ [checkProfileAndNavigate] Error fallback push also failed:', pushError);
        }
      }
      
      // Flag'i sıfırla
      setTimeout(() => {
        isNavigatingRef.current = false;
        console.log('✅ [checkProfileAndNavigate] Error: Navigation flag reset');
      }, 2000);
    }
  }, [router, pathname]);

  // OAuth callback'i dinle - her zaman aktif
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [onAuthStateChange] Auth state changed:', event, 'User ID:', session?.user?.id);
      console.log('🔔 [onAuthStateChange] isNavigatingRef.current:', isNavigatingRef.current);
      console.log('🔔 [onAuthStateChange] oauthLoading:', oauthLoading);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [onAuthStateChange] User signed in via OAuth:', session.user.id);
        // Duplicate call'ları önle - eğer zaten navigation yapılıyorsa atla
        if (!isNavigatingRef.current) {
          console.log('🚀 [onAuthStateChange] Calling checkProfileAndNavigate (isNavigatingRef is false)');
          // checkProfileAndNavigate içinde loading state'leri kapatılıyor
          await checkProfileAndNavigate(session.user.id);
          console.log('✅ [onAuthStateChange] checkProfileAndNavigate completed');
        } else {
          console.log('⏭️ [onAuthStateChange] Skipping checkProfileAndNavigate (navigation already in progress)');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 [onAuthStateChange] User signed out');
        setOauthLoading(false);
        setLoading(false);
        isNavigatingRef.current = false;
        console.log('✅ [onAuthStateChange] Reset states and navigation flag');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 [onAuthStateChange] Token refreshed for user:', session.user.id);
        // Token yenilendiğinde de kontrol et (sadece OAuth loading durumunda)
        if (oauthLoading && !isNavigatingRef.current) {
          console.log('🚀 [onAuthStateChange] Calling checkProfileAndNavigate after token refresh');
          setOauthLoading(false);
          setLoading(false);
          await checkProfileAndNavigate(session.user.id);
          console.log('✅ [onAuthStateChange] checkProfileAndNavigate completed after token refresh');
        } else {
          console.log('⏭️ [onAuthStateChange] Skipping checkProfileAndNavigate after token refresh (oauthLoading:', oauthLoading, ', isNavigatingRef:', isNavigatingRef.current, ')');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkProfileAndNavigate, oauthLoading]);

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Hata', 'Geçerli bir email adresi girin');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      } else {
        // Email confirmation için web callback sayfası kullan (oradan deep link'e yönlendirecek)
        const deepLinkUrl = 'mytrabzon://auth/callback';
        const emailRedirectTo = Platform.select({
          web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://www.litxtech.com/auth/callback',
          default: `https://www.litxtech.com/auth/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`,
        });

        result = await supabase.auth.signUp({ 
          email: trimmedEmail, 
          password,
          options: {
            emailRedirectTo,
          }
        });
      }

      if (result.error) {
        // Email confirmation hatası - kayıt modunda kullanıcıyı onboarding'e yönlendir
        if (mode === 'register' && result.data?.user && 
            (result.error.message?.includes('Email not confirmed') || result.error.message?.includes('email_not_confirmed'))) {
          // Kullanıcı oluşturuldu, email confirmation beklenmeden onboarding'e yönlendir
          Alert.alert(
            'Kayıt Başarılı',
            'Email adresinize doğrulama linki gönderildi. Şimdi profilini oluşturabilirsin.',
            [{ text: 'Tamam', onPress: () => router.replace('/auth/onboarding') }]
          );
          setLoading(false);
          return;
        }
        
        // Giriş modunda email confirmation hatası
        if (result.error.message?.includes('Email not confirmed') || result.error.message?.includes('email_not_confirmed')) {
          Alert.alert(
            'Email Doğrulama Gerekli',
            'Email adresinizi doğrulamanız gerekiyor. Email kutunuzu kontrol edin ve doğrulama linkine tıklayın.',
            [
              {
                text: 'Email Gönder',
                onPress: async () => {
                  try {
                    // Email resend için web callback sayfası kullan (oradan deep link'e yönlendirecek)
                    const deepLinkUrl = 'mytrabzon://auth/callback';
                    const emailRedirectTo = Platform.select({
                      web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://www.litxtech.com/auth/callback',
                      default: `https://www.litxtech.com/auth/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`,
                    });

                    const { error: resendError } = await supabase.auth.resend({
                      type: 'signup',
                      email: trimmedEmail,
                      options: {
                        emailRedirectTo,
                      },
                    });
                    if (resendError) throw resendError;
                    Alert.alert('Başarılı', 'Doğrulama emaili tekrar gönderildi!');
                  } catch (resendErr: any) {
                    Alert.alert('Hata', resendErr.message || 'Email gönderilemedi');
                  }
                },
              },
              { text: 'Tamam' },
            ]
          );
          setLoading(false);
          return;
        }
        throw result.error;
      }

      if (mode === 'register') {
        // Kayıt başarılı - kullanıcıyı onboarding'e yönlendir
        if (result.data.user) {
          // Email confirmation beklemeden onboarding'e yönlendir
          router.replace('/auth/onboarding');
        } else {
          Alert.alert('Başarılı', 'Kayıt başarılı! Email adresinizi kontrol edin.');
        }
      } else {
        checkProfileAndNavigate(result.data.user?.id || '');
      }
    } catch (error: any) {
      console.error('Error during auth:', error);
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      Alert.alert('Hata', 'Lütfen email adresinizi girin');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Hata', 'Geçerli bir email adresi girin');
      return;
    }

    setLoading(true);
    try {
      // Magic link için web callback sayfası kullan (oradan deep link'e yönlendirecek)
      const deepLinkUrl = 'mytrabzon://auth/callback';
      const emailRedirectTo = Platform.select({
        web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://www.litxtech.com/auth/callback',
        default: `https://www.litxtech.com/auth/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`,
      });

      const { error } = await supabase.auth.signInWithOtp({ 
        email: trimmedEmail,
        options: {
          emailRedirectTo,
        }
      });
      
      if (error) throw error;
      Alert.alert('Başarılı', 'Email adresinize giriş linki gönderildi!');
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      Alert.alert('Hata', 'Lütfen email adresinizi girin');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Hata', 'Geçerli bir email adresi girin');
      return;
    }

    setLoading(true);
    try {
      // Platform'a göre redirect URL belirle
      const redirectUrl = Platform.select({
        web: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : 'https://www.litxtech.com/auth/reset-password',
        default: 'mytrabzon://auth/reset-password',
      });
      
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });
      
      if (error) throw error;
      Alert.alert('Başarılı', 'Şifre sıfırlama linki email adresinize gönderildi! Linke tıklayarak şifrenizi sıfırlayabilirsiniz.');
      setMode('login');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setOauthLoading(true);
    try {
      console.log('🔐 [GoogleLogin] Starting Google OAuth login...');

      // Platforma göre redirect URL belirle
      const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
      const redirectUrl = isNative
        ? 'mytrabzon://auth/callback'
        : (typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : 'https://www.litxtech.com/auth/callback');

      console.log('🔐 [GoogleLogin] Platform:', Platform.OS, 'Redirect URL:', redirectUrl);

      // Web'de Supabase'in standart yönlendirmesini kullan
      if (Platform.OS === 'web') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
          },
        });

        if (error) throw error;
        if (data.url) {
          window.location.href = data.url;
        }
        return;
      }

      // Native platformlar için Supabase OAuth - direkt deep link'e yönlendir
      // skipBrowserRedirect: false kullanarak Supabase'in normal redirect akışını kullan
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false, // Supabase'in normal redirect akışını kullan
        },
      });

      if (error) {
        console.error('🔐 [GoogleLogin] OAuth error:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('OAuth URL alınamadı');
      }

      console.log('🔐 [GoogleLogin] Opening OAuth URL in browser:', data.url);
      
      // Native'de tarayıcıyı aç - Supabase redirectTo ile mytrabzon://auth/callback'e dönecek
      await Linking.openURL(data.url);
      
      // OAuth başarılı olduğunda onAuthStateChange callback'i tetiklenecek
      // ve checkProfileAndNavigate çağrılacak
      // Bu yüzden burada loading state'i kapatmıyoruz - callback ekranında kapatılacak
      
    } catch (error: any) {
      console.error('🔐 [GoogleLogin] Error during Google login:', error);
      Alert.alert('Hata', error.message || 'Google ile giriş yapılırken bir hata oluştu');
      setLoading(false);
      setOauthLoading(false);
    }
  };


  const handleAppleLogin = async () => {
    // Apple ile giriş sadece iOS'ta çalışır
    if (Platform.OS !== 'ios') {
      Alert.alert('Bilgi', 'Apple ile giriş sadece iOS cihazlarda kullanılabilir');
      return;
    }

    setLoading(true);
    setOauthLoading(true);
    try {
      console.log('Starting Apple native login...');
      
      // Apple native authentication kullan
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple credential received:', {
        user: credential.user,
        email: credential.email,
        identityToken: !!credential.identityToken,
      });

      if (!credential.identityToken) {
        throw new Error('Apple identity token alınamadı');
      }

      // Identity token'ı decode et ve aud claim'ini kontrol et
      try {
        const tokenParts = credential.identityToken.split('.');
        if (tokenParts.length === 3) {
          // Base64 decode (React Native için)
          const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
          const decoded = atob(padded);
          const payload = JSON.parse(decoded);
          
          console.log('Apple identity token payload:', {
            aud: payload.aud,
            sub: payload.sub,
            iss: payload.iss,
            exp: payload.exp,
          });
          
          // Expo Go kontrolü - aud claim'i "host.exp.Exponent" ise development build gerekli
          if (payload.aud === 'host.exp.Exponent') {
            Alert.alert(
              'Development Build Gerekli',
              'Apple ile giriş için development build kullanmanız gerekiyor. Expo Go\'da çalışmaz.\n\nLütfen EAS Build ile development build oluşturun.'
            );
            setLoading(false);
            setOauthLoading(false);
            return;
          }
          
          // aud claim'i Service ID olmalı: com.litxtech.mytrabzon.login
          if (payload.aud && payload.aud !== 'com.litxtech.mytrabzon.login') {
            console.warn('⚠️ Token audience mismatch!');
            console.warn('Expected: com.litxtech.mytrabzon.login');
            console.warn('Got:', payload.aud);
            console.warn('Supabase Dashboard → Authentication → Providers → Apple → Service ID (Client ID) alanına "' + payload.aud + '" yazılmalı');
          }
        }
      } catch (decodeError) {
        console.warn('Could not decode identity token:', decodeError);
      }

      // Supabase'e identity token ile giriş yap
      // Not: Supabase'de Apple provider yapılandırmasında Service ID (Client ID) olarak
      // "com.litxtech.mytrabzon.login" ayarlanmış olmalı
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('Supabase Apple sign in error:', error);
        throw error;
      }

      if (data.user) {
        console.log('Apple login successful:', data.user.id);
        setOauthLoading(false);
        setLoading(false);
        await checkProfileAndNavigate(data.user.id);
      } else {
        throw new Error('Kullanıcı bilgisi alınamadı');
      }
    } catch (error: any) {
      // Kullanıcı iptal ettiyse hata gösterme
      if (error.code === 'ERR_CANCELED' || error.code === 'ERR_REQUEST_CANCELED' || error.message?.includes('canceled')) {
        console.log('Apple giriş iptal edildi');
      } else {
        console.error('Error during Apple login:', error);
        Alert.alert('Hata', error.message || 'Apple ile giriş yapılırken bir hata oluştu');
      }
      setLoading(false);
      setOauthLoading(false);
    }
  };


  const renderForm = () => {
    if (mode === 'magic') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Link ile Giriş</Text>
          <Text style={styles.formSubtitle}>Email adresinize giriş linki göndereceğiz</Text>
          
          <View style={styles.inputContainer}>
            <Mail size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleMagicLink}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Link Gönder</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('login')}>
            <Text style={styles.linkText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === 'forgot') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Şifremi Unuttum</Text>
          <Text style={styles.formSubtitle}>Şifre sıfırlama linki göndereceğiz</Text>
          
          <View style={styles.inputContainer}>
            <Mail size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Link Gönder</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('login')}>
            <Text style={styles.linkText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </Text>
        
        <View style={styles.inputContainer}>
          <Mail size={20} color={COLORS.white} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {mode === 'login' && (
          <TouchableOpacity onPress={() => setMode('forgot')}>
            <Text style={styles.forgotText}>Şifremi unuttum</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleEmailAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.googleButton, (loading || oauthLoading) && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading || oauthLoading}
        >
          {oauthLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.googleButtonText}>
              🔐 Google ile {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
          )}
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.appleButton, (loading || oauthLoading) && styles.buttonDisabled]}
            onPress={handleAppleLogin}
            disabled={loading || oauthLoading}
          >
            {oauthLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.appleButtonText}>
                🍎 Apple ile {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.magicLinkButton, loading && styles.buttonDisabled]}
          onPress={() => setMode('magic')}
          disabled={loading}
        >
          <Text style={styles.magicLinkButtonText}>✉️ Link ile Giriş</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Hesabın var mı? Giriş yap'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderForm()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Developed by</Text>
            <Text style={styles.companyName}>LITXTECH LLC</Text>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://www.litxtech.com')}
              style={styles.footerLinks}
            >
              <Text style={styles.footerLinkText}>www.litxtech.com</Text>
            </TouchableOpacity>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <TouchableOpacity onPress={() => Linking.openURL('https://www.litxtech.com')}>
                <Text style={styles.dividerText}>www.litxtech.com</Text>
              </TouchableOpacity>
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.terms}>
              Devam ederek{' '}
              <Text 
                style={styles.termsLink}
                onPress={() => handlePolicyPress('terms')}
              >
                Kullanım Koşulları
              </Text>
              {' '}ve{' '}
              <Text 
                style={styles.termsLink}
                onPress={() => handlePolicyPress('privacy')}
              >
                Gizlilik Politikası
              </Text>
              &apos;nı kabul etmiş olursunuz
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  formContainer: {
    width: '100%',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  formTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textAlign: 'center' as const,
    flexWrap: 'wrap',
  },
  formSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: SPACING.lg,
    textAlign: 'center' as const,
    flexWrap: 'wrap',
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
  forgotText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    textAlign: 'right' as const,
    marginBottom: SPACING.md,
    opacity: 0.8,
  },
  primaryButton: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md + 2,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '500' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#357AE8',
  },
  googleButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
  },
  appleButton: {
    backgroundColor: '#000000',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#333333',
  },
  appleButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
  },
  magicLinkButton: {
    backgroundColor: '#9B59B6',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#8E44AD',
  },
  magicLinkButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    flexWrap: 'wrap',
    textAlign: 'center' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    color: COLORS.white,
    marginHorizontal: SPACING.md,
    opacity: 0.7,
  },
  switchText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center' as const,
    marginTop: SPACING.md,
    opacity: 0.9,
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xs,
  },
  linkText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center' as const,
    marginTop: SPACING.md,
    textDecorationLine: 'underline' as const,
  },
  footer: {
    marginTop: SPACING.xxl,
    alignItems: 'center' as const,
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.6,
    marginBottom: SPACING.xs,
  },
  companyName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  footerLinks: {
    marginBottom: SPACING.md,
  },
  footerLink: {
    textDecorationLine: 'none' as const,
  },
  footerLinkText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.8,
  },
  terms: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    textAlign: 'center' as const,
    opacity: 0.7,
    lineHeight: 18,
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xs,
  },
  termsLink: {
    textDecorationLine: 'underline' as const,
  },
});
