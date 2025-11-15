/**
 * Agora Video/Audio Call Integration
 * Sesli ve görüntülü arama için Agora SDK wrapper
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Agora SDK import (conditional - native module)
let RtcEngine: any = null;
let RtcSurfaceView: any = null;
let RtcLocalView: any = null;

try {
  // react-native-agora native module
  const AgoraModule = require('react-native-agora');
  RtcEngine = AgoraModule.default;
  RtcSurfaceView = AgoraModule.SurfaceView;
  RtcLocalView = AgoraModule.LocalView;
} catch (error) {
  console.warn('react-native-agora not available, using mock implementation');
}

export const AGORA_APP_ID = Constants.expoConfig?.extra?.agoraAppId || 
  process.env.EXPO_PUBLIC_AGORA_APP_ID || 
  'd1e34b20cd2b4da69418f360039d254d';

export const AGORA_CERTIFICATE = Constants.expoConfig?.extra?.agoraCertificate || 
  process.env.EXPO_PUBLIC_AGORA_CERTIFICATE || 
  'd0c65c85891f40c680764c5cf0523433';

export interface AgoraCallConfig {
  channelName: string;
  uid: number;
  token?: string;
  enableVideo?: boolean;
  enableAudio?: boolean;
}

export class AgoraCallManager {
  private static instance: AgoraCallManager;
  private engine: any = null;
  private isInitialized = false;
  private currentChannel: string | null = null;
  private currentUid: number | null = null;

  static getInstance(): AgoraCallManager {
    if (!AgoraCallManager.instance) {
      AgoraCallManager.instance = new AgoraCallManager();
    }
    return AgoraCallManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      if (!RtcEngine) {
        console.warn('Agora SDK not available - using mock mode');
        this.isInitialized = true;
        return;
      }

      // Agora Engine oluştur
      this.engine = await RtcEngine.create(AGORA_APP_ID);
      
      // Event listener'ları ekle
      this.engine.addListener('JoinChannelSuccess', (channel: string, uid: number, elapsed: number) => {
        console.log('Join channel success:', channel, uid);
      });

      this.engine.addListener('UserJoined', (uid: number, elapsed: number) => {
        console.log('User joined:', uid);
      });

      this.engine.addListener('UserOffline', (uid: number, reason: number) => {
        console.log('User offline:', uid, reason);
      });

      this.engine.addListener('Error', (err: number, msg: string) => {
        console.error('Agora error:', err, msg);
      });

      // Video ve audio enable et
      await this.engine.enableVideo();
      await this.engine.enableAudio();
      
      this.isInitialized = true;
      console.log('Agora initialized successfully');
    } catch (error) {
      console.error('Agora initialization error:', error);
      // Hata durumunda mock mode'a geç
      this.isInitialized = true;
    }
  }

  async joinChannel(config: AgoraCallConfig): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.currentChannel = config.channelName;
    this.currentUid = config.uid;

    if (!this.engine) {
      console.warn('Agora engine not available - mock join');
      return;
    }

    try {
      // Video ve audio ayarları
      if (config.enableVideo !== undefined) {
        await this.engine.enableLocalVideo(config.enableVideo);
      }
      if (config.enableAudio !== undefined) {
        await this.engine.enableLocalAudio(config.enableAudio);
      }

      // Channel'a katıl
      await this.engine.joinChannel(
        config.token || null,
        config.channelName,
        config.uid,
        {
          clientRoleType: 1, // BROADCASTER
        }
      );

      console.log('Joined channel:', config.channelName);
    } catch (error) {
      console.error('Join channel error:', error);
      throw error;
    }
  }

  async leaveChannel(): Promise<void> {
    if (this.engine && this.currentChannel) {
      try {
        await this.engine.leaveChannel();
        console.log('Left channel:', this.currentChannel);
      } catch (error) {
        console.error('Leave channel error:', error);
      }
    }
    this.currentChannel = null;
    this.currentUid = null;
  }

  async enableVideo(enabled: boolean): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.enableLocalVideo(enabled);
        console.log('Video enabled:', enabled);
      } catch (error) {
        console.error('Enable video error:', error);
      }
    }
  }

  async enableAudio(enabled: boolean): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.enableLocalAudio(enabled);
        console.log('Audio enabled:', enabled);
      } catch (error) {
        console.error('Enable audio error:', error);
      }
    }
  }

  async muteLocalAudio(muted: boolean): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.muteLocalAudioStream(muted);
        console.log('Local audio muted:', muted);
      } catch (error) {
        console.error('Mute audio error:', error);
      }
    }
  }

  async switchCamera(): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.switchCamera();
        console.log('Camera switched');
      } catch (error) {
        console.error('Switch camera error:', error);
      }
    }
  }

  async endCall(): Promise<void> {
    await this.leaveChannel();
    
    if (this.engine) {
      try {
        await this.engine.destroy();
        this.engine = null;
        this.isInitialized = false;
        console.log('Agora engine destroyed');
      } catch (error) {
        console.error('Destroy engine error:', error);
      }
    }
  }

  // Remote user video view için
  getRemoteVideoView(uid: number): any {
    if (!RtcSurfaceView) return null;
    return RtcSurfaceView;
  }

  // Local video view için
  getLocalVideoView(): any {
    if (!RtcLocalView) return null;
    return RtcLocalView;
  }
}

// Helper function to generate channel name from user IDs
export function generateChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `call_${sorted[0]}_${sorted[1]}`;
}

// Helper function to generate token (requires backend)
export async function generateAgoraToken(
  channelName: string,
  uid: number
): Promise<string> {
  // This should call your backend to generate Agora token
  // For now, return empty string (works for testing with no token)
  return '';
}
