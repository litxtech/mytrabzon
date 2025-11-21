import React, { useState, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { Search, X, Users } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { SupporterBadge } from '@/components/SupporterBadge';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FollowingScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Takip Edilenler',
      headerShown: true,
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.text,
      headerTitleStyle: { color: theme.colors.text },
    });
  }, [navigation, theme]);

  const { data, isLoading } = trpc.user.getFollowing.useQuery(
    { user_id: id || user?.id || '', limit: 100, offset: 0 },
    {
      enabled: !!(id || user?.id),
      retry: false,
    }
  );

  const filteredFollowing = useMemo(() => {
    const following = data?.following || [];
    if (!searchQuery.trim()) return following;

    const query = searchQuery.toLowerCase().trim();
    return following.filter((follow: any) =>
      follow.full_name?.toLowerCase().includes(query) ||
      follow.username?.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

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

      {filteredFollowing.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={theme.colors.textLight} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz takip edilen yok'}
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>
            {searchQuery
              ? 'Farklı bir arama terimi deneyin'
              : 'Diğer kullanıcıları takip ederek bağlantılarınızı artırabilirsiniz'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFollowing}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.followerItem, { backgroundColor: theme.colors.card }]}
              onPress={() => {
                router.push(`/profile/${item.id}` as any);
              }}
            >
              <Image
                source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
                style={styles.followerAvatar}
              />
              <View style={styles.followerInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.followerName, { color: theme.colors.text }]}>
                    {item.full_name}
                  </Text>
                  {item.verified && <VerifiedBadgeIcon size={16} />}
                </View>
                {item.username && (
                  <Text style={[styles.followerUsername, { color: theme.colors.textLight }]}>
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
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  followerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  followerUsername: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
});
