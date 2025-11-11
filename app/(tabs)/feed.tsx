import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICTS, DISTRICT_BADGES } from '@/constants/districts';
import { Post, District } from '@/types/database';
import { Heart, MessageCircle, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeedScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [selectedDistrict, setSelectedDistrict] = useState<District | 'all'>('all');

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['posts', selectedDistrict],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:user_profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (selectedDistrict !== 'all') {
        query = query.eq('district', selectedDistrict);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Post[];
    },
  });

  const renderDistrictFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'all', name: 'Tümü', badge: '🌍' }, ...DISTRICTS.map(d => ({ id: d, name: d, badge: DISTRICT_BADGES[d] }))]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedDistrict === item.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedDistrict(item.id as District | 'all')}
          >
            <Text style={styles.filterEmoji}>{item.badge}</Text>
            <Text
              style={[
                styles.filterText,
                selectedDistrict === item.id && styles.filterTextActive,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <View style={styles.postHeader}>
        <Image
          source={{ uri: item.user?.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View style={styles.postHeaderInfo}>
          <Text style={styles.postAuthor}>{item.user?.full_name}</Text>
          <View style={styles.postMeta}>
            <Text style={styles.postDistrict}>
              {DISTRICT_BADGES[item.district]} {item.district}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.postContent}>{item.content}</Text>

      {item.media_url && (
        <Image
          source={{ uri: item.media_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.postActions}>
        <View style={styles.actionButton}>
          <Heart size={20} color={COLORS.textLight} />
          <Text style={styles.actionText}>{item.likes_count || 0}</Text>
        </View>
        <View style={styles.actionButton}>
          <MessageCircle size={20} color={COLORS.textLight} />
          <Text style={styles.actionText}>{item.comments_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MyTrabzon</Text>
      </View>

      {renderDistrictFilter()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedList}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz gönderi yok</Text>
              <Text style={styles.emptySubtext}>
                İlk paylaşımı yapan sen ol!
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-post')}
      >
        <Plus size={28} color={COLORS.white} />
      </TouchableOpacity>
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
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginHorizontal: SPACING.xs,
    gap: SPACING.xs,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterEmoji: {
    fontSize: FONT_SIZES.sm,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  feedList: {
    paddingVertical: SPACING.sm,
  },
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: 12,
    overflow: 'hidden' as const,
  },
  postHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  postMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 2,
  },
  postDistrict: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  postActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
  fab: {
    position: 'absolute' as const,
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
