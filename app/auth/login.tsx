import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert, Linking, Modal } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, PhoneCall, X } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'login' | 'register' | 'magic' | 'forgot' | 'phone' | 'phone-password-setup' | 'phone-forgot';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [phonePassword, setPhonePassword] = useState('');
  const [phonePasswordConfirm, setPhonePasswordConfirm] = useState('');
  const [phoneUserId, setPhoneUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const isNavigatingRef = useRef(false); // Navigation flag - duplicate call'ları önlemek için
  const router = useRouter();
  const pathname = usePathname(); // Mevcut path'i takip et
  
  // Policy'leri çek
  const { data: policies } = (trpc as any).admin.getPolicies.useQuery();
  
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);

  const handlePolicyPress = (policyType: string) => {
    if (policies) {
      const policy = policies.find((p: any) => p.policy_type === policyType && p.is_active);
      if (policy) {
        setSelectedPolicy(policy);
        setPolicyModalVisible(true);
      } else {
        Alert.alert('Bilgi', 'Politika bulunamadı');
      }
    } else {
      Alert.alert('Bilgi', 'Politikalar yükleniyor, lütfen tekrar deneyin');
    }
  };

  const getRedirectUrl = useCallback(
    (path: string) =>
      makeRedirectUri({
        scheme: 'mytrabzon',
        path,
      }),
    []
  );

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

  useEffect(() => {
    if (mode !== 'phone') {
      setSmsSent(false);
      setSmsCode('');
      setSmsLoading(false);
    }
  }, [mode]);

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
        const deepLinkUrl = getRedirectUrl('auth/callback');
        const emailRedirectTo = Platform.select({
          web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : deepLinkUrl,
          default: deepLinkUrl,
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
                    const deepLinkUrl = getRedirectUrl('auth/callback');
                    const emailRedirectTo = Platform.select({
                      web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : deepLinkUrl,
                      default: deepLinkUrl,
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
      const deepLinkUrl = getRedirectUrl('auth/callback');
      const emailRedirectTo = Platform.select({
        web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : deepLinkUrl,
        default: deepLinkUrl,
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
        web: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : getRedirectUrl('auth/reset-password'),
        default: getRedirectUrl('auth/reset-password'),
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

  const normalizePhone = (raw: string) => {
    let value = raw.trim();
    if (!value) return '';
    if (value.startsWith('+')) return value;
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (!digits.startsWith('90')) digits = `90${digits}`;
    return `+${digits}`;
  };

  const handleSendSmsCode = async () => {
    const formatted = normalizePhone(phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
      return;
    }
    setSmsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: {
          shouldCreateUser: mode !== 'login',
          channel: 'sms',
        },
      });
      if (error) throw error;
      setSmsSent(true);
      Alert.alert('Başarılı', 'SMS doğrulama kodu gönderildi. Telefonunuza gelen kodu girin.');
    } catch (error: any) {
      console.error('Error sending SMS code:', error);
      Alert.alert('Hata', error?.message || 'SMS kodu gönderilemedi');
    } finally {
      setSmsLoading(false);
    }
  };

  const handlePhonePasswordSetup = async () => {
    if (!phonePassword.trim() || phonePassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (phonePassword !== phonePasswordConfirm) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      // Şifreyi güncelle
      const { error } = await supabase.auth.updateUser({
        password: phonePassword,
      });
      if (error) throw error;

      // Metadata'ya has_password ekle
      await supabase.auth.updateUser({
        data: { has_password: true },
      });

      Alert.alert('Başarılı', 'Şifreniz oluşturuldu');
      
      if (phoneUserId) {
        await checkProfileAndNavigate(phoneUserId);
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          await checkProfileAndNavigate(userData.user.id);
        }
      }
    } catch (error: any) {
      console.error('Error setting password:', error);
      Alert.alert('Hata', error?.message || 'Şifre oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneForgotPassword = async () => {
    const formatted = normalizePhone(phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
      return;
    }

    setSmsLoading(true);
    try {
      // Telefon numarasına OTP gönder
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: {
          shouldCreateUser: false,
          channel: 'sms',
        },
      });
      
      if (error) throw error;
      
      setSmsSent(true);
      Alert.alert('Başarılı', 'Telefonunuza doğrulama kodu gönderildi. Lütfen kodu girin.');
    } catch (error: any) {
      console.error('Error sending forgot password SMS:', error);
      Alert.alert('Hata', error?.message || 'SMS kodu gönderilemedi');
    } finally {
      setSmsLoading(false);
    }
  };

  const handlePhoneResetPassword = async () => {
    const formatted = normalizePhone(phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Telefon numarası gerekli');
      return;
    }
    if (!smsCode.trim()) {
      Alert.alert('Hata', 'SMS kodunu girin');
      return;
    }
    if (!phonePassword.trim() || phonePassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (phonePassword !== phonePasswordConfirm) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      // Önce OTP'yi doğrula
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: smsCode.trim(),
        type: 'sms',
      });
      
      if (verifyError) throw verifyError;

      // Şifreyi güncelle
      const { error: updateError } = await supabase.auth.updateUser({
        password: phonePassword,
      });
      
      if (updateError) throw updateError;

      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi');
      
      // Giriş yap
      const resolvedId = data?.session?.user?.id || data?.user?.id;
      if (resolvedId) {
        await checkProfileAndNavigate(resolvedId);
      } else {
        setMode('login');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert('Hata', error?.message || 'Şifre değiştirilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    const formatted = normalizePhone(phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Hata', 'Şifre gerekli');
      return;
    }

    setLoading(true);
    try {
      // Önce telefon numarası ile OTP gönder (giriş için)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: {
          shouldCreateUser: false,
          channel: 'sms',
        },
      });
      
      if (otpError) {
        // Eğer kullanıcı yoksa, şifre ile giriş yapmayı dene
        // Telefon + şifre ile giriş için özel bir yöntem gerekebilir
        // Şimdilik OTP ile devam edelim
        throw otpError;
      }
      
      // OTP gönderildi, kullanıcıdan kodu iste
      setSmsSent(true);
      Alert.alert('Bilgi', 'Telefonunuza doğrulama kodu gönderildi. Lütfen kodu girin.');
    } catch (error: any) {
      console.error('Error in phone login:', error);
      // Eğer kullanıcı yoksa kayıt ekranına yönlendir
      if (error?.message?.includes('not found') || error?.message?.includes('User not found')) {
        Alert.alert('Bilgi', 'Bu telefon numarası ile kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.');
        setMode('phone');
      } else {
        Alert.alert('Hata', error?.message || 'Giriş yapılamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySmsCode = async () => {
    const formatted = normalizePhone(phoneNumber);
    if (!formatted) {
      Alert.alert('Hata', 'Telefon numarası gerekli');
      return;
    }
    if (!smsSent) {
      Alert.alert('Hata', 'Önce telefonunuza kod gönderin');
      return;
    }
    if (!smsCode.trim()) {
      Alert.alert('Hata', 'SMS kodunu girin');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: smsCode.trim(),
        type: 'sms',
      });
      if (error) throw error;

      let resolvedId = data?.session?.user?.id || data?.user?.id;
      if (!resolvedId) {
        const { data: current } = await supabase.auth.getUser();
        resolvedId = current?.user?.id;
      }
      if (!resolvedId) throw new Error('Kullanıcı doğrulanamadı');
      
      // Kullanıcının şifresi var mı kontrol et
      const { data: userData } = await supabase.auth.getUser();
      const hasPassword = userData?.user?.app_metadata?.has_password || false;
      
      // Eğer yeni kullanıcıysa ve şifresi yoksa şifre oluşturma ekranına yönlendir
      if (!hasPassword && mode === 'phone') {
        setPhoneUserId(resolvedId);
        setMode('phone-password-setup');
        setSmsCode('');
        setLoading(false);
        return;
      }
      
      await checkProfileAndNavigate(resolvedId);
    } catch (error: any) {
      console.error('Error verifying SMS code:', error);
      Alert.alert('Hata', error?.message || 'Telefon doğrulaması başarısız');
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
      const redirectUrl = isNative ? getRedirectUrl('auth/callback') : getRedirectUrl('auth/callback');

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
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('🔐 [GoogleLogin] OAuth error:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('OAuth URL alınamadı');
      }

      console.log('🔐 [GoogleLogin] Opening OAuth session:', data.url);
      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
        setLoading(false);
        setOauthLoading(false);
      }
      
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
            <PhoneCall size={20} color={COLORS.white} style={styles.inputIcon} />
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

    if (mode === 'phone') {
      return (
        <View style={styles.formContainer}>
          <View style={styles.betaBadge}>
            <Text style={styles.betaText}>📱 Telefon ile giriş</Text>
            <Text style={styles.betaSubtext}>Numaranı doğrulayarak giriş yap</Text>
          </View>

          <View style={styles.inputContainer}>
            <Mail size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+90 5xx xxx xx xx"
              placeholderTextColor="rgba(255,255,255,0.6)"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <Text style={styles.phoneInfoText}>
            Telefon numaranı girip SMS doğrulama kodu iste. Kod geldikten sonra aşağıya girerek giriş yapabilirsin.
          </Text>

          <TouchableOpacity
            style={[styles.secondaryButton, (smsLoading || !phoneNumber.trim()) && styles.buttonDisabled]}
            onPress={handleSendSmsCode}
            disabled={smsLoading || !phoneNumber.trim()}
          >
            {smsLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {smsSent ? 'Kodu Yeniden Gönder' : 'SMS Kodu Gönder'}
              </Text>
            )}
          </TouchableOpacity>

          {smsSent && (
            <View style={styles.inputContainer}>
              <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="SMS Kodu"
                placeholderTextColor="rgba(255,255,255,0.6)"
                keyboardType="number-pad"
                value={smsCode}
                onChangeText={setSmsCode}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, (!smsSent || !smsCode.trim() || loading) && styles.buttonDisabled]}
            onPress={handleVerifySmsCode}
            disabled={!smsSent || !smsCode.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.primaryButtonText}>Telefonla Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre (varsa)"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, (!phoneNumber.trim() || !password.trim() || loading) && styles.buttonDisabled]}
            onPress={handlePhoneLogin}
            disabled={!phoneNumber.trim() || !password.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.secondaryButtonText}>Şifre ile Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('phone-forgot')}>
            <Text style={styles.forgotText}>Şifremi unuttum</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('login')}>
            <Text style={styles.linkText}>Geri dön</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === 'phone-password-setup') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Şifre Oluştur</Text>
          <Text style={styles.formSubtitle}>Hesabınızı güvence altına almak için bir şifre oluşturun</Text>

          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre (en az 6 karakter)"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={phonePassword}
              onChangeText={setPhonePassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre Tekrar"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={phonePasswordConfirm}
              onChangeText={setPhonePasswordConfirm}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!phonePassword.trim() || !phonePasswordConfirm.trim() || loading) && styles.buttonDisabled]}
            onPress={handlePhonePasswordSetup}
            disabled={!phonePassword.trim() || !phonePasswordConfirm.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Şifre Oluştur</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === 'phone-forgot') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Şifremi Unuttum</Text>
          <Text style={styles.formSubtitle}>Telefon numaranıza doğrulama kodu göndereceğiz</Text>

          <View style={styles.inputContainer}>
            <PhoneCall size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+90 5xx xxx xx xx"
              placeholderTextColor="rgba(255,255,255,0.6)"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, (smsLoading || !phoneNumber.trim()) && styles.buttonDisabled]}
            onPress={handlePhoneForgotPassword}
            disabled={smsLoading || !phoneNumber.trim()}
          >
            {smsLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {smsSent ? 'Kodu Yeniden Gönder' : 'Doğrulama Kodu Gönder'}
              </Text>
            )}
          </TouchableOpacity>

          {smsSent && (
            <>
              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="SMS Kodu"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  keyboardType="number-pad"
                  value={smsCode}
                  onChangeText={setSmsCode}
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Yeni Şifre (en az 6 karakter)"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={phonePassword}
                  onChangeText={setPhonePassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Yeni Şifre Tekrar"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={phonePasswordConfirm}
                  onChangeText={setPhonePasswordConfirm}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!smsCode.trim() || !phonePassword.trim() || !phonePasswordConfirm.trim() || loading) && styles.buttonDisabled]}
                onPress={handlePhoneResetPassword}
                disabled={!smsCode.trim() || !phonePassword.trim() || !phonePasswordConfirm.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Şifreyi Değiştir</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => { setMode('phone'); setSmsSent(false); setSmsCode(''); }}>
            <Text style={styles.linkText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.formContainer}>
        {/* Beta Sürümü Mesajı */}
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>🚀 Beta Sürümü</Text>
          <Text style={styles.betaSubtext}>Yakında tam sürüm kullanıma sunulacak</Text>
        </View>

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
              Google ile {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
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
                Apple ile {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.magicLinkButton, loading && styles.buttonDisabled]}
          onPress={() => setMode('magic')}
          disabled={loading}
        >
          <Text style={styles.magicLinkButtonText}>Link ile Giriş</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.magicLinkButton, loading && styles.buttonDisabled]}
          onPress={() => {
            setMode('phone');
            setSmsSent(false);
            setSmsCode('');
          }}
          disabled={loading}
        >
          <Text style={styles.magicLinkButtonText}>Telefon ile Giriş</Text>
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
            {/* Politikalar - Sıralı ve Düzenli */}
            {policies && policies.length > 0 && (() => {
              const policyTypeLabels: Record<string, string> = {
                terms: 'Kullanım Şartları',
                privacy: 'Gizlilik Politikası',
                community: 'Topluluk Kuralları',
                cookie: 'Çerez Politikası',
                refund: 'İade Politikası',
                child_safety: 'Çocuk Güvenliği',
                payment: 'Ödeme Politikası',
                moderation: 'Moderasyon',
                data_storage: 'Veri Saklama',
                eula: 'Lisans Sözleşmesi',
                university: 'Üniversite Modu',
                event: 'Etkinlik Politikası',
                other: 'Diğer',
              };
              
              const activePolicies = policies
                .filter((p: any) => p.is_active)
                .sort((a: any, b: any) => (a.display_order || 999) - (b.display_order || 999))
                .slice(0, 20); // Maksimum 20 politika
              
              if (activePolicies.length === 0) return null;
              
              return (
                <View style={styles.policiesContainer}>
                  {activePolicies.map((policy: any, index: number) => (
                    <React.Fragment key={policy.id}>
                      <TouchableOpacity 
                        onPress={() => handlePolicyPress(policy.policy_type)}
                        style={styles.policyButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.policyButtonText}>
                          {policyTypeLabels[policy.policy_type] || policy.title}
                        </Text>
                      </TouchableOpacity>
                      {index < activePolicies.length - 1 && (
                        <Text style={styles.policySeparator}>•</Text>
                      )}
                    </React.Fragment>
                  ))}
                </View>
              );
            })()}
            
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

      {/* Policy Modal */}
      <Modal
        visible={policyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setPolicyModalVisible(false);
          setSelectedPolicy(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => {
              setPolicyModalVisible(false);
              setSelectedPolicy(null);
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPolicy?.title || 'Politika'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setPolicyModalVisible(false);
                  setSelectedPolicy(null);
                }} 
                style={styles.closeButton}
              >
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView} 
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {selectedPolicy && (
                <>
                  <Text style={styles.modalPolicyContent}>{selectedPolicy.content}</Text>
                  <Text style={styles.modalPolicyDate}>
                    Son güncelleme: {new Date(selectedPolicy.updated_at || selectedPolicy.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xl * 1.2,
    }),
  },
  formSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: SPACING.lg,
    textAlign: 'center' as const,
    flexWrap: 'wrap',
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center' as const,
      paddingTop: 0,
      paddingBottom: 0,
    }),
  },
  forgotText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    textAlign: 'right' as const,
    marginBottom: SPACING.md,
    opacity: 0.8,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  switchText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center' as const,
    marginTop: SPACING.md,
    opacity: 0.9,
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xs,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  linkText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center' as const,
    marginTop: SPACING.md,
    textDecorationLine: 'underline' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  footer: {
    marginTop: SPACING.xxl,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
  },
  policiesContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    maxWidth: '100%',
  },
  policyButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    minHeight: 32,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  policyButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.85,
    textDecorationLine: 'underline' as const,
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xs * 1.4,
    }),
  },
  policySeparator: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.5,
    marginHorizontal: SPACING.xs,
    lineHeight: FONT_SIZES.xs * 1.4,
  },
  terms: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    textAlign: 'center' as const,
    opacity: 0.7,
    lineHeight: Platform.OS === 'android' ? FONT_SIZES.xs * 1.4 : 18,
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xs,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  termsLink: {
    textDecorationLine: 'underline' as const,
  },
  betaBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center' as const,
  },
  betaText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: '#FFC107',
    marginBottom: SPACING.xs,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
  },
  betaSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  phoneInfoText: {
    color: COLORS.white,
    opacity: 0.8,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
    textAlign: 'left' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalOverlayTouchable: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  modalPolicyContent: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  modalPolicyDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontStyle: 'italic' as const,
  },
});
