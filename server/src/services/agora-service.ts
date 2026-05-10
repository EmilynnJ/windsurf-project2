import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';
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
    if (!channelName || !/^reading_[0-9a-zA-Z_]+$/.test(channelName)) {
      throw new AppError(400, 'Invalid channel name');
    }

    const expiration = config.agora.tokenExpiration;
    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // RtcTokenBuilder.buildTokenWithUid(appId, cert, channel, uid, role, tokenExpire, privilegeExpire)
    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      config.agora.appId,
      config.agora.appCertificate,
      channelName,
      uid,
      rtcRole,
      expiration,
      expiration,
    );

    // RtmTokenBuilder.buildToken(appId, cert, userId, expire)
    const rtmToken = RtmTokenBuilder.buildToken(
      config.agora.appId,
      config.agora.appCertificate,
      String(uid),
      expiration,
    );

    return { rtcToken, rtmToken, channelName, uid, expiration };
  }
}
