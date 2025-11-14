import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, Linking, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const params = useLocalSearchParams();

  // URL parametrelerini ve deep link'i kontrol et
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Deep link'ten gelen parametreleri kontrol et
        const initialUrl = await Linking.getInitialURL();
        
        if (initialUrl) {
          const url = new URL(initialUrl);
          const token = url.searchParams.get('token');
          const type = url.searchParams.get('type');
          
          if (token && type === 'recovery') {
            // Token'ı Supabase'e set et
            const { error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'recovery',
            });
            
            if (error) {
              console.error('Token verification error:', error);
              Alert.alert('Hata', 'Geçersiz veya süresi dolmuş link');
              router.replace('/auth/login');
              return;
            }
          }
        }
        
        // Local search params'dan da kontrol et (web için)
        if (params.token && params.type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: params.token as string,
            type: 'recovery',
          });
          
          if (error) {
            console.error('Token verification error:', error);
            Alert.alert('Hata', 'Geçersiz veya süresi dolmuş link');
            router.replace('/auth/login');
            return;
          }
        }
        
        // Deep link listener (uygulama açıkken link'e tıklanırsa)
        const subscription = Linking.addEventListener('url', async (event) => {
          const url = new URL(event.url);
          const token = url.searchParams.get('token');
          const type = url.searchParams.get('type');
          
          if (token && type === 'recovery') {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'recovery',
            });
            
            if (error) {
              Alert.alert('Hata', 'Geçersiz veya süresi dolmuş link');
            }
          }
        });
        
        setInitializing(false);
        
        return () => {
          subscription.remove();
        };
      } catch (error: any) {
        console.error('Initialization error:', error);
        setInitializing(false);
      }
    };
    
    initializeAuth();
  }, [params, router]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi!', [
        {
          text: 'Tamam',
          onPress: () => router.replace('/auth/login'),
        },
      ]);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  if (initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>🔐</Text>
          <Text style={styles.title}>Yeni Şifre Belirle</Text>
          <Text style={styles.subtitle}>Güçlü bir şifre seçin</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Yeni Şifre"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.white} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre Tekrar"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.buttonText}>Şifreyi Değiştir</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center' as const,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: SPACING.xxl,
  },
  logo: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    opacity: 0.8,
  },
  form: {
    width: '100%',
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
  button: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md + 2,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: SPACING.md,
  },
  buttonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
