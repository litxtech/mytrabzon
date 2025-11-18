import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, XCircle, Clock, X } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';

export default function AdminKycScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected' | undefined>(undefined);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data, isLoading, refetch, error } = trpc.admin.getKycRequests.useQuery({
    status: selectedStatus,
    limit: 50,
    offset: 0,
  }, {
    retry: 1,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const approveMutation = trpc.admin.approveKyc.useMutation({
    onSuccess: () => {
      refetch();
      setModalVisible(false);
      Alert.alert('Başarılı', 'KYC başvurusu onaylandı');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const rejectMutation = trpc.admin.rejectKyc.useMutation({
    onSuccess: () => {
      refetch();
      setShowRejectModal(false);
      setRejectingId(null);
      setRejectNotes('');
      setModalVisible(false);
      Alert.alert('Başarılı', 'KYC başvurusu reddedildi');
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

  const handleApprove = (kycId: string) => {
    Alert.alert(
      'Onayla',
      'Bu KYC başvurusunu onaylamak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: () => {
            approveMutation.mutate({ kycId });
          },
        },
      ]
    );
  };

  const handleReject = (kycId: string) => {
    setRejectingId(kycId);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = () => {
    if (!rejectNotes.trim()) {
      Alert.alert('Hata', 'Lütfen red nedeni girin');
      return;
    }
    if (rejectingId) {
      rejectMutation.mutate({ kycId: rejectingId, reviewNotes: rejectNotes });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDocumentByType = (documents: any[], type: string) => {
    return documents?.find((doc: any) => doc.type === type);
  };

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={[styles.loadingText, { color: COLORS.error }]}>Hata: {error.message}</Text>
        <TouchableOpacity
          style={[styles.loadMoreButton, { marginTop: SPACING.md }]}
          onPress={() => refetch()}
        >
          <Text style={styles.loadMoreText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Başvuruları</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterButton, !selectedStatus && styles.filterButtonActive]}
            onPress={() => setSelectedStatus(undefined)}
          >
            <Text style={[styles.filterButtonText, !selectedStatus && styles.filterButtonTextActive]}>Tümü</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedStatus === 'pending' && styles.filterButtonActive]}
            onPress={() => setSelectedStatus('pending')}
          >
            <Clock size={16} color={selectedStatus === 'pending' ? COLORS.white : COLORS.text} />
            <Text style={[styles.filterButtonText, selectedStatus === 'pending' && styles.filterButtonTextActive]}>
              Bekleyen
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedStatus === 'approved' && styles.filterButtonActive]}
            onPress={() => setSelectedStatus('approved')}
          >
            <CheckCircle2 size={16} color={selectedStatus === 'approved' ? COLORS.white : COLORS.success} />
            <Text style={[styles.filterButtonText, selectedStatus === 'approved' && styles.filterButtonTextActive]}>
              Onaylanan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedStatus === 'rejected' && styles.filterButtonActive]}
            onPress={() => setSelectedStatus('rejected')}
          >
            <XCircle size={16} color={selectedStatus === 'rejected' ? COLORS.white : COLORS.error} />
            <Text style={[styles.filterButtonText, selectedStatus === 'rejected' && styles.filterButtonTextActive]}>
              Reddedilen
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {data?.requests && data.requests.length > 0 ? (
          data.requests.map((request: any) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => {
                setSelectedRequest(request);
                setModalVisible(true);
              }}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestUserInfo}>
                  <Image
                    source={{ uri: request.user?.avatar_url || 'https://via.placeholder.com/40' }}
                    style={styles.userAvatar}
                  />
                  <View>
                    <Text style={styles.userName}>{request.user?.full_name || 'İsimsiz'}</Text>
                    <Text style={styles.requestName}>{request.full_name}</Text>
                    <Text style={styles.requestId}>TCKN: {request.national_id}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, getStatusBadgeStyle(request.status)]}>
                  {request.status === 'pending' && <Clock size={14} color={COLORS.warning} />}
                  {request.status === 'approved' && <CheckCircle2 size={14} color={COLORS.success} />}
                  {request.status === 'rejected' && <XCircle size={14} color={COLORS.error} />}
                  <Text style={[styles.statusText, getStatusTextStyle(request.status)]}>
                    {request.status === 'pending' && 'Beklemede'}
                    {request.status === 'approved' && 'Onaylandı'}
                    {request.status === 'rejected' && 'Reddedildi'}
                  </Text>
                </View>
              </View>
              <Text style={styles.requestDate}>{formatDate(request.created_at)}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Başvuru bulunamadı</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>KYC Başvuru Detayı</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Kullanıcı</Text>
                  <Text style={styles.detailValue}>{selectedRequest.user?.full_name || 'İsimsiz'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Ad Soyad</Text>
                  <Text style={styles.detailValue}>{selectedRequest.full_name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>TCKN / Pasaport</Text>
                  <Text style={styles.detailValue}>{selectedRequest.national_id}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Doğum Tarihi</Text>
                  <Text style={styles.detailValue}>
                    {(() => {
                      const date = new Date(selectedRequest.birth_date);
                      const day = date.getDate().toString().padStart(2, '0');
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}.${month}.${year}`;
                    })()}
                  </Text>
                </View>

                {selectedRequest.country && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Ülke / Şehir</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.country} {selectedRequest.city ? `- ${selectedRequest.city}` : ''}
                    </Text>
                  </View>
                )}

                {selectedRequest.email && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>E-posta</Text>
                    <Text style={styles.detailValue}>{selectedRequest.email}</Text>
                  </View>
                )}

                {selectedRequest.verification_code && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Doğrulama Kodu</Text>
                    <Text style={[styles.detailValue, styles.codeValue]}>{selectedRequest.verification_code}</Text>
                  </View>
                )}

                <Text style={styles.documentsTitle}>Belgeler</Text>

                {getDocumentByType(selectedRequest.documents, 'id_front') && (
                  <View style={styles.documentSection}>
                    <Text style={styles.documentLabel}>Kimlik Ön Yüz</Text>
                    <Image
                      source={{ uri: getDocumentByType(selectedRequest.documents, 'id_front')?.file_url }}
                      style={styles.documentImage}
                    />
                  </View>
                )}

                {getDocumentByType(selectedRequest.documents, 'id_back') && (
                  <View style={styles.documentSection}>
                    <Text style={styles.documentLabel}>Kimlik Arka Yüz</Text>
                    <Image
                      source={{ uri: getDocumentByType(selectedRequest.documents, 'id_back')?.file_url }}
                      style={styles.documentImage}
                    />
                  </View>
                )}

                {getDocumentByType(selectedRequest.documents, 'selfie') && (
                  <View style={styles.documentSection}>
                    <Text style={styles.documentLabel}>Selfie</Text>
                    <Image
                      source={{ uri: getDocumentByType(selectedRequest.documents, 'selfie')?.file_url }}
                      style={styles.documentImage}
                    />
                  </View>
                )}

                {getDocumentByType(selectedRequest.documents, 'selfie_with_id') && (
                  <View style={styles.documentSection}>
                    <Text style={styles.documentLabel}>Selfie + Kimlik</Text>
                    <Image
                      source={{ uri: getDocumentByType(selectedRequest.documents, 'selfie_with_id')?.file_url }}
                      style={styles.documentImage}
                    />
                  </View>
                )}

                {selectedRequest.review_notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Admin Notu</Text>
                    <Text style={styles.detailValue}>{selectedRequest.review_notes}</Text>
                  </View>
                )}

                {selectedRequest.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApprove(selectedRequest.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 size={20} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>Onayla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(selectedRequest.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle size={20} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>Reddet</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>Red Nedeni</Text>
            <Text style={styles.rejectModalDescription}>
              Lütfen başvurunun neden reddedildiğini açıklayın. Bu mesaj kullanıcıya gönderilecektir.
            </Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectNotes}
              onChangeText={setRejectNotes}
              placeholder="Örn: Kimlik fotoğrafı okunamıyor, lütfen yeniden yükleyin."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={4}
            />
            <View style={styles.rejectModalButtons}>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectNotes('');
                  setRejectingId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.submitRejectButton]}
                onPress={handleRejectSubmit}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitRejectButtonText}>Reddet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'approved':
      return { backgroundColor: COLORS.success + '20' };
    case 'rejected':
      return { backgroundColor: COLORS.error + '20' };
    default:
      return { backgroundColor: COLORS.warning + '20' };
  }
};

const getStatusTextStyle = (status: string) => {
  switch (status) {
    case 'approved':
      return { color: COLORS.success };
    case 'rejected':
      return { color: COLORS.error };
    default:
      return { color: COLORS.warning };
  }
};

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
  placeholder: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  requestUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  requestName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  requestId: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  requestDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: SPACING.md,
  },
  detailSection: {
    marginBottom: SPACING.md,
  },
  detailLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  codeValue: {
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.sm,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  documentsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  documentSection: {
    marginBottom: SPACING.lg,
  },
  documentLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  documentImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
  },
  rejectModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    margin: SPACING.lg,
  },
  rejectModalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  rejectModalDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  rejectInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  rejectModalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  rejectModalButton: {
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
  submitRejectButton: {
    backgroundColor: COLORS.error,
  },
  submitRejectButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
  },
  loadMoreButton: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

