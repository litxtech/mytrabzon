import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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

  // Zorunlu politikaları al
  const { data: policiesData, isLoading: policiesLoading } = trpc.user.getRequiredPolicies.useQuery();
  const consentMutation = trpc.user.consentToPolicies.useMutation();

  // İlk açılışta politika modalını göster
  useEffect(() => {
    if (policiesData?.policies && policiesData.policies.length > 0 && !policiesAccepted) {
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

  const handleComplete = async () => {
    const trimmedFullName = fullName.trim();
    if (!trimmedFullName || !selectedDistrict || !user) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    // Politika onayı kontrolü
    if (!policiesAccepted) {
      alert('Devam etmek için politikaları kabul etmeniz gerekmektedir');
      setShowPolicyModal(true);
      return;
    }

    setLoading(true);
    try {
      const avatarUrlMetadata = user.user_metadata?.avatar_url;
      const avatarUrl = typeof avatarUrlMetadata === 'string' ? avatarUrlMetadata : null;

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email ?? '',
            full_name: trimmedFullName,
            bio: bio || null,
            district: selectedDistrict,
            avatar_url: avatarUrl,
            verified: false,
            show_address: true,
          },
          {
            onConflict: 'id',
          }
        );

      if (error) throw error;

      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Profil oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profilini Oluştur</Text>
        <Text style={styles.subtitle}>MyTrabzon&apos;a hoş geldin!</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İsim Soyisim</Text>
            <TextInput
              style={styles.input}
              placeholder="Adınız ve soyadınız"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={COLORS.textLight}
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
                  onPress={() => setSelectedDistrict(district)}
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

        <TouchableOpacity
          style={[
            styles.button, 
            (loading || !fullName.trim() || !selectedDistrict || !policiesAccepted) && styles.buttonDisabled
          ]}
          onPress={handleComplete}
          disabled={loading || !fullName.trim() || !selectedDistrict || !policiesAccepted}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Başla</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Politika Onay Modalı */}
      {policiesData?.policies && (
        <PolicyConsentModal
          visible={showPolicyModal}
          policies={policiesData.policies}
          onAccept={() => {
            const policyIds = policiesData.policies.map(p => p.id);
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
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
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
});
