import { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } from 'agora-token';
import { config } from '../config';
import { AppError } from '../middleware/error-handler';

export class AgoraService {
  static generateTokens(
    channelName: string,
    uid: number,
    role: 'publisher' | 'subscriber' = 'publisher',
  ): { rtcToken: string; rtmToken: string; channelName: string; uid: number; expiration: number } {
    if (!config.agora.appId || !config.agora.appCertificate) {
      throw new AppError(500, 'Agora credentials not configured');
    }
    if (!channelName || !channelName.startsWith('reading_')) {
      throw new AppError(400, 'Invalid channel name');
    }

    const expiration = config.agora.tokenExpiration;
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expiration;

    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      config.agora.appId,
      config.agora.appCertificate,
      channelName,
      uid,
      rtcRole,
      privilegeExpireTime,
    );

    const rtmToken = RtmTokenBuilder.buildToken(
      config.agora.appId,
      config.agora.appCertificate,
      String(uid),
      RtmRole.Rtm_User,
      privilegeExpireTime,
    );

    return { rtcToken, rtmToken, channelName, uid, expiration };
  }
}
