import { ReadingService } from './reading-service';
import { db } from '../db/db';
import { readings } from '@soulseer/shared/schema';
import { eq } from 'drizzle-orm';
// Grace period for disconnections (in seconds)
const GRACE_PERIOD_SECONDS = 30;
export class GracePeriodService {
    static activeGracePeriods = new Map();
    /**
     * Initiates a grace period for a reading after disconnection
     */
    static async initiateGracePeriod(readingId, userId) {
        // Clear any existing grace period for this reading
        this.clearGracePeriod(readingId);
        // Create a timeout that will end the reading if no reconnection happens
        const timeoutId = setTimeout(async () => {
            await this.handleGracePeriodExpiration(readingId, userId);
        }, GRACE_PERIOD_SECONDS * 1000);
        // Store the grace period
        this.activeGracePeriods.set(readingId, {
            readingId,
            timeoutId,
            userId,
        });
        console.log(`Grace period initiated for reading ${readingId} for user ${userId} (${GRACE_PERIOD_SECONDS}s)`);
    }
    /**
     * Clears an active grace period (when user reconnects)
     */
    static clearGracePeriod(readingId) {
        const gracePeriod = this.activeGracePeriods.get(readingId);
        if (gracePeriod) {
            clearTimeout(gracePeriod.timeoutId);
            this.activeGracePeriods.delete(readingId);
            console.log(`Grace period cleared for reading ${readingId}`);
        }
    }
    /**
     * Checks if a reading is currently in a grace period
     */
    static isInGracePeriod(readingId) {
        return this.activeGracePeriods.has(readingId);
    }
    /**
     * Handles the expiration of a grace period
     */
    static async handleGracePeriodExpiration(readingId, userId) {
        try {
            // Remove from active grace periods
            this.activeGracePeriods.delete(readingId);
            // Get the current reading status
            const reading = await db.query.readings.findFirst({
                where: eq(readings.id, readingId),
            });
            if (!reading) {
                console.error(`Reading ${readingId} not found for grace period expiration`);
                return;
            }
            // Only end the reading if it's still in progress
            if (reading.status === 'in_progress') {
                console.log(`Grace period expired for reading ${readingId}. Ending reading.`);
                // End the reading (this will calculate billing)
                await ReadingService.endReading(readingId, userId);
            }
            else {
                console.log(`Grace period expired for reading ${readingId}, but status is ${reading.status}. Skipping.`);
            }
        }
        catch (error) {
            console.error(`Error handling grace period expiration for reading ${readingId}:`, error);
        }
    }
    /**
     * Gets the remaining time in grace period for a reading
     */
    static getRemainingGraceTime(readingId) {
        const gracePeriod = this.activeGracePeriods.get(readingId);
        if (!gracePeriod) {
            return null;
        }
        // Calculate remaining time
        const start = Date.now();
        const remaining = Math.max(0, GRACE_PERIOD_SECONDS * 1000 - (Date.now() - start));
        return Math.ceil(remaining / 1000); // Return in seconds
    }
    /**
     * Cleans up all active grace periods (e.g., on shutdown)
     */
    static cleanup() {
        for (const gracePeriod of this.activeGracePeriods.values()) {
            clearTimeout(gracePeriod.timeoutId);
        }
        this.activeGracePeriods.clear();
    }
}
