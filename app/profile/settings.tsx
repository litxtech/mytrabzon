import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { 
  ChevronLeft, 
  Bell, 
  Shield, 
  Lock, 
  MessageSquare
} from 'lucide-react-native';

interface UserSettings {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    likes: boolean;
    comments: boolean;
    follows: boolean;
    messages: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showOnline: boolean;
    allowMessages: boolean;
    allowTagging: boolean;
  };
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();

  // Default settings
  const defaultSettings: UserSettings = {
    notifications: {
      push: true,
      email: true,
      sms: false,
      likes: true,
      comments: true,
      follows: true,
      messages: true,
    },
    privacy: {
      profileVisible: true,
      showOnline: true,
      allowMessages: true,
      allowTagging: true,
    },
  };

  // Load settings from profile
  const loadSettings = (): UserSettings => {
    if (!profile?.privacy_settings) {
      return defaultSettings;
    }

    const privacySettings = profile.privacy_settings as any;
    
    return {
      notifications: {
        push: privacySettings.notifications?.push ?? defaultSettings.notifications.push,
        email: privacySettings.notifications?.email ?? defaultSettings.notifications.email,
        sms: privacySettings.notifications?.sms ?? defaultSettings.notifications.sms,
        likes: privacySettings.notifications?.likes ?? defaultSettings.notifications.likes,
        comments: privacySettings.notifications?.comments ?? defaultSettings.notifications.comments,
        follows: privacySettings.notifications?.follows ?? defaultSettings.notifications.follows,
        messages: privacySettings.notifications?.messages ?? defaultSettings.notifications.messages,
      },
      privacy: {
        profileVisible: privacySettings.privacy?.profileVisible ?? defaultSettings.privacy.profileVisible,
        showOnline: privacySettings.privacy?.showOnline ?? defaultSettings.privacy.showOnline,
        allowMessages: privacySettings.privacy?.allowMessages ?? defaultSettings.privacy.allowMessages,
        allowTagging: privacySettings.privacy?.allowTagging ?? defaultSettings.privacy.allowTagging,
      },
    };
  };

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings when profile changes
  useEffect(() => {
    if (profile) {
      const loadedSettings = loadSettings();
      setSettings(loadedSettings);
    }
  }, [profile?.privacy_settings]);

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: async () => {
      await refreshProfile();
      Alert.alert('Başarılı', 'Ayarlarınız kaydedildi.');
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Settings update error:', error);
      Alert.alert('Hata', `Ayarlar kaydedilirken bir hata oluştu: ${error.message}`);
      setIsLoading(false);
    },
  });

  const renderSection = (title: string, IconComponent: React.ReactNode) => (
    <View style={styles.sectionHeader}>
      {IconComponent}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderToggle = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    description?: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={COLORS.white}
        disabled={isLoading}
      />
    </View>
  );

  const handleSaveSettings = async () => {
    if (!profile) {
      Alert.alert('Hata', 'Profil bilgisi bulunamadı.');
      return;
    }

    setIsLoading(true);

    // Merge with existing privacy_settings
    const existingPrivacySettings = (profile.privacy_settings || {}) as any;
    
    const updatedPrivacySettings = {
      ...existingPrivacySettings,
      notifications: settings.notifications,
      privacy: settings.privacy,
    };

    updateProfileMutation.mutate({
      privacy_settings: updatedPrivacySettings,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {renderSection('Bildirimler', <Bell size={20} color={COLORS.primary} />)}
          
          {renderToggle(
            'Push Bildirimleri',
            settings.notifications.push,
            (value) => setSettings({ ...settings, notifications: { ...settings.notifications, push: value } }),
            'Uygulama bildirimleri'
          )}
          
          {renderToggle(
            'E-posta Bildirimleri',
            settings.notifications.email,
            (value) => setSettings({ ...settings, notifications: { ...settings.notifications, email: value } }),
            'E-posta ile bildirimler'
          )}
          
          {renderToggle(
            'SMS Bildirimleri',
            settings.notifications.sms,
            (value) => setSettings({ ...settings, notifications: { ...settings.notifications, sms: value } }),
            'SMS ile bildirimler'
          )}
        </View>

        <View style={styles.section}>
          {renderSection('Bildirim Türleri', <MessageSquare size={20} color={COLORS.primary} />)}
          
          {renderToggle(
            'Beğeniler',
            settings.notifications.likes,
            (value) => setSettings({ ...settings, notifications: { ...settings.notifications, likes: value } }),
            'Paylaşımlarınız beğenildiğinde bildir'
          )}
          
          {renderToggle(
            'Yorumlar',
            settings.notifications.comments,
            (value) => setSettings({ ...settings, notifications: { ...settings.notifications, comments: value } }),
            'Yeni yorum geldiğinde bildir'
          )}
          
          {renderToggle(
            'Takip',
            settings.notifications.follows,
            (value) => setSettings({ ...settings, notifications: { ...settings.notifications, follows: value } }),
            'Biri sizi takip ettiğinde bildir'
          )}
          
          {renderToggle(
            'Mesajlar',
            settings.notifications.messages,
            (value) => setSettings({ ...settings, notifications: { ...settings.notifications, messages: value } }),
            'Yeni mesaj geldiğinde bildir'
          )}
        </View>

        <View style={styles.section}>
          {renderSection('Gizlilik', <Shield size={20} color={COLORS.primary} />)}
          
          {renderToggle(
            'Profil Görünürlüğü',
            settings.privacy.profileVisible,
            (value) => setSettings({ ...settings, privacy: { ...settings.privacy, profileVisible: value } }),
            'Profilinizi herkes görebilir'
          )}
          
          {renderToggle(
            'Çevrimiçi Durumu',
            settings.privacy.showOnline,
            (value) => setSettings({ ...settings, privacy: { ...settings.privacy, showOnline: value } }),
            'Çevrimiçi olduğunuzda göster'
          )}
          
          {renderToggle(
            'Mesaj İzinleri',
            settings.privacy.allowMessages,
            (value) => setSettings({ ...settings, privacy: { ...settings.privacy, allowMessages: value } }),
            'Herkes size mesaj gönderebilir'
          )}
          
          {renderToggle(
            'Etiketlenme İzni',
            settings.privacy.allowTagging,
            (value) => setSettings({ ...settings, privacy: { ...settings.privacy, allowTagging: value } }),
            'Paylaşımlarda etiketlenebilirsiniz'
          )}
        </View>

        <View style={styles.section}>
          {renderSection('Hesap', <Lock size={20} color={COLORS.primary} />)}
          
          <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => Alert.alert('Şifre Değiştir', 'Bu özellik yakında eklenecek.')}
          >
            <Text style={styles.settingButtonText}>Şifre Değiştir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => Alert.alert('2FA', 'İki faktörlü kimlik doğrulama yakında eklenecek.')}
          >
            <Text style={styles.settingButtonText}>İki Faktörlü Doğrulama</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => Alert.alert('Veri İndir', 'Verileriniz hazırlanıyor...')}
          >
            <Text style={styles.settingButtonText}>Verilerimi İndir</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSaveSettings}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Ayarları Kaydet</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  settingButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  settingButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});
