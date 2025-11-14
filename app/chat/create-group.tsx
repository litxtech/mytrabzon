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
import { ArrowLeft, Users, Search, Check } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [category, setCategory] = useState<'genel' | 'yardim' | 'etkinlik' | 'is' | 'egitim'>('genel');

  const { data: usersData, isLoading } = trpc.user.getAllUsers.useQuery({
    search: search || undefined,
  });

  const createRoomMutation = trpc.chat.createRoom.useMutation({
    onSuccess: (room) => {
      Alert.alert('Başarılı', 'Grup başarıyla oluşturuldu!', [
        {
          text: 'Tamam',
          onPress: () => router.replace(`/chat/${room.id}` as any),
        },
      ]);
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Grup oluşturulamadı');
    },
  });

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Hata', 'Lütfen grup adı girin');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir kullanıcı seçin');
      return;
    }

    try {
      await createRoomMutation.mutateAsync({
        type: 'group',
        name: `${getCategoryPrefix()} ${groupName.trim()}`,
        memberIds: selectedUsers,
      });
    } catch (error) {
      console.error('Create group error:', error);
    }
  };

  const getCategoryPrefix = () => {
    switch (category) {
      case 'genel': return 'Genel Sohbet';
      case 'yardim': return 'Yardım & Destek';
      case 'etkinlik': return 'Etkinlikler';
      case 'is': return 'İş İlanları';
      case 'egitim': return 'Eğitim';
      default: return 'Grup';
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const categories = [
    { key: 'genel' as const, label: 'Genel Sohbet' },
    { key: 'yardim' as const, label: 'Yardım & Destek' },
    { key: 'etkinlik' as const, label: 'Etkinlikler' },
    { key: 'is' as const, label: 'İş İlanları' },
    { key: 'egitim' as const, label: 'Eğitim' },
  ];

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
          title: 'Yeni Grup Oluştur',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Grup Adı *</Text>
          <TextInput
            style={styles.input}
            placeholder="Grup adını girin"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Kategori *</Text>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryButton,
                  category === cat.key && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat.key)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat.key && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Üyeler Seç ({selectedUsers.length} seçili) *</Text>
          <View style={styles.searchContainer}>
            <Search size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kullanıcı ara..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={COLORS.textLight}
            />
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
                const isSelected = selectedUsers.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.userItem,
                      isSelected && styles.userItemSelected,
                    ]}
                    onPress={() => toggleUserSelection(item.id)}
                  >
                    <Image
                      source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
                      style={styles.userAvatar}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.full_name}</Text>
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
                  <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
                </View>
              }
            />
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            (createRoomMutation.isPending || !groupName.trim() || selectedUsers.length === 0) &&
              styles.createButtonDisabled,
          ]}
          onPress={handleCreateGroup}
          disabled={createRoomMutation.isPending || !groupName.trim() || selectedUsers.length === 0}
        >
          {createRoomMutation.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Users size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Grup Oluştur</Text>
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
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryButtonTextActive: {
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.border,
    marginRight: SPACING.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

