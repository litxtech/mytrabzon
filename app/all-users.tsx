import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MapPin, ChevronRight, Users, User, UserCheck } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { CallButtons } from '@/components/CallButtons';

interface UserListItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  district: string;
  created_at: string;
  verified: boolean;
  gender: 'male' | 'female' | 'other' | null;
}

type GenderFilter = 'all' | 'male' | 'female' | 'other';

export default function AllUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<UserListItem[]>([]);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, isFetching, refetch } = trpc.user.getAllUsers.useQuery({
    search: debouncedSearch || undefined,
    gender: genderFilter === 'all' ? undefined : genderFilter,
  }, {
    enabled: true,
    staleTime: 30000, // 30 saniye
  });

  useEffect(() => {
    console.log('getAllUsers response:', data);
    if (data && data.users) {
      console.log('Setting users:', data.users.length);
      setAllUsers(data.users);
    } else {
      console.log('No users in response');
      setAllUsers([]);
    }
  }, [data]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
  }, []);

  const handleGenderFilter = useCallback((gender: GenderFilter) => {
    setGenderFilter(gender);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleUserPress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}` as any);
    },
    [router]
  );

  const renderUser = useCallback(
    ({ item }: { item: UserListItem }) => (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => handleUserPress(item.id)}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: item.avatar_url || 'https://via.placeholder.com/60',
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.full_name}</Text>
            {item.verified && <Text style={styles.verifiedBadge}>✓</Text>}
          </View>
          {item.bio && (
            <Text style={styles.userBio} numberOfLines={1}>
              {item.bio}
            </Text>
          )}
          <View style={styles.locationRow}>
            <MapPin size={14} color={COLORS.textLight} />
            <Text style={styles.locationText}>
              {item.district}
              {item.city ? `, ${item.city}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.userActions}>
          <CallButtons
            targetUserId={item.id}
            targetUserName={item.full_name}
            targetUserAvatar={item.avatar_url || undefined}
          />
          <ChevronRight size={20} color={COLORS.textLight} />
        </View>
      </TouchableOpacity>
    ),
    [handleUserPress]
  );

  const renderEmpty = useMemo(() => {
    if (isLoading || isFetching) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Yükleniyor...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {search
            ? 'Arama sonucu bulunamadı'
            : 'Henüz kayıtlı kullanıcı bulunmuyor'}
        </Text>
      </View>
    );
  }, [isLoading, isFetching, search]);


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Kullanıcılar</Text>
        <Text style={styles.subtitle}>
          {data?.total || 0} kayıtlı kullanıcı
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="İsim veya e-posta ile ara..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              genderFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => handleGenderFilter('all')}
          >
            <Users size={18} color={genderFilter === 'all' ? COLORS.white : COLORS.primary} />
            <Text
              style={[
                styles.filterButtonText,
                genderFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              Tümü
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              genderFilter === 'male' && styles.filterButtonActive,
            ]}
            onPress={() => handleGenderFilter('male')}
          >
            <User size={18} color={genderFilter === 'male' ? COLORS.white : COLORS.primary} />
            <Text
              style={[
                styles.filterButtonText,
                genderFilter === 'male' && styles.filterButtonTextActive,
              ]}
            >
              Erkek
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              genderFilter === 'female' && styles.filterButtonActive,
            ]}
            onPress={() => handleGenderFilter('female')}
          >
            <UserCheck size={18} color={genderFilter === 'female' ? COLORS.white : COLORS.primary} />
            <Text
              style={[
                styles.filterButtonText,
                genderFilter === 'female' && styles.filterButtonTextActive,
              ]}
            >
              Kadın
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={allUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshing={isLoading}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.xs,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.border,
  },
  userInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '700',
  },
  userBio: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
