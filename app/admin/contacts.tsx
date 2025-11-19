import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Mail, Send, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';

export default function AdminContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messageType, setMessageType] = useState<'sms' | 'email'>('sms');
  const [messageText, setMessageText] = useState('');
  const [subject, setSubject] = useState('');
  const [showRecentChanges, setShowRecentChanges] = useState(false);

  const { data, isLoading, refetch } = (trpc as any).admin.getUserContacts.useQuery({
    search: searchQuery || undefined,
    limit: 100,
    offset: 0,
  });

  const { data: recentChangesData } = (trpc as any).admin.getRecentProfileChanges.useQuery({
    limit: 20,
  });

  const sendSMSMutation = (trpc as any).admin.sendSMS.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'SMS gönderildi');
      setSendModalVisible(false);
      setMessageText('');
      setSelectedContact(null);
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'SMS gönderilemedi');
    },
  });

  const sendEmailMutation = (trpc as any).admin.sendEmail.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Email gönderildi');
      setSendModalVisible(false);
      setMessageText('');
      setSubject('');
      setSelectedContact(null);
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Email gönderilemedi');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSendMessage = (contact: any) => {
    setSelectedContact(contact);
    setSendModalVisible(true);
    setMessageType(contact.phone ? 'sms' : 'email');
    setMessageText('');
    setSubject('');
  };

  const handleSend = () => {
    if (!messageText.trim()) {
      Alert.alert('Hata', 'Mesaj boş olamaz');
      return;
    }

    if (messageType === 'sms') {
      if (!selectedContact?.phone) {
        Alert.alert('Hata', 'Telefon numarası bulunamadı');
        return;
      }
      sendSMSMutation.mutate({
        phone: selectedContact.phone,
        message: messageText.trim(),
      });
    } else {
      if (!selectedContact?.email) {
        Alert.alert('Hata', 'Email adresi bulunamadı');
        return;
      }
      if (!subject.trim()) {
        Alert.alert('Hata', 'Konu boş olamaz');
        return;
      }
      sendEmailMutation.mutate({
        email: selectedContact.email,
        subject: subject.trim(),
        message: messageText.trim(),
      });
    }
  };

  const contacts = data?.contacts || [];
  const total = data?.total || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Telefon ve Mailler</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Arama */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="İsim, telefon veya email ile ara..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Toplam Kullanıcı</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {contacts.filter((c: any) => c.phone).length}
          </Text>
          <Text style={styles.statLabel}>Telefon Var</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {contacts.filter((c: any) => c.email).length}
          </Text>
          <Text style={styles.statLabel}>Email Var</Text>
        </View>
      </View>

      {/* Son Değişiklikler */}
      {recentChangesData?.changes && recentChangesData.changes.length > 0 && (
        <TouchableOpacity
          style={styles.recentChangesButton}
          onPress={() => setShowRecentChanges(!showRecentChanges)}
        >
          <Text style={styles.recentChangesButtonText}>
            {showRecentChanges ? '▼' : '▶'} Son Değişiklikler ({recentChangesData.changes.length})
          </Text>
        </TouchableOpacity>
      )}

      {showRecentChanges && recentChangesData?.changes && (
        <View style={styles.recentChangesContainer}>
          {recentChangesData.changes.slice(0, 5).map((change: any) => (
            <View key={change.id} style={styles.changeCard}>
              <Text style={styles.changeUserName}>
                {change.user?.full_name || 'İsimsiz'}
              </Text>
              <Text style={styles.changeField}>
                {change.field_name === 'email' ? '📧 Email' : '📱 Telefon'} değişti
              </Text>
              <Text style={styles.changeValue}>
                Eski: {change.old_value || 'Yok'} → Yeni: {change.new_value || 'Yok'}
              </Text>
              <Text style={styles.changeDate}>
                {new Date(change.changed_at).toLocaleString('tr-TR')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Liste */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Kayıt bulunamadı</Text>
          </View>
        ) : (
          contacts.map((contact: any) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>
                  {contact.full_name || 'İsimsiz Kullanıcı'}
                </Text>
                <View style={styles.contactDetails}>
                  {contact.phone ? (
                    <View style={styles.contactDetailRow}>
                      <Phone size={16} color={COLORS.primary} />
                      <Text style={styles.contactDetailText}>{contact.phone}</Text>
                    </View>
                  ) : (
                    <View style={styles.contactDetailRow}>
                      <Phone size={16} color={COLORS.textLight} />
                      <Text style={[styles.contactDetailText, styles.missingInfo]}>
                        Telefon yok
                      </Text>
                    </View>
                  )}
                  {contact.email ? (
                    <View style={styles.contactDetailRow}>
                      <Mail size={16} color={COLORS.secondary} />
                      <Text style={styles.contactDetailText}>{contact.email}</Text>
                    </View>
                  ) : (
                    <View style={styles.contactDetailRow}>
                      <Mail size={16} color={COLORS.textLight} />
                      <Text style={[styles.contactDetailText, styles.missingInfo]}>
                        Email yok
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.contactDate}>
                  Güncellenme: {new Date(contact.updated_at).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!contact.phone && !contact.email) && styles.sendButtonDisabled,
                ]}
                onPress={() => handleSendMessage(contact)}
                disabled={!contact.phone && !contact.email}
              >
                <Send 
                  size={20} 
                  color={(!contact.phone && !contact.email) ? COLORS.textLight : COLORS.white} 
                />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Gönderme Modal */}
      <Modal
        visible={sendModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSendModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {messageType === 'sms' ? 'SMS Gönder' : 'Email Gönder'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSendModalVisible(false)}
              >
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientLabel}>Alıcı:</Text>
                <Text style={styles.recipientText}>
                  {selectedContact?.full_name || 'İsimsiz Kullanıcı'}
                </Text>
                {messageType === 'sms' ? (
                  <View style={styles.recipientDetailRow}>
                    <Phone size={16} color={COLORS.primary} />
                    <Text style={styles.recipientDetail}>{selectedContact?.phone}</Text>
                  </View>
                ) : (
                  <View style={styles.recipientDetailRow}>
                    <Mail size={16} color={COLORS.secondary} />
                    <Text style={styles.recipientDetail}>{selectedContact?.email}</Text>
                  </View>
                )}
              </View>

              {/* Mesaj Tipi Seçimi */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    messageType === 'sms' && styles.typeButtonActive,
                    !selectedContact?.phone && styles.typeButtonDisabled,
                  ]}
                  onPress={() => setMessageType('sms')}
                  disabled={!selectedContact?.phone}
                >
                  <Phone size={20} color={messageType === 'sms' ? COLORS.white : COLORS.text} />
                  <Text
                    style={[
                      styles.typeButtonText,
                      messageType === 'sms' && styles.typeButtonTextActive,
                    ]}
                  >
                    SMS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    messageType === 'email' && styles.typeButtonActive,
                    !selectedContact?.email && styles.typeButtonDisabled,
                  ]}
                  onPress={() => setMessageType('email')}
                  disabled={!selectedContact?.email}
                >
                  <Mail size={20} color={messageType === 'email' ? COLORS.white : COLORS.text} />
                  <Text
                    style={[
                      styles.typeButtonText,
                      messageType === 'email' && styles.typeButtonTextActive,
                    ]}
                  >
                    Email
                  </Text>
                </TouchableOpacity>
              </View>

              {messageType === 'email' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Konu</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email konusu"
                    placeholderTextColor={COLORS.textLight}
                    value={subject}
                    onChangeText={setSubject}
                    maxLength={200}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mesaj</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mesajınızı yazın..."
                  placeholderTextColor={COLORS.textLight}
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  numberOfLines={6}
                  maxLength={messageType === 'sms' ? 1000 : 5000}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {messageText.length} / {messageType === 'sms' ? 1000 : 5000}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!messageText.trim() || (messageType === 'email' && !subject.trim()) ||
                    sendSMSMutation.isPending || sendEmailMutation.isPending) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={
                  !messageText.trim() ||
                  (messageType === 'email' && !subject.trim()) ||
                  sendSMSMutation.isPending ||
                  sendEmailMutation.isPending
                }
              >
                {(sendSMSMutation.isPending || sendEmailMutation.isPending) ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Send size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Gönder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  recentChangesButton: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentChangesButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  recentChangesContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  changeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  changeUserName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  changeField: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  changeValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  changeDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  contactDetails: {
    gap: SPACING.xs,
  },
  contactDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  contactDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  missingInfo: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
  contactDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  recipientDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalBody: {
    padding: SPACING.md,
  },
  recipientInfo: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recipientLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  recipientText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  recipientDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonDisabled: {
    opacity: 0.5,
  },
  typeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeButtonTextActive: {
    color: COLORS.white,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

