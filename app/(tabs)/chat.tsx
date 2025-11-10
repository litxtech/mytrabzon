import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ChatScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const mockChats = [
    {
      id: '1',
      name: 'Trabzon Genel',
      lastMessage: 'Bugün havalar çok güzel!',
      type: 'district',
      time: '5 dk',
    },
    {
      id: '2',
      name: 'Yardımlaşma',
      lastMessage: 'Kan bağışı kampanyası başladı',
      type: 'group',
      time: '1 sa',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sohbet</Text>
      </View>

      <FlatList
        data={mockChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <Text style={styles.chatMessage} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
          </TouchableOpacity>
        )}
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
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: SPACING.md,
  },
  chatAvatarText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
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
});
