import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { Check, X, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handleTogglePolicy = (policyId: string) => {
    const newAccepted = new Set(acceptedPolicies);
    if (newAccepted.has(policyId)) {
      newAccepted.delete(policyId);
    } else {
      newAccepted.add(policyId);
    }
    setAcceptedPolicies(newAccepted);
  };

  const handleAccept = () => {
    if (acceptedPolicies.size !== policies.length) {
      return; // Tüm politikalar onaylanmalı
    }

    // onAccept callback'ini çağır, mutation parent component'te yapılacak
    onAccept();
  };

  const allAccepted = acceptedPolicies.size === policies.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={required ? undefined : onReject}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerLeft}>
            <FileText size={24} color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Kullanım Şartları</Text>
          </View>
          {!required && (
            <TouchableOpacity onPress={onReject} style={styles.closeButton}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          <View style={[styles.descriptionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.description, { color: theme.colors.text }]}>
              MyTrabzon&apos;u kullanmaya devam etmek için aşağıdaki politikaları okumanız ve kabul etmeniz gerekmektedir.
            </Text>
          </View>

          {policies.map((policy) => {
            const isAccepted = acceptedPolicies.has(policy.id);
            const isExpanded = expandedPolicy === policy.id;
            
            return (
              <View 
                key={policy.id} 
                style={[
                  styles.policyCard, 
                  { 
                    backgroundColor: theme.colors.card, 
                    borderWidth: isAccepted ? 2 : 1,
                    borderColor: isAccepted ? theme.colors.primary : theme.colors.border,
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.policyHeader}
                  onPress={() => handleTogglePolicy(policy.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox, 
                    { borderColor: theme.colors.border },
                    isAccepted && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}>
                    {isAccepted && <Check size={18} color={COLORS.white} />}
                  </View>
                  <View style={styles.policyTitleContainer}>
                    <Text style={[styles.policyTitle, { color: theme.colors.text }]}>{policy.title}</Text>
                    {isAccepted && (
                      <Text style={[styles.acceptedLabel, { color: theme.colors.primary }]}>✓ Kabul Edildi</Text>
                    )}
                  </View>
                </TouchableOpacity>
                
                {isExpanded && (
                  <View style={styles.policyContentContainer}>
                    <ScrollView
                      style={styles.policyContent}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      <Text style={[styles.policyText, { color: theme.colors.text }]}>{policy.content}</Text>
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.collapseButton}
                      onPress={() => setExpandedPolicy(null)}
                    >
                      <Text style={[styles.collapseButtonText, { color: theme.colors.primary }]}>
                        Kapat
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {!isExpanded && (
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setExpandedPolicy(policy.id)}
                  >
                    <Text style={[styles.expandButtonText, { color: theme.colors.primary }]}>
                      Detayları Görüntüle
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: insets.bottom }]}>
          {!required && (
            <TouchableOpacity
              style={[styles.button, styles.rejectButton, { borderColor: theme.colors.border }]}
              onPress={onReject}
            >
              <Text style={[styles.rejectButtonText, { color: theme.colors.text }]}>Reddet</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              styles.acceptButton,
              { backgroundColor: theme.colors.primary },
              !allAccepted && styles.buttonDisabled,
            ]}
            onPress={handleAccept}
            disabled={!allAccepted}
          >
            <Text style={styles.acceptButtonText}>Kabul Et ve Devam Et</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  descriptionCard: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  description: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  policyCard: {
    borderRadius: 16,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyTitleContainer: {
    flex: 1,
  },
  policyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  acceptedLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  policyContentContainer: {
    maxHeight: SCREEN_HEIGHT * 0.5,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  policyContent: {
    padding: SPACING.md,
  },
  policyText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
  },
  expandButton: {
    padding: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  expandButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  collapseButton: {
    padding: SPACING.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  collapseButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  acceptButton: {
    // backgroundColor set dynamically
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  rejectButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

