/**
 * Yakındaki Kullanıcılar - In-App Bildirim Modal
 * Kullanıcıya "yakınında bir MyTrabzon kullanıcısı var" bildirimi gösterir
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, XCircle, Ban } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { trpc } from '@/lib/trpc';

interface ProximityNotificationModalProps {
  visible: boolean;
  pairId: string;
  onClose: () => void;
  onMatch?: (otherUserId: string) => void;
}

export function ProximityNotificationModal({
  visible,
  pairId,
  onClose,
  onMatch,
}: ProximityNotificationModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isResponding, setIsResponding] = useState(false);

  const respondMutation = trpc.user.respondToProximityPair.useMutation({
    onSuccess: (data) => {
      setIsResponding(false);
      if (data.status === 'accepted' && onMatch) {
        // Eşleşme başarılı - diğer kullanıcının profilini göster
        // pair'den other_user_id'yi almak için pair detayını çekmemiz gerekir
        // Şimdilik sadece modal'ı kapat
        Alert.alert(
          'Eşleşme Başarılı!',
          'Yakındaki kullanıcıyla eşleştiniz! Artık birbirinizin profilini görebilirsiniz.',
          [{ text: 'Tamam', onPress: onClose }]
        );
      } else {
        onClose();
      }
    },
    onError: (error) => {
      setIsResponding(false);
      Alert.alert('Hata', error.message || 'İşlem başarısız oldu');
    },
  });

  const handleResponse = (action: 'accept' | 'reject' | 'block') => {
    if (isResponding) return;

    setIsResponding(true);
    respondMutation.mutate({
      pairId,
      action,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.card,
              paddingBottom: Math.max(insets.bottom, SPACING.md),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isResponding}
          >
            <X size={24} color={theme.colors.textLight} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={styles.iconEmoji}>📍</Text>
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              Yakınında bir MyTrabzon kullanıcısı var
            </Text>

            <Text style={[styles.message, { color: theme.colors.textLight }]}>
              Yakınında bir MyTrabzon kullanıcısı var (≈200 m içinde). Bağlanmak istiyor musun?
            </Text>

            <Text style={[styles.disclaimer, { color: theme.colors.textLight }]}>
              Gizlilik: Konumunuz haritada gösterilmez, sadece yakınlık hesaplaması için kullanılır.
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton, { borderColor: theme.colors.border }]}
                onPress={() => handleResponse('reject')}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <>
                    <XCircle size={20} color={theme.colors.text} />
                    <Text style={[styles.buttonText, { color: theme.colors.text }]}>Reddet</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.blockButton, { borderColor: theme.colors.border }]}
                onPress={() => handleResponse('block')}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <>
                    <Ban size={20} color={COLORS.error} />
                    <Text style={[styles.buttonText, { color: COLORS.error }]}>Engelle</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.acceptButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleResponse('accept')}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Check size={20} color={COLORS.white} />
                    <Text style={[styles.buttonText, { color: COLORS.white }]}>Kabul Et</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: SPACING.xs,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SPACING.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  acceptButton: {
    borderWidth: 0,
  },
  rejectButton: {
    // Styles already applied
  },
  blockButton: {
    // Styles already applied
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

