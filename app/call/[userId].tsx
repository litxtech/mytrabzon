/**
 * Call Screen
 * Agora sesli/görüntülü arama ekranı
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { PhoneOff, Video, VideoOff, Mic, MicOff, Phone } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { AgoraCallManager, generateChannelName } from '@/lib/agora';

export default function CallScreen() {
  const { userId, userName, userAvatar, callType } = useLocalSearchParams<{
    userId: string;
    userName: string;
    userAvatar: string;
    callType: 'audio' | 'video';
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isLoading, setIsLoading] = useState(true);
  const callManagerRef = useRef<AgoraCallManager | null>(null);

  useEffect(() => {
    if (!user || !userId) {
      router.back();
      return;
    }

    const initCall = async () => {
      try {
        setIsLoading(true);
        const manager = AgoraCallManager.getInstance();
        callManagerRef.current = manager;
        
        await manager.initialize();
        
        const channelName = generateChannelName(user.id, userId);
        await manager.joinChannel({
          channelName,
          uid: Math.floor(Math.random() * 100000),
          enableVideo: callType === 'video',
          enableAudio: true,
        });
        
        setIsConnected(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Call initialization error:', error);
        Alert.alert('Hata', 'Arama başlatılamadı');
        router.back();
      }
    };

    initCall();

    return () => {
      if (callManagerRef.current) {
        callManagerRef.current.endCall();
      }
    };
  }, [user, userId, callType, router]);

  const handleEndCall = async () => {
    if (callManagerRef.current) {
      await callManagerRef.current.endCall();
    }
    router.back();
  };

  const handleToggleMute = async () => {
    if (callManagerRef.current) {
      await callManagerRef.current.muteLocalAudio(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const handleToggleVideo = async () => {
    if (callManagerRef.current && callType === 'video') {
      await callManagerRef.current.enableVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Arama başlatılıyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Remote Video/Audio View */}
      <View style={styles.remoteView}>
        {callType === 'video' && isVideoEnabled ? (
          <View style={styles.videoContainer}>
            <Text style={styles.videoPlaceholder}>Video görüntüsü</Text>
            {/* Agora remote video view buraya eklenecek */}
          </View>
        ) : (
          <View style={styles.audioView}>
            <Image
              source={{ uri: userAvatar || 'https://via.placeholder.com/150' }}
              style={styles.avatar}
            />
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.callStatus}>
              {isConnected ? 'Bağlandı' : 'Bağlanıyor...'}
            </Text>
          </View>
        )}
      </View>

      {/* Local Video View (Video call için) */}
      {callType === 'video' && isVideoEnabled && (
        <View style={styles.localView}>
          <View style={styles.localVideoContainer}>
            <Text style={styles.localVideoText}>Siz</Text>
            {/* Agora local video view buraya eklenecek */}
          </View>
        </View>
      )}

      {/* Call Controls */}
      <View style={styles.controls}>
        {callType === 'video' && (
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
        )}

        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonDisabled]}
          onPress={handleToggleMute}
        >
          {isMuted ? (
            <MicOff size={24} color={COLORS.white} />
          ) : (
            <Mic size={24} color={COLORS.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <PhoneOff size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  remoteView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textLight,
  },
  audioView: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  callStatus: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  localView: {
    position: 'absolute',
    top: SPACING.xl,
    right: SPACING.md,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  localVideoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  localVideoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingBottom: SPACING.xl + (Platform.OS === 'ios' ? 20 : 0), // Safe area for iOS
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
    minHeight: 56,
  },
  controlButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  endCallButton: {
    backgroundColor: COLORS.error,
  },
});

