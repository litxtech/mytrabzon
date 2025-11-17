import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICTS, DISTRICT_BADGES } from '@/constants/districts';
import { District } from '@/types/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PolicyConsentModal } from '@/components/PolicyConsentModal';
import { trpc } from '@/lib/trpc';

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Profil kontrolü - eğer profil varsa feed'e yönlendir
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user?.id) {
        setCheckingProfile(false);
        return;
      }

      try {
        console.log('🔍 [onboarding] Checking existing profile for user:', user.id);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, district')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ [onboarding] Profile check error:', error);
          setCheckingProfile(false);
          return;
        }

        if (profile && profile.full_name) {
          console.log('✅ [onboarding] Profile exists, redirecting to feed');
          router.replace('/(tabs)/feed' as any);
          return;
        }

        console.log('ℹ️ [onboarding] No profile found, showing onboarding form');
        setCheckingProfile(false);
      } catch (error: any) {
        console.error('❌ [onboarding] Profile check exception:', error);
        setCheckingProfile(false);
      }
    };

    checkExistingProfile();
  }, [user?.id, router]);

  // Zorunlu politikaları al
  const { data: policiesData, isLoading: policiesLoading } = (trpc as any).user.getRequiredPolicies.useQuery();
  const consentMutation = (trpc as any).user.consentToPolicies.useMutation();

  // Policy yoksa veya query başarısızsa otomatik olarak kabul edilmiş say
  useEffect(() => {
    if (!policiesLoading && (!policiesData?.policies || policiesData.policies.length === 0)) {
      console.log('✅ [onboarding] No policies required, auto-accepting');
      setPoliciesAccepted(true);
    }
  }, [policiesData, policiesLoading]);

  // İlk açılışta politika modalını göster
  useEffect(() => {
    if (policiesData?.policies && policiesData.policies.length > 0 && !policiesAccepted) {
      console.log('📋 [onboarding] Showing policy modal');
      setShowPolicyModal(true);
    }
  }, [policiesData, policiesAccepted]);

  const handlePolicyAccept = async (policyIds: string[]) => {
    try {
      await consentMutation.mutateAsync({ policyIds });
      setPoliciesAccepted(true);
      setShowPolicyModal(false);
    } catch (error) {
      console.error('Error accepting policies:', error);
      alert('Politika onayı sırasında bir hata oluştu');
    }
  };

  // Button disabled durumunu hesapla
  const isButtonDisabled = useMemo(() => {
    const hasRequiredPolicies = policiesData?.policies && policiesData.policies.length > 0;
    const needsPolicyAcceptance = hasRequiredPolicies && !policiesAccepted && !policiesLoading;
    const hasFullName = !!fullName.trim();
    const hasDistrict = !!selectedDistrict;
    
    const disabled = loading || !hasFullName || !hasDistrict || needsPolicyAcceptance;
    
    if (disabled) {
      console.log('🚫 [onboarding] Button disabled:', {
        loading,
        hasFullName,
        hasDistrict,
        selectedDistrict: selectedDistrict || 'null',
        policiesAccepted,
        policiesLoading,
        hasRequiredPolicies,
        needsPolicyAcceptance,
      });
    } else {
      console.log('✅ [onboarding] Button enabled:', {
        hasFullName,
        hasDistrict,
        selectedDistrict,
      });
    }
    
    return disabled;
  }, [loading, fullName, selectedDistrict, policiesAccepted, policiesLoading, policiesData]);

  const handleComplete = async () => {
    console.log('🔘 [onboarding] Başla button pressed');
    console.log('🔘 [onboarding] Current state:', {
      fullName: fullName.trim(),
      selectedDistrict,
      hasUser: !!user,
      policiesAccepted,
      loading,
      isButtonDisabled,
    });
    
    const trimmedFullName = fullName.trim();
    if (!trimmedFullName || !selectedDistrict || !user) {
      console.error('❌ [onboarding] Validation failed:', {
        hasFullName: !!trimmedFullName,
        hasDistrict: !!selectedDistrict,
        hasUser: !!user,
      });
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    // Politika onayı kontrolü
    if (!policiesAccepted && policiesData?.policies && policiesData.policies.length > 0) {
      console.warn('⚠️ [onboarding] Policies not accepted');
      Alert.alert('Uyarı', 'Devam etmek için politikaları kabul etmeniz gerekmektedir');
      setShowPolicyModal(true);
      return;
    }

    console.log('✅ [onboarding] Starting profile creation...');
    setLoading(true);
    try {
      const avatarUrlMetadata = user.user_metadata?.avatar_url;
      const avatarUrl = typeof avatarUrlMetadata === 'string' ? avatarUrlMetadata : null;

      console.log('💾 [onboarding] Upserting profile:', {
        id: user.id,
        email: user.email,
        full_name: trimmedFullName,
        district: selectedDistrict,
        hasAvatar: !!avatarUrl,
      });

      const profileData: any = {
        id: user.id,
        email: user.email ?? '',
        full_name: trimmedFullName,
        bio: bio || null,
        district: selectedDistrict,
        avatar_url: avatarUrl,
      };

      // Opsiyonel kolonları ekle (eğer tabloda yoksa hata verecek, o zaman tekrar deneyeceğiz)
      profileData.show_address = true;
      profileData.verified = false;

      let { data, error } = await supabase
        .from('profiles')
        .upsert(
          profileData,
          {
            onConflict: 'id',
          }
        )
        .select();

      // Eğer eksik kolonlar varsa hatayı yakala ve tekrar dene (eksik kolonlar olmadan)
      if (error && (error.message?.includes('show_address') || error.message?.includes('verified'))) {
        console.warn('⚠️ [onboarding] Bazı kolonlar mevcut değil, tekrar deneniyor (eksik kolonlar olmadan)');
        console.warn('⚠️ [onboarding] Hata:', error.message);
        
        // Eksik kolonları kaldır
        if (error.message?.includes('show_address')) {
          delete profileData.show_address;
        }
        if (error.message?.includes('verified')) {
          delete profileData.verified;
        }
        
        const retryResult = await supabase
          .from('profiles')
          .upsert(
            profileData,
            {
              onConflict: 'id',
            }
          )
          .select();
        
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error('❌ [onboarding] Profile upsert error:', error);
        throw error;
      }

      console.log('✅ [onboarding] Profile created successfully:', data);

      console.log('🔄 [onboarding] Refreshing profile...');
      await refreshProfile();
      
      console.log('🚀 [onboarding] Navigating to tabs...');
      router.replace('/(tabs)/feed' as any);
    } catch (error: any) {
      console.error('❌ [onboarding] Error creating profile:', error);
      console.error('❌ [onboarding] Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Hata', error.message || 'Profil oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
      console.log('✅ [onboarding] handleComplete finished');
    }
  };

  // Profil kontrolü yapılırken loading göster
  if (checkingProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.scrollContainer}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.title}>Profilini Oluştur</Text>
          <Text style={styles.subtitle}>MyTrabzon&apos;a hoş geldin!</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>İsim Soyisim</Text>
              <TextInput
                style={styles.input}
                placeholder="Adınız ve soyadınız"
                value={fullName}
                onChangeText={(text) => {
                  console.log('✏️ [onboarding] Full name changed:', text);
                  setFullName(text);
                }}
                placeholderTextColor={COLORS.textLight}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hakkında (İsteğe bağlı)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Kendiniz hakkında birkaç kelime..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>İlçenizi Seçin</Text>
              <View style={styles.districtGrid}>
                {DISTRICTS.map((district) => (
                  <TouchableOpacity
                    key={district}
                    style={[
                      styles.districtChip,
                      selectedDistrict === district && styles.districtChipSelected,
                    ]}
                    onPress={() => {
                      console.log('📍 [onboarding] District selected:', district);
                      setSelectedDistrict(district);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.districtEmoji}>{DISTRICT_BADGES[district]}</Text>
                    <Text
                      style={[
                        styles.districtText,
                        selectedDistrict === district && styles.districtTextSelected,
                      ]}
                    >
                      {district}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Button ScrollView dışında, sabit konumda */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.button, 
              isButtonDisabled && styles.buttonDisabled,
              pressed && !isButtonDisabled && styles.buttonPressed
            ]}
            onPressIn={() => {
              console.log('👆 [onboarding] Button onPressIn triggered');
            }}
            onPressOut={() => {
              console.log('👆 [onboarding] Button onPressOut triggered');
            }}
            onPress={() => {
              console.log('👆 [onboarding] Button onPress triggered');
              console.log('👆 [onboarding] isButtonDisabled:', isButtonDisabled);
              console.log('👆 [onboarding] Platform:', Platform.OS);
              console.log('👆 [onboarding] Current values:', {
                fullName: fullName.trim(),
                selectedDistrict,
                hasUser: !!user,
                loading,
              });
              if (!isButtonDisabled && !loading) {
                console.log('✅ [onboarding] Calling handleComplete...');
                handleComplete();
              } else {
                console.warn('⚠️ [onboarding] Button is disabled or loading, ignoring press');
                if (isButtonDisabled) {
                  Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun');
                }
              }
            }}
            disabled={isButtonDisabled || loading}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Başla</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Politika Onay Modalı */}
      {policiesData?.policies && (
        <PolicyConsentModal
          visible={showPolicyModal}
          policies={policiesData.policies}
          onAccept={() => {
            const policyIds = policiesData.policies.map((p: any) => p.id);
            handlePolicyAccept(policyIds);
          }}
          onReject={() => {
            // Zorunlu olduğu için reddetme seçeneği yok
            alert('Politikaları kabul etmeden devam edemezsiniz');
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  scrollContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xl, // ScrollView için padding
  },
  buttonContainer: {
    padding: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: '100%',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700' as const,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
  },
  form: {
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top' as const,
  },
  districtGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: SPACING.sm,
  },
  districtChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    flexShrink: 0, // Android'de metinlerin kesilmemesi için
  },
  districtChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  districtEmoji: {
    fontSize: FONT_SIZES.md,
  },
  districtText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flexShrink: 0, // Android'de metinlerin tam görünmesi için
  },
  districtTextSelected: {
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  button: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.md + 4,
    borderRadius: 12,
    alignItems: 'center' as const,
    minHeight: 50, // Minimum yükseklik
    justifyContent: 'center' as const,
    zIndex: 1001,
    elevation: 11, // Android için
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
});
