import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { UserProfile } from '@/types/database';

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
      console.warn('⚠️ Profile not found, creating it now...');
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Profil bulunamadı ve kullanıcı bilgisi alınamadı');
      }

      const newProfile = {
        id: userId,
        email: userData.user.email || '',
        full_name: userData.user.user_metadata?.full_name || 'Kullanıcı',
        district: userData.user.user_metadata?.district || 'Ortahisar',
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('Failed to create profile:', createError);
        throw new Error('Profil oluşturulamadı');
      }

      console.log('✅ Profile created successfully');
      return createdProfile as UserProfile;
    }

    console.log('Profile loaded via Supabase successfully', { userId });
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        setLoading(true);
        void loadProfile(nextUser.id)
          .then((profileData) => {
            setProfile(profileData);
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

    console.log('Setting up real-time subscription for user:', user.id);
    const subscription = supabase
      .channel(`profile_changes_${user.id}`)
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
    await supabase.auth.signOut();
    setProfile(null);
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
