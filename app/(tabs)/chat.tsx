import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Alert, ScrollView, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Users, MapPin, AlertCircle, Inbox, UsersRound, Plus, Trash2, CheckSquare, Square } from 'lucide-react-native';
import { Footer } from '@/components/Footer';
import { trpc } from '@/lib/trpc';

type TabType = 'inbox' | 'groups';
type GroupCategory = 'genel' | 'yardim' | 'etkinlik' | 'is' | 'egitim';

export default function ChatScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { rooms, loading, loadRooms, onlineUsers } = useChat();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [selectedCategory, setSelectedCategory] = useState<GroupCategory | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const utils = trpc.useUtils();

  const leaveRoomMutation = trpc.chat.leaveRoom.useMutation({
    onSuccess: () => {
      loadRooms();
      utils.chat.getRooms.invalidate();
    },
  });

  const deleteRoomMutation = trpc.chat.deleteRoom.useMutation({
    onSuccess: () => {
      loadRooms();
      utils.chat.getRooms.invalidate();
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        await loadRooms();
      } catch (err: any) {
        const errorMessage = err?.message || 'Chat odaları yüklenirken bir hata oluştu';
        setError(errorMessage);
        console.error('Chat screen error:', err);
      }
    };
    
    if (user) {
      load();
    }
  }, [loadRooms, user]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      await loadRooms();
    } catch (err: any) {
      const errorMessage = err?.message || 'Chat odaları yüklenirken bir hata oluştu';
      setError(errorMessage);
      Alert.alert('Hata', errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk`;
    if (diffHours < 24) return `${diffHours} sa`;
    if (diffDays === 1) return 'Dün';
    return messageDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getRoomName = (room: any) => {
    if (room.type === 'direct' && room.other_user) {
      return room.other_user.full_name;
    }
    return room.name || room.district || 'Sohbet';
  };

  const getRoomAvatar = (room: any) => {
    if (room.type === 'direct' && room.other_user?.avatar_url) {
      return room.other_user.avatar_url;
    }
    return room.avatar_url;
  };

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'district':
        return MapPin;
      case 'group':
        return Users;
      default:
        return MessageCircle;
    }
  };

  const isUserOnline = (room: any) => {
    if (room.type === 'direct' && room.other_user) {
      return onlineUsers[room.other_user.id]?.is_online || false;
    }
    return false;
  };

  const directMessages = useMemo(() => {
    return rooms.filter(room => room.type === 'direct');
  }, [rooms]);

  const groupRooms = useMemo(() => {
    return rooms.filter(room => room.type === 'group');
  }, [rooms]);

  const getCategoryFromName = (name: string): GroupCategory | null => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('genel')) return 'genel';
    if (lowerName.includes('yardım') || lowerName.includes('destek')) return 'yardim';
    if (lowerName.includes('etkinlik')) return 'etkinlik';
    if (lowerName.includes('iş') || lowerName.includes('ilan')) return 'is';
    if (lowerName.includes('eğitim')) return 'egitim';
    return null;
  };

  const categorizedGroups = useMemo(() => {
    const categories: Record<GroupCategory, typeof groupRooms> = {
      genel: [],
      yardim: [],
      etkinlik: [],
      is: [],
      egitim: [],
    };

    groupRooms.forEach(room => {
      const category = getCategoryFromName(room.name || '');
      if (category) {
        categories[category].push(room);
      }
    });

    return categories;
  }, [groupRooms]);

  const getCategoryTitle = (category: GroupCategory): string => {
    switch (category) {
      case 'genel': return 'Genel Sohbet';
      case 'yardim': return 'Yardım & Destek';
      case 'etkinlik': return 'Etkinlikler';
      case 'is': return 'İş İlanları';
      case 'egitim': return 'Eğitim';
    }
  };

  const displayedRooms = useMemo(() => {
    if (activeTab === 'inbox') {
      return directMessages;
    }
    if (selectedCategory) {
      return categorizedGroups[selectedCategory];
    }
    return [];
  }, [activeTab, selectedCategory, directMessages, categorizedGroups]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Sohbet</Text>
        </View>
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color={theme.colors.textLight} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>Giriş Yapmalısınız</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>Sohbet özelliğini kullanmak için giriş yapın</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && rooms.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Sohbet</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Sohbet</Text>
        </View>
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>Hata Oluştu</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]} 
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity
        style={[styles.tab, { backgroundColor: theme.colors.surface }, activeTab === 'inbox' && { backgroundColor: theme.colors.primary }]}
        onPress={() => setActiveTab('inbox')}
      >
        <Inbox size={20} color={activeTab === 'inbox' ? COLORS.white : theme.colors.textLight} />
        <Text style={[styles.tabText, { color: activeTab === 'inbox' ? COLORS.white : theme.colors.text }]}>Gelen Kutusu</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, { backgroundColor: theme.colors.surface }, activeTab === 'groups' && { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          setActiveTab('groups');
          if (!selectedCategory) setSelectedCategory('genel');
        }}
      >
        <UsersRound size={20} color={activeTab === 'groups' ? COLORS.white : theme.colors.textLight} />
        <Text style={[styles.tabText, { color: activeTab === 'groups' ? COLORS.white : theme.colors.text }]}>Gruplar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGroupCategories = () => {
    if (activeTab !== 'groups') return null;

    const categories: { key: GroupCategory; icon: typeof Users; label: string }[] = [
      { key: 'genel', icon: MessageCircle, label: 'Genel Sohbet' },
      { key: 'yardim', icon: AlertCircle, label: 'Yardım & Destek' },
      { key: 'etkinlik', icon: MapPin, label: 'Etkinlikler' },
      { key: 'is', icon: Users, label: 'İş İlanları' },
      { key: 'egitim', icon: Users, label: 'Eğitim' },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map(({ key, icon: Icon, label }) => {
          const count = categorizedGroups[key].length;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryButton,
                selectedCategory === key && styles.selectedCategoryButton,
              ]}
              onPress={() => setSelectedCategory(key)}
            >
              <Icon
                size={18}
                color={selectedCategory === key ? COLORS.white : theme.colors.textLight}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  { color: selectedCategory === key ? COLORS.white : theme.colors.text },
                  selectedCategory === key && styles.selectedCategoryButtonText,
                ]}
              >
                {label}
              </Text>
              {count > 0 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const handleCreateGroup = () => {
    router.push('/chat/create-group' as any);
  };

  const handleNewMessage = () => {
    router.push('/chat/new-message' as any);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedRooms(new Set());
  };

  const toggleRoomSelection = (roomId: string) => {
    const newSelected = new Set(selectedRooms);
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId);
    } else {
      newSelected.add(roomId);
    }
    setSelectedRooms(newSelected);
  };

  const selectAllRooms = () => {
    const allRoomIds = new Set(displayedRooms.map(room => room.id));
    setSelectedRooms(allRoomIds);
  };

  const handleDeleteSelected = () => {
    if (selectedRooms.size === 0) {
      Alert.alert('Uyarı', 'Lütfen silinecek sohbetleri seçin');
      return;
    }

    Alert.alert(
      'Sohbetleri Sil',
      `${selectedRooms.size} sohbeti silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            for (const roomId of selectedRooms) {
              const room = rooms.find(r => r.id === roomId);
              if (room) {
                if (room.type === 'group' && room.created_by === user?.id) {
                  await deleteRoomMutation.mutateAsync({ roomId });
                } else {
                  await leaveRoomMutation.mutateAsync({ roomId });
                }
              }
            }
            setSelectedRooms(new Set());
            setSelectionMode(false);
            Alert.alert('Başarılı', 'Seçili sohbetler silindi');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Sohbet</Text>
        <View style={styles.headerButtons}>
          {!selectionMode && activeTab === 'inbox' && (
            <>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={toggleSelectionMode}
              >
                <CheckSquare size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newMessageButton}
                onPress={handleNewMessage}
              >
                <Plus size={20} color={COLORS.white} />
                <Text style={styles.newMessageButtonText}>Yeni Mesaj</Text>
              </TouchableOpacity>
            </>
          )}
          {!selectionMode && activeTab === 'groups' && (
            <TouchableOpacity
              style={styles.createGroupButton}
              onPress={handleCreateGroup}
            >
              <Users size={20} color={COLORS.white} />
              <Text style={styles.createGroupButtonText}>Grup Oluştur</Text>
            </TouchableOpacity>
          )}
          {selectionMode && (
            <>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={selectAllRooms}
              >
                <Text style={styles.selectAllButtonText}>Tümünü Seç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteSelected}
                disabled={selectedRooms.size === 0}
              >
                <Trash2 size={20} color={COLORS.white} />
                <Text style={styles.deleteButtonText}>Sil ({selectedRooms.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={toggleSelectionMode}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {renderTabBar()}
      {renderGroupCategories()}

      <FlatList
        data={displayedRooms}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 80, // Ortalama room item yüksekliği
          offset: 80 * index,
          index,
        })}
        renderItem={({ item: room }) => {
          const IconComponent = getRoomIcon(room.type);
          const isOnline = isUserOnline(room);
          const avatar = getRoomAvatar(room);
          const isSelected = selectedRooms.has(room.id);
          
          return (
            <TouchableOpacity
              style={[
                styles.chatItem,
                { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
                isSelected && { backgroundColor: theme.colors.surface }
              ]}
              onPress={() => {
                if (selectionMode) {
                  toggleRoomSelection(room.id);
                } else {
                  router.push(`/chat/${room.id}`);
                }
              }}
              onLongPress={() => {
                if (!selectionMode) {
                  setSelectionMode(true);
                  toggleRoomSelection(room.id);
                }
              }}
            >
              {selectionMode && (
                <View style={styles.checkboxContainer}>
                  {isSelected ? (
                    <CheckSquare size={24} color={theme.colors.primary} />
                  ) : (
                    <Square size={24} color={theme.colors.textLight} />
                  )}
                </View>
              )}
              
              <View style={styles.avatarContainer}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.chatAvatar} />
                ) : (
                  <View style={[styles.chatAvatar, styles.chatAvatarPlaceholder]}>
                    <IconComponent size={24} color={COLORS.white} />
                  </View>
                )}
                {isOnline && <View style={styles.onlineBadge} />}
              </View>
              
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <View style={styles.chatNameContainer}>
                    <Text style={styles.chatName}>
                      {getRoomName(room)}
                    </Text>
                  </View>
                  <View style={styles.chatTimeContainer}>
                    <Text style={styles.chatTime}>
                      {formatTime(room.last_message_at)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.messageRow}>
                  <View style={styles.chatMessageContainer}>
                    <Text style={styles.chatMessage}>
                      {room.last_message?.content || 'Henüz mesaj yok'}
                    </Text>
                  </View>
                  {room.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{room.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'inbox' ? 'Henüz mesaj yok' : 'Bu kategoride grup yok'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'inbox'
                ? 'Kullanıcılarla sohbet başlatarak iletişime geçebilirsin'
                : selectedCategory
                ? `${getCategoryTitle(selectedCategory)} kategorisinde henüz grup bulunmuyor`
                : 'Bir kategori seçin'}
            </Text>
          </View>
        }
        ListFooterComponent={<Footer />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.primary,
  },
  chatItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
  },
  chatInfo: {
    flex: 1,
    flexShrink: 1,
  },
  chatHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
    flex: 1,
    flexShrink: 1,
  },
  chatNameContainer: {
    flex: 1,
    flexShrink: 1,
  },
  chatName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  chatTimeContainer: {
    flexShrink: 0,
  },
  chatTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  chatMessageContainer: {
    flex: 1,
    flexShrink: 1,
  },
  chatMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  emptyContainer: {
    padding: SPACING.xxl,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginRight: SPACING.md,
  },
  chatAvatarPlaceholder: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  onlineBadge: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  messageRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
    marginLeft: SPACING.sm,
  },
  unreadText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700' as const,
  },
  retryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
  tabBar: {
    flexDirection: 'row' as const,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500' as const,
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700' as const,
  },
  categoryScroll: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryScrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedCategoryButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500' as const,
    color: COLORS.textLight,
  },
  selectedCategoryButtonText: {
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  categoryBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
    marginLeft: 2,
  },
  categoryBadgeText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700' as const,
  },
  headerButtons: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
  },
  newMessageButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  newMessageButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  createGroupButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  createGroupButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  selectButton: {
    padding: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  selectAllButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectAllButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  deleteButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  cancelButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  checkboxContainer: {
    marginRight: SPACING.sm,
    justifyContent: 'center' as const,
  },
  chatItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
});
