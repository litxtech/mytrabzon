import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Users, MapPin } from 'lucide-react-native';

export default function ChatScreen() {
  const { user } = useAuth();
  const { rooms, loading, loadRooms, onlineUsers } = useChat();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
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

  if (loading && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sohbet</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sohbet</Text>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item: room }) => {
          const IconComponent = getRoomIcon(room.type);
          const isOnline = isUserOnline(room);
          const avatar = getRoomAvatar(room);
          
          return (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => router.push(`/chat/${room.id}`)}
            >
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
                  <Text style={styles.chatName}>{getRoomName(room)}</Text>
                  <Text style={styles.chatTime}>
                    {formatTime(room.last_message_at)}
                  </Text>
                </View>
                
                <View style={styles.messageRow}>
                  <Text style={styles.chatMessage} numberOfLines={1}>
                    {room.last_message?.content || 'Henüz mesaj yok'}
                  </Text>
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
            <Text style={styles.emptyText}>Henüz sohbet yok</Text>
            <Text style={styles.emptySubtext}>İlçe gruplarına katılarak başlayabilirsin</Text>
          </View>
        }
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
  },
  chatHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  chatName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  chatTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
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
});
