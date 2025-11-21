import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { UserProfile } from '@/types/database';
import { registerForPushNotifications } from '@/lib/notifications';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
      
      // User bilgisini al
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Email kolonu olmayabilir, kontrol et
      const profileData: any = {
        id: userId,
        full_name: currentUser?.user_metadata?.full_name || 'Kullanıcı',
        district: currentUser?.user_metadata?.district || 'Ortahisar',
      };
      
      // Email kolonu varsa ekle
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
    
    // Android için ULTRA AGRESIF timeout - 500ms içinde session alınamazsa loading'i false yap
    timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 500);
    
    // Session'ı al ve koru - otomatik çıkış yapma
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (!mounted) return;
      
      if (error) {
        // Hata olsa bile session'ı korumaya çalış - refresh token ile yenilenebilir
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      if (!mounted) return;

      setSession(session);
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        // Profile yükleme için de agresif timeout
        const profileTimeout = setTimeout(() => {
          if (mounted) {
            setLoading(false);
          }
        }, 1000);
        
        try {
          const profileData = await loadProfile(nextUser.id);
          clearTimeout(profileTimeout);
          
          if (mounted) {
            setProfile(profileData);
            setLoading(false);
          }
        } catch (error) {
          clearTimeout(profileTimeout);
          // Hata olsa bile session'ı koru - otomatik çıkış yapma
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        // Session yoksa bile otomatik çıkış yapma - refresh token ile yenilenebilir
        if (mounted) {
          setLoading(false);
        }
      }
    }).catch((error) => {
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
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Session varsa token'ı yenile (otomatik refresh)
          await supabase.auth.refreshSession();
          console.log('🔄 [AuthContext] Token refreshed automatically');
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
        // Hata olsa bile session'ı koru
      }
    }, 30 * 60 * 1000); // Her 30 dakikada bir token'ı yenile

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Sadece manuel SIGNED_OUT event'inde çıkış yap
      // TOKEN_REFRESHED ve diğer event'lerde session'ı koru
      // Not: Supabase'de SIGNED_OUT event'i sadece manuel signOut() çağrıldığında tetiklenir
      // Ancak TypeScript'te SIGNED_OUT event'i yok, bu yüzden session null kontrolü yapıyoruz
      if (!session && event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') {
        // Session yoksa ve manuel çıkış yapılmışsa
        console.log('👋 [AuthContext] Session ended - user may have signed out');
        // Sadece gerçekten çıkış yapıldıysa temizle
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
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

    return () => {
      clearInterval(refreshInterval);
      subscription.unsubscribe();
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
   * Önce anonymous auth dener, başarısız olursa geçici email ile otomatik kayıt yapar
   */
  const signInAsGuest = useCallback(async () => {
    try {
      setLoading(true);
      
      // Önce anonymous auth'u dene
      let data = null;
      let error = null;
      
      try {
        const result = await supabase.auth.signInAnonymously();
        data = result.data;
        error = result.error;
      } catch (anonError: any) {
        error = anonError;
      }
      
      // Anonymous auth başarısızsa backend fonksiyonu ile misafir kullanıcı oluştur (email doğrulaması bypass)
      if (error && error.message?.includes('Anonymous sign-ins are disabled')) {
        console.log('🔄 [Guest] Anonymous auth disabled, creating guest user via backend...');
        
        try {
          // Backend fonksiyonu ile misafir kullanıcı oluştur (email confirmation bypass)
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xcvcplwimicylaxghiak.supabase.co';
          const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
          
          console.log('🔄 [Guest] Calling backend function:', `${supabaseUrl}/functions/v1/create-guest-user`);
          
          const response = await fetch(`${supabaseUrl}/functions/v1/create-guest-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          });

          console.log('📡 [Guest] Backend response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Guest] Backend error response:', errorText);
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || 'Backend error' };
            }
            throw new Error(errorData.error || errorData.message || 'Misafir hesabı oluşturulamadı');
          }

          const result = await response.json();
          console.log('✅ [Guest] Backend response:', { success: result.success, hasSession: !!result.session, hasUser: !!result.user });
          
          if (!result.success || !result.session || !result.user) {
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
        } catch (backendError: any) {
          console.error('❌ [Guest] Backend creation error:', backendError);
          // Fallback: Eski yöntemi dene
          console.log('🔄 [Guest] Falling back to direct signup...');
          
          // Geçici email oluştur
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 9);
          const tempEmail = `guest_${timestamp}_${randomId}@mytrabzon.guest`;
          
          // Geçici password oluştur
          const tempPassword = `Guest_${timestamp}_${randomId}_${Math.random().toString(36).substring(2, 15)}`;
          
          // Önce giriş yapmayı dene (hesap zaten varsa)
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: tempEmail,
            password: tempPassword,
          });
          
          if (!signInError && signInData?.session && signInData?.user) {
            // Hesap zaten varsa direkt giriş yap
            data = signInData;
          } else {
            throw new Error(backendError.message || 'Misafir hesabı oluşturulamadı. Lütfen email veya telefon ile giriş yapın.');
          }
        }
      } else if (error) {
        throw new Error(error.message || 'Misafir girişi başarısız');
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
