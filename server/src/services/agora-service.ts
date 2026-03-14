import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

if (!APP_ID || !APP_CERTIFICATE) {
  console.warn('Agora App ID and Certificate not configured. Agora functionality will be disabled.');
}

export interface AgoraTokenOptions {
  channelName: string;
  uid?: number;
  role?: 'publisher' | 'subscriber';
  privilege?: number;
  expirationTimeInSeconds?: number;
}

export class AgoraService {
  static generateRtcToken(options: AgoraTokenOptions): string {
    if (!APP_ID || !APP_CERTIFICATE) {
      throw new Error('Agora App ID and Certificate not configured');
    }

    const {
      channelName,
      uid = 0,
      role = 'publisher',
      privilege = 1, // kJoinChannelPrivilege
      expirationTimeInSeconds = 3600, // 1 hour default
    } = options;

    // Calculate expiration time
    const expirationTime = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;

    // Generate token based on role
    if (role === 'publisher') {
      return RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        RtcRole.PUBLISHER,
        expirationTime,
        expirationTime
      );
    } else {
      return RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        RtcRole.SUBSCRIBER,
        expirationTime,
        expirationTime
      );
    }
  }

  static generateRtmToken(userId: string, expirationTimeInSeconds: number = 3600): string {
    if (!APP_ID || !APP_CERTIFICATE) {
      throw new Error('Agora App ID and Certificate not configured');
    }

    const expirationTime = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;

    return RtmTokenBuilder.buildToken(
      APP_ID,
      APP_CERTIFICATE,
      userId,
      expirationTime
    );
  }

  static validateConfig(): boolean {
    return !!APP_ID && !!APP_CERTIFICATE;
  }
}