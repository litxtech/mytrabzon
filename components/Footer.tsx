import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, ScrollView } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { X } from 'lucide-react-native';

export function Footer() {
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data: policies } = trpc.admin.getPolicies.useQuery();
  const { data: companyInfo } = trpc.admin.getCompanyInfo.useQuery();

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening link:', err));
  };

  const handlePolicyPress = (policy: any) => {
    setSelectedPolicy(policy);
    setModalVisible(true);
  };

  const handlePhonePress = () => {
    if (companyInfo?.phone) {
      Linking.openURL(`tel:${companyInfo.phone}`).catch(err => console.error('Error opening phone:', err));
    }
  };

  const handleEmailPress = () => {
    if (companyInfo?.email) {
      Linking.openURL(`mailto:${companyInfo.email}`).catch(err => console.error('Error opening email:', err));
    }
  };

  const handleWebsitePress = () => {
    if (companyInfo?.website) {
      Linking.openURL(companyInfo.website).catch(err => console.error('Error opening website:', err));
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

  // Aktif politikaları sırala (display_order'a göre)
  const activePolicies = policies
    ?.filter((p: any) => p.is_active)
    .sort((a: any, b: any) => a.display_order - b.display_order) || [];

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.versionText}>MyTrabzon v1.0</Text>
        <Text style={styles.tagline}>Trabzon&apos;un Dijital Sesi</Text>
        
        <View style={styles.divider} />
        
        {/* Şirket Bilgileri */}
        {companyInfo && (
          <>
            {companyInfo.company_name && (
              <Text style={styles.companyName}>{companyInfo.company_name}</Text>
            )}
            
            {companyInfo.website && (
              <TouchableOpacity onPress={handleWebsitePress}>
                <Text style={styles.websiteLink}>{companyInfo.website}</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.contactContainer}>
              {companyInfo.phone && (
                <TouchableOpacity onPress={handlePhonePress}>
                  <Text style={styles.contactText}>{companyInfo.phone}</Text>
                </TouchableOpacity>
              )}
              {companyInfo.email && (
                <TouchableOpacity onPress={handleEmailPress}>
                  <Text style={styles.contactText}>{companyInfo.email}</Text>
                </TouchableOpacity>
              )}
              {companyInfo.address && (
                <Text style={styles.addressText}>{companyInfo.address}</Text>
              )}
            </View>
          </>
        )}

        {/* Fallback: Eğer company info yoksa eski bilgileri göster */}
        {!companyInfo && (
          <>
            <Text style={styles.developedBy}>Developed by</Text>
            <Text style={styles.companyName}>LITXTECH LLC</Text>
            
            <TouchableOpacity onPress={() => handleLinkPress('https://www.litxtech.com')}>
              <Text style={styles.websiteLink}>www.litxtech.com</Text>
            </TouchableOpacity>
            
            <View style={styles.contactContainer}>
              <TouchableOpacity onPress={() => handleLinkPress('tel:+13072715151')}>
                <Text style={styles.contactText}>+1 307 271 5151</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleLinkPress('mailto:support@litxtech.com')}>
                <Text style={styles.contactText}>support@litxtech.com</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        
        {/* Politikalar */}
        {activePolicies.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.policiesContainer}>
              {activePolicies.map((policy: any, index: number) => (
                <React.Fragment key={policy.id}>
                  <TouchableOpacity onPress={() => handlePolicyPress(policy)}>
                    <Text style={styles.policyLink}>
                      {policyTypeLabels[policy.policy_type] || policy.title}
                    </Text>
                  </TouchableOpacity>
                  {index < activePolicies.length - 1 && <Text style={styles.separator}>•</Text>}
                </React.Fragment>
              ))}
            </View>
          </>
        )}
        
        <Text style={styles.copyright}>© 2025 LITXTECH LLC. Tüm hakları saklıdır.</Text>
      </View>

      {/* Policy Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPolicy ? (policyTypeLabels[selectedPolicy.policy_type] || selectedPolicy.title) : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              {selectedPolicy && (
                <>
                  <Text style={styles.modalPolicyTitle}>{selectedPolicy.title}</Text>
                  <Text style={styles.modalPolicyContent}>{selectedPolicy.content}</Text>
                  <Text style={styles.modalPolicyDate}>
                    Son güncelleme: {new Date(selectedPolicy.updated_at || selectedPolicy.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  versionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  tagline: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  developedBy: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  companyName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  websiteLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
    textDecorationLine: 'underline' as const,
  },
  contactContainer: {
    alignItems: 'center' as const,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  contactText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.secondary,
    textDecorationLine: 'underline' as const,
  },
  linksContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  link: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textDecorationLine: 'underline' as const,
  },
  separator: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  copyright: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    opacity: 0.7,
  },
  addressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center' as const,
  },
  policiesContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  policyLink: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textDecorationLine: 'underline' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
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
  modalPolicyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalPolicyContent: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  modalPolicyDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontStyle: 'italic' as const,
  },
});
