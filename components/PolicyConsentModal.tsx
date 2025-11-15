import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { Check, X } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

interface PolicyConsentModalProps {
  visible: boolean;
  policies: {
    id: string;
    title: string;
    content: string;
    policy_type: string;
  }[];
  onAccept: () => void;
  onReject: () => void;
  required?: boolean; // Zorunlu mu? (true ise reddetme seçeneği yok)
}

export function PolicyConsentModal({
  visible,
  policies,
  onAccept,
  onReject,
  required = true,
}: PolicyConsentModalProps) {
  const [acceptedPolicies, setAcceptedPolicies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const consentMutation = (trpc as any).user.consentToPolicies.useMutation();

  const handleTogglePolicy = (policyId: string) => {
    const newAccepted = new Set(acceptedPolicies);
    if (newAccepted.has(policyId)) {
      newAccepted.delete(policyId);
    } else {
      newAccepted.add(policyId);
    }
    setAcceptedPolicies(newAccepted);
  };

  const handleAccept = async () => {
    if (acceptedPolicies.size !== policies.length) {
      return; // Tüm politikalar onaylanmalı
    }

    setLoading(true);
    try {
      await consentMutation.mutateAsync({
        policyIds: Array.from(acceptedPolicies),
      });
      onAccept();
    } catch (error) {
      console.error('Error accepting policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const allAccepted = acceptedPolicies.size === policies.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={required ? undefined : onReject}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Kullanım Şartları ve Politikalar</Text>
            {!required && (
              <TouchableOpacity onPress={onReject} style={styles.closeButton}>
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              MyTrabzon&apos;u kullanmaya devam etmek için aşağıdaki politikaları kabul etmeniz gerekmektedir.
            </Text>

            {policies.map((policy) => {
              const isAccepted = acceptedPolicies.has(policy.id);
              return (
                <View key={policy.id} style={styles.policyCard}>
                  <TouchableOpacity
                    style={styles.policyHeader}
                    onPress={() => handleTogglePolicy(policy.id)}
                  >
                    <View style={[styles.checkbox, isAccepted && styles.checkboxChecked]}>
                      {isAccepted && <Check size={16} color={COLORS.white} />}
                    </View>
                    <Text style={styles.policyTitle}>{policy.title}</Text>
                  </TouchableOpacity>
                  <ScrollView
                    style={styles.policyContent}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.policyText}>{policy.content}</Text>
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            {!required && (
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={onReject}
                disabled={loading}
              >
                <Text style={styles.rejectButtonText}>Reddet</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.acceptButton,
                (!allAccepted || loading) && styles.buttonDisabled,
              ]}
              onPress={handleAccept}
              disabled={!allAccepted || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.acceptButtonText}>Kabul Et ve Devam Et</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  policyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  policyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  policyContent: {
    maxHeight: 200,
    padding: SPACING.md,
  },
  policyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
  },
  rejectButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

