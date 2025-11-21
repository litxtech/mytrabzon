import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MessageCircle, Search, Check } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';

export default function NewMessageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: usersData, isLoading } = trpc.user.getAllUsers.useQuery({
    search: search || undefined,
  });

  const createRoomMutation = trpc.chat.createRoom.useMutation({
    onSuccess: (room) => {
      Alert.alert('Başarılı', 'Mesaj başarıyla gönderildi!', [
        {
          text: 'Tamam',
          onPress: () => router.replace(`/chat/${room.id}` as any),
        },
      ]);
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Mesaj gönderilemedi');
    },
  });

  const handleSendMessage = async () => {
    if (!selectedUserId) {
      Alert.alert('Hata', 'Lütfen bir kullanıcı seçin');
      return;
    }

    try {
      await createRoomMutation.mutateAsync({
        type: 'direct',
        memberIds: [selectedUserId],
      });
    } catch (error) {
      console.error('Create message error:', error);
    }
  };

  const filteredUsers = usersData?.users?.filter(u => u.id !== user?.id) || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          title: 'Yeni Mesaj',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Kullanıcı Ara</Text>
          <View style={styles.searchContainer}>
            <Search size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="İsim, kullanıcı adı veya e-posta ile ara..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
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
                    source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.userName}>{item.full_name}</Text>
                      {item.verified && <VerifiedBadgeIcon size={14} />}
                    </View>
                    {(item as any).username && (
                      <Text style={styles.userUsername}>@{(item as any).username}</Text>
                    )}
                    {item.district && (
                      <Text style={styles.userDistrict}>{item.district}</Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.checkIcon}>
                      <Check size={20} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {search ? 'Kullanıcı bulunamadı' : 'Arama yaparak kullanıcı bulun'}
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selectedUserId || createRoomMutation.isPending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!selectedUserId || createRoomMutation.isPending}
        >
          {createRoomMutation.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MessageCircle size={20} color={COLORS.white} />
              <Text style={styles.sendButtonText}>Mesaj Gönder</Text>
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
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
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
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    marginRight: SPACING.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  userUsername: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs / 2,
  },
  userDistrict: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
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
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

