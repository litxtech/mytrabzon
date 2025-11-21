import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';

type RideReviewModalProps = {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  reviewedUserName: string;
  onSuccess?: () => void;
};

export function RideReviewModal({
  visible,
  onClose,
  bookingId,
  reviewedUserName,
  onSuccess,
}: RideReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  const createReviewMutation = trpc.ride.createReview.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Değerlendirmeniz kaydedildi!');
      setRating(0);
      setComment('');
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Değerlendirme kaydedilemedi');
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Hata', 'Lütfen bir yıldız seçin');
      return;
    }

    createReviewMutation.mutate({
      booking_id: bookingId,
      rating,
      comment: comment.trim() || null,
    });
  };

  const handleSkip = () => {
    Alert.alert(
      'Değerlendirme Atla',
      'Değerlendirme yapmadan devam etmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Atla',
          onPress: () => {
            setRating(0);
            setComment('');
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Değerlendirme Yap</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.reviewedUserName}>{reviewedUserName} için değerlendirme</Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                onPressIn={() => setHoveredStar(star)}
                onPressOut={() => setHoveredStar(0)}
                style={styles.starButton}
              >
                <Star
                  size={40}
                  color={star <= (hoveredStar || rating) ? COLORS.warning : COLORS.border}
                  fill={star <= (hoveredStar || rating) ? COLORS.warning : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ratingText}>
            {rating === 0
              ? 'Yıldız seçin'
              : rating === 1
              ? 'Çok Kötü'
              : rating === 2
              ? 'Kötü'
              : rating === 3
              ? 'Orta'
              : rating === 4
              ? 'İyi'
              : 'Mükemmel'}
          </Text>

          <TextInput
            style={styles.commentInput}
            placeholder="Yorumunuzu yazın (isteğe bağlı)"
            placeholderTextColor={COLORS.textLight}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.skipButton]}
              onPress={handleSkip}
              disabled={createReviewMutation.isPending}
            >
              <Text style={styles.skipButtonText}>Atla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={createReviewMutation.isPending || rating === 0}
            >
              {createReviewMutation.isPending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  reviewedUserName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  starButton: {
    padding: SPACING.xs,
  },
  ratingText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  commentInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

