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
import { ArrowLeft, Search } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';

export default function NewMessageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const { data: usersData, isLoading } = trpc.user.getAllUsers.useQuery({
    search: search || undefined,
  });

  const createRoomMutation = trpc.chat.createRoom.useMutation({
    onSuccess: (room) => {
      // Room oluşturuldu, mesaj ekranına yönlendir
      setLoadingUserId(null); // Loading'i temizle
      router.replace(`/chat/${room.id}` as any);
    },
    onError: (error) => {
      setLoadingUserId(null); // Hata durumunda loading'i temizle
      Alert.alert('Hata', error.message || 'Mesaj odası oluşturulamadı');
    },
  });

  const handleUserSelect = async (userId: string) => {
    if (!userId) {
      Alert.alert('Hata', 'Kullanıcı seçilemedi');
      return;
    }

    // Sadece bu kullanıcı için loading göster
    setLoadingUserId(userId);

    try {
      // Kullanıcı seçildiğinde room oluştur ve mesaj ekranına yönlendir
      await createRoomMutation.mutateAsync({
        type: 'direct',
        memberIds: [userId],
      });
    } catch (error) {
      console.error('Create room error:', error);
      setLoadingUserId(null); // Hata durumunda loading'i temizle
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
              const isCreating = loadingUserId === item.id && createRoomMutation.isPending;
              return (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    isCreating && styles.userItemDisabled,
                  ]}
                  onPress={() => handleUserSelect(item.id)}
                  disabled={createRoomMutation.isPending}
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
                  {isCreating && (
                    <ActivityIndicator size="small" color={COLORS.primary} />
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
  userItemDisabled: {
    opacity: 0.6,
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
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
});

