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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        setLoading(true);
        try {
          const profileData = await loadProfile(nextUser.id);
          setProfile(profileData);
        } catch (error) {
          console.error('Error loading profile after session fetch:', error);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
            setProfile(null);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
    await supabase.auth.signOut();
    setProfile(null);
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

    try {
      const refreshedProfile = await loadProfile(user.id);
      setProfile(refreshedProfile);
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
