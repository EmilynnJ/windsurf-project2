/**
 * Agora RTMP Converter wrapper.
 *
 * The Agora RTMP Converter REST API takes an RTC channel and pushes it
 * to an external RTMP destination (YouTube, Twitch, Facebook Live, etc.).
 * Per the build guide live streaming is a phase-2 feature, so this module
 * is intentionally minimal: a `start` that creates a converter, a `stop`
 * that tears it down, and a status check. All routes that use it are
 * admin-or-reader-gated.
 *
 * Required env vars (none of these should be exposed to the client):
 *   AGORA_APP_ID
 *   AGORA_CUSTOMER_ID         — Agora Customer ID for REST auth (Console → Project → Customer ID)
 *   AGORA_CUSTOMER_SECRET     — Agora Customer Secret
 *
 * If any required var is unset, the service is `enabled = false` and
 * every method throws a clearly-named error so callers can degrade.
 */
import { logger } from '../utils/logger';
import { config } from '../config';

const RTMP_BASE = 'https://api.agora.io/v1/projects';

export interface RtmpStartOptions {
  channelName: string;
  /** Destination RTMP URL, e.g. rtmps://live.example.com/app/streamKey */
  rtmpUrl: string;
  /** UID inside the Agora channel that the converter joins as. */
  converterUid: number;
  /** Optional list of stream UIDs to mix; omit to pull the whole channel. */
  streamUids?: number[];
  width?: number;
  height?: number;
  videoBitrate?: number;
  audioBitrate?: number;
}

export interface RtmpStartResult {
  converterId: string;
  createdAt: string;
}

class AgoraRtmpService {
  private get appId(): string {
    return config.agora.appId;
  }
  private get customerId(): string {
    return config.agora.customerId;
  }
  private get customerSecret(): string {
    return config.agora.customerSecret;
  }

  get enabled(): boolean {
    return Boolean(this.appId && this.customerId && this.customerSecret);
  }

  private authHeader(): string {
    const credential = `${this.customerId}:${this.customerSecret}`;
    const encoded = Buffer.from(credential).toString('base64');
    return `Basic ${encoded}`;
  }

  async start(opts: RtmpStartOptions): Promise<RtmpStartResult> {
    if (!this.enabled) {
      throw new Error(
        'Agora RTMP is not configured. Set AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET.',
      );
    }
    const body = {
      converter: {
        name: `soulseer-${opts.channelName}-${Date.now()}`,
        transcodeOptions: {
          rtcChannel: opts.channelName,
          audioOptions: {
            codecProfile: 'HE-AAC',
            sampleRate: 48000,
            bitrate: opts.audioBitrate ?? 128,
            audioChannels: 2,
          },
          videoOptions: {
            canvas: {
              width: opts.width ?? 1280,
              height: opts.height ?? 720,
              color: 0,
            },
            layout: opts.streamUids?.length
              ? opts.streamUids.map((uid, i) => ({
                  uid: String(uid),
                  x_position: 0,
                  y_position: i * 360,
                  width: opts.width ?? 1280,
                  height: 360,
                  alpha: 1.0,
                  render_mode: 1,
                }))
              : [],
            vertical: {
              uid: String(opts.converterUid),
              fillMode: 'fit',
            },
            codec: 'H264',
            codecProfile: 'baseline',
            frameRate: 30,
            gop: 60,
            bitrate: opts.videoBitrate ?? 2000,
            lowLatency: false,
          },
        },
        rtmpUrl: opts.rtmpUrl,
        idleTimeOut: 300,
      },
    };

    const url = `${RTMP_BASE}/${encodeURIComponent(this.appId)}/rtmp-converters`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error(
        { status: res.status, text, channel: opts.channelName },
        'Agora RTMP start failed',
      );
      throw new Error(`Agora RTMP start failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as { converter: { id: string; createTs?: number } };
    if (!data.converter?.id) {
      throw new Error('Agora RTMP response missing converter id');
    }
    logger.info(
      { converterId: data.converter.id, channel: opts.channelName },
      'Agora RTMP converter started',
    );
    return {
      converterId: data.converter.id,
      createdAt: new Date(
        data.converter.createTs ? data.converter.createTs * 1000 : Date.now(),
      ).toISOString(),
    };
  }

  async stop(converterId: string): Promise<boolean> {
    if (!this.enabled) {
      throw new Error(
        'Agora RTMP is not configured. Set AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET.',
      );
    }
    const url = `${RTMP_BASE}/${encodeURIComponent(this.appId)}/rtmp-converters/${encodeURIComponent(
      converterId,
    )}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: this.authHeader() },
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => '');
      logger.error(
        { status: res.status, text, converterId },
        'Agora RTMP stop failed',
      );
      throw new Error(`Agora RTMP stop failed (${res.status}): ${text}`);
    }
    logger.info({ converterId }, 'Agora RTMP converter stopped');
    return true;
  }
}

export const agoraRtmpService = new AgoraRtmpService();
