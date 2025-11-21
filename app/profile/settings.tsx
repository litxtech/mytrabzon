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
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { trpc } from '@/lib/trpc';
import { 
  ChevronLeft, 
  Bell, 
  Shield, 
  Lock, 
  MessageSquare,
  Sun,
  Moon,
  MapPin
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
    showGenderIcon: boolean;
  };
  location: {
    optIn: boolean;
  };
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const { theme, mode, setMode } = useTheme();

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
        showGenderIcon: true,
      },
      location: {
        optIn: false,
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
          showGenderIcon: privacySettings.privacy?.showGenderIcon ?? defaultSettings.privacy.showGenderIcon,
        },
        location: {
          optIn: (profile as any)?.location_opt_in ?? false,
        },
      };
    };

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings when profile changes (sadece location_opt_in değiştiğinde)
  useEffect(() => {
    if (profile) {
      const loadedSettings = loadSettings();
      // Sadece location_opt_in değiştiyse güncelle (diğer ayarlar için kullanıcı değişiklik yapmış olabilir)
      setSettings(prev => ({
        ...prev,
        location: {
          optIn: loadedSettings.location.optIn,
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(profile as any)?.location_opt_in]);

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: async (data, variables) => {
      await refreshProfile();
      // Sadece "Ayarları Kaydet" butonundan çağrıldıysa alert göster
      if (variables.privacy_settings) {
        Alert.alert('Başarılı', 'Ayarlarınız kaydedildi.');
      }
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Settings update error:', error);
      Alert.alert('Hata', `Ayarlar kaydedilirken bir hata oluştu: ${error.message}`);
      setIsLoading(false);
      // Hata durumunda state'i geri al
      if (profile) {
        const loadedSettings = loadSettings();
        setSettings(prev => ({
          ...prev,
          location: {
            optIn: loadedSettings.location.optIn,
          },
        }));
      }
    },
  });

  const renderSection = (title: string, IconComponent: React.ReactNode) => {
    return (
      <View style={styles.sectionHeader}>
        {IconComponent}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
    );
  };

  const renderToggle = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    description?: string
  ) => {
    return (
      <View style={[styles.settingItem, { borderTopColor: theme.colors.border }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{label}</Text>
          {description && <Text style={[styles.settingDescription, { color: theme.colors.textLight }]}>{description}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={COLORS.white}
          disabled={isLoading}
        />
      </View>
    );
  };

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

    // location_opt_in'i ayrı olarak güncelle (profiles tablosunda direkt kolon)
    updateProfileMutation.mutate({
      privacy_settings: updatedPrivacySettings,
      location_opt_in: settings.location.optIn,
    });
  };

  const handleLocationOptInToggle = async (value: boolean) => {
    if (value) {
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Konum İzni Gerekli',
          'Yakındaki kullanıcılar özelliğini kullanmak için konum izni gereklidir.',
          [{ text: 'Tamam' }]
        );
        return;
      }
    }

    // State'i güncelle
    setSettings({ ...settings, location: { ...settings.location, optIn: value } });

    // Hemen kaydet (diğer ayarları koruyarak)
    if (!profile) {
      Alert.alert('Hata', 'Profil bilgisi bulunamadı.');
      return;
    }

    setIsLoading(true);
    
    const existingPrivacySettings = (profile.privacy_settings || {}) as any;
    const updatedPrivacySettings = {
      ...existingPrivacySettings,
      notifications: settings.notifications,
      privacy: settings.privacy,
    };

    // Sadece location_opt_in'i güncelle
    updateProfileMutation.mutate({
      privacy_settings: updatedPrivacySettings,
      location_opt_in: value,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          {renderSection('Bildirimler', <Bell size={20} color={theme.colors.primary} />)}
          
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

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          {renderSection('Bildirim Türleri', <MessageSquare size={20} color={theme.colors.primary} />)}
          
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

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          {renderSection('Gizlilik', <Shield size={20} color={theme.colors.primary} />)}
          
          {renderToggle(
            'Gizli Mod',
            !settings.privacy.profileVisible,
            (value) => {
              setSettings({ ...settings, privacy: { ...settings.privacy, profileVisible: !value } });
            },
            !settings.privacy.profileVisible ? 'Profiliniz gizli - Admin panelinde görüneceksiniz' : 'Profiliniz herkese görünür'
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
          
          {renderToggle(
            'Cinsiyet Simgesi',
            settings.privacy.showGenderIcon,
            (value) => setSettings({ ...settings, privacy: { ...settings.privacy, showGenderIcon: value } }),
            'Profilinizde isminizin yanında cinsiyet simgesi göster'
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          {renderSection('Konum', <MapPin size={20} color={theme.colors.primary} />)}
          
          {renderToggle(
            'Yakındaki Kullanıcılar',
            settings.location.optIn,
            handleLocationOptInToggle,
            'Yakınındaki MyTrabzon kullanıcılarıyla karşılaşma özelliğini etkinleştir. Konumunuz sadece yakınlık hesaplaması için kullanılır, haritada gösterilmez.'
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          {renderSection('Tema', mode === 'dark' ? <Moon size={20} color={theme.colors.primary} /> : <Sun size={20} color={theme.colors.primary} />)}
          
          <View style={styles.themeContainer}>
            <TouchableOpacity
              style={[
                styles.themeButton,
                { borderColor: theme.colors.border },
                mode === 'light' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
              ]}
              onPress={() => setMode('light')}
            >
              <Sun size={20} color={mode === 'light' ? theme.colors.primary : theme.colors.textLight} />
              <Text style={[styles.themeButtonText, { color: mode === 'light' ? theme.colors.primary : theme.colors.text }]}>
                Açık Mod
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeButton,
                { borderColor: theme.colors.border },
                mode === 'dark' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
              ]}
              onPress={() => setMode('dark')}
            >
              <Moon size={20} color={mode === 'dark' ? theme.colors.primary : theme.colors.textLight} />
              <Text style={[styles.themeButtonText, { color: mode === 'dark' ? theme.colors.primary : theme.colors.text }]}>
                Koyu Mod
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          {renderSection('Hesap', <Lock size={20} color={theme.colors.primary} />)}
          
          <TouchableOpacity 
            style={[styles.settingButton, { borderTopColor: theme.colors.border }]}
            onPress={() => router.push('/auth/reset-password')}
          >
            <Text style={[styles.settingButtonText, { color: theme.colors.primary }]}>Şifre Değiştir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingButton, { borderTopColor: theme.colors.border }]}
            onPress={() => {
              Alert.alert(
                'İki Faktörlü Doğrulama',
                'Bu özellik yakında eklenecek. Güvenliğiniz için şifrenizi güçlü tutun.',
                [{ text: 'Tamam' }]
              );
            }}
          >
            <Text style={[styles.settingButtonText, { color: theme.colors.primary }]}>İki Faktörlü Doğrulama</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingButton, { borderTopColor: theme.colors.border }]}
            onPress={async () => {
              try {
                Alert.alert(
                  'Veri İndirme',
                  'Verileriniz hazırlanıyor. Bu işlem birkaç dakika sürebilir. Hazır olduğunda e-posta ile bilgilendirileceksiniz.',
                  [{ text: 'Tamam' }]
                );
                // TODO: Backend'de veri indirme endpoint'i eklendiğinde buraya entegre edilecek
              } catch (error) {
                Alert.alert('Hata', 'Veri indirme işlemi başlatılamadı.');
              }
            }}
          >
            <Text style={[styles.settingButtonText, { color: theme.colors.primary }]}>Verilerimi İndir</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }, isLoading && styles.saveButtonDisabled]}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  section: {
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
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: FONT_SIZES.sm,
  },
  settingButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  settingButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  themeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButton: {
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
