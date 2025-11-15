import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Users, MapPin, Clock, Plus, Check } from 'lucide-react-native';

export default function MissingPlayersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [position, setPosition] = useState<string>('');
  const [city, setCity] = useState<'Trabzon' | 'Giresun'>('Trabzon');
  const [fieldId, setFieldId] = useState<string>('');

  // Aktif eksik oyuncu ilanlarını getir
  const { data: missingPosts, isLoading, refetch } = trpc.football.getMissingPlayerPosts.useQuery(
    { city, limit: 50, offset: 0 },
    { enabled: !!user }
  );

  // Saha listesini getir
  const { data: fieldsData } = trpc.football.getFields.useQuery(
    { city, limit: 100 },
    { enabled: !!user }
  );

  const createPostMutation = trpc.football.createMissingPlayerPost.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Eksik oyuncu ilanı oluşturuldu');
      refetch();
      setPosition('');
      setFieldId('');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const applyMutation = trpc.football.applyToMissingPlayerPost.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Başvurunuz gönderildi');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const handleCreatePost = () => {
    if (!position || !fieldId) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    createPostMutation.mutate({
      position: position as any,
      field_id: fieldId,
      match_time: new Date().toISOString(),
    });
  };

  const handleApply = (postId: string) => {
    applyMutation.mutate({ post_id: postId });
  };

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postInfo}>
          <Text style={styles.postPosition}>{item.position}</Text>
          <View style={styles.postMeta}>
            <MapPin size={14} color={COLORS.textLight} />
            <Text style={styles.postField}>{item.field?.name}</Text>
          </View>
          <View style={styles.postMeta}>
            <Clock size={14} color={COLORS.textLight} />
            <Text style={styles.postTime}>
              {new Date(item.match_time).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}{' '}
              {new Date(item.match_time).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Istanbul',
              })}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => handleApply(item.id)}
          disabled={applyMutation.isPending}
        >
          <Check size={16} color={COLORS.white} />
          <Text style={styles.applyButtonText}>Katıl</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.createSection}>
        <Text style={styles.sectionTitle}>Eksik Oyuncu İlanı Oluştur</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Pozisyon</Text>
          <View style={styles.positionButtons}>
            {['Kaleci', 'Defans', 'Orta Saha', 'Forvet'].map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[
                  styles.positionButton,
                  position === pos && styles.positionButtonActive,
                ]}
                onPress={() => setPosition(pos)}
              >
                <Text
                  style={[
                    styles.positionButtonText,
                    position === pos && styles.positionButtonTextActive,
                  ]}
                >
                  {pos}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Şehir</Text>
          <View style={styles.cityButtons}>
            {(['Trabzon', 'Giresun'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cityButton, city === c && styles.cityButtonActive]}
                onPress={() => setCity(c)}
              >
                <Text
                  style={[
                    styles.cityButtonText,
                    city === c && styles.cityButtonTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Saha</Text>
          <FlatList
            data={fieldsData?.fields || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.fieldButton,
                  fieldId === item.id && styles.fieldButtonActive,
                ]}
                onPress={() => setFieldId(item.id)}
              >
                <Text
                  style={[
                    styles.fieldButtonText,
                    fieldId === item.id && styles.fieldButtonTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, createPostMutation.isPending && styles.buttonDisabled]}
          onPress={handleCreatePost}
          disabled={createPostMutation.isPending}
        >
          {createPostMutation.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Plus size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>İlan Oluştur</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Aktif İlanlar</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : missingPosts && missingPosts.length > 0 ? (
          <FlatList
            data={missingPosts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aktif ilan bulunmuyor</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  createSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  positionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  positionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  positionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  positionButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  positionButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  cityButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cityButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cityButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  cityButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  fieldButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  fieldButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  fieldButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  fieldButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  listSection: {
    flex: 1,
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: SPACING.md,
  },
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postInfo: {
    flex: 1,
  },
  postPosition: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  postField: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  applyButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
});

