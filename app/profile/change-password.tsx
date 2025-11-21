import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);

  // Şifre eşleşme kontrolü
  React.useEffect(() => {
    if (confirmPassword.length > 0) {
      setPasswordMatch(newPassword === confirmPassword);
    } else {
      setPasswordMatch(null);
    }
  }, [newPassword, confirmPassword]);

  const changePasswordMutation = trpc.user.changePassword.useMutation({
    onSuccess: async () => {
      Alert.alert(
        'Başarılı',
        'Şifreniz başarıyla değiştirildi. Lütfen yeni şifrenizle giriş yapın.',
        [
          {
            text: 'Tamam',
            onPress: async () => {
              // Çıkış yap ve giriş sayfasına yönlendir
              await signOut();
              router.replace('/auth/login');
            },
          },
        ]
      );
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Şifre değiştirme işlemi sırasında bir hata oluştu.');
      setLoading(false);
    },
  });

  const handleChangePassword = async () => {
    // Validasyon
    if (!currentPassword.trim()) {
      Alert.alert('Hata', 'Lütfen mevcut şifrenizi girin');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Hata', 'Yeni şifre mevcut şifrenizden farklı olmalıdır');
      return;
    }

    setLoading(true);

    try {
      // Önce mevcut şifreyi doğrula
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (verifyError) {
        Alert.alert('Hata', 'Mevcut şifre hatalı');
        setLoading(false);
        return;
      }

      // Şifreyi değiştir
      changePasswordMutation.mutate({
        currentPassword,
        newPassword,
      });
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Şifre Değiştir',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* İkon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Lock size={32} color={theme.colors.primary} />
          </View>
        </View>

        {/* Başlık */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Şifre Değiştir
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textLight }]}>
          Güvenliğiniz için şifrenizi düzenli olarak değiştirmenizi öneririz
        </Text>

        {/* Mevcut Şifre */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Mevcut Şifre
          </Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Mevcut şifrenizi girin"
              placeholderTextColor={theme.colors.textLight}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              style={styles.eyeButton}
            >
              {showCurrentPassword ? (
                <EyeOff size={20} color={theme.colors.textLight} />
              ) : (
                <Eye size={20} color={theme.colors.textLight} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Yeni Şifre */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Yeni Şifre
          </Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Yeni şifrenizi girin (min. 6 karakter)"
              placeholderTextColor={theme.colors.textLight}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeButton}
            >
              {showNewPassword ? (
                <EyeOff size={20} color={theme.colors.textLight} />
              ) : (
                <Eye size={20} color={theme.colors.textLight} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Şifre Tekrar */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Yeni Şifre Tekrar
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors.card,
                borderColor:
                  passwordMatch === null
                    ? theme.colors.border
                    : passwordMatch
                    ? theme.colors.success
                    : theme.colors.error,
                borderWidth: passwordMatch !== null ? 2 : 1,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Yeni şifrenizi tekrar girin"
              placeholderTextColor={theme.colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.rightIcons}>
              {passwordMatch !== null && (
                <CheckCircle2
                  size={20}
                  color={passwordMatch ? theme.colors.success : theme.colors.error}
                  style={styles.checkIcon}
                />
              )}
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={theme.colors.textLight} />
                ) : (
                  <Eye size={20} color={theme.colors.textLight} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {passwordMatch !== null && (
            <Text
              style={[
                styles.matchText,
                {
                  color: passwordMatch ? theme.colors.success : theme.colors.error,
                },
              ]}
            >
              {passwordMatch ? '✓ Şifreler eşleşiyor' : '✗ Şifreler eşleşmiyor'}
            </Text>
          )}
        </View>

        {/* Değiştir Butonu */}
        <TouchableOpacity
          style={[
            styles.changeButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Lock size={20} color={COLORS.white} />
              <Text style={styles.changeButtonText}>Şifreyi Değiştir</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: FONT_SIZES.md * 1.5,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    minHeight: 56,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.md,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkIcon: {
    marginRight: SPACING.xs,
  },
  eyeButton: {
    padding: SPACING.xs,
  },
  matchText: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  changeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});

