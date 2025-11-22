import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { UserProfile } from '@/types/database';
import { registerForPushNotifications } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

// AsyncStorage key'leri
const GUEST_EMAIL_KEY = '@mytrabzon:guest_email';
const GUEST_PASSWORD_KEY = '@mytrabzon:guest_password';
const GUEST_USER_ID_KEY = '@mytrabzon:guest_user_id';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);

  const loadProfile = useCallback(async (userId: string): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile fetch failed', error);
      throw new Error(error.message ?? 'Profil verisine ulaşılamadı');
    }

    if (!data) {
      console.warn('Profile not found, creating one...');
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const profileData: any = {
        id: userId,
        full_name: currentUser?.user_metadata?.full_name || 'Kullanıcı',
        district: currentUser?.user_metadata?.district || 'Ortahisar',
      };
      
      if (currentUser?.email) {
        profileData.email = currentUser.email;
      }
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileData);
      
      if (insertError) {
        console.error('Failed to create profile:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        throw new Error(`Profil oluşturulamadı: ${insertError.message}`);
      }
      
      const { data: newProfile, error: newError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (newError || !newProfile) {
        throw new Error('Profil bulunamadı');
      }
      
      return newProfile as UserProfile;
    }

    return data as UserProfile;
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    // Session'ı restore et - kalıcı oturum için
    const restoreSession = async () => {
      try {
        // Önce mevcut session'ı kontrol et
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [AuthContext] Session get error:', sessionError);
          // Hata olsa bile refresh token ile yenilemeyi dene
          try {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshedSession) {
              if (mounted) {
                setLoading(false);
              }
              return;
            }
            
            if (refreshedSession && mounted) {
              setSession(refreshedSession);
              setUser(refreshedSession.user);
              if (refreshedSession.user) {
                const profileData = await loadProfile(refreshedSession.user.id);
                if (mounted) {
                  setProfile(profileData);
                  setLoading(false);
                }
              }
              return;
            }
          } catch (refreshError) {
            console.error('❌ [AuthContext] Refresh error:', refreshError);
          }
          
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (!mounted) return;

        // Session varsa kullan
        if (session) {
          setSession(session);
          setUser(session.user);
          
          if (session.user) {
            try {
              const profileData = await loadProfile(session.user.id);
              if (mounted) {
                setProfile(profileData);
                setLoading(false);
              }
            } catch (error) {
              console.error('❌ [AuthContext] Profile load error:', error);
              // Hata olsa bile session'ı koru
              if (mounted) {
                setLoading(false);
              }
            }
          } else {
            if (mounted) {
              setLoading(false);
            }
          }
        } else {
          // Session yoksa refresh token ile yenilemeyi dene
          try {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshedSession) {
              console.log('⚠️ [AuthContext] No session and refresh failed - user needs to login');
              if (mounted) {
                setLoading(false);
              }
              return;
            }
            
            if (refreshedSession && mounted) {
              setSession(refreshedSession);
              setUser(refreshedSession.user);
              if (refreshedSession.user) {
                const profileData = await loadProfile(refreshedSession.user.id);
                if (mounted) {
                  setProfile(profileData);
                  setLoading(false);
                }
              } else {
                if (mounted) {
                  setLoading(false);
                }
              }
            } else {
              if (mounted) {
                setLoading(false);
              }
            }
          } catch (error) {
            console.error('❌ [AuthContext] Refresh attempt error:', error);
            if (mounted) {
              setLoading(false);
            }
          }
        }
      } catch (error) {
        console.error('❌ [AuthContext] Unexpected error in restoreSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Timeout - 2 saniye içinde session alınamazsa loading'i false yap
    timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 2000);
    
    // Session'ı restore et
    restoreSession().then(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }).catch((error) => {
      console.error('❌ [AuthContext] restoreSession promise error:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadProfile]);

  useEffect(() => {
    // Token refresh listener - session'ı süresiz tutmak için
    // Daha sık refresh yap (her 15 dakikada bir) - session'ın süresiz kalması için
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Session varsa token'ı yenile (otomatik refresh)
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('❌ [AuthContext] Token refresh error:', error);
            // Hata olsa bile session'ı koru - tekrar denenecek
          } else if (refreshedSession) {
            console.log('🔄 [AuthContext] Token refreshed automatically');
            // Refreshed session'ı güncelle
            setSession(refreshedSession);
            setUser(refreshedSession.user);
          }
        } else {
          // Session yoksa bile refresh token ile yenilemeyi dene
          try {
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            if (refreshedSession) {
              console.log('🔄 [AuthContext] Session restored from refresh token');
              setSession(refreshedSession);
              setUser(refreshedSession.user);
              if (refreshedSession.user) {
                const profileData = await loadProfile(refreshedSession.user.id);
                setProfile(profileData);
              }
            }
          } catch (refreshError) {
            // Refresh token da yoksa kullanıcı gerçekten çıkış yapmış demektir
            console.log('⚠️ [AuthContext] No refresh token available');
          }
        }
      } catch (error) {
        console.error('❌ [AuthContext] Error in refresh interval:', error);
        // Hata olsa bile session'ı koru
      }
    }, 10 * 60 * 1000); // Her 10 dakikada bir token'ı yenile (süresiz session için)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [AuthContext] Auth state changed:', event, session?.user?.id);
      
      // Sadece manuel SIGNED_OUT event'inde çıkış yap
      // TOKEN_REFRESHED, INITIAL_SESSION ve diğer event'lerde session'ı koru
      if (event === 'SIGNED_OUT') {
        // Sadece manuel çıkış yapıldığında temizle
        console.log('👋 [AuthContext] User signed out manually');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // Session yoksa bile refresh token ile yenilemeyi dene
      if (!session && event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') {
        console.log('⚠️ [AuthContext] Session temporarily unavailable, attempting refresh...');
        try {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshedSession) {
            // Refresh token da yoksa gerçekten çıkış yapılmış
            console.log('👋 [AuthContext] No refresh token - user signed out');
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          
          // Refresh başarılı - session'ı restore et
          console.log('✅ [AuthContext] Session restored from refresh token');
          session = refreshedSession;
        } catch (error) {
          console.error('❌ [AuthContext] Refresh attempt failed:', error);
          // Hata olsa bile bir kez daha kontrol et
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          session = currentSession;
        }
      }

      // Diğer tüm durumlarda session'ı koru ve güncelle
      setSession(session);
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        setLoading(true);
        void loadProfile(nextUser.id)
          .then((profileData) => {
            setProfile(profileData);
            
            // Push notification token'ı kaydet (arka planda, sessiz)
            registerForPushNotifications().catch((error) => {
              console.error('❌ [AuthContext] Push token kaydı başarısız:', error);
              // Hata olsa bile uygulamayı durdurma
            });
          })
          .catch((error) => {
            console.error('Error loading profile after auth change:', error);
            // Hata olsa bile session'ı koru - otomatik çıkış yapma
            // setProfile(null); // Bu satırı kaldırdık - session korunacak
          })
          .finally(() => {
            setLoading(false);
          });
      } else if (event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED') {
        // Session yoksa bile koru (refresh bekleniyor olabilir)
        // Otomatik çıkış yapma - session refresh edilebilir
        console.log('⚠️ [AuthContext] Session temporarily unavailable, waiting for refresh...');
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error) {
            console.error('❌ [AuthContext] Get session error on foreground:', error);
            supabase.auth.refreshSession().then(({ data: { session: refreshedSession } }) => {
              if (refreshedSession) {
                console.log('✅ [AuthContext] Session restored from refresh token on foreground');
                setSession(refreshedSession);
                setUser(refreshedSession.user);
                if (refreshedSession.user) {
                  loadProfile(refreshedSession.user.id).then(setProfile).catch((err) => {
                    console.error('❌ [AuthContext] Profile load error on foreground:', err);
                  });
                }
              }
            }).catch((refreshErr) => {
              console.error('❌ [AuthContext] Refresh session error on foreground:', refreshErr);
            });
            return;
          }

          if (session) {
            console.log('✅ [AuthContext] Session found on foreground, updating state');
            setSession(session);
            setUser(session.user);
            if (session.user) {
              loadProfile(session.user.id).then(setProfile).catch((err) => {
                console.error('❌ [AuthContext] Profile load error on foreground:', err);
              });
            }
          } else {
            console.log('⚠️ [AuthContext] No session on foreground, attempting refresh...');
            supabase.auth.refreshSession().then(({ data: { session: refreshedSession } }) => {
              if (refreshedSession) {
                console.log('✅ [AuthContext] Session restored from refresh token on foreground');
                setSession(refreshedSession);
                setUser(refreshedSession.user);
                if (refreshedSession.user) {
                  loadProfile(refreshedSession.user.id).then(setProfile).catch((err) => {
                    console.error('❌ [AuthContext] Profile load error on foreground:', err);
                  });
                }
              } else {
                console.log('⚠️ [AuthContext] No refresh token available on foreground');
              }
            }).catch((refreshErr) => {
              console.error('❌ [AuthContext] Refresh session error on foreground:', refreshErr);
            });
          }
        }).catch((err) => {
          console.error('❌ [AuthContext] Unexpected error on foreground session check:', err);
        });
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      clearInterval(refreshInterval);
      subscription.unsubscribe();
      if (appStateSubscription && typeof appStateSubscription.remove === 'function') {
        appStateSubscription.remove();
      }
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      // Optimize: Profile changes için minimal subscription
      .channel(`profile_changes_${user.id}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // Profile updated via real-time
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      // Unsubscribing from profile changes
      subscription.unsubscribe();
    };
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      // Session'ı temizle
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      // Supabase'den çıkış yap
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        // Hata olsa bile state'i temizle
      }
      
      console.log('✅ [AuthContext] User signed out successfully');
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Hata olsa bile state'i temizle
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    // Manually refreshing profile
    setLoading(true);
    try {
      const profileData = await loadProfile(user.id);
      setProfile(profileData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, loadProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      console.error('❌ Cannot update profile: No user logged in');
      throw new Error('Kullanıcı oturumu bulunamadı');
    }

    // Email veya telefon eklendiğinde hesabı ilişkilendir
    const isGuestAccount = !user.email || user.email.includes('@mytrabzon.guest') || user.is_anonymous;
    
    if (isGuestAccount && updates.email && typeof updates.email === 'string') {
      const trimmedEmail = updates.email.trim();
      
      // Email validation
      if (trimmedEmail.length > 0 && trimmedEmail.length <= 254 && trimmedEmail !== user.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(trimmedEmail)) {
          console.log('🔄 [Profile] Linking guest account with email:', trimmedEmail);
          try {
            const { error: updateError } = await supabase.auth.updateUser({ 
              email: trimmedEmail 
            });
            if (updateError) {
              console.error('❌ [Profile] Email update error:', updateError);
              // Email güncelleme hatası profil güncellemesini durdurmaz
            } else {
              console.log('✅ [Profile] Email linked successfully');
            }
          } catch (emailError: any) {
            console.error('❌ [Profile] Unexpected error linking email:', emailError);
            // Hata olsa bile devam et
          }
        } else {
          console.warn('⚠️ [Profile] Invalid email format:', trimmedEmail);
        }
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating profile:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Profile update failed: ${error.message}`);
    }

    if (!data) {
      console.error('❌ Profile update returned no data');
      throw new Error('Profil güncellenemedi, veri dönmedi');
    }

    setProfile(data as UserProfile);

    // Profil güncellendikten sonra user bilgisini yenile
    try {
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (userError: any) {
      console.warn('⚠️ Error refreshing user after profile update:', userError);
    }

    try {
      const refreshedProfile = await loadProfile(user.id);
      setProfile(refreshedProfile);
      return refreshedProfile;
    } catch (refreshError: any) {
      console.error('⚠️ Error reloading profile after update:', refreshError);
      return data as UserProfile;
    }
  }, [user, loadProfile]);

  /**
   * Misafir olarak giriş yap (Anonymous Auth)
   * Önce AsyncStorage'dan kayıtlı misafir hesabını kontrol eder, varsa onunla giriş yapar
   * Yoksa yeni misafir hesabı oluşturur ve AsyncStorage'a kaydeder
   */
  const signInAsGuest = useCallback(async () => {
    try {
      setLoading(true);
      
      // Önce AsyncStorage'dan kayıtlı misafir hesabını kontrol et
      const savedGuestEmail = await AsyncStorage.getItem('@mytrabzon:guest_email');
      const savedGuestPassword = await AsyncStorage.getItem('@mytrabzon:guest_password');
      const savedGuestUserId = await AsyncStorage.getItem('@mytrabzon:guest_user_id');
      
      let data = null;
      let guestEmail = '';
      let guestPassword = '';
      
      // Kayıtlı misafir hesabı varsa onunla giriş yapmayı dene
      if (savedGuestEmail && savedGuestPassword) {
        console.log('🔄 [Guest] Saved guest account found, attempting login...');
        guestEmail = savedGuestEmail;
        guestPassword = savedGuestPassword;
        
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: savedGuestEmail,
            password: savedGuestPassword,
          });
          
          if (!signInError && signInData?.session && signInData?.user) {
            // Kayıtlı hesap ile giriş başarılı
            console.log('✅ [Guest] Logged in with saved guest account');
            data = signInData;
          } else {
            console.warn('⚠️ [Guest] Saved account login failed, creating new guest account...');
            // Kayıtlı hesap ile giriş başarısız, yeni hesap oluştur
            // AsyncStorage'ı temizle (eski hesap geçersiz)
            try {
              await AsyncStorage.multiRemove([
                '@mytrabzon:guest_email',
                '@mytrabzon:guest_password',
                '@mytrabzon:guest_user_id',
              ]);
              console.log('🔄 [Guest] Cleared invalid saved credentials');
            } catch (clearError) {
              console.warn('⚠️ [Guest] Failed to clear invalid credentials:', clearError);
            }
          }
        } catch (loginError: any) {
          console.warn('⚠️ [Guest] Saved account login error:', loginError);
          // Giriş başarısız, yeni hesap oluştur
          // AsyncStorage'ı temizle
          try {
            await AsyncStorage.multiRemove([
              '@mytrabzon:guest_email',
              '@mytrabzon:guest_password',
              '@mytrabzon:guest_user_id',
            ]);
            console.log('🔄 [Guest] Cleared invalid saved credentials after error');
          } catch (clearError) {
            console.warn('⚠️ [Guest] Failed to clear invalid credentials:', clearError);
          }
        }
      }
      
      // Kayıtlı hesap yoksa veya giriş başarısız olduysa yeni misafir hesabı oluştur
      if (!data || !data.session || !data.user) {
        console.log('🔄 [Guest] Creating new guest account...');
        
        // Önce anonymous auth'u dene
        let error = null;
        
        try {
          const result = await supabase.auth.signInAnonymously();
          data = result.data;
          error = result.error;
        } catch (anonError: any) {
          error = anonError;
        }
        
        // Anonymous auth başarısızsa backend fonksiyonu ile misafir kullanıcı oluştur
        if (error && error.message?.includes('Anonymous sign-ins are disabled')) {
          console.log('🔄 [Guest] Anonymous auth disabled, creating guest user via backend...');
          
          try {
            // Backend fonksiyonu ile misafir kullanıcı oluştur (email confirmation bypass)
            console.log('🔄 [Guest] Calling create-guest-user function via supabase.functions.invoke');
            
            const { data: result, error: invokeError } = await supabase.functions.invoke('create-guest-user', {
              body: {},
            });
            
            if (invokeError) {
              console.error('❌ [Guest] create-guest-user invoke error:', invokeError);
              throw new Error(invokeError.message || 'Misafir hesabı oluşturulamadı');
            }

            console.log('✅ [Guest] Backend response:', { success: result?.success, hasSession: !!result?.session, hasUser: !!result?.user });
            
            if (!result?.success || !result?.session || !result?.user) {
              console.error('❌ [Guest] Invalid backend response:', result);
              throw new Error('Misafir hesabı oluşturulamadı - geçersiz yanıt');
            }

            // Session'ı set et
            console.log('🔄 [Guest] Setting session...');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: result.session.access_token,
              refresh_token: result.session.refresh_token,
            });

            if (sessionError || !sessionData.session || !sessionData.user) {
              console.error('❌ [Guest] Session set error:', sessionError);
              throw new Error('Misafir oturumu oluşturulamadı');
            }

            console.log('✅ [Guest] Session set successfully');
            data = { session: sessionData.session, user: sessionData.user };
            
            // Backend'den dönen email/password'ü kaydet
            if (result.credentials?.email && result.credentials?.password) {
              guestEmail = result.credentials.email;
              guestPassword = result.credentials.password;
              
              // AsyncStorage'a kaydet
              try {
                await AsyncStorage.multiSet([
                  ['@mytrabzon:guest_email', guestEmail],
                  ['@mytrabzon:guest_password', guestPassword],
                  ['@mytrabzon:guest_user_id', sessionData.user.id],
                ]);
                console.log('✅ [Guest] Guest credentials saved to AsyncStorage from backend');
              } catch (storageError: any) {
                console.warn('⚠️ [Guest] Failed to save credentials to AsyncStorage:', storageError);
              }
            } else if (result.user?.email) {
              // Backend'den email/password yoksa sadece email'i kaydet (password yok)
              guestEmail = result.user.email;
              console.warn('⚠️ [Guest] Backend did not return password, credentials not saved');
            }
          } catch (backendError: any) {
            console.error('❌ [Guest] Backend creation error:', backendError);
            // Fallback: Geçici email ile misafir hesabı oluştur
            console.log('🔄 [Guest] Falling back to direct signup...');
          }
        }
        
        // Backend başarısız olduysa veya email/password yoksa fallback yöntemi kullan
        if (!data || !data.session || !data.user) {
          // Geçici email ve password oluştur
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 9);
          guestEmail = `guest_${timestamp}_${randomId}@mytrabzon.guest`;
          guestPassword = `Guest_${timestamp}_${randomId}_${Math.random().toString(36).substring(2, 15)}`;
          
          // Yeni misafir hesabı oluştur (email confirmation bypass için backend kullanılmalı)
          // Ancak fallback olarak normal signup denenebilir (ancak email confirmation gerekir)
          // Bu yüzden backend fonksiyonunu kullanmak daha iyi
          throw new Error('Misafir hesabı oluşturulamadı. Lütfen tekrar deneyin.');
        }
        
        // Yeni misafir hesabı oluşturuldu, email ve password'ü AsyncStorage'a kaydet
        if (guestEmail && guestPassword && data.user) {
          try {
            await AsyncStorage.multiSet([
              ['@mytrabzon:guest_email', guestEmail],
              ['@mytrabzon:guest_password', guestPassword],
              ['@mytrabzon:guest_user_id', data.user.id],
            ]);
            console.log('✅ [Guest] Guest credentials saved to AsyncStorage');
          } catch (storageError: any) {
            console.warn('⚠️ [Guest] Failed to save credentials to AsyncStorage:', storageError);
            // AsyncStorage hatası kritik değil, devam et
          }
        }
      }

      if (!data || !data.session || !data.user) {
        throw new Error('Misafir oturumu oluşturulamadı');
      }

      setSession(data.session);
      setUser(data.user);
      
      // Guest user için profil yükleme
      try {
        const profileData = await loadProfile(data.user.id);
        setProfile(profileData);
        console.log('✅ [AuthContext] Guest signed in successfully');
      } catch (error: any) {
        // Profil oluşturulamazsa bile devam et
        console.warn('⚠️ [AuthContext] Guest profile creation failed:', error);
      }
      
      setLoading(false);
      return data.session;
    } catch (error: any) {
      console.error('❌ Unexpected error during guest sign in:', error);
      setLoading(false);
      throw error;
    }
  }, [loadProfile]);

  /**
   * Kullanıcının misafir olup olmadığını kontrol eder
   */
  const isGuest = useMemo(() => {
    if (!user) return false;
    // Anonymous kullanıcılar misafir sayılır (email yoksa)
    return !user.email && user.is_anonymous === true;
  }, [user]);

  return useMemo(() => ({
    session,
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
    updateProfile,
    signInAsGuest,
    isGuest,
  }), [session, user, profile, loading, signOut, refreshProfile, updateProfile, signInAsGuest, isGuest]);
});
