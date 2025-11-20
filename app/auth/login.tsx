import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, PhoneCall } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import { PolicyConsentModal } from '@/components/PolicyConsentModal';

type AuthMode = 'login' | 'register' | 'forgot' | 'phone' | 'phone-register' | 'phone-password-setup' | 'phone-forgot';

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
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const isNavigatingRef = useRef(false); // Navigation flag - duplicate call'ları önlemek için
  const router = useRouter();
  const pathname = usePathname(); // Mevcut path'i takip et
  
  // Policy'leri çek
  const { data: policies } = (trpc as any).admin.getPolicies.useQuery();
  const { data: requiredPolicies } = (trpc as any).user.getRequiredPolicies.useQuery();
  const consentMutation = (trpc as any).user.consentToPolicies.useMutation();
  
  // Kullanıcı dostu hata mesajları için yardımcı fonksiyon
  const getFriendlyErrorMessage = (error: any): string => {
    const errorMessage = error?.message || error?.error || '';
    const lowerMessage = errorMessage.toLowerCase();

    // Email ile ilgili hatalar
    if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid_credentials')) {
      return 'Email veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
    }
    if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('email_not_confirmed')) {
      return 'Email adresinizi doğrulamanız gerekiyor. Email kutunuzu kontrol edin.';
    }
    if (lowerMessage.includes('user not found') || lowerMessage.includes('user_not_found')) {
      return 'Bu email adresi ile kayıtlı kullanıcı bulunamadı.';
    }
    if (lowerMessage.includes('email already registered') || lowerMessage.includes('already_registered')) {
      return 'Bu email adresi zaten kullanılıyor. Giriş yapmayı deneyin.';
    }

    // Şifre ile ilgili hatalar
    if (lowerMessage.includes('password') && lowerMessage.includes('weak')) {
      return 'Şifreniz çok zayıf. Daha güçlü bir şifre seçin.';
    }
    if (lowerMessage.includes('password') && lowerMessage.includes('too short')) {
      return 'Şifreniz en az 6 karakter olmalıdır.';
    }

    // Network hataları
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
      return 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }

    // Rate limit hataları
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';
    }

    // Magic link hataları
    if (lowerMessage.includes('magic link') || lowerMessage.includes('otp')) {
      return 'Doğrulama linki gönderilemedi. Lütfen tekrar deneyin.';
    }

    // SMS hataları
    if (lowerMessage.includes('sms') || lowerMessage.includes('phone')) {
      return 'SMS gönderilemedi. Telefon numaranızı kontrol edin ve tekrar deneyin.';
    }

    // Genel hatalar
    if (lowerMessage.includes('server error') || lowerMessage.includes('internal error')) {
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    }
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('permission')) {
      return 'Bu işlem için yetkiniz bulunmuyor.';
    }

    // Bilinmeyen hatalar için genel mesaj
    if (errorMessage) {
      // Eğer mesaj zaten Türkçe ve kullanıcı dostu görünüyorsa direkt kullan
      if (errorMessage.length < 100 && !errorMessage.includes('Error') && !errorMessage.includes('error')) {
        return errorMessage;
      }
    }

    return 'Bir sorun oluştu. Lütfen tekrar deneyin.';
  };

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

  // Profil güncelleme fonksiyonu - email ve telefon bilgilerini otomatik ekle
  const updateProfileWithAuthInfo = useCallback(async (userId: string, email?: string, phone?: string, isNewUser: boolean = false) => {
    try {
      const updateData: any = {};
      
      // Email varsa ve farklıysa ekle
      if (email) {
        updateData.email = email;
      }
      
      // Telefon varsa ve farklıysa ekle
      if (phone) {
        updateData.phone = phone;
      }
      
      // Yeni kullanıcılar için "beni göster" ayarını açık yap
      if (isNewUser) {
        updateData.show_in_directory = true;
      }
      
      // Eğer güncellenecek bir şey varsa
      if (Object.keys(updateData).length > 0) {
        console.log('📝 [updateProfile] Updating profile with:', updateData);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);
        
        if (updateError) {
          console.error('❌ [updateProfile] Error updating profile:', updateError);
          // Hata olsa bile devam et, kritik değil
        } else {
          console.log('✅ [updateProfile] Profile updated successfully');
        }
      }
    } catch (error: any) {
      console.error('❌ [updateProfile] Unexpected error:', error);
      // Hata olsa bile devam et
    }
  }, []);

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
  }, [mode]);

  const handlePolicyAccept = async (policyIds: string[]) => {
    if (!policyIds || policyIds.length === 0) {
      console.error('No policy IDs provided');
      Alert.alert('Hata', 'Politika ID\'leri bulunamadı');
      return;
    }

    // Kayıt modunda kullanıcı henüz oluşturulmamış olabilir
    // Bu durumda sadece checkbox'ı işaretle, kayıt işleminden sonra politika onayı yapılacak
    if (mode === 'register') {
      console.log('📝 [login] Register mode: Marking policies as accepted, will be saved after signup');
      setPoliciesAccepted(true);
      setShowPolicyModal(false);
      return;
    }

    // Giriş modunda veya mevcut kullanıcı için politika onayını kaydet
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        setLoading(false);
        return;
      }

      console.log('📝 [login] Accepting policies:', policyIds, 'for user:', user.id);
      await consentMutation.mutateAsync({ 
        policyIds,
        userId: user.id,
      });
      console.log('✅ [login] Policies accepted successfully');
      setPoliciesAccepted(true);
      setShowPolicyModal(false);
    } catch (error: any) {
      console.error('❌ [login] Error accepting policies:', error);
      const errorMessage = error?.message || 'Politika onayı sırasında bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    
    console.log('🔍 [login] handleEmailAuth called:', {
      mode,
      email: trimmedEmail,
      emailLength: trimmedEmail.length,
      passwordLength: password.length,
      trimmedPasswordLength: trimmedPassword.length,
      hasEmail: !!trimmedEmail && trimmedEmail.length > 0,
      hasPassword: !!trimmedPassword && trimmedPassword.length > 0,
    });
    
    // Email ve password kontrolü - boş string veya sadece boşluk kontrolü
    if (!trimmedEmail || trimmedEmail.length === 0) {
      console.warn('⚠️ [login] Email validation failed');
      Alert.alert('Hata', 'Lütfen email adresinizi girin');
      return;
    }
    
    if (!trimmedPassword || trimmedPassword.length === 0) {
      console.warn('⚠️ [login] Password validation failed:', {
        passwordLength: password.length,
        trimmedPasswordLength: trimmedPassword.length,
        passwordValue: password,
      });
      Alert.alert('Hata', 'Lütfen şifrenizi girin');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Hata', 'Geçerli bir email adresi girin');
      return;
    }

    // Kayıt modunda politika onayı kontrolü
    if (mode === 'register') {
      if (requiredPolicies?.policies && requiredPolicies.policies.length > 0 && !policiesAccepted) {
        Alert.alert('Uyarı', 'Devam etmek için politikaları kabul etmeniz gerekmektedir');
        setShowPolicyModal(true);
        return;
      }
      
      // Kayıt modunda email doğrulaması ile kayıt yap
      setLoading(true);
      try {
        console.log('📝 [register] Creating user with email:', trimmedEmail);
        
        // Supabase emailRedirectTo için web URL kullanmalıyız (custom scheme kabul etmez)
        // Web callback sayfası mobil uygulamaya yönlendirecek
        const webRedirectUrl = Platform.select({
          web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://litxtech.com/auth/callback',
          default: 'https://litxtech.com/auth/callback',
        });
        
        const deepLinkUrl = getRedirectUrl('auth/callback');
        
        console.log('📧 [register] Web redirect URL:', webRedirectUrl);
        console.log('📧 [register] Deep link URL:', deepLinkUrl);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            emailRedirectTo: webRedirectUrl, // Web URL kullan (Supabase custom scheme kabul etmez)
            // Email doğrulaması gerekli - Supabase Dashboard'da "Enable email confirmations" açık olmalı
            // Email gönderilmesi için Supabase Dashboard > Authentication > Email Templates ayarlanmalı
            // ÖNEMLİ: Supabase Dashboard > Authentication > URL Configuration > Redirect URLs listesine
            // "https://litxtech.com/auth/callback" eklenmeli
          },
        });

        if (signUpError) {
          console.error('❌ [register] SignUp error:', signUpError);
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error('Kullanıcı oluşturulamadı');
        }

        console.log('✅ [register] User created:', signUpData.user.id);
        console.log('📧 [register] Email confirmation required:', !signUpData.session);
        console.log('📧 [register] SignUp response:', {
          hasUser: !!signUpData.user,
          hasSession: !!signUpData.session,
          userEmail: signUpData.user?.email,
          userConfirmed: signUpData.user?.email_confirmed_at ? 'Yes' : 'No',
        });

        // Email bilgisini profile ekle (email doğrulanmadan önce bile) ve "beni göster" ayarını aç
        await updateProfileWithAuthInfo(signUpData.user.id, trimmedEmail, undefined, true);

        // Politika onaylarını kaydet (email doğrulanmadan önce bile)
        if (policiesAccepted && requiredPolicies?.policies && requiredPolicies.policies.length > 0) {
          try {
            const policyIds = requiredPolicies.policies.map((p: any) => p.id);
            console.log('📝 [register] Saving policies for new user:', signUpData.user.id);
            await consentMutation.mutateAsync({ 
              policyIds,
              userId: signUpData.user.id,
            });
            console.log('✅ [register] Policies accepted for new user');
          } catch (policyError: any) {
            console.error('❌ [register] Error accepting policies for new user:', policyError);
            // Politika hatası kayıt işlemini durdurmaz
          }
        }

        // Email doğrulaması gerekli
        if (!signUpData.session) {
          console.log('📧 [register] No session - email confirmation required');
          console.log('📧 [register] Email should be sent to:', trimmedEmail);
          
          // Email gönderilip gönderilmediğini kontrol et ve manuel olarak gönder
          try {
            console.log('📧 [register] Manually resending confirmation email...');
            const { error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email: trimmedEmail,
              options: {
                emailRedirectTo: webRedirectUrl, // Web URL kullan
              },
            });
            
            if (resendError) {
              console.error('❌ [register] Error resending email:', resendError);
              // Resend hatası olsa bile kullanıcıya bilgi ver
            } else {
              console.log('✅ [register] Confirmation email resent successfully');
            }
          } catch (resendErr: any) {
            console.error('❌ [register] Exception during email resend:', resendErr);
          }
          
          Alert.alert(
            'Kayıt Başarılı',
            'Email adresinize doğrulama linki gönderildi. Lütfen email kutunuzu kontrol edin.',
            [{ 
              text: 'Tamam', 
              onPress: () => {
                setMode('login');
                setEmail('');
                setPassword('');
              }
            }]
          );
          return;
        }

        // Eğer session varsa (email doğrulaması kapalıysa), direkt giriş yap
        if (signUpData.session?.user) {
          console.log('✅ [register] Auto login successful (email confirmation disabled)');
          await checkProfileAndNavigate(signUpData.session.user.id);
        }
      } catch (error: any) {
        console.error('❌ [register] Error during registration:', error);
        console.error('❌ [register] Error details:', {
          message: error?.message,
          status: error?.status,
          code: error?.code,
          name: error?.name,
        });
        
        const friendlyMessage = getFriendlyErrorMessage(error);
        
        // Daha detaylı hata mesajı göster
        Alert.alert(
          'Kayıt Başarısız', 
          friendlyMessage,
          [
            { text: 'Tamam' },
            ...(error?.message?.includes('email') || error?.message?.includes('Email') ? [] : [
              {
                text: 'Detaylar',
                onPress: () => {
                  Alert.alert('Hata Detayları', JSON.stringify({
                    message: error?.message,
                    code: error?.code,
                  }, null, 2));
                },
              },
            ]),
          ]
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      // Giriş modunda normal şifre ile giriş yap
      const result = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: trimmedPassword });

      if (result.error) {
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
                    const friendlyMessage = getFriendlyErrorMessage(resendErr);
                    Alert.alert('Email Gönderilemedi', friendlyMessage);
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

      // Giriş başarılı - email bilgisini profile ekle
      const userId = result.data.user?.id || '';
      if (userId) {
        await updateProfileWithAuthInfo(userId, trimmedEmail, undefined);
      }
      checkProfileAndNavigate(userId);
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
      // Magic link gönder - mobil uygulamada kalması için deep link kullan
      const redirectUrl = getRedirectUrl('auth/callback');
      
      console.log('📧 [magic-link] Sending magic link to:', trimmedEmail);
      console.log('📧 [magic-link] Redirect URL:', redirectUrl);
      console.log('📧 [magic-link] Mode:', mode, 'isRegister:', mode === 'register');
      
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: mode === 'register', // Kayıt modunda kullanıcı oluştur
          emailRedirectTo: redirectUrl, // Mobil deep link
        },
      });

      if (error) {
        console.error('❌ [magic-link] Error:', error);
        throw error;
      }

      Alert.alert(
        'Başarılı', 
        mode === 'register' 
          ? 'Email adresinize doğrulama linki gönderildi! Linke tıklayarak kaydınızı tamamlayabilirsiniz.'
          : 'Email adresinize doğrulama linki gönderildi! Linke tıklayarak giriş yapabilirsiniz.'
      );
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Link Gönderilemedi', friendlyMessage);
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async () => {
    const input = email.trim();
    
    if (!input) {
      Alert.alert('Hata', 'Lütfen email veya telefon numaranızı girin');
      return;
    }

    setLoading(true);
    try {
      // Email mi telefon mu kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(input);
      
      if (isEmail) {
        // Email ile şifre sıfırlama
        const trimmedEmail = input.toLowerCase();
        const redirectUrl = Platform.select({
          web: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : getRedirectUrl('auth/reset-password'),
          default: getRedirectUrl('auth/reset-password'),
        });
        
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: redirectUrl,
        });
        
        if (error) throw error;
        Alert.alert('Başarılı', 'Şifre sıfırlama linki email adresinize gönderildi! Linke tıklayarak şifrenizi sıfırlayabilirsiniz.');
      } else {
        // Telefon ile şifre sıfırlama
        const formatted = normalizePhone(input);
        if (!formatted) {
          Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
          setLoading(false);
          return;
        }
        
        // Telefon numarasına OTP gönder
        const { error } = await supabase.auth.signInWithOtp({
          phone: formatted,
          options: {
            shouldCreateUser: false,
            channel: 'sms',
          },
        });
        
        if (error) throw error;
        
        // Telefon numarasını state'e kaydet
        setPhoneNumber(input);
        setSmsSent(true);
        setMode('phone-forgot');
        Alert.alert('Başarılı', 'Telefonunuza doğrulama kodu gönderildi. Lütfen kodu girin.');
      }
      
      setMode('login');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Şifre Sıfırlama Hatası', friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const normalizePhone = (raw: string) => {
    let value = raw.trim();
    if (!value) return '';
    
    // Sadece rakamları al
    let digits = value.replace(/\D/g, '');
    
    // Boşsa döndür
    if (!digits) return '';
    
    // Eğer zaten +90 ile başlıyorsa, olduğu gibi döndür
    if (value.startsWith('+90')) {
      return value.replace(/\D/g, '').replace(/^90/, '+90');
    }
    
    // Eğer 0 ile başlıyorsa, 0'ı kaldır
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    
    // Eğer 90 ile başlıyorsa, + ekle
    if (digits.startsWith('90')) {
      return `+${digits}`;
    }
    
    // Eğer 10 haneli numara ise (5330483061 gibi), +90 ekle
    if (digits.length === 10) {
      return `+90${digits}`;
    }
    
    // Diğer durumlarda +90 ekle
    return `+90${digits}`;
  };

  const handleSendSmsCode = async (isRegister: boolean = false) => {
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
          shouldCreateUser: isRegister, // Kayıt modunda kullanıcı oluştur
          channel: 'sms',
        },
      });
      if (error) throw error;
      setSmsSent(true);
      Alert.alert(
        'Başarılı', 
        isRegister 
          ? 'SMS doğrulama kodu gönderildi. Telefonunuza gelen kodu girin ve şifrenizi oluşturun.'
          : 'SMS doğrulama kodu gönderildi. Telefonunuza gelen kodu girin.'
      );
    } catch (error: any) {
      console.error('Error sending SMS code:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('SMS Gönderilemedi', friendlyMessage);
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
      const userId = phoneUserId || (await supabase.auth.getUser()).data?.user?.id;
      
      if (!userId) {
        throw new Error('Kullanıcı ID bulunamadı');
      }
      
      console.log('📱 [phone-register] Setting password for user:', userId);
      
      // Şifreyi güncelle
      const { error: passwordError } = await supabase.auth.updateUser({
        password: phonePassword,
      });
      
      if (passwordError) {
        console.error('❌ [phone-register] Password update error:', passwordError);
        throw passwordError;
      }

      // Metadata'ya has_password ekle
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { has_password: true },
      });
      
      if (metadataError) {
        console.warn('⚠️ [phone-register] Metadata update error (non-critical):', metadataError);
        // Metadata hatası kritik değil, devam et
      }

      console.log('✅ [phone-register] Password set successfully');
      
      // Telefon numarasını profile ekle (eğer henüz eklenmediyse) ve "beni göster" ayarını aç
      const formatted = normalizePhone(phoneNumber);
      if (formatted) {
        console.log('📱 [phone-register] Updating profile with phone:', formatted);
        await updateProfileWithAuthInfo(userId, undefined, formatted, true);
      }
      
      // Politika onaylarını kontrol et ve kaydet (eğer kayıt modundaysa)
      if (requiredPolicies?.policies && requiredPolicies.policies.length > 0) {
        try {
          const policyIds = requiredPolicies.policies.map((p: any) => p.id);
          console.log('📝 [phone-register] Saving policies for new user:', userId);
          await consentMutation.mutateAsync({ 
            policyIds,
            userId: userId,
          });
          console.log('✅ [phone-register] Policies accepted for new user');
        } catch (policyError: any) {
          console.error('❌ [phone-register] Error accepting policies:', policyError);
          // Politika hatası kayıt işlemini durdurmaz
        }
      }
      
      // Profil kontrolü ve yönlendirme
      await checkProfileAndNavigate(userId);
    } catch (error: any) {
      console.error('❌ [phone-register] Error setting password:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Kayıt Başarısız', friendlyMessage);
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
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('SMS Gönderilemedi', friendlyMessage);
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
      
      // Giriş yap ve telefon numarasını profile ekle
      const resolvedId = data?.session?.user?.id || data?.user?.id;
      if (resolvedId) {
        // Telefon numarasını profile ekle
        await updateProfileWithAuthInfo(resolvedId, undefined, formatted);
        await checkProfileAndNavigate(resolvedId);
      } else {
        setMode('login');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Şifre Değiştirilemedi', friendlyMessage);
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
      Alert.alert('Hata', 'Lütfen şifrenizi girin');
      return;
    }

    setLoading(true);
    try {
      // Telefon numarasını email formatına çevir (Supabase telefon + şifre girişi için)
      // Format: +905551234567 -> +905551234567@phone.mytrabzon.com
      const phoneEmail = `${formatted}@phone.mytrabzon.com`;
      
      console.log('📱 [phone-login] Attempting login with phone:', formatted);
      
      // Telefon numarasını email olarak kullanarak şifre ile giriş yap
      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: password.trim(),
      });

      if (error) {
        console.error('❌ [phone-login] Error:', error);
        throw error;
      }

      if (data?.user) {
        console.log('✅ [phone-login] Login successful');
        // Giriş başarılı - telefon numarasını profile ekle
        await updateProfileWithAuthInfo(data.user.id, undefined, formatted);
        await checkProfileAndNavigate(data.user.id);
      }
    } catch (error: any) {
      console.error('Error in phone login:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      
      // Kullanıcı bulunamadı hatası için özel mesaj
      if (error?.message?.includes('not found') || 
          error?.message?.includes('User not found') ||
          error?.message?.includes('Invalid login credentials') ||
          error?.message?.includes('invalid_credentials')) {
        Alert.alert(
          'Giriş Yapılamadı', 
          'Telefon numarası veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.'
        );
      } else {
        Alert.alert('Giriş Yapılamadı', friendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySmsCode = async (isRegister: boolean = false) => {
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
      console.log('📱 [phone-verify] Verifying SMS code for:', formatted);
      console.log('📱 [phone-verify] Is register mode:', isRegister);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: smsCode.trim(),
        type: 'sms',
      });
      
      if (error) {
        console.error('❌ [phone-verify] OTP verification error:', error);
        throw error;
      }

      let resolvedId = data?.session?.user?.id || data?.user?.id;
      if (!resolvedId) {
        const { data: current } = await supabase.auth.getUser();
        resolvedId = current?.user?.id;
      }
      if (!resolvedId) {
        console.error('❌ [phone-verify] User ID not found');
        throw new Error('Kullanıcı doğrulanamadı');
      }
      
      console.log('✅ [phone-verify] SMS code verified, user ID:', resolvedId);
      
      // Telefon numarasını profile ekle
      await updateProfileWithAuthInfo(resolvedId, undefined, formatted);

      // Kayıt modunda şifre oluşturma ekranına yönlendir
      if (isRegister) {
        console.log('📱 [phone-register] Redirecting to password setup');
        setPhoneUserId(resolvedId);
        setMode('phone-password-setup');
        setSmsCode('');
        setSmsSent(false); // SMS kodunu temizle
        setLoading(false);
        return;
      }

      // Giriş modunda - kullanıcının şifresi var mı kontrol et
      const { data: userData } = await supabase.auth.getUser();
      const hasPassword = userData?.user?.app_metadata?.has_password || false;
      
      if (!hasPassword && mode === 'phone') {
        console.log('📱 [phone-login] No password, redirecting to password setup');
        setPhoneUserId(resolvedId);
        setMode('phone-password-setup');
        setSmsCode('');
        setSmsSent(false);
        setLoading(false);
        return;
      }
      
      // Giriş başarılı, profil kontrolü ve yönlendirme
      await checkProfileAndNavigate(resolvedId);
    } catch (error: any) {
      console.error('❌ [phone-verify] Error verifying SMS code:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      Alert.alert('Doğrulama Başarısız', friendlyMessage);
    } finally {
      setLoading(false);
    }
  };





  const renderForm = () => {
    if (mode === 'forgot') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Şifremi Unuttum</Text>
          <Text style={styles.formSubtitle}>Email veya telefon numaranızla şifre sıfırlama linki göndereceğiz</Text>
          
          <View style={styles.inputContainer}>
            <Mail size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email veya Telefon (5xx xxx xx xx)"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // Eğer telefon numarası formatındaysa phoneNumber'a da ekle
                if (/^[0-9+\s-]+$/.test(text) && !text.includes('@')) {
                  setPhoneNumber(text);
                }
              }}
              keyboardType="default"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={async () => {
              const input = email.trim();
              // Email mi telefon mu kontrol et
              if (input.includes('@')) {
                // Email ile şifre sıfırlama
                await handleForgotPassword();
              } else {
                // Telefon ile şifre sıfırlama
                await handlePhoneForgotPassword();
              }
            }}
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Şifre Sıfırlama Linki Gönder</Text>
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
          <Text style={styles.betaText}>Telefon ile giriş</Text>

          <View style={styles.inputContainer}>
            <PhoneCall size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="5xx xxx xx xx"
              placeholderTextColor="rgba(255,255,255,0.6)"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
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
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!phoneNumber.trim() || !password.trim() || loading) && styles.buttonDisabled]}
            onPress={handlePhoneLogin}
            disabled={!phoneNumber.trim() || !password.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('phone-forgot')}>
            <Text style={styles.forgotText}>Şifremi unuttum</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('login')}>
            <Text style={styles.linkText}>Email ile giriş yap</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === 'phone-register') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.betaText}>Telefon ile kayıt ol</Text>

          <View style={styles.inputContainer}>
            <PhoneCall size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="5xx xxx xx xx"
              placeholderTextColor="rgba(255,255,255,0.6)"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoCapitalize="none"
              editable={!smsSent}
            />
          </View>

          {!smsSent ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, (smsLoading || !phoneNumber.trim()) && styles.buttonDisabled]}
                onPress={() => handleSendSmsCode(true)}
                disabled={smsLoading || !phoneNumber.trim()}
              >
                {smsLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>SMS Kodu Gönder</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
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
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!smsCode.trim() || loading) && styles.buttonDisabled]}
                onPress={() => handleVerifySmsCode(true)}
                disabled={!smsCode.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Kodu Doğrula</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setSmsSent(false);
                  setSmsCode('');
                }}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Farklı Numara Kullan</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => setMode('register')}>
            <Text style={styles.linkText}>Email ile kayıt ol</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === 'phone-password-setup') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.betaText}>Şifre Belirle</Text>

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
              <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
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
              placeholder="5xx xxx xx xx"
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
        <Text style={styles.betaText}>Yakında tam sürüm kullanıma sunulacak</Text>

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
            onChangeText={(text) => {
              console.log('🔑 [login] Password changed:', text.length, 'characters');
              setPassword(text);
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {mode === 'login' && (
          <TouchableOpacity onPress={() => setMode('forgot')}>
            <Text style={styles.forgotText}>Şifremi unuttum</Text>
          </TouchableOpacity>
        )}

        {/* Politika Onay Checkbox (Sadece Kayıt Modunda) */}
        {mode === 'register' && requiredPolicies?.policies && requiredPolicies.policies.length > 0 && (
          <TouchableOpacity
            style={styles.policyCheckboxContainer}
            onPress={() => setShowPolicyModal(true)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              policiesAccepted && styles.checkboxChecked,
              { borderColor: COLORS.white }
            ]}>
              {policiesAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.policyCheckboxText}>
              Kullanım Koşulları ve Gizlilik Politikası&apos;nı kabul ediyorum
            </Text>
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

        <View style={styles.alternativeButtonsContainer}>
          {/* Apple Sign In/Up (Sadece iOS) - Özel buton */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.magicLinkButton, loading && styles.buttonDisabled]}
              onPress={async () => {
                try {
                  setLoading(true);
                  const credential = await AppleAuthentication.signInAsync({
                    requestedScopes: [
                      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                      AppleAuthentication.AppleAuthenticationScope.EMAIL,
                    ],
                  });

                  if (credential.identityToken) {
                    const { data, error } = await supabase.auth.signInWithIdToken({
                      provider: 'apple',
                      token: credential.identityToken,
                    });

                    if (error) throw error;

                    if (data.user) {
                      // Politika onaylarını kontrol et ve kaydet
                      if (requiredPolicies?.policies && requiredPolicies.policies.length > 0) {
                        try {
                          const policyIds = requiredPolicies.policies.map((p: any) => p.id);
                          await consentMutation.mutateAsync({ 
                            policyIds,
                            userId: data.user.id,
                          });
                          console.log('✅ [login] Policies accepted for Apple user');
                        } catch (policyError: any) {
                          console.error('❌ [login] Error accepting policies for Apple user:', policyError);
                        }
                      }
                      
                      checkProfileAndNavigate(data.user.id);
                    }
                  }
                } catch (e: any) {
                  if (e.code === 'ERR_REQUEST_CANCELED') {
                    // Kullanıcı iptal etti, sessizce devam et
                    console.log('Apple Sign In cancelled');
                  } else {
                    console.error('Apple Sign In error:', e);
                    const friendlyMessage = getFriendlyErrorMessage(e);
                    Alert.alert('Giriş Yapılamadı', friendlyMessage);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <Text style={styles.magicLinkButtonText}>
                {mode === 'login' ? 'Apple ile Giriş' : 'Apple ile Kayıt'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.magicLinkButton, loading && styles.buttonDisabled]}
            onPress={handleSendEmailCode}
            disabled={loading}
          >
            <Text style={styles.magicLinkButtonText}>
              {mode === 'login' ? 'Magic Link ile Giriş' : 'Magic Link ile Kayıt'}
            </Text>
          </TouchableOpacity>

          {mode === 'login' && (
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
          )}

          {mode === 'register' && (
            <TouchableOpacity
              style={[styles.magicLinkButton, loading && styles.buttonDisabled]}
              onPress={() => {
                setMode('phone-register');
                setPhoneNumber('');
                setSmsSent(false);
                setSmsCode('');
              }}
              disabled={loading}
            >
              <Text style={styles.magicLinkButtonText}>Telefon ile Kayıt Ol</Text>
            </TouchableOpacity>
          )}
        </View>

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

      {/* Politika Onay Modalı */}
      {requiredPolicies?.policies && requiredPolicies.policies.length > 0 && (
        <PolicyConsentModal
          visible={showPolicyModal}
          policies={requiredPolicies.policies}
          onAccept={() => {
            const policyIds = requiredPolicies.policies.map((p: any) => p.id);
            handlePolicyAccept(policyIds);
          }}
          onReject={() => {
            // Zorunlu olduğu için reddetme seçeneği yok
            Alert.alert('Uyarı', 'Politikaları kabul etmeden devam edemezsiniz');
          }}
          required={true}
        />
      )}
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
    alignItems: 'center' as const,
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
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.xl,
    minHeight: 60,
    width: '100%',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
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
  alternativeButtonsContainer: {
    width: '100%',
    alignItems: 'center' as const,
    marginTop: SPACING.md,
  },
  magicLinkButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    minHeight: 48,
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
  betaText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '400' as const,
    color: COLORS.white,
    opacity: 0.6,
    textAlign: 'center' as const,
    marginBottom: SPACING.lg,
  },
  phoneInfoText: {
    color: COLORS.white,
    opacity: 0.8,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'left' as const,
  },
  appleButton: {
    width: '100%',
    height: 44, // Küçültüldü (50'den 44'e)
    marginBottom: SPACING.md,
  },
  policyCheckboxContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
    marginRight: SPACING.sm,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  checkmark: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  policyCheckboxText: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    opacity: 0.9,
    flexWrap: 'wrap',
  },
});
