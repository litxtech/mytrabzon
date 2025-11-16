/**
 * Görüntülü Görüşme Ekranı
 * Agora SDK ile görüntülü görüşme
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  MessageCircle,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { AgoraCallManager } from '@/lib/agora';

export default function MatchVideoScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');

  const callManagerRef = useRef<AgoraCallManager | null>(null);
  const sessionRef = useRef<any>(null);

  // Session bilgisini al
  const { data: sessionData } = trpc.match.checkMatch.useQuery(
    sessionId ? { session_id: sessionId } : undefined,
    {
      enabled: !!sessionId,
      refetchInterval: 5000,
    }
  );

  const updateSessionMutation = trpc.match.updateSession.useMutation({
    onSuccess: (data: any) => {
      if (data.session.ended_at) {
        // Görüşme bitti
        handleEndCall();
      }
      sessionRef.current = data.session;
    },
  });

  const reportUserMutation = (trpc as any).match.reportUser.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Şikayet kaydedildi');
      setShowReportModal(false);
      handleEndCall();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message);
    },
  });

  useEffect(() => {
    if (sessionData?.matched && sessionData.session) {
      sessionRef.current = sessionData.session;
      initializeCall();
    }
  }, [sessionData]);

  const initializeCall = async () => {
    if (!sessionRef.current || !user) return;

    try {
      setIsLoading(true);
      const manager = AgoraCallManager.getInstance();
      callManagerRef.current = manager;

      await manager.initialize();

      const channelName = sessionRef.current.channel_name;
      const uid = Math.floor(Math.random() * 100000);

      // Agora token al
      let token = '';
      try {
        const tokenResult = await (trpc as any).match.generateAgoraToken.mutate({
          channel_name: channelName,
          uid: uid,
        });
        token = tokenResult.token || '';
      } catch (error) {
        console.error('Token generation error:', error);
        // Token olmadan devam et (test mode)
        token = '';
      }
      
      await manager.joinChannel({
        channelName: channelName,
        uid: uid,
        token: token,
        enableVideo: isVideoEnabled,
        enableAudio: isAudioEnabled,
      });

      setIsConnected(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Call initialization error:', error);
      Alert.alert('Hata', 'Görüntülü görüşme başlatılamadı');
      setIsLoading(false);
      router.back();
    }
  };

  const handleEndCall = async () => {
    if (callManagerRef.current) {
      await callManagerRef.current.endCall();
    }
    if (sessionRef.current) {
      updateSessionMutation.mutate({
        session_id: sessionRef.current.id,
        action: 'end',
      });
    }
    router.back();
  };

  const handleNext = () => {
    if (sessionRef.current) {
      updateSessionMutation.mutate({
        session_id: sessionRef.current.id,
        action: 'next',
      });
    }
    // Next sonrası yeni eşleşme için geri dön
    router.replace('/match');
  };

  const handleToggleVideo = async () => {
    if (callManagerRef.current) {
      await callManagerRef.current.enableVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
      
      if (sessionRef.current) {
        updateSessionMutation.mutate({
          session_id: sessionRef.current.id,
          action: 'toggle_video',
        });
      }
    }
  };

  const handleToggleAudio = async () => {
    if (callManagerRef.current) {
      await callManagerRef.current.muteLocalAudio(isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
      
      if (sessionRef.current) {
        updateSessionMutation.mutate({
          session_id: sessionRef.current.id,
          action: 'toggle_audio',
        });
      }
    }
  };

  const handleSendMessage = () => {
    // Mesaj gönderme (kısa mesajlar için)
    setShowMessageModal(false);
    setMessageText('');
    // TODO: Mesaj gönderme implementasyonu
  };

  const handleReport = () => {
    if (!sessionRef.current || !user) return;

    const otherUser = sessionRef.current.user1_id === user.id
      ? sessionRef.current.user2
      : sessionRef.current.user1;

    reportUserMutation.mutate({
      reported_user_id: otherUser.id,
      match_session_id: sessionRef.current.id,
      reason: reportReason as any,
    });
  };

  if (isLoading || !sessionRef.current) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Görüntülü görüşme başlatılıyor...</Text>
      </View>
    );
  }

  const otherUser = sessionRef.current.user1_id === user?.id
    ? sessionRef.current.user2
    : sessionRef.current.user1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Karşı taraf videosu (ana ekran) */}
      <View style={styles.remoteVideoContainer}>
        {isVideoEnabled && otherUser?.avatar_url ? (
          <Image
            source={{ uri: otherUser.avatar_url }}
            style={styles.remoteVideo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <Text style={styles.placeholderText}>
              {otherUser?.full_name || 'Kullanıcı'}
            </Text>
            {!isVideoEnabled && (
              <Text style={styles.placeholderSubtext}>Kamera kapalı</Text>
            )}
          </View>
        )}
      </View>

      {/* Kendi videosu (küçük pencere) */}
      <View style={styles.localVideoContainer}>
        {isVideoEnabled && profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={styles.localVideo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.localVideoPlaceholder}>
            <Text style={styles.placeholderTextSmall}>Sen</Text>
          </View>
        )}
      </View>

      {/* Kontrol butonları */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, !isVideoEnabled && styles.controlButtonDisabled]}
          onPress={handleToggleVideo}
        >
          {isVideoEnabled ? (
            <Video size={24} color={COLORS.white} />
          ) : (
            <VideoOff size={24} color={COLORS.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isAudioEnabled && styles.controlButtonDisabled]}
          onPress={handleToggleAudio}
        >
          {isAudioEnabled ? (
            <Mic size={24} color={COLORS.white} />
          ) : (
            <MicOff size={24} color={COLORS.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.messageButton]}
          onPress={() => setShowMessageModal(true)}
        >
          <MessageCircle size={24} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.nextButton]}
          onPress={handleNext}
        >
          <ChevronRight size={24} color={COLORS.white} />
          <Text style={styles.nextButtonText}>Geç</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endButton]}
          onPress={handleEndCall}
        >
          <X size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Mesaj Modal */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mesaj Gönder</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Kısa mesaj yaz..."
              placeholderTextColor={COLORS.textLight}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={100}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowMessageModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSend]}
                onPress={handleSendMessage}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.white }]}>
                  Gönder
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Şikayet Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Şikayet Et</Text>
            <Text style={styles.modalSubtitle}>Neden şikayet ediyorsunuz?</Text>
            
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {['inappropriate', 'harassment', 'spam', 'fake', 'other'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reportOption,
                    reportReason === reason && styles.reportOptionSelected,
                  ]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text
                    style={[
                      styles.reportOptionText,
                      reportReason === reason && styles.reportOptionTextSelected,
                    ]}
                  >
                    {reason === 'inappropriate' && 'Uygunsuz İçerik'}
                    {reason === 'harassment' && 'Taciz'}
                    {reason === 'spam' && 'Spam'}
                    {reason === 'fake' && 'Sahte Hesap'}
                    {reason === 'other' && 'Diğer'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSend]}
                onPress={handleReport}
                disabled={!reportReason}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.white }]}>
                  Şikayet Et
                </Text>
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
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
  },
  placeholderText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  placeholderSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    opacity: 0.7,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  localVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '40',
  },
  placeholderTextSmall: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '80',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  controlButtonDisabled: {
    backgroundColor: COLORS.error + '80',
  },
  messageButton: {
    backgroundColor: COLORS.primary + '80',
  },
  nextButton: {
    width: 80,
    backgroundColor: COLORS.warning + '80',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  endButton: {
    backgroundColor: COLORS.error + '80',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    maxHeight: '90%',
    minHeight: 300,
  },
  modalScrollView: {
    maxHeight: 300,
    marginBottom: SPACING.md,
  },
  modalScrollContent: {
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  messageInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 100,
    maxHeight: 200,
    marginBottom: SPACING.md,
    textAlignVertical: 'top' as const,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
  },
  modalButtonSend: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  reportOption: {
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.sm,
  },
  reportOptionSelected: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  reportOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  reportOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

