import React, { useState, useMemo } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Send, AlertCircle } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam / Gereksiz İçerik' },
  { value: 'harassment', label: 'Taciz / Rahatsız Edici' },
  { value: 'inappropriate', label: 'Uygunsuz İçerik' },
  { value: 'fake', label: 'Sahte Hesap' },
  { value: 'other', label: 'Diğer' },
];

export default function ReportUserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: usersData, isLoading } = trpc.user.getAllUsers.useQuery({
    search: search || undefined,
    limit: 50,
    page: 1,
  });

  const reportMutation = trpc.user.reportUser.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Şikayetiniz admin paneline iletildi. Teşekkürler!');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Şikayet gönderilemedi');
      setIsSubmitting(false);
    },
  });

  const filteredUsers = useMemo(() => {
    if (!usersData?.users) return [];
    if (!search.trim()) return [];
    return usersData.users.filter((u: any) => 
      u.full_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [usersData, search]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId || !usersData?.users) return null;
    return usersData.users.find((u: any) => u.id === selectedUserId);
  }, [selectedUserId, usersData]);

  const handleSubmit = async () => {
    if (!selectedUserId) {
      Alert.alert('Hata', 'Lütfen bir kullanıcı seçin');
      return;
    }
    if (!reason) {
      Alert.alert('Hata', 'Lütfen şikayet nedeni seçin');
      return;
    }

    setIsSubmitting(true);
    try {
      await reportMutation.mutateAsync({
        reported_user_id: selectedUserId,
        reason: reason as any,
        description: description.trim() || undefined,
      });
    } catch (error) {
      console.error('Report error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          title: 'Kullanıcı Şikayeti',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningBox}>
          <AlertCircle size={20} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Şikayetleriniz admin panelinde incelenecektir. Gereksiz şikayetler hesabınızın kısıtlanmasına neden olabilir.
          </Text>
        </View>

        {/* Kullanıcı Arama */}
        <View style={styles.section}>
          <Text style={styles.label}>Kullanıcı Ara (İsim Soyisim) *</Text>
          <View style={styles.searchContainer}>
            <Search size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kullanıcı adı veya soyadı yazın..."
              placeholderTextColor={COLORS.textLight}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {search.trim() && (
            <View style={styles.userListContainer}>
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : filteredUsers.length > 0 ? (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isSelected = selectedUserId === item.id;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.userItem,
                          isSelected && styles.userItemSelected,
                        ]}
                        onPress={() => setSelectedUserId(item.id)}
                      >
                        <Image
                          source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
                          style={styles.userAvatar}
                        />
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{item.full_name || 'İsimsiz'}</Text>
                          {item.district && (
                            <Text style={styles.userDistrict}>{item.district}</Text>
                          )}
                        </View>
                        {isSelected && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  nestedScrollEnabled
                  style={styles.userList}
                />
              ) : (
                <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
              )}
            </View>
          )}

          {selectedUser && (
            <View style={styles.selectedUserCard}>
              <Image
                source={{ uri: selectedUser.avatar_url || 'https://via.placeholder.com/50' }}
                style={styles.selectedAvatar}
              />
              <View style={styles.selectedUserInfo}>
                <Text style={styles.selectedUserName}>{selectedUser.full_name || 'İsimsiz'}</Text>
                {selectedUser.district && (
                  <Text style={styles.selectedUserDistrict}>{selectedUser.district}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setSelectedUserId(null)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Şikayet Nedeni */}
        <View style={styles.section}>
          <Text style={styles.label}>Şikayet Nedeni *</Text>
          <View style={styles.reasonsContainer}>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.reasonChip,
                  reason === r.value && styles.reasonChipSelected,
                ]}
                onPress={() => setReason(r.value)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    reason === r.value && styles.reasonTextSelected,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Açıklama */}
        <View style={styles.section}>
          <Text style={styles.label}>Açıklama (Opsiyonel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Şikayetinizi detaylı olarak açıklayın..."
            placeholderTextColor={COLORS.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Gönder Butonu */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedUserId || !reason || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedUserId || !reason || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Send size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Şikayet Et</Text>
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
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  userListContainer: {
    marginTop: SPACING.sm,
    maxHeight: 200,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  userList: {
    maxHeight: 200,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  userItemSelected: {
    backgroundColor: COLORS.primary + '10',
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
  },
  userDistrict: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  selectedAvatar: {
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
  },
  selectedUserDistrict: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  reasonsContainer: {
    gap: SPACING.sm,
  },
  reasonChip: {
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasonChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reasonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  reasonTextSelected: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.md,
  },
  emptyText: {
    padding: SPACING.md,
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    marginTop: SPACING.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

