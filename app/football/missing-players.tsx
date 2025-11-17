import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, MapPin, Clock, MessageCircle, UserPlus } from 'lucide-react-native';

type MissingPlayerPost = {
  id: string;
  city: string;
  district?: string;
  field_name?: string;
  match_time?: string;
  position_needed?: string;
  posted_by_user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  field?: {
    id: string;
    name: string;
    district?: string;
  };
  match?: {
    id: string;
    match_date?: string;
    start_time?: string;
  };
  applications?: Array<{
    id: string;
    message?: string;
    status: string;
    applied_at: string;
    applicant?: {
      id: string;
      full_name?: string;
      avatar_url?: string;
    };
  }>;
};

export default function MissingPlayersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [city, setCity] = useState<'Trabzon' | 'Giresun'>('Trabzon');
  const [searchType, setSearchType] = useState<'all' | 'team' | 'player'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<MissingPlayerPost | null>(null);
  const [message, setMessage] = useState('Ben oynamak istiyorum');

  const { data: response, isLoading, refetch } = (trpc as any).football.getMissingPlayerPosts.useQuery(
    { city, limit: 50, offset: 0 },
    { enabled: !!user }
  );

  const posts = useMemo<MissingPlayerPost[]>(() => response?.posts ?? [], [response]);
  
  // Filtreleme: Takım veya Oyuncu
  const filteredPosts = useMemo(() => {
    if (searchType === 'all') return posts;
    return posts.filter((post) => {
      if (searchType === 'team') {
        // Takım arıyor - missing_players_count > 1 veya team_name var
        return (post.match as any)?.team1_name || (post.match as any)?.team2_name || (post.match as any)?.needed_players > 1;
      } else {
        // Oyuncu arıyor - missing_players_count = 1 veya position_needed var
        return post.position_needed || ((post.match as any)?.needed_players === 1);
      }
    });
  }, [posts, searchType]);

  const applyMutation = (trpc as any).football.applyToMissingPlayerPost.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Rezervasyon isteğin organizatöre iletildi.');
      closeModal();
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'İşlem tamamlanamadı. Lütfen tekrar dene.');
    },
  });

  const openModal = (post: MissingPlayerPost) => {
    setSelectedPost(post);
    setMessage('Ben oynamak istiyorum');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPost(null);
  };

  const submitApplication = () => {
    if (!selectedPost) return;
    applyMutation.mutate({
      post_id: selectedPost.id,
      message: message.trim() || undefined,
    });
  };

  const renderAvatar = (profile?: { full_name?: string; avatar_url?: string }) => {
    if (profile?.avatar_url) {
      return <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />;
    }

    const initials =
      profile?.full_name
        ?.split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';

    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarFallbackText}>{initials}</Text>
      </View>
    );
  };

  const formatDateTime = (match: MissingPlayerPost['match'], fallback?: string) => {
    if (match?.match_date && match?.start_time) {
      const date = new Date(`${match.match_date}T${match.start_time}`);
      return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (fallback) {
      return new Date(fallback).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return 'Tarih bekleniyor';
  };

  const renderApplication = (application: NonNullable<MissingPlayerPost['applications']>[number]) => (
    <View key={application.id} style={styles.commentRow}>
      {renderAvatar(application.applicant)}
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{application.applicant?.full_name || 'Misafir Oyuncu'}</Text>
          <Text style={styles.commentTime}>
            {new Date(application.applied_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {application.message ? (
          <Text style={styles.commentText}>{application.message}</Text>
        ) : (
          <Text style={[styles.commentText, { fontStyle: 'italic' }]}>Rezervasyon isteği gönderildi</Text>
        )}
      </View>
    </View>
  );

  const renderPost = useCallback(({ item }: { item: MissingPlayerPost }) => {
    const match = item.match as any;
    const team1Name = match?.team1_name;
    const team2Name = match?.team2_name;
    const isTeamSearch = team1Name || team2Name || (match?.needed_players && match.needed_players > 1);
    
    return (
      <View style={styles.postCard}>
      <View style={styles.organizerRow}>
        {renderAvatar(item.posted_by_user)}
        <View style={styles.organizerInfo}>
          <Text style={styles.organizerName}>{item.posted_by_user?.full_name || 'Organizatör'}</Text>
          <Text style={styles.organizerMeta}>
            {item.city} • {formatDateTime(item.match, item.match_time)}
          </Text>
        </View>
        {!!item.posted_by_user?.id && (
          <TouchableOpacity onPress={() => router.push(`/profile/${item.posted_by_user!.id}` as any)}>
            <Text style={styles.profileLink}>Profil</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.postMetaRow}>
        <MapPin size={16} color={COLORS.textLight} />
        <Text style={styles.postMetaText}>
          {item.field?.name || item.field_name || 'Halı Saha'} {item.field?.district ? `(${item.field.district})` : ''}
        </Text>
      </View>
      <View style={styles.postMetaRow}>
        <Clock size={16} color={COLORS.textLight} />
        <Text style={styles.postMetaText}>{formatDateTime(item.match, item.match_time)}</Text>
      </View>

      <View style={styles.positionBadge}>
        <Text style={styles.positionBadgeText}>
          {isTeamSearch 
            ? team1Name && team2Name 
              ? `${team1Name} vs ${team2Name} - Rakip Takım Aranıyor`
              : team1Name 
                ? `${team1Name} - Rakip Takım Aranıyor`
                : team2Name
                  ? `${team2Name} - Rakip Takım Aranıyor`
                  : 'Takım Aranıyor'
            : item.position_needed 
              ? item.position_needed.toUpperCase() 
              : 'POZİSYON SERBEST'}
        </Text>
      </View>

      <TouchableOpacity style={styles.joinButton} onPress={() => openModal(item)}>
        <UserPlus size={18} color={COLORS.white} />
        <Text style={styles.joinButtonText}>Katıl / Rezervasyon Yap</Text>
      </TouchableOpacity>

      <View style={styles.commentsSection}>
        <View style={styles.commentsHeader}>
          <MessageCircle size={16} color={COLORS.textLight} />
          <Text style={styles.commentsTitle}>Yorumlar & Rezervasyonlar</Text>
        </View>
        {item.applications && item.applications.length > 0 ? (
          item.applications.slice(0, 3).map(renderApplication)
        ) : (
          <Text style={styles.emptyCommentText}>Henüz yorum yapılmadı.</Text>
        )}
      </View>
    </View>
    );
  }, [router, openModal, renderApplication, formatDateTime]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Eksik Oyuncular',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.filterBar}>
        {(['Trabzon', 'Giresun'] as const).map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.filterChip, city === c && styles.filterChipActive]}
            onPress={() => setCity(c)}
          >
            <Text style={[styles.filterChipText, city === c && styles.filterChipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.filterBar}>
        {(['all', 'team', 'player'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, searchType === type && styles.filterChipActive]}
            onPress={() => setSearchType(type)}
          >
            <Text style={[styles.filterChipText, searchType === type && styles.filterChipTextActive]}>
              {type === 'all' ? 'Tümü' : type === 'team' ? 'Takım Arıyor' : 'Oyuncu Arıyor'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredPosts.length > 0 ? (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bu şehirde aktif ilan bulunmuyor.</Text>
          <Text style={styles.emptySubtext}>Yeni bir maç yayınlandığında burada görünecek.</Text>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rezervasyon Mesajı</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Örn: Ben oynamak istiyorum, pozisyon fark etmez."
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={closeModal} disabled={applyMutation.isPending}>
                <Text style={styles.modalButtonText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, applyMutation.isPending && { opacity: 0.6 }]}
                onPress={submitApplication}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  filterChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  organizerMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  profileLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  postMetaText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  positionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  positionBadgeText: {
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  joinButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  commentsTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  commentRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  commentContent: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentAuthor: {
    fontWeight: '600',
    color: COLORS.text,
  },
  commentTime: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
  },
  commentText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
  },
  emptyCommentText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
   	alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtext: {
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    minHeight: 120,
    textAlignVertical: 'top',
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalSubmitButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalButtonText: {
    fontWeight: '600',
    color: COLORS.text,
  },
});


