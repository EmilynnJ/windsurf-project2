import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from "agora-token";
import { config } from "../config";
import { logger } from "../utils/logger";

/**
 * Check whether Agora is configured (appId + appCertificate present).
 */
export function isAgoraConfigured(): boolean {
  return Boolean(config.agora.appId && config.agora.appCertificate);
}

/**
 * Generate RTC + RTM tokens for an Agora channel.
 *
 * @param channelName  Channel name (e.g. "reading_12345_abc")
 * @param uid          Internal user ID
 * @returns Object with rtcToken, rtmToken, channelName, uid, expiresIn
 */
export function generateTokens(
  channelName: string,
  uid: number,
): { rtcToken: string; rtmToken: string; channelName: string; uid: number; expiresIn: number } {
  if (!isAgoraConfigured()) {
    throw new Error("Agora is not configured — set AGORA_APP_ID and AGORA_APP_CERTIFICATE");
  }

  const now = Math.floor(Date.now() / 1000);
  const expireTime = now + config.agora.tokenExpiration;

  const rtcToken = RtcTokenBuilder.buildTokenWithUid(
    config.agora.appId,
    config.agora.appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expireTime,
    expireTime,
  );

  const rtmToken = RtmTokenBuilder.buildToken(
    config.agora.appId,
    config.agora.appCertificate,
    String(uid),
    expireTime,
  );

  logger.info({ channelName, uid }, "Generated Agora tokens");

  return {
    rtcToken,
    rtmToken,
    channelName,
    uid,
    expiresIn: config.agora.tokenExpiration,
  };
}
