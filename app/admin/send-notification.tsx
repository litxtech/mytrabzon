import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Search, Users, User, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';
import { Footer } from '@/components/Footer';

type SendMode = 'all' | 'single';

export default function AdminSendNotificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sendMode, setSendMode] = useState<SendMode>('single');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: usersData, isLoading: usersLoading } = (trpc as any).user.getAllUsers.useQuery({
    search: searchQuery || undefined,
  });

  const sendNotificationMutation = (trpc as any).admin.sendNotification.useMutation({
    onSuccess: (data: any) => {
      Alert.alert('Başarılı', `Bildirim gönderildi. ${data.sentCount || 1} kullanıcıya ulaştı.`);
      setTitle('');
      setBody('');
      setSelectedUser(null);
      setSearchQuery('');
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Bildirim gönderilemedi');
    },
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Hata', 'Başlık ve mesaj alanları zorunludur');
      return;
    }

    if (sendMode === 'single' && !selectedUser) {
      Alert.alert('Hata', 'Lütfen bir kullanıcı seçin');
      return;
    }

    Alert.alert(
      'Bildirim Gönder',
      sendMode === 'all'
        ? 'Tüm kullanıcılara bildirim göndermek istediğinizden emin misiniz?'
        : `${selectedUser?.full_name || 'Kullanıcı'} adlı kullanıcıya bildirim göndermek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: () => {
            sendNotificationMutation.mutate({
              userId: sendMode === 'single' ? selectedUser.id : undefined,
              title: title.trim(),
              body: body.trim(),
              type: 'SYSTEM',
            });
          },
        },
      ]
    );
  };

  const users = usersData?.users || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirim Gönder</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Gönderim Modu Seçimi */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, sendMode === 'single' && styles.modeButtonActive]}
            onPress={() => {
              setSendMode('single');
              setSelectedUser(null);
            }}
          >
            <User size={20} color={sendMode === 'single' ? COLORS.white : COLORS.text} />
            <Text style={[styles.modeButtonText, sendMode === 'single' && styles.modeButtonTextActive]}>
              Tek Kullanıcı
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, sendMode === 'all' && styles.modeButtonActive]}
            onPress={() => {
              setSendMode('all');
              setSelectedUser(null);
            }}
          >
            <Users size={20} color={sendMode === 'all' ? COLORS.white : COLORS.text} />
            <Text style={[styles.modeButtonText, sendMode === 'all' && styles.modeButtonTextActive]}>
              Tüm Kullanıcılar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Kullanıcı Seçimi (Tek kullanıcı modunda) */}
        {sendMode === 'single' && (
          <View style={styles.userSelection}>
            <Text style={styles.sectionTitle}>Kullanıcı Seç</Text>
            {selectedUser ? (
              <View style={styles.selectedUserCard}>
                <Image
                  source={{ uri: selectedUser.avatar_url || 'https://via.placeholder.com/40' }}
                  style={styles.selectedUserAvatar}
                />
                <View style={styles.selectedUserInfo}>
                  <Text style={styles.selectedUserName}>{selectedUser.full_name || 'İsimsiz'}</Text>
                  <Text style={styles.selectedUserEmail}>{selectedUser.email || ''}</Text>
                  {selectedUser.username && (
                    <Text style={styles.selectedUserUsername}>@{selectedUser.username}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedUser(null)}
                  style={styles.removeUserButton}
                >
                  <X size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.searchContainer}>
                <Search size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="İsim, e-posta veya kullanıcı adı ile ara..."
                  placeholderTextColor={COLORS.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}

            {!selectedUser && searchQuery.length > 0 && (
              <View style={styles.usersListContainer}>
                {usersLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : users.length > 0 ? (
                  <FlatList
                    data={users.slice(0, 10)}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.userItem}
                        onPress={() => {
                          setSelectedUser(item);
                          setSearchQuery('');
                        }}
                      >
                        <Image
                          source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
                          style={styles.userAvatar}
                        />
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{item.full_name || 'İsimsiz'}</Text>
                          <Text style={styles.userEmail}>{item.email || ''}</Text>
                          {item.username && (
                            <Text style={styles.userUsername}>@{item.username}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    nestedScrollEnabled
                    style={styles.usersList}
                  />
                ) : (
                  <Text style={styles.noUsersText}>Kullanıcı bulunamadı</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Bildirim Formu */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Bildirim İçeriği</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Başlık *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Kimliğiniz Onaylandı"
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mesaj *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Bildirim mesajınızı buraya yazın..."
              placeholderTextColor={COLORS.textLight}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{body.length}/500</Text>
          </View>
        </View>

        {/* Gönder Butonu */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!title.trim() || !body.trim() || (sendMode === 'single' && !selectedUser)) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={
            !title.trim() ||
            !body.trim() ||
            (sendMode === 'single' && !selectedUser) ||
            sendNotificationMutation.isPending
          }
        >
          {sendNotificationMutation.isPending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Send size={20} color={COLORS.white} />
              <Text style={styles.sendButtonText}>
                {sendMode === 'all' ? 'Tüm Kullanıcılara Gönder' : 'Gönder'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Footer />
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
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: SPACING.xs,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modeButtonTextActive: {
    color: COLORS.white,
  },
  userSelection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  selectedUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  selectedUserInfo: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  selectedUserEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  selectedUserUsername: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
  },
  removeUserButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  usersListContainer: {
    maxHeight: 300,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
  },
  usersList: {
    maxHeight: 280,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.background,
    gap: SPACING.sm,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
  },
  noUsersText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    padding: SPACING.md,
  },
  formSection: {
    marginBottom: SPACING.md,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.sm,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});

