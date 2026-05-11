import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/db';
import { messages, users, transactions } from '@soulseer/shared/schema';
import { eq, and, or, desc, asc, sql } from 'drizzle-orm';
import { authMiddleware, authenticateToken } from '../middleware/auth';
import { messagingRateLimitMiddleware } from '../middleware/rate-limit';
const router = Router();
// Zod schemas for validation
const sendMessageSchema = z.object({
    receiverId: z.number(),
    content: z.string().min(1).max(5000),
    isPaid: z.boolean().optional().default(false),
    price: z.number().min(0).optional(),
    parentMessageId: z.number().optional(),
});
const unlockMessageSchema = z.object({
    messageId: z.number(),
});
const updateMessageReadStatusSchema = z.object({
    messageId: z.number(),
    isRead: z.boolean(),
});
const setReplyPricingSchema = z.object({
    price: z.number().min(0),
});
// Send a message
router.post('/send', authMiddleware, messagingRateLimitMiddleware, async (req, res) => {
    try {
        const { receiverId, content, isPaid, price, parentMessageId } = sendMessageSchema.parse(req.body);
        const senderId = req.user.id;
        // Check if sender and receiver exist
        const [sender, receiver] = await Promise.all([
            db.select().from(users).where(eq(users.id, senderId)).limit(1),
            db.select().from(users).where(eq(users.id, receiverId)).limit(1),
        ]);
        if (!sender.length) {
            return res.status(404).json({ error: 'Sender not found' });
        }
        if (!receiver.length) {
            return res.status(404).json({ error: 'Receiver not found' });
        }
        // If parentMessageId is provided, validate it
        let parentMessage = null;
        if (parentMessageId) {
            [parentMessage] = await db
                .select()
                .from(messages)
                .where(eq(messages.id, parentMessageId))
                .limit(1);
            if (!parentMessage) {
                return res.status(404).json({ error: 'Parent message not found' });
            }
            // Verify the parent message is part of the conversation between these users
            const isValidParent = (parentMessage.senderId === senderId && parentMessage.receiverId === receiverId) ||
                (parentMessage.senderId === receiverId && parentMessage.receiverId === senderId);
            if (!isValidParent) {
                return res.status(400).json({ error: 'Parent message is not part of this conversation' });
            }
        }
        // If it's a paid message, validate price
        if (isPaid) {
            if (!price || price <= 0) {
                return res.status(400).json({ error: 'Price must be greater than 0 for paid messages' });
            }
        }
        // Wrap the entire operation in a transaction for atomicity
        const newMessage = await db.transaction(async (tx) => {
            // Get sender with row lock for balance check
            const [senderLocked] = await tx
                .select()
                .from(users)
                .where(eq(users.id, senderId))
                .limit(1);
            if (!senderLocked) {
                throw new Error('Sender not found');
            }
            // If it's a paid message, check balance and update atomically
            if (isPaid) {
                if (senderLocked.accountBalance < price) {
                    throw new Error('Insufficient balance for paid message');
                }
                // Calculate platform fee
                const platformFeeRate = 0.1; // 10% platform fee
                const platformFee = Math.floor(price * platformFeeRate);
                const readerAmount = price - platformFee;
                // Deduct from sender's balance atomically
                await tx
                    .update(users)
                    .set({ accountBalance: sql `${users.accountBalance} - ${price}` })
                    .where(eq(users.id, senderId));
                // Add to receiver's balance atomically
                await tx
                    .update(users)
                    .set({ accountBalance: sql `${users.accountBalance} + ${readerAmount}` })
                    .where(eq(users.id, receiverId));
                // Get updated balances for transaction records
                const [senderUpdated] = await tx
                    .select({ accountBalance: users.accountBalance })
                    .from(users)
                    .where(eq(users.id, senderId))
                    .limit(1);
                const [receiverUpdated] = await tx
                    .select({ accountBalance: users.accountBalance })
                    .from(users)
                    .where(eq(users.id, receiverId))
                    .limit(1);
                if (!senderUpdated || !receiverUpdated) {
                    throw new Error('Failed to retrieve updated balances');
                }
            }
            // Create the message
            const insertedMessages = await tx
                .insert(messages)
                .values({
                senderId,
                receiverId,
                parentMessageId,
                content,
                isPaid: !!isPaid,
                price: isPaid ? price : null,
                readerAmount: isPaid ? (price - Math.floor(price * 0.1)) : null,
                platformAmount: isPaid ? Math.floor(price * 0.1) : null,
                isUnlocked: !isPaid, // Free messages are unlocked by default
            })
                .returning();
            const msg = insertedMessages[0];
            // If it's a paid message, create transaction records with the message ID
            if (isPaid) {
                const platformFeeRate = 0.1;
                const platformFee = Math.floor(price * platformFeeRate);
                const readerAmount = price - platformFee;
                // Get sender and receiver balances before the update
                const senderBalanceBefore = senderLocked.accountBalance;
                const receiverBalanceBefore = receiver[0].accountBalance;
                await tx.insert(transactions).values([
                    {
                        userId: senderId,
                        type: 'paid_message',
                        amount: -price,
                        balanceBefore: senderBalanceBefore,
                        balanceAfter: senderBalanceBefore - price,
                        messageId: msg.id,
                        note: `Paid message to user ${receiverId}`,
                        createdAt: new Date(),
                    },
                    {
                        userId: receiverId,
                        type: 'paid_message',
                        amount: readerAmount,
                        balanceBefore: receiverBalanceBefore,
                        balanceAfter: receiverBalanceBefore + readerAmount,
                        messageId: msg.id,
                        note: `Paid message from user ${senderId}`,
                        createdAt: new Date(),
                    },
                ]);
            }
            return msg;
        });
        res.status(201).json({ message: 'Message sent successfully', data: newMessage });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request data', details: error.issues });
        }
        if (error instanceof Error && error.message === 'Insufficient balance for paid message') {
            return res.status(400).json({ error: 'Insufficient balance for paid message' });
        }
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get messages for a conversation between two users
router.get('/conversation/:otherUserId', authenticateToken, async (req, res) => {
    try {
        const { otherUserId } = z.object({ otherUserId: z.string().transform(Number) }).parse(req.params);
        const userId = req.user.id;
        // Validate that the other user exists
        const otherUser = await db.select().from(users).where(eq(users.id, otherUserId)).limit(1);
        if (!otherUser.length) {
            return res.status(404).json({ error: 'Other user not found' });
        }
        // Get messages between the two users
        const conversationMessages = await db.select({
            id: messages.id,
            senderId: messages.senderId,
            receiverId: messages.receiverId,
            content: messages.content,
            isPaid: messages.isPaid,
            price: messages.price,
            isUnlocked: messages.isUnlocked,
            createdAt: messages.createdAt,
            readAt: messages.readAt,
            senderInfo: sql `json_build_object('id', ${users.id}, 'username', ${users.username}, 'fullName', ${users.fullName})`.as('sender_info'),
            receiverInfo: sql `json_build_object('id', ${users.id}, 'username', ${users.username}, 'fullName', ${users.fullName})`.as('receiver_info'),
        })
            .from(messages)
            .leftJoin(users, eq(users.id, messages.senderId))
            .where(and(or(and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)), and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId)))))
            .orderBy(asc(messages.createdAt));
        // Filter content based on unlock status for paid messages
        const filteredMessages = conversationMessages.map(msg => {
            if (msg.isPaid && !msg.isUnlocked && msg.senderId !== userId) {
                return {
                    ...msg,
                    content: '[Content locked - Pay to unlock]',
                };
            }
            return msg;
        });
        res.json({ data: filteredMessages });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request data', details: error.issues });
        }
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user's message inbox (conversations)
router.get('/inbox', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get all unique conversations for the user
        const inboxData = await db
            .select({
            otherUserId: sql `CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`.as('other_user_id'),
            lastMessageContent: messages.content,
            lastMessageIsPaid: messages.isPaid,
            lastMessageIsUnlocked: messages.isUnlocked,
            lastMessageCreatedAt: messages.createdAt,
            unreadCount: sql `COUNT(CASE WHEN ${messages.readAt} IS NULL AND ${messages.senderId} != ${userId} THEN 1 END)`.as('unread_count'),
            otherUserInfo: sql `json_build_object('id', ${users.id}, 'username', ${users.username}, 'fullName', ${users.fullName}, 'role', ${users.role})`.as('other_user_info'),
        })
            .from(messages)
            .leftJoin(users, sql `${users.id} = CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`)
            .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
            .groupBy(sql `CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`, users.id, users.username, users.fullName, users.role)
            .orderBy(desc(messages.createdAt));
        // Process the inbox data to handle locked message content
        const processedInbox = inboxData.map(conversation => {
            // If the last message is paid and not unlocked by current user, hide content
            if (conversation.lastMessageIsPaid && !conversation.lastMessageIsUnlocked) {
                return {
                    ...conversation,
                    lastMessageContent: '[Content locked - Pay to unlock]',
                };
            }
            return conversation;
        });
        res.json({ data: processedInbox });
    }
    catch (error) {
        console.error('Error fetching inbox:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Unlock a paid message
router.post('/unlock', authenticateToken, async (req, res) => {
    try {
        const { messageId } = unlockMessageSchema.parse(req.body);
        const userId = req.user.id;
        // Get the message
        const [message] = await db
            .select({
            id: messages.id,
            senderId: messages.senderId,
            receiverId: messages.receiverId,
            content: messages.content,
            price: messages.price,
            isPaid: messages.isPaid,
            isUnlocked: messages.isUnlocked,
        })
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Check if the message is paid and locked
        if (!message.isPaid) {
            return res.status(400).json({ error: 'Message is not a paid message' });
        }
        if (message.isUnlocked) {
            return res.status(400).json({ error: 'Message is already unlocked' });
        }
        // Check if the requesting user is the receiver
        if (message.receiverId !== userId) {
            return res.status(403).json({ error: 'Unauthorized to unlock this message' });
        }
        // Check if the receiver has sufficient balance
        const [receiver] = await db
            .select({ accountBalance: users.accountBalance })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        if (!receiver) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (receiver.accountBalance < message.price) {
            return res.status(400).json({ error: 'Insufficient balance to unlock message' });
        }
        // Deduct the price from receiver's balance
        await db.update(users).set({
            accountBalance: sql `${users.accountBalance} - ${message.price}`
        }).where(eq(users.id, userId));
        // Add the amount to sender's balance (after platform fee deduction)
        const platformFeeRate = 0.1; // 10% platform fee
        const platformFee = Math.floor(message.price * platformFeeRate);
        const readerAmount = message.price - platformFee;
        await db.update(users).set({
            accountBalance: sql `${users.accountBalance} + ${readerAmount}`
        }).where(eq(users.id, message.senderId));
        // Update the message to unlocked
        await db.update(messages).set({
            isUnlocked: true,
            unlockedAt: new Date(),
        }).where(eq(messages.id, messageId));
        // Record the transaction
        await db.insert(transactions).values({
            userId: userId,
            type: 'paid_message',
            amount: -message.price,
            balanceBefore: receiver.accountBalance,
            balanceAfter: receiver.accountBalance - message.price,
            messageId: message.id,
            note: `Unlock paid message from user ${message.senderId}`,
            createdAt: new Date(),
        });
        await db.insert(transactions).values({
            userId: message.senderId,
            type: 'paid_message',
            amount: readerAmount,
            balanceBefore: sql `(SELECT account_balance FROM users WHERE id = ${message.senderId}) - ${readerAmount}`.mapWith(Number),
            balanceAfter: sql `(SELECT account_balance FROM users WHERE id = ${message.senderId})`.mapWith(Number),
            messageId: message.id,
            note: `Paid message unlock from user ${userId}`,
            createdAt: new Date(),
        });
        res.json({ message: 'Message unlocked successfully', data: { ...message, isUnlocked: true } });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request data', details: error.issues });
        }
        console.error('Error unlocking message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Mark message as read
router.put('/read-status', authenticateToken, async (req, res) => {
    try {
        const { messageId, isRead } = updateMessageReadStatusSchema.parse(req.body);
        const userId = req.user.id;
        // Get the message to verify ownership
        const [message] = await db
            .select({ receiverId: messages.receiverId })
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Check if the requesting user is the receiver
        if (message.receiverId !== userId) {
            return res.status(403).json({ error: 'Unauthorized to update read status for this message' });
        }
        // Update read status
        await db.update(messages).set({
            readAt: isRead ? new Date() : null,
        }).where(eq(messages.id, messageId));
        res.json({ message: 'Read status updated successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request data', details: error.issues });
        }
        console.error('Error updating read status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get unread message count
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const unreadCountResult = await db
            .select({ count: sql `count(*)` })
            .from(messages)
            .where(and(eq(messages.receiverId, userId), sql `${messages.readAt} IS NULL`));
        const unreadCount = unreadCountResult[0]?.count || 0;
        res.json({ data: { unreadCount } });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Set reply pricing for readers
router.post('/set-reply-pricing', authenticateToken, async (req, res) => {
    try {
        const { price } = setReplyPricingSchema.parse(req.body);
        const userId = req.user.id;
        // Check if user is a reader
        const [user] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.role !== 'reader') {
            return res.status(403).json({ error: 'Only readers can set reply pricing' });
        }
        // Update the user's chat pricing
        await db.update(users).set({
            pricingChat: price,
        }).where(eq(users.id, userId));
        res.json({ message: 'Reply pricing updated successfully', data: { price } });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request data', details: error.issues });
        }
        console.error('Error setting reply pricing:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
