import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Edit3, Trash2, Eye } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';

export default function AdminPoliciesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    policyType: 'terms' as 'terms' | 'privacy' | 'community' | 'cookie' | 'refund' | 'other',
    displayOrder: 0,
    isActive: true,
  });

  const { data: policies, isLoading, refetch } = trpc.admin.getAllPolicies.useQuery();

  const createPolicyMutation = trpc.admin.createPolicy.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      setFormData({
        title: '',
        content: '',
        policyType: 'terms',
        displayOrder: 0,
        isActive: true,
      });
      Alert.alert('Başarılı', 'Politika oluşturuldu');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const updatePolicyMutation = trpc.admin.updatePolicy.useMutation({
    onSuccess: () => {
      refetch();
      setEditingPolicy(null);
      setShowForm(false);
      setFormData({
        title: '',
        content: '',
        policyType: 'terms',
        displayOrder: 0,
        isActive: true,
      });
      Alert.alert('Başarılı', 'Politika güncellendi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const deletePolicyMutation = trpc.admin.deletePolicy.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Politika silindi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleEdit = (policy: any) => {
    setEditingPolicy(policy);
    setFormData({
      title: policy.title,
      content: policy.content,
      policyType: policy.policy_type,
      displayOrder: policy.display_order,
      isActive: policy.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = (policyId: string, title: string) => {
    Alert.alert(
      'Politikayı Sil',
      `"${title}" politikasını silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deletePolicyMutation.mutate({ policyId });
          },
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (editingPolicy) {
      updatePolicyMutation.mutate({
        policyId: editingPolicy.id,
        ...formData,
      });
    } else {
      createPolicyMutation.mutate(formData);
    }
  };

  const policyTypeLabels: Record<string, string> = {
    terms: 'Kullanım Şartları',
    privacy: 'Gizlilik Politikası',
    community: 'Topluluk Kuralları',
    cookie: 'Çerez Politikası',
    refund: 'İade Politikası',
    other: 'Diğer',
  };

  if (isLoading && !policies) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politika Yönetimi</Text>
        <TouchableOpacity
          onPress={() => {
            setEditingPolicy(null);
            setFormData({
              title: '',
              content: '',
              policyType: 'terms',
              displayOrder: 0,
              isActive: true,
            });
            setShowForm(true);
          }}
          style={styles.addButton}
        >
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {showForm ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.formContent}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingPolicy ? 'Politika Düzenle' : 'Yeni Politika'}</Text>

            <Text style={styles.label}>Başlık</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Politika başlığı"
            />

            <Text style={styles.label}>İçerik</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.content}
              onChangeText={(text) => setFormData({ ...formData, content: text })}
              placeholder="Politika içeriği"
              multiline
              numberOfLines={10}
            />

            <Text style={styles.label}>Tip</Text>
            <View style={styles.typeButtons}>
              {Object.entries(policyTypeLabels).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.typeButton,
                    formData.policyType === key && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, policyType: key as any })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.policyType === key && styles.typeButtonTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Sıra</Text>
            <TextInput
              style={styles.input}
              value={formData.displayOrder.toString()}
              onChangeText={(text) =>
                setFormData({ ...formData, displayOrder: parseInt(text) || 0 })
              }
              keyboardType="numeric"
              placeholder="0"
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowForm(false);
                  setEditingPolicy(null);
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {policies && policies.length > 0 ? (
            policies.map((policy: any) => (
              <View key={policy.id} style={styles.policyCard}>
                <View style={styles.policyHeader}>
                  <View style={styles.policyInfo}>
                    <Text style={styles.policyTitle}>{policy.title}</Text>
                    <Text style={styles.policyType}>
                      {policyTypeLabels[policy.policy_type] || policy.policy_type}
                    </Text>
                    <Text style={styles.policyOrder}>Sıra: {policy.display_order}</Text>
                    {!policy.is_active && (
                      <Text style={styles.inactiveLabel}>Pasif</Text>
                    )}
                  </View>
                  <View style={styles.policyActions}>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => router.push(`/admin/policy-view/${policy.id}` as any)}
                    >
                      <Eye size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => handleEdit(policy)}
                    >
                      <Edit3 size={20} color={COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => handleDelete(policy.id, policy.title)}
                    >
                      <Trash2 size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.policyContent} numberOfLines={3}>
                  {policy.content}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz politika yok</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  policyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  policyInfo: {
    flex: 1,
  },
  policyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  policyType: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  policyOrder: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  inactiveLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  policyActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionIcon: {
    padding: SPACING.xs,
  },
  policyContent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  formContent: {
    padding: SPACING.md,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  typeButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  button: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
});

