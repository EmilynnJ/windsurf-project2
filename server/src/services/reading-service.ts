import { eq, desc } from "drizzle-orm";
import { readings, users } from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { logger } from "../utils/logger";
import { startBillingTimer, stopBillingTimer } from "./billing-service";
import { generateTokens, isAgoraConfigured } from "./agora-service";

const MIN_BALANCE_CENTS = 500;
const GRACE_PERIOD_SECONDS = 120;
const gracePeriods = new Map<number, NodeJS.Timeout>();

export interface CreateReadingData {
  readerId: number;
  clientId: number;
  type: "chat" | "voice" | "video";
}

export async function createReading(data: CreateReadingData) {
  const db = getDb();
  const readerRows = await db.select().from(users).where(eq(users.id, data.readerId)).limit(1);
  const reader = readerRows[0];
  if (!reader) throw new Error("Reader not found");
  if (reader.role !== "reader") throw new Error("User is not a reader");
  if (!reader.isOnline) throw new Error("Reader is not online");

  let pricePerMinute = 0;
  if (data.type === "chat") pricePerMinute = reader.pricingChat;
  if (data.type === "voice") pricePerMinute = reader.pricingVoice;
  if (data.type === "video") pricePerMinute = reader.pricingVideo;
  if (pricePerMinute <= 0) throw new Error(`Reader does not offer ${data.type} readings`);

  const clientRows = await db.select({ accountBalance: users.accountBalance }).from(users).where(eq(users.id, data.clientId)).limit(1);
  const client = clientRows[0];
  if (!client) throw new Error("Client not found");
  if (client.accountBalance < MIN_BALANCE_CENTS) throw new Error("Insufficient balance — minimum $5.00 required");

  const channelName = `reading_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const inserted = await db.insert(readings).values({ readerId: data.readerId, clientId: data.clientId, type: data.type, status: "pending", pricePerMinute, channelName }).returning();
  logger.info({ readingId: inserted[0]!.id, readerId: data.readerId, clientId: data.clientId, type: data.type }, "Reading request created");
  return inserted[0]!;
}

export async function acceptReading(readingId: number, readerId: number) {
  const db = getDb();
  const rows = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
  const reading = rows[0];
  if (!reading) throw new Error("Reading not found");
  if (reading.readerId !== readerId) throw new Error("Only the assigned reader can accept");
  if (reading.status !== "pending") throw new Error("Reading is not pending");
  const updated = await db.update(readings).set({ status: "accepted" }).where(eq(readings.id, readingId)).returning();
  logger.info({ readingId }, "Reading accepted by reader");
  return updated[0]!;
}

export async function getAgoraToken(readingId: number, userId: number) {
  const db = getDb();
  const rows = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
  const reading = rows[0];
  if (!reading) throw new Error("Reading not found");
  if (userId !== reading.clientId && userId !== reading.readerId) throw new Error("Not a participant of this reading");
  if (!isAgoraConfigured()) throw new Error("Agora is not configured");
  return generateTokens(reading.channelName, userId);
}

export async function startReading(readingId: number, userId: number) {
  const db = getDb();
  const rows = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
  const reading = rows[0];
  if (!reading) throw new Error("Reading not found");
  if (userId !== reading.clientId && userId !== reading.readerId) throw new Error("Not a participant");
  if (reading.status !== "accepted") throw new Error("Reading must be accepted first");
  const updated = await db.update(readings).set({ status: "in_progress", startedAt: new Date() }).where(eq(readings.id, readingId)).returning();
  startBillingTimer(readingId, reading.pricePerMinute, reading.clientId, reading.readerId);
  logger.info({ readingId }, "Reading started — billing timer running");
  return updated[0]!;
}

export async function endReading(readingId: number, userId: number) {
  const db = getDb();
  const rows = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
  const reading = rows[0];
  if (!reading) throw new Error("Reading not found");
  if (userId !== reading.clientId && userId !== reading.readerId) throw new Error("Not a participant");
  if (reading.status !== "in_progress") throw new Error("Reading is not in progress");
  stopBillingTimer(readingId);
  clearGracePeriod(readingId);
  const now = new Date();
  const durationMs = reading.startedAt ? now.getTime() - reading.startedAt.getTime() : 0;
  const updated = await db.update(readings).set({ status: "completed", completedAt: now, duration: durationMs, paymentStatus: "paid" }).where(eq(readings.id, readingId)).returning();
  logger.info({ readingId, durationMs, billedMinutes: updated[0]!.billedMinutes, totalPrice: updated[0]!.totalPrice }, "Reading ended");
  return updated[0]!;
}

export async function rateReading(readingId: number, clientId: number, ratingValue: number, reviewText?: string) {
  const db = getDb();
  const rows = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
  const reading = rows[0];
  if (!reading) throw new Error("Reading not found");
  if (reading.clientId !== clientId) throw new Error("Only the client can rate");
  if (reading.status !== "completed") throw new Error("Can only rate completed readings");
  if (reading.rating !== null) throw new Error("Already rated");
  const updated = await db.update(readings).set({ rating: ratingValue, review: reviewText ?? null }).where(eq(readings.id, readingId)).returning();
  logger.info({ readingId, rating: ratingValue }, "Reading rated");
  return updated[0]!;
}

export async function getClientReadings(clientId: number) {
  const db = getDb();
  return db.select().from(readings).where(eq(readings.clientId, clientId)).orderBy(desc(readings.createdAt));
}

export async function getReaderReadings(readerId: number) {
  const db = getDb();
  return db.select().from(readings).where(eq(readings.readerId, readerId)).orderBy(desc(readings.createdAt));
}

export async function getReadingById(readingId: number) {
  const db = getDb();
  const rows = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
  return rows[0] ?? null;
}

export function initiateGracePeriod(readingId: number, userId: number): void {
  clearGracePeriod(readingId);
  const timer = setTimeout(async () => {
    try {
      gracePeriods.delete(readingId);
      const reading = await getReadingById(readingId);
      if (reading && reading.status === "in_progress") {
        logger.warn({ readingId }, "Grace period expired — ending reading");
        await endReading(readingId, userId);
      }
    } catch (err) {
      logger.error({ err, readingId }, "Error handling grace period expiration");
    }
  }, GRACE_PERIOD_SECONDS * 1000);
  gracePeriods.set(readingId, timer);
}

export function clearGracePeriod(readingId: number): void {
  const timer = gracePeriods.get(readingId);
  if (timer) { clearTimeout(timer); gracePeriods.delete(readingId); }
}

export function cleanupAllTimers(): void {
  for (const timer of gracePeriods.values()) clearTimeout(timer);
  gracePeriods.clear();
}
