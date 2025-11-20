import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, PhoneCall } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { makeRedirectUri } from 'expo-auth-session';

type AuthMode = 'login' | 'register' | 'email-code' | 'forgot' | 'phone' | 'phone-password-setup' | 'phone-forgot';

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
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
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
        setLoading(false);
        isNavigatingRef.current = false;
        console.log('✅ [onAuthStateChange] Reset states and navigation flag');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkProfileAndNavigate]);

  useEffect(() => {
    if (mode !== 'phone') {
      setSmsSent(false);
      setSmsCode('');
      setSmsLoading(false);
    }
    if (mode === 'email-code') {
      setEmailCode('');
      setEmailCodeSent(false);
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

  const handleSendEmailCode = async () => {
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
      // Email doğrulama kodu gönder (OTP) - magic link yerine kod gönder
      const { error } = await supabase.auth.signInWithOtp({ 
        email: trimmedEmail,
        options: {
          shouldCreateUser: mode === 'register', // Kayıt modunda yeni kullanıcı oluştur
          emailRedirectTo: undefined, // Magic link'i devre dışı bırak
        }
      });
      
      if (error) {
        throw error;
      }
      
      setEmailCodeSent(true);
      Alert.alert('Başarılı', 'Email adresinize doğrulama kodu gönderildi!');
    } catch (error: any) {
      console.error('Error sending email code:', error);
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = emailCode.trim();
    
    if (!trimmedCode) {
      Alert.alert('Hata', 'Lütfen doğrulama kodunu girin');
      return;
    }

    if (trimmedCode.length !== 6) {
      Alert.alert('Hata', 'Doğrulama kodu 6 haneli olmalıdır');
      return;
    }

    setLoading(true);
    try {
      // Email ve kodu ile giriş yap
      // Önce email type ile dene, sonra signup type ile dene
      let { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedCode,
        type: 'email',
      });
      
      // Eğer email type başarısız olursa ve register modundaysak, signup type ile dene
      if (error && mode === 'register') {
        const { data: signUpData, error: signUpError } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: trimmedCode,
          type: 'signup',
        });
        if (signUpError) throw signUpError;
        data = signUpData;
      } else if (error) {
        throw error;
      }

      if (data?.user) {
        // Profil kontrolü yap
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.full_name) {
          // Profil var, feed'e yönlendir
          router.replace('/(tabs)/feed');
        } else {
          // Profil yok, onboarding'e yönlendir
          router.replace('/auth/onboarding');
        }
      }
    } catch (error: any) {
      console.error('Error verifying email code:', error);
      Alert.alert('Hata', error.message || 'Doğrulama kodu hatalı');
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





  const renderForm = () => {
    if (mode === 'email-code') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Email ile Giriş</Text>
          <Text style={styles.formSubtitle}>
            {emailCodeSent 
              ? 'Email adresinize gönderilen 6 haneli kodu girin' 
              : 'Email adresinize doğrulama kodu göndereceğiz'}
          </Text>
          
          <View style={styles.inputContainer}>
            <Mail size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailCodeSent) {
                  setEmailCodeSent(false);
                  setEmailCode('');
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!emailCodeSent}
            />
          </View>

          {emailCodeSent && (
            <View style={styles.inputContainer}>
              <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Doğrulama Kodu (6 haneli)"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={emailCode}
                onChangeText={(text) => setEmailCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={emailCodeSent ? handleVerifyEmailCode : handleSendEmailCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {emailCodeSent ? 'Kodu Doğrula' : 'Kod Gönder'}
              </Text>
            )}
          </TouchableOpacity>

          {emailCodeSent && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setEmailCodeSent(false);
                setEmailCode('');
              }}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Farklı Email Kullan</Text>
            </TouchableOpacity>
          )}

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
          style={[styles.magicLinkButton, loading && styles.buttonDisabled]}
          onPress={() => {
            setMode('email-code');
            setEmailCodeSent(false);
            setEmailCode('');
          }}
          disabled={loading}
        >
          <Text style={styles.magicLinkButtonText}>Email Kodu ile Giriş</Text>
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
  dividerText: {
    color: COLORS.white,
    marginHorizontal: SPACING.md,
    opacity: 0.7,
  },
  footer: {
    marginTop: SPACING.xxl,
    alignItems: 'center' as const,
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
  },
  betaSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center' as const,
  },
  phoneInfoText: {
    color: COLORS.white,
    opacity: 0.8,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'left' as const,
  },
});
