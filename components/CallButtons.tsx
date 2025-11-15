/**
 * Call Buttons Component
 * Sesli ve görüntülü arama butonları
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Phone, Video, PhoneOff } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface CallButtonsProps {
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string;
}

export function CallButtons({ targetUserId, targetUserName, targetUserAvatar }: CallButtonsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCalling, setIsCalling] = useState(false);

  const handleAudioCall = async () => {
    if (!user) {
      Alert.alert('Hata', 'Arama yapmak için giriş yapmalısınız');
      return;
    }

    if (user.id === targetUserId) {
      Alert.alert('Hata', 'Kendinizi arayamazsınız');
      return;
    }

    setIsCalling(true);
    try {
      // Navigate to call screen
      router.push({
        pathname: '/call/[userId]',
        params: {
          userId: targetUserId,
          userName: targetUserName,
          userAvatar: targetUserAvatar || '',
          callType: 'audio',
        },
      } as any);
    } catch (error) {
      console.error('Audio call error:', error);
      Alert.alert('Hata', 'Arama başlatılamadı');
    } finally {
      setIsCalling(false);
    }
  };

  const handleVideoCall = async () => {
    if (!user) {
      Alert.alert('Hata', 'Arama yapmak için giriş yapmalısınız');
      return;
    }

    if (user.id === targetUserId) {
      Alert.alert('Hata', 'Kendinizi arayamazsınız');
      return;
    }

    setIsCalling(true);
    try {
      // Navigate to call screen
      router.push({
        pathname: '/call/[userId]',
        params: {
          userId: targetUserId,
          userName: targetUserName,
          userAvatar: targetUserAvatar || '',
          callType: 'video',
        },
      } as any);
    } catch (error) {
      console.error('Video call error:', error);
      Alert.alert('Hata', 'Arama başlatılamadı');
    } finally {
      setIsCalling(false);
    }
  };

  if (!user || user.id === targetUserId) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.callButton, styles.audioButton]}
        onPress={handleAudioCall}
        disabled={isCalling}
      >
        {isCalling ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Phone size={20} color={COLORS.white} />
            <Text style={styles.buttonText}>Sesli</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.callButton, styles.videoButton]}
        onPress={handleVideoCall}
        disabled={isCalling}
      >
        {isCalling ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Video size={20} color={COLORS.white} />
            <Text style={styles.buttonText}>Görüntülü</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.sm,
    width: '100%',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
    gap: SPACING.xs,
    minHeight: 44, // iOS minimum touch target
  },
  audioButton: {
    backgroundColor: COLORS.primary,
  },
  videoButton: {
    backgroundColor: COLORS.error,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
});

