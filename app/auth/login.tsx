import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import * as AppleAuthentication from 'expo-apple-authentication';

type AuthMode = 'login' | 'register' | 'magic' | 'forgot';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const router = useRouter();
  
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile || !profile.full_name) {
      router.replace('/auth/onboarding');
    } else {
      router.replace('/(tabs)/feed');
    }
  }, [router]);

  // OAuth callback'i dinle - her zaman aktif
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in via OAuth:', session.user.id);
        setOauthLoading(false);
        setLoading(false);
        await checkProfileAndNavigate(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setOauthLoading(false);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed for user:', session.user.id);
        // Token yenilendiğinde de kontrol et
        if (oauthLoading) {
          setOauthLoading(false);
          setLoading(false);
          await checkProfileAndNavigate(session.user.id);
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
        // Email confirmation için Supabase callback URL kullan (mobilde deep link'e yönlendirsin)
        const deepLinkUrl = 'mytrabzon://auth/callback';
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
        const emailRedirectTo = Platform.select({
          web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://www.litxtech.com/auth/callback',
          default: `${supabaseUrl}/auth/v1/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`,
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
                    // Email resend için Supabase callback URL kullan
                    const deepLinkUrl = 'mytrabzon://auth/callback';
                    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
                    const emailRedirectTo = Platform.select({
                      web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://www.litxtech.com/auth/callback',
                      default: `${supabaseUrl}/auth/v1/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`,
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
      // Magic link için Supabase callback URL kullan (mobilde deep link'e yönlendirsin)
      const deepLinkUrl = 'mytrabzon://auth/callback';
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const emailRedirectTo = Platform.select({
        web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://www.litxtech.com/auth/callback',
        default: `${supabaseUrl}/auth/v1/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`,
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
      // OAuth provider'lar https:// bekliyor, bu yüzden Supabase callback URL'ini kullan
      // Deep link'i redirect_to parametresi olarak ekle
      const deepLinkUrl = 'mytrabzon://auth/callback';
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const redirectUrl = Platform.select({
        web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://www.litxtech.com/auth/callback',
        default: `${supabaseUrl}/auth/v1/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`,
      });

      console.log('Google redirect URL:', redirectUrl);
      console.log('Platform:', Platform.OS);
      console.log('Deep link URL:', deepLinkUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // true - OAuth URL'ini direkt aç, Supabase callback'i deep link handler yakalayacak
        },
      });

      if (error) {
        throw error;
      }

      // Web'de OAuth browser'da açılır
      if (Platform.OS === 'web' && data.url) {
        window.location.href = data.url;
        return; // Web'de yönlendirme yapıldı
      }

      // Mobilde OAuth URL'ini aç
      if (Platform.OS !== 'web' && data.url) {
        const canOpen = await Linking.canOpenURL(data.url);
        if (canOpen) {
          await Linking.openURL(data.url);
        } else {
          throw new Error('OAuth URL açılamadı');
        }
      }

      // Mobilde OAuth callback'i beklemek için session kontrolü yap
      // onAuthStateChange listener otomatik olarak yönlendirecek
      // Timeout ekle - eğer 60 saniye içinde callback gelmezse hata göster
      setTimeout(() => {
        if (oauthLoading) {
          setOauthLoading(false);
          setLoading(false);
          Alert.alert('Zaman Aşımı', 'Giriş işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.');
        }
      }, 60000);
    } catch (error: any) {
      console.error('Error during Google login:', error);
      Alert.alert('Hata', error.message || 'Google ile giriş yapılırken bir hata oluştu');
      setLoading(false);
      setOauthLoading(false);
    }
  };

  const handleTwitterLogin = async () => {
    setLoading(true);
    setOauthLoading(true);
    try {
      console.log('Starting Twitter/X OAuth login...');
      
      // OAuth provider'lar https:// bekliyor, bu yüzden Supabase callback URL'ini kullan
      // Deep link'i redirect_to parametresi olarak ekle
      const deepLinkUrl = 'mytrabzon://auth/callback';
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const redirectUrl = Platform.select({
        web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://www.litxtech.com/auth/callback',
        default: `${supabaseUrl}/auth/v1/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`,
      });

      console.log('Redirect URL:', redirectUrl);
      console.log('Platform:', Platform.OS);
      console.log('Deep link URL:', deepLinkUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // true - OAuth URL'ini direkt aç, Supabase callback'i deep link handler yakalayacak
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      console.log('OAuth URL received:', data?.url ? 'Yes' : 'No');

      // Web'de OAuth browser'da açılır
      if (Platform.OS === 'web' && data.url) {
        window.location.href = data.url;
        return; // Web'de yönlendirme yapıldı
      }

      // Mobilde OAuth URL'ini aç - Supabase callback URL'i açılacak
      if (Platform.OS !== 'web' && data.url) {
        console.log('Opening OAuth URL:', data.url);
        const canOpen = await Linking.canOpenURL(data.url);
        console.log('Can open URL:', canOpen);
        
        if (canOpen) {
          await Linking.openURL(data.url);
          console.log('OAuth URL opened, waiting for deep link callback...');
          
          // Deep link handler otomatik olarak callback'i işleyecek
          // Timeout ekle - eğer 60 saniye içinde callback gelmezse hata göster
          setTimeout(() => {
            if (oauthLoading) {
              console.log('OAuth timeout - checking final session state');
              supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                  setOauthLoading(false);
                  setLoading(false);
                  checkProfileAndNavigate(session.user.id);
                } else {
                  setOauthLoading(false);
                  setLoading(false);
                  Alert.alert('Zaman Aşımı', 'Giriş işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.');
                }
              });
            }
          }, 60000);
        } else {
          throw new Error('OAuth URL açılamadı');
        }
      } else if (!data.url) {
        throw new Error('OAuth URL alınamadı');
      }
    } catch (error: any) {
      console.error('Error during Twitter/X login:', error);
      Alert.alert('Hata', error.message || 'X ile giriş yapılırken bir hata oluştu');
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
      console.log('Starting Apple OAuth login...');
      
      // OAuth provider'lar https:// bekliyor, bu yüzden Supabase callback URL'ini kullan
      // Deep link'i redirect_to parametresi olarak ekle
      const deepLinkUrl = 'mytrabzon://auth/callback';
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const redirectUrl = `${supabaseUrl}/auth/v1/callback?redirect_to=${encodeURIComponent(deepLinkUrl)}`;

      console.log('Apple redirect URL:', redirectUrl);
      console.log('Platform:', Platform.OS);
      console.log('Deep link URL:', deepLinkUrl);

      // Supabase OAuth flow kullan (signInWithIdToken Expo Go'da çalışmıyor)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // true - OAuth URL'ini direkt aç, Supabase callback'i deep link handler yakalayacak
        },
      });

      if (error) {
        console.error('Apple OAuth error:', error);
        throw error;
      }

      console.log('Apple OAuth URL received:', data?.url ? 'Yes' : 'No');

      // iOS'ta OAuth URL'ini aç - Supabase callback URL'i açılacak
      if (data.url) {
        console.log('Opening OAuth URL:', data.url);
        const canOpen = await Linking.canOpenURL(data.url);
        console.log('Can open Apple URL:', canOpen);
        
        if (canOpen) {
          await Linking.openURL(data.url);
          console.log('Apple OAuth URL opened, waiting for deep link callback...');
          
          // Deep link handler otomatik olarak callback'i işleyecek
          // Timeout ekle - eğer 60 saniye içinde callback gelmezse hata göster
          setTimeout(() => {
            if (oauthLoading) {
              console.log('Apple OAuth timeout - checking final session state');
              supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                  setOauthLoading(false);
                  setLoading(false);
                  checkProfileAndNavigate(session.user.id);
                } else {
                  setOauthLoading(false);
                  setLoading(false);
                  Alert.alert('Zaman Aşımı', 'Giriş işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.');
                }
              });
            }
          }, 60000);
        } else {
          throw new Error('Apple OAuth URL açılamadı');
        }
      } else if (!data.url) {
        throw new Error('Apple OAuth URL alınamadı');
      }
    } catch (error: any) {
      // Kullanıcı iptal ettiyse hata gösterme
      if (error.code === 'ERR_CANCELED' || error.message?.includes('canceled')) {
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
          style={[styles.twitterButton, (loading || oauthLoading) && styles.buttonDisabled]}
          onPress={handleTwitterLogin}
          disabled={loading || oauthLoading}
        >
          {oauthLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.twitterButtonText}>
              𝕏 ile {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
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
          <View style={styles.header}>
            <Text style={styles.subtitle} numberOfLines={2} adjustsFontSizeToFit>
              Trabzon&apos;un Dijital Sesi
            </Text>
          </View>

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
  header: {
    alignItems: 'center' as const,
    marginBottom: SPACING.xxl,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: SPACING.sm,
    textAlign: 'center' as const,
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
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
  twitterButton: {
    backgroundColor: '#000000',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#333333',
  },
  twitterButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
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
