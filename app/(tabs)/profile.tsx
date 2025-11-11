import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, HelpCircle, Trash2, Edit3, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react-native';
import { DISTRICT_BADGES } from '../../constants/districts';
import { useRouter } from 'expo-router';
import { Footer } from '../../components/Footer';
import { SupportPanel } from '../../components/SupportPanel';
import { trpc } from '../../lib/trpc';
import { LinearGradient } from 'expo-linear-gradient';

type VerificationStep = {
  id: string;
  title: string;
  bulletPoints: string[];
  completed: boolean;
};

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);

  const deleteAccountMutation = trpc.user.requestAccountDeletion.useMutation();

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı silmek istediğinizden emin misiniz?\n\nHesabınız 7 gün süreyle askıya alınacak ve bu süre sonunda kalıcı olarak silinecektir. Bu süre içinde giriş yaparsanız hesabınızı geri yükleyebilirsiniz.\n\nSilinen veriler:\n• Profil bilgileriniz\n• Paylaşımlarınız\n• Yorumlarınız\n• Mesajlarınız\n• Tüm kişisel verileriniz',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountMutation.mutateAsync();
              Alert.alert(
                'Hesap Silme İsteği Alındı',
                'Hesabınız 7 gün içinde kalıcı olarak silinecektir. Bu süre içinde giriş yaparsanız hesabınızı geri yükleyebilirsiniz.',
                [
                  {
                    text: 'Tamam',
                    onPress: () => {
                      signOut();
                      router.replace('/auth/login');
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Hata', 'Hesap silme işlemi sırasında bir hata oluştu.');
              console.error('Delete account error:', error);
            }
          }
        }
      ]
    );
  };

  const verificationPending = Boolean(profile && !profile.verified);

  const verificationSteps = useMemo<VerificationStep[]>(() => {
    const baseSteps: Omit<VerificationStep, 'completed'>[] = [
      {
        id: 'basic-info',
        title: 'ADIM 1 - Temel Bilgiler',
        bulletPoints: ['Email', 'SMS/Email OTP', 'Şifre Belirleme'],
      },
      {
        id: 'profile-details',
        title: 'ADIM 2 - Profil Detayları',
        bulletPoints: ['Ad-Soyad (TC ile eşleşmeli)', 'TC Kimlik No', 'Doğum Tarihi', 'Profil Fotoğrafı'],
      },
      {
        id: 'identity-verification',
        title: 'ADIM 3 - Kimlik Doğrulama',
        bulletPoints: ['Kimlik Kartı Ön/Yüz Fotoğrafı', 'Selfie (Yüz Tanıma)', 'Kimlik + Selfie Eşleştirme'],
      },
      {
        id: 'blue-tick',
        title: 'ADIM 5 - Mavi Tik Atama',
        bulletPoints: ['Manuel İnceleme veya AI Onayı', 'Güven Skoru Hesaplama', 'Süreli Doğrulama (1 yıl)'],
      },
    ];

    if (!profile) {
      return baseSteps.map((step) => ({ ...step, completed: false }));
    }

    const completionMap: Record<string, boolean> = {
      'basic-info': Boolean(profile.email),
      'profile-details': Boolean(profile.full_name && profile.district && profile.avatar_url),
      'identity-verification': Boolean(profile.selfie_verified),
      'blue-tick': Boolean(profile.verified),
    };

    return baseSteps.map((step) => ({ ...step, completed: completionMap[step.id] ?? false }));
  }, [profile]);

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <ScrollView>
        {verificationPending && (
          <View style={styles.bannerWrapper} testID="verification-warning">
            <LinearGradient colors={['#FF6B6B', '#C23737']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bannerGradient}>
              <View style={styles.bannerHeader}>
                <View style={styles.bannerIconWrapper}>
                  <AlertTriangle size={24} color={COLORS.white} />
                </View>
                <View style={styles.bannerTextBlock}>
                  <Text style={styles.bannerTitle}>Hesabınız doğrulanmayı bekliyor</Text>
                  <Text style={styles.bannerSubtitle}>
                    Güvenli topluluk deneyimi için doğrulama adımlarını tamamlamanız gerekiyor.
                  </Text>
                </View>
              </View>
              <View style={styles.bannerSteps}>
                {verificationSteps.map((step) => (
                  <View key={step.id} style={styles.stepRow} testID={`verification-step-${step.id}`}>
                    <View style={[styles.stepStatusBadge, step.completed ? styles.stepCompleted : styles.stepPending]}>
                      {step.completed ? (
                        <CheckCircle2 size={18} color={COLORS.white} />
                      ) : (
                        <Clock3 size={18} color={COLORS.white} />
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <View style={styles.stepBullets}>
                        {step.bulletPoints.map((bullet) => (
                          <Text key={`${step.id}-${bullet}`} style={styles.stepBullet}>• {bullet}</Text>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.bannerAction}
                onPress={() => router.push('/profile/edit')}
                activeOpacity={0.85}
                testID="verification-start-button"
              >
                <Text style={styles.bannerActionText}>Doğrulamayı Başlat</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
        <View style={styles.header}>
          <Image
            source={{ uri: profile.avatar_url || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{profile.full_name}</Text>
          <View style={styles.districtBadge}>
            <Text style={styles.districtEmoji}>{DISTRICT_BADGES[profile.district]}</Text>
            <Text style={styles.districtText}>{profile.district}</Text>
          </View>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Gönderi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Beğeni</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Yorum</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/edit')}>
            <Edit3 size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Profili Düzenle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/settings')}>
            <Settings size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Ayarlar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setSupportVisible(true)}>
            <HelpCircle size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Destek</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <Trash2 size={20} color={COLORS.error} />
            <Text style={[styles.menuText, { color: COLORS.error }]}>Hesabı Sil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <LogOut size={20} color={COLORS.error} />
            <Text style={[styles.menuText, { color: COLORS.error }]}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>

        <Footer />
      </ScrollView>

      <SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bannerWrapper: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  bannerGradient: {
    borderRadius: 20,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  bannerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.md,
  },
  bannerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bannerTextBlock: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: '#FDEDEC',
    lineHeight: 18,
  },
  bannerSteps: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  stepRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: SPACING.sm,
  },
  stepStatusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stepCompleted: {
    backgroundColor: 'rgba(46, 204, 113, 0.85)',
  },
  stepPending: {
    backgroundColor: 'rgba(192, 57, 43, 0.85)',
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  stepBullets: {
    gap: 2,
  },
  stepBullet: {
    fontSize: FONT_SIZES.sm,
    color: '#FDEDEC',
    lineHeight: 18,
  },
  bannerAction: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
    alignItems: 'center' as const,
  },
  bannerActionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: COLORS.error,
  },
  header: {
    backgroundColor: COLORS.white,
    alignItems: 'center' as const,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.md,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  districtBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  districtEmoji: {
    fontSize: FONT_SIZES.md,
  },
  districtText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  bio: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center' as const,
    marginBottom: SPACING.md,
  },
  stats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    width: '100%',
    marginTop: SPACING.md,
  },
  statItem: {
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  menuText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
});
