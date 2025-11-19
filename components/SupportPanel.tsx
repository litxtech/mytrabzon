import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { X, Phone, Mail, Globe, MessageCircle } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

interface SupportPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function SupportPanel({ visible, onClose }: SupportPanelProps) {
  const [message, setMessage] = useState('');

  const createTicketMutation = (trpc as any).support.createTicket.useMutation({
    onSuccess: () => {
      setMessage('');
      Alert.alert('Başarılı', 'Destek başvurunuz alındı. En kısa sürede size dönüş yapılacaktır.');
      onClose();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    },
  });

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
    if (!message.trim()) {
      Alert.alert('Uyarı', 'Lütfen mesajınızı yazın.');
      return;
    }

    createTicketMutation.mutate({
      subject: 'MyTrabzon Destek Başvurusu',
      message: message.trim(),
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContentWrapper}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>Destek</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
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
                  maxLength={1000}
                />

                <TouchableOpacity
                  style={[styles.sendButton, createTicketMutation.isPending && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={createTicketMutation.isPending}
                >
                  <MessageCircle size={20} color={COLORS.white} />
                  <Text style={styles.sendButtonText}>
                    {createTicketMutation.isPending ? 'Gönderiliyor...' : 'Mesaj Gönder'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  modalContentWrapper: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
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
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
});
