import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { X, Phone, Mail, Globe, MessageCircle } from 'lucide-react-native';

interface SupportPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function SupportPanel({ visible, onClose }: SupportPanelProps) {
  const [message, setMessage] = useState('');

  const handleContact = (type: 'phone' | 'email' | 'web') => {
    switch (type) {
      case 'phone':
        Linking.openURL('tel:+13072715151');
        break;
      case 'email':
        Linking.openURL('mailto:support@litxtech.com');
        break;
      case 'web':
        Linking.openURL('https://www.litxtech.com');
        break;
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      Linking.openURL(`mailto:support@litxtech.com?subject=MyTrabzon Destek&body=${encodeURIComponent(message)}`);
      setMessage('');
      Alert.alert('Başarılı', 'Mesajınız gönderildi. En kısa sürede size dönüş yapılacaktır.');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Destek</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.subtitle}>İletişim Bilgileri</Text>

            <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('phone')}>
              <View style={styles.iconContainer}>
                <Phone size={20} color={COLORS.primary} />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Telefon</Text>
                <Text style={styles.contactValue}>+1 307 271 5151</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('email')}>
              <View style={styles.iconContainer}>
                <Mail size={20} color={COLORS.primary} />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>E-posta</Text>
                <Text style={styles.contactValue}>support@litxtech.com</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('web')}>
              <View style={styles.iconContainer}>
                <Globe size={20} color={COLORS.primary} />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Web</Text>
                <Text style={styles.contactValue}>www.litxtech.com</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.subtitle}>Hızlı Mesaj</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Mesajınızı buraya yazın..."
              placeholderTextColor={COLORS.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <MessageCircle size={20} color={COLORS.white} />
              <Text style={styles.sendButtonText}>Mesaj Gönder</Text>
            </TouchableOpacity>
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
    justifyContent: 'flex-end' as const,
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.lg,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  contactItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: SPACING.md,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500' as const,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 100,
    marginBottom: SPACING.md,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  sendButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
});
