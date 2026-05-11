import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';
import { db } from '../db/db';
import { readings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { config } from '../config';
/**
 * Production-ready Agora Service for SoulSeer
 * Handles all real-time communication token generation, validation, and session management
 * Implements comprehensive security, error handling, and monitoring
 */
export class AgoraService {
    static TOKEN_CACHE = new Map();
    static ACTIVE_SESSIONS = new Map();
    static TOKEN_EXPIRATION_WARNING_THRESHOLD = 300; // 5 minutes
    static MAX_CONCURRENT_SESSIONS_PER_USER = 3;
    static SESSION_CLEANUP_INTERVAL = 300000; // 5 minutes
    static cleanupInterval;
    static initialized = false;
    /**
     * Initialize the Agora service with cleanup routines
     */
    static async initialize() {
        if (this.initialized)
            return;
        // Validate configuration
        if (!config.agora.appId || !config.agora.appCertificate) {
            logger.error('Agora service initialization failed: missing app ID or certificate');
            throw new Error('Agora service not properly configured');
        }
        // Start session cleanup
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.SESSION_CLEANUP_INTERVAL);
        logger.info('Agora service initialized successfully');
        metrics.increment('agora.service.initialized');
        this.initialized = true;
    }
    /**
     * Generate RTC token for voice/video sessions
     * Implements token caching, rate limiting, and comprehensive validation
     */
    static async generateRtcToken(userId, channelName, role = 'publisher', expirationTimeInSeconds = config.agora.tokenExpiration) {
        this.validateInitialization();
        this.validateChannelName(channelName);
        // Check for active session limit
        await this.checkUserSessionLimit(userId);
        // Check token cache first
        const cacheKey = this.getTokenCacheKey(userId, channelName, role);
        const cachedToken = this.TOKEN_CACHE.get(cacheKey);
        if (cachedToken && cachedToken.expiresAt > Date.now()) {
            const expiresIn = cachedToken.expiresAt - Date.now();
            if (expiresIn < this.TOKEN_EXPIRATION_WARNING_THRESHOLD * 1000) {
                logger.warn(`Using cached Agora token that expires in ${Math.round(expiresIn / 1000)} seconds`);
                metrics.increment('agora.token.cache.hit.near_expiry');
            }
            else {
                metrics.increment('agora.token.cache.hit');
            }
            return {
                rtcToken: cachedToken.token,
                rtmToken: await this.generateRtmToken(userId.toString(), expirationTimeInSeconds)
            };
        }
        // Generate new token
        const expirationTime = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;
        const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
        const rtcToken = RtcTokenBuilder.buildTokenWithUid(config.agora.appId, config.agora.appCertificate, channelName, userId, rtcRole, expirationTime, expirationTime);
        const rtmToken = await this.generateRtmToken(userId.toString(), expirationTimeInSeconds);
        // Cache the token
        this.TOKEN_CACHE.set(cacheKey, {
            token: rtcToken,
            expiresAt: Date.now() + (expirationTimeInSeconds * 1000)
        });
        // Track active session
        await this.trackActiveSession(channelName, userId);
        logger.info(`Generated Agora RTC token for user ${userId} on channel ${channelName}`);
        metrics.increment('agora.token.generated');
        metrics.histogram('agora.token.expiration', expirationTimeInSeconds);
        return { rtcToken, rtmToken };
    }
    /**
     * Generate RTM token for chat and signaling
     */
    static async generateRtmToken(userId, expirationTimeInSeconds = config.agora.tokenExpiration) {
        this.validateInitialization();
        const expirationTime = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;
        const token = RtmTokenBuilder.buildToken(config.agora.appId, config.agora.appCertificate, userId, expirationTime);
        logger.debug(`Generated Agora RTM token for user ${userId}`);
        metrics.increment('agora.rtm_token.generated');
        return token;
    }
    /**
     * Refresh tokens for an ongoing session
     */
    static async refreshTokens(userId, channelName, role = 'publisher') {
        this.validateInitialization();
        // Invalidate old cached token
        const cacheKey = this.getTokenCacheKey(userId, channelName, role);
        this.TOKEN_CACHE.delete(cacheKey);
        logger.info(`Refreshing Agora tokens for user ${userId} on channel ${channelName}`);
        metrics.increment('agora.token.refreshed');
        return this.generateRtcToken(userId, channelName, role);
    }
    /**
     * Validate Agora configuration
     */
    static validateConfig() {
        return !!(config.agora.appId && config.agora.appCertificate);
    }
    /**
     * Get active sessions count for a user
     */
    static getUserActiveSessionCount(userId) {
        let count = 0;
        for (const [channelName, session] of this.ACTIVE_SESSIONS) {
            if (session.userIds.has(userId)) {
                count++;
            }
        }
        return count;
    }
    /**
     * Clean up expired sessions
     */
    static cleanupExpiredSessions() {
        const now = Date.now();
        let cleaned = 0;
        for (const [cacheKey, cachedToken] of this.TOKEN_CACHE) {
            if (cachedToken.expiresAt < now) {
                this.TOKEN_CACHE.delete(cacheKey);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.info(`Cleaned up ${cleaned} expired Agora tokens`);
            metrics.increment('agora.token.cache.cleaned', cleaned);
        }
    }
    /**
     * Track active session
     */
    static async trackActiveSession(channelName, userId) {
        if (!this.ACTIVE_SESSIONS.has(channelName)) {
            this.ACTIVE_SESSIONS.set(channelName, { channelName, userIds: new Set() });
        }
        const session = this.ACTIVE_SESSIONS.get(channelName);
        if (session) {
            session.userIds.add(userId);
            // Verify this session exists in database
            try {
                const reading = await db.query.readings.findFirst({
                    where: and(eq(readings.channelName, channelName), eq(readings.status, 'in_progress'))
                });
                if (!reading) {
                    logger.warn(`Active Agora session found for non-existent reading: ${channelName}`);
                    metrics.increment('agora.session.orphaned');
                }
            }
            catch (error) {
                logger.error(`Error verifying session ${channelName} in database: ${error}`);
                metrics.increment('agora.session.verification_error');
            }
        }
    }
    /**
     * Check if user has reached session limit
     */
    static async checkUserSessionLimit(userId) {
        const activeSessions = this.getUserActiveSessionCount(userId);
        if (activeSessions >= this.MAX_CONCURRENT_SESSIONS_PER_USER) {
            logger.warn(`User ${userId} reached maximum concurrent sessions (${this.MAX_CONCURRENT_SESSIONS_PER_USER})`);
            metrics.increment('agora.session.limit_exceeded');
            throw new Error(`Maximum concurrent sessions reached (${this.MAX_CONCURRENT_SESSIONS_PER_USER})`);
        }
    }
    /**
     * Validate channel name format
     */
    static validateChannelName(channelName) {
        if (!channelName || typeof channelName !== 'string') {
            throw new Error('Invalid channel name');
        }
        if (!/^reading_[0-9]+$/.test(channelName)) {
            logger.warn(`Invalid channel name format: ${channelName}`);
            metrics.increment('agora.token.invalid_channel_format');
            throw new Error('Channel name must be in format: reading_[readingId]');
        }
        if (channelName.length > 128) {
            throw new Error('Channel name too long (max 128 characters)');
        }
    }
    /**
     * Validate service initialization
     */
    static validateInitialization() {
        if (!this.initialized) {
            throw new Error('Agora service not initialized. Call AgoraService.initialize() first.');
        }
    }
    /**
     * Get token cache key
     */
    static getTokenCacheKey(userId, channelName, role) {
        return `agora:${userId}:${channelName}:${role}`;
    }
    /**
     * Shutdown the service
     */
    static shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.TOKEN_CACHE.clear();
        this.ACTIVE_SESSIONS.clear();
        this.initialized = false;
        logger.info('Agora service shutdown complete');
    }
    /**
     * Get service metrics
     */
    static getMetrics() {
        return {
            activeSessions: this.ACTIVE_SESSIONS.size,
            tokenCacheSize: this.TOKEN_CACHE.size,
            initialized: this.initialized
        };
    }
}
// Export singleton instance for easier dependency injection
export const agoraService = new (class {
    constructor() {
        AgoraService.initialize().catch(error => {
            logger.error('Failed to initialize Agora service:', error);
        });
    }
    async generateRtcToken(userId, channelName, role) {
        return AgoraService.generateRtcToken(userId, channelName, role);
    }
    async generateRtmToken(userId) {
        return AgoraService.generateRtmToken(userId);
    }
    async refreshTokens(userId, channelName, role) {
        return AgoraService.refreshTokens(userId, channelName, role);
    }
    validateConfig() {
        return AgoraService.validateConfig();
    }
    getMetrics() {
        return AgoraService.getMetrics();
    }
})();
// Graceful shutdown handling
process.on('SIGTERM', () => agoraService.shutdown());
process.on('SIGINT', () => agoraService.shutdown());
