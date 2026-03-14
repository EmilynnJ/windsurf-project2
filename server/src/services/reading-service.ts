import { eq, and, or, desc, asc } from 'drizzle-orm';
import { db } from '../db/db';
import { readings, users, transactions, transactionTypeEnum } from '@soulseer/shared/schema';
import { AgoraService } from './agora-service';
import { z } from 'zod';
import { GracePeriodService } from './grace-period-service';

// Define Zod schemas for validation
const CreateReadingSchema = z.object({
  readerId: z.number(),
  clientId: z.number(),
  type: z.enum(['chat', 'voice', 'video']),
  pricePerMinute: z.number().int().nonnegative(),
});

const UpdateReadingStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'in_progress', 'completed', 'cancelled']),
});

const AddMessageSchema = z.object({
  senderId: z.number(),
  content: z.string().min(1),
});

// Grace period for disconnections (in seconds)
const GRACE_PERIOD_SECONDS = 30;

export interface CreateReadingData {
  readerId: number;
  clientId: number;
  type: 'chat' | 'voice' | 'video';
  pricePerMinute: number;
}

export interface ReadingSession {
  id: number;
  readerId: number;
  clientId: number;
  type: 'chat' | 'voice' | 'video';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  pricePerMinute: number;
  channelName: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number;
  totalPrice: number;
  paymentStatus: string;
  billedMinutes: number;
  chatTranscript: Array<{
    senderId: number;
    senderName: string;
    content: string;
    timestamp: string;
  }> | null;
}

export class ReadingService {
  /**
   * Creates a new reading request
   */
  static async createReading(data: CreateReadingData): Promise<ReadingSession> {
    // Validate input
    const parsedData = CreateReadingSchema.parse(data);

    // Check if reader exists
    const reader = await db.query.users.findFirst({
      where: eq(users.id, parsedData.readerId),
      columns: { id: true, role: true, pricingChat: true, pricingVoice: true, pricingVideo: true, accountBalance: true },
    });

    if (!reader || reader.role !== 'reader') {
      throw new Error('Invalid reader ID');
    }

    // Check if client exists
    const client = await db.query.users.findFirst({
      where: eq(users.id, parsedData.clientId),
      columns: { id: true, role: true, accountBalance: true },
    });

    if (!client || client.role !== 'client') {
      throw new Error('Invalid client ID');
    }

    // Validate pricing based on reading type
    if (parsedData.type === 'chat' && parsedData.pricePerMinute !== reader.pricingChat) {
      throw new Error(`Incorrect price for chat reading. Expected: ${reader.pricingChat}`);
    }
    if (parsedData.type === 'voice' && parsedData.pricePerMinute !== reader.pricingVoice) {
      throw new Error(`Incorrect price for voice reading. Expected: ${reader.pricingVoice}`);
    }
    if (parsedData.type === 'video' && parsedData.pricePerMinute !== reader.pricingVideo) {
      throw new Error(`Incorrect price for video reading. Expected: ${reader.pricingVideo}`);
    }

    // Check client balance
    const requiredBalance = parsedData.pricePerMinute * 5; // Minimum 5 minutes pre-paid
    if (client.accountBalance < requiredBalance) {
      throw new Error('Insufficient balance for reading');
    }

    // Generate unique channel name for Agora
    const channelName = `reading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the reading record
    const [newReading] = await db
      .insert(readings)
      .values({
        readerId: parsedData.readerId,
        clientId: parsedData.clientId,
        type: parsedData.type,
        status: 'pending',
        pricePerMinute: parsedData.pricePerMinute,
        channelName,
        chatTranscript: [],
      })
      .returning();

    if (!newReading) {
      throw new Error('Failed to create reading');
    }

    return this.mapToReadingSession(newReading);
  }

  /**
   * Accepts a pending reading request
   */
  static async acceptReading(readingId: number, readerId: number): Promise<ReadingSession> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    if (reading.readerId !== readerId) {
      throw new Error('Unauthorized: Only the assigned reader can accept this reading');
    }

    if (reading.status !== 'pending') {
      throw new Error('Reading is not in pending state');
    }

    const updatedReadings = await db
      .update(readings)
      .set({
        status: 'accepted',
      })
      .where(eq(readings.id, readingId))
      .returning();

    const updatedReading = updatedReadings[0];
    if (!updatedReading) {
      throw new Error('Failed to update reading');
    }

    return this.mapToReadingSession(updatedReading);
  }

  /**
   * Starts a reading session
   */
  static async startReading(readingId: number, userId: number): Promise<ReadingSession> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    // Only the client or reader can start the reading
    if (userId !== reading.clientId && userId !== reading.readerId) {
      throw new Error('Unauthorized: Only client or reader can start reading');
    }

    if (reading.status !== 'accepted') {
      throw new Error('Reading must be accepted before starting');
    }

    const updatedReadings = await db
      .update(readings)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
      })
      .where(eq(readings.id, readingId))
      .returning();

    const updatedReading = updatedReadings[0];
    if (!updatedReading) {
      throw new Error('Failed to update reading');
    }

    return this.mapToReadingSession(updatedReading);
  }

  /**
   * Adds a message to a chat reading
   */
  static async addMessage(readingId: number, senderId: number, content: string): Promise<void> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    if (reading.type !== 'chat') {
      throw new Error('Messages can only be added to chat readings');
    }

    if (reading.status !== 'in_progress' && reading.status !== 'completed') {
      throw new Error('Messages can only be added during an active reading');
    }

    // Validate the message
    const parsedMessage = AddMessageSchema.parse({ senderId, content });

    // Get sender info
    const sender = await db.query.users.findFirst({
      where: eq(users.id, senderId),
      columns: { id: true, fullName: true },
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    // Get current transcript
    let currentTranscript = reading.chatTranscript as Array<{
      senderId: number;
      senderName: string;
      content: string;
      timestamp: string;
    }> | null;

    if (!currentTranscript) {
      currentTranscript = [];
    }

    // Add new message
    const newMessage = {
      senderId: parsedMessage.senderId,
      senderName: sender.fullName || `User ${sender.id}`,
      content: parsedMessage.content,
      timestamp: new Date().toISOString(),
    };

    currentTranscript.push(newMessage);

    // Update the reading with the new transcript
    await db
      .update(readings)
      .set({
        chatTranscript: currentTranscript,
      })
      .where(eq(readings.id, readingId));
  }

  /**
   * Ends a reading session and calculates billing
   */
  static async endReading(readingId: number, userId: number): Promise<ReadingSession> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    // Only the client or reader can end the reading
    if (userId !== reading.clientId && userId !== reading.readerId) {
      throw new Error('Unauthorized: Only client or reader can end reading');
    }

    if (reading.status !== 'in_progress') {
      throw new Error('Reading is not in progress');
    }

    // Calculate duration and cost
    const startedAt = reading.startedAt;
    if (!startedAt) {
      throw new Error('Reading has no start time');
    }

    const now = new Date();
    const durationMs = now.getTime() - startedAt.getTime();
    const durationMinutes = Math.max(1, Math.ceil(durationMs / (1000 * 60))); // At least 1 minute
    
    const totalPrice = durationMinutes * reading.pricePerMinute;

    // Update the reading
    const updatedReadings = await db
      .update(readings)
      .set({
        status: 'completed',
        completedAt: now,
        duration: durationMs,
        totalPrice,
        billedMinutes: durationMinutes,
        paymentStatus: 'charged',
      })
      .where(eq(readings.id, readingId))
      .returning();

    const updatedReading = updatedReadings[0];
    if (!updatedReading) {
      throw new Error('Failed to update reading');
    }

    // Process the payment
    await this.processPayment(readingId, reading.clientId, reading.readerId, totalPrice);

    return this.mapToReadingSession(updatedReading);
  }

  /**
   * Cancels a reading request
   */
  static async cancelReading(readingId: number, userId: number): Promise<ReadingSession> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    // Only the client or reader can cancel the reading
    if (userId !== reading.clientId && userId !== reading.readerId) {
      throw new Error('Unauthorized: Only client or reader can cancel reading');
    }

    if (reading.status === 'completed' || reading.status === 'cancelled') {
      throw new Error('Cannot cancel a completed or already cancelled reading');
    }

    const updatedReadings = await db
      .update(readings)
      .set({
        status: 'cancelled',
      })
      .where(eq(readings.id, readingId))
      .returning();

    const updatedReading = updatedReadings[0];
    if (!updatedReading) {
      throw new Error('Failed to update reading');
    }

    return this.mapToReadingSession(updatedReading);
  }

  /**
   * Updates the reading status
   */
  static async updateReadingStatus(readingId: number, status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'): Promise<ReadingSession> {
    const parsedStatus = UpdateReadingStatusSchema.parse({ status });

    const [updatedReading] = await db
      .update(readings)
      .set({
        status: parsedStatus.status,
      })
      .where(eq(readings.id, readingId))
      .returning();

    if (!updatedReading) {
      throw new Error('Failed to update reading status');
    }

    return this.mapToReadingSession(updatedReading);
  }

  /**
   * Processes payment for a completed reading
   */
  static async processPayment(readingId: number, clientId: number, readerId: number, amount: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Get current client and reader balances
      const client = await tx.query.users.findFirst({
        where: eq(users.id, clientId),
        columns: { accountBalance: true },
      });

      const reader = await tx.query.users.findFirst({
        where: eq(users.id, readerId),
        columns: { accountBalance: true },
      });

      if (!client || !reader) {
        throw new Error('Client or reader not found');
      }

      // Check if client has sufficient balance
      if (client.accountBalance < amount) {
        throw new Error('Insufficient balance for payment');
      }

      // Update balances
      await tx
        .update(users)
        .set({ accountBalance: client.accountBalance - amount })
        .where(eq(users.id, clientId));

      await tx
        .update(users)
        .set({ accountBalance: reader.accountBalance + amount })
        .where(eq(users.id, readerId));

      // Record transaction
      await tx.insert(transactions).values({
        userId: clientId,
        type: 'reading_charge',
        amount: -amount, // Negative because it's a charge
        balanceBefore: client.accountBalance,
        balanceAfter: client.accountBalance - amount,
        readingId,
        note: `Reading payment to reader ${readerId}`,
      });

      await tx.insert(transactions).values({
        userId: readerId,
        type: 'reading_charge',
        amount: amount, // Positive because it's income
        balanceBefore: reader.accountBalance,
        balanceAfter: reader.accountBalance + amount,
        readingId,
        note: `Reading payment from client ${clientId}`,
      });
    });
  }

  /**
   * Handles disconnection with grace period
   */
  static async handleDisconnection(readingId: number, userId: number): Promise<void> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    if (reading.status !== 'in_progress') {
      return; // Nothing to do if not in progress
    }

    console.log(`User ${userId} disconnected from reading ${readingId}. Grace period initiated.`);
    
    // Initiate grace period
    await GracePeriodService.initiateGracePeriod(readingId, userId);
  }

  /**
   * Handles reconnection after disconnection
   */
  static async handleReconnection(readingId: number, userId: number): Promise<void> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    if (reading.status !== 'in_progress') {
      return; // Nothing to do if not in progress
    }

    console.log(`User ${userId} reconnected to reading ${readingId}.`);
    
    // Clear the grace period since the user reconnected
    GracePeriodService.clearGracePeriod(readingId);
  }

  /**
   * Gets a reading by ID
   */
  static async getReadingById(readingId: number): Promise<ReadingSession | null> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    return reading ? this.mapToReadingSession(reading) : null;
  }

  /**
   * Gets readings for a user
   */
  static async getUserReadings(userId: number, limit: number = 20, offset: number = 0): Promise<ReadingSession[]> {
    const userReadings = await db.query.readings.findMany({
      where: or(
        eq(readings.clientId, userId),
        eq(readings.readerId, userId)
      ),
      orderBy: [desc(readings.createdAt)],
      limit,
      offset,
    });

    return userReadings.map(this.mapToReadingSession);
  }

  /**
   * Gets readings for a reader
   */
  static async getReaderReadings(readerId: number, status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'): Promise<ReadingSession[]> {
    const userReadings = await db.query.readings.findMany({
      where: status 
        ? and(eq(readings.readerId, readerId), eq(readings.status, status))
        : eq(readings.readerId, readerId),
      orderBy: [desc(readings.createdAt)],
    });

    return userReadings.map(this.mapToReadingSession);
  }

  /**
   * Gets readings for a client
   */
  static async getClientReadings(clientId: number, status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'): Promise<ReadingSession[]> {
    const userReadings = await db.query.readings.findMany({
      where: status 
        ? and(eq(readings.clientId, clientId), eq(readings.status, status))
        : eq(readings.clientId, clientId),
      orderBy: [desc(readings.createdAt)],
    });

    return userReadings.map(this.mapToReadingSession);
  }

  /**
   * Generates an Agora token for a reading session
   */
  static async generateAgoraToken(readingId: number, userId: number, role: 'publisher' | 'subscriber' = 'publisher'): Promise<string> {
    const reading = await db.query.readings.findFirst({
      where: eq(readings.id, readingId),
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    // Verify that the user is part of this reading
    if (userId !== reading.clientId && userId !== reading.readerId) {
      throw new Error('Unauthorized: User is not part of this reading');
    }

    if (!AgoraService.validateConfig()) {
      throw new Error('Agora configuration not set up');
    }

    return AgoraService.generateRtcToken({
      channelName: reading.channelName,
      uid: userId,
      role,
      expirationTimeInSeconds: 3600, // 1 hour
    });
  }

  /**
   * Maps a database reading object to a ReadingSession interface
   */
  private static mapToReadingSession(dbReading: typeof readings.$inferSelect): ReadingSession {
    return {
      id: dbReading.id,
      readerId: dbReading.readerId,
      clientId: dbReading.clientId,
      type: dbReading.type,
      status: dbReading.status,
      pricePerMinute: dbReading.pricePerMinute,
      channelName: dbReading.channelName,
      createdAt: dbReading.createdAt,
      startedAt: dbReading.startedAt,
      completedAt: dbReading.completedAt,
      duration: dbReading.duration,
      totalPrice: dbReading.totalPrice,
      paymentStatus: dbReading.paymentStatus,
      billedMinutes: dbReading.billedMinutes,
      chatTranscript: dbReading.chatTranscript as Array<{
        senderId: number;
        senderName: string;
        content: string;
        timestamp: string;
      }> | null,
    };
  }
}