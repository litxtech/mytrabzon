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
    console.log('Loading profile via Supabase', { userId });

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

    console.log('Profile loaded via Supabase successfully', { userId });
    return data as UserProfile;
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Session'ı al ve koru - otomatik çıkış yapma
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('Error getting session:', error);
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
        setLoading(true);
        try {
          const profileData = await loadProfile(nextUser.id);
          if (mounted) {
            setProfile(profileData);
          }
        } catch (error) {
          console.error('Error loading profile after session fetch:', error);
          // Hata olsa bile session'ı koru - otomatik çıkış yapma
          // setProfile(null); // Kaldırıldı - session korunacak
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        // Session yoksa bile otomatik çıkış yapma - refresh token ile yenilenebilir
        // setProfile(null); // Kaldırıldı
        if (mounted) {
          setLoading(false);
        }
      }
    }).catch((error) => {
      console.error('Unexpected error in getSession:', error);
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
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

    console.log('Setting up real-time subscription for user:', user.id);
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
          console.log('Profile updated via real-time:', payload.new);
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from profile changes');
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

    console.log('Manually refreshing profile');
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

    console.log('🔄 Updating profile with:', JSON.stringify(updates, null, 2));
    console.log('🔑 User ID:', user.id);

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

    console.log('✅ Profile updated successfully in database');
    setProfile(data as UserProfile);

    try {
      console.log('🔄 Refreshing profile to ensure consistency...');
      const refreshedProfile = await loadProfile(user.id);
      setProfile(refreshedProfile);
      console.log('✅ Profile refreshed successfully');
      return refreshedProfile;
    } catch (refreshError: any) {
      console.error('⚠️ Error reloading profile after update:', refreshError);
      return data as UserProfile;
    }
  }, [user, loadProfile]);

  return useMemo(() => ({
    session,
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
    updateProfile,
  }), [session, user, profile, loading, signOut, refreshProfile, updateProfile]);
});
