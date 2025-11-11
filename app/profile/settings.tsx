import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChevronLeft, 
  Bell, 
  Shield, 
  Lock, 
  MessageSquare
} from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    likes: true,
    comments: true,
    follows: true,
    messages: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showOnline: true,
    allowMessages: true,
    allowTagging: true,
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
      />
    </View>
  );

  const handleSaveSettings = () => {
    Alert.alert('Başarılı', 'Ayarlarınız kaydedildi.');
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
            notifications.push,
            (value) => setNotifications({ ...notifications, push: value }),
            'Uygulama bildirimleri'
          )}
          
          {renderToggle(
            'E-posta Bildirimleri',
            notifications.email,
            (value) => setNotifications({ ...notifications, email: value }),
            'E-posta ile bildirimler'
          )}
          
          {renderToggle(
            'SMS Bildirimleri',
            notifications.sms,
            (value) => setNotifications({ ...notifications, sms: value }),
            'SMS ile bildirimler'
          )}
        </View>

        <View style={styles.section}>
          {renderSection('Bildirim Türleri', <MessageSquare size={20} color={COLORS.primary} />)}
          
          {renderToggle(
            'Beğeniler',
            notifications.likes,
            (value) => setNotifications({ ...notifications, likes: value }),
            'Paylaşımlarınız beğenildiğinde bildir'
          )}
          
          {renderToggle(
            'Yorumlar',
            notifications.comments,
            (value) => setNotifications({ ...notifications, comments: value }),
            'Yeni yorum geldiğinde bildir'
          )}
          
          {renderToggle(
            'Takip',
            notifications.follows,
            (value) => setNotifications({ ...notifications, follows: value }),
            'Biri sizi takip ettiğinde bildir'
          )}
          
          {renderToggle(
            'Mesajlar',
            notifications.messages,
            (value) => setNotifications({ ...notifications, messages: value }),
            'Yeni mesaj geldiğinde bildir'
          )}
        </View>

        <View style={styles.section}>
          {renderSection('Gizlilik', <Shield size={20} color={COLORS.primary} />)}
          
          {renderToggle(
            'Profil Görünürlüğü',
            privacy.profileVisible,
            (value) => setPrivacy({ ...privacy, profileVisible: value }),
            'Profilinizi herkes görebilir'
          )}
          
          {renderToggle(
            'Çevrimiçi Durumu',
            privacy.showOnline,
            (value) => setPrivacy({ ...privacy, showOnline: value }),
            'Çevrimiçi olduğunuzda göster'
          )}
          
          {renderToggle(
            'Mesaj İzinleri',
            privacy.allowMessages,
            (value) => setPrivacy({ ...privacy, allowMessages: value }),
            'Herkes size mesaj gönderebilir'
          )}
          
          {renderToggle(
            'Etiketlenme İzni',
            privacy.allowTagging,
            (value) => setPrivacy({ ...privacy, allowTagging: value }),
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
          style={styles.saveButton}
          onPress={handleSaveSettings}
        >
          <Text style={styles.saveButtonText}>Ayarları Kaydet</Text>
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
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});
