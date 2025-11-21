import React, { useState, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { Search, X, Users, Unlock } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { SupporterBadge } from '@/components/SupporterBadge';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Engellenen Kullanıcılar',
      headerShown: true,
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.text,
      headerTitleStyle: { color: theme.colors.text },
    });
  }, [navigation, theme]);

  const { data, isLoading, refetch } = trpc.user.getBlockedUsers.useQuery(
    { limit: 100, offset: 0 },
    {
      enabled: !!user,
      retry: false,
    }
  );

  const unblockMutation = trpc.chat.unblockUser.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Kullanıcının engeli kaldırıldı');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Engel kaldırılırken bir hata oluştu');
    },
  });

  const filteredBlockedUsers = useMemo(() => {
    const blockedUsers = data?.blockedUsers || [];
    if (!searchQuery.trim()) return blockedUsers;

    const query = searchQuery.toLowerCase().trim();
    return blockedUsers.filter((user: any) =>
      user.full_name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  const handleUnblock = (userId: string, userName: string) => {
    Alert.alert(
      'Engeli Kaldır',
      `${userName} adlı kullanıcının engelini kaldırmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Engeli Kaldır',
          style: 'default',
          onPress: () => {
            unblockMutation.mutate({ blockedUserId: userId });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
        <Search size={20} color={theme.colors.textLight} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Kullanıcı ara..."
          placeholderTextColor={theme.colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={theme.colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {filteredBlockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={theme.colors.textLight} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            {searchQuery ? 'Sonuç bulunamadı' : 'Engellenen kullanıcı yok'}
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>
            {searchQuery
              ? 'Farklı bir arama terimi deneyin'
              : 'Engellediğiniz kullanıcılar burada görünecektir'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBlockedUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.blockedItem, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity
                style={styles.blockedContent}
                onPress={() => {
                  router.push(`/profile/${item.id}` as any);
                }}
              >
                <Image
                  source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
                  style={styles.blockedAvatar}
                />
                <View style={styles.blockedInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.blockedName, { color: theme.colors.text }]}>
                      {item.full_name}
                    </Text>
                    {item.verified && <VerifiedBadgeIcon size={16} />}
                  </View>
                  {item.username && (
                    <Text style={[styles.blockedUsername, { color: theme.colors.textLight }]}>
                      @{item.username}
                    </Text>
                  )}
                </View>
                {item.supporter_badge && item.supporter_badge_visible && (
                  <SupporterBadge
                    visible={true}
                    size="small"
                    color={item.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unblockButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleUnblock(item.id, item.full_name || 'Kullanıcı')}
                disabled={unblockMutation.isPending}
              >
                <Unlock size={16} color={COLORS.white} />
                <Text style={styles.unblockButtonText}>Engeli Kaldır</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    fontSize: FONT_SIZES.md,
  },
  listContent: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  blockedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  blockedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  blockedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  blockedInfo: {
    flex: 1,
  },
  blockedName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  blockedUsername: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  unblockButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});

