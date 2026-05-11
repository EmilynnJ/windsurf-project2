import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { users, transactions } from '@soulseer/shared/schema';
export class BillingService {
    /**
     * Calculates revenue split: 60% to reader, 40% to platform
     * All money is integers in cents
     */
    static calculateSplit(amount) {
        const readerShare = Math.floor(amount * 0.60);
        const platformShare = amount - readerShare; // Always calculate this way, never hardcode 0.40
        return { readerShare, platformShare };
    }
    /**
     * Processes payment for a completed reading with 60/40 revenue split
     */
    static async processReadingPayment(readingId, clientId, readerId, amount) {
        return db.transaction(async (tx) => {
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
            // Calculate 60/40 split
            const { readerShare, platformShare } = this.calculateSplit(amount);
            // Update client balance (deduct full amount)
            const clientNewBalance = client.accountBalance - amount;
            await tx
                .update(users)
                .set({ accountBalance: clientNewBalance })
                .where(eq(users.id, clientId));
            // Update reader balance (add 60% share)
            const readerNewBalance = reader.accountBalance + readerShare;
            await tx
                .update(users)
                .set({ accountBalance: readerNewBalance })
                .where(eq(users.id, readerId));
            // Record client transaction
            await tx.insert(transactions).values({
                userId: clientId,
                type: 'reading_charge',
                amount: -amount,
                balanceBefore: client.accountBalance,
                balanceAfter: clientNewBalance,
                readingId,
                note: `Reading payment to reader ${readerId}`,
            });
            // Record reader transaction (60% share)
            await tx.insert(transactions).values({
                userId: readerId,
                type: 'reading_charge',
                amount: readerShare,
                balanceBefore: reader.accountBalance,
                balanceAfter: readerNewBalance,
                readingId,
                note: `Reading payment from client ${clientId} (60% split)`,
            });
            // Platform share (40%) is implicitly tracked as the difference
            // between total charged and reader share — no separate transaction needed
            return {
                readerShare,
                platformShare,
                clientBalanceBefore: client.accountBalance,
                clientBalanceAfter: clientNewBalance,
                readerBalanceBefore: reader.accountBalance,
                readerBalanceAfter: readerNewBalance,
            };
        });
    }
    /**
     * Processes a billing tick during an active reading session
     * Charges client and distributes 60/40 split
     */
    static async processBillingTick(readingId, clientId, readerId, amount) {
        return this.processReadingPayment(readingId, clientId, readerId, amount);
    }
    /**
     * Finalizes session billing and closes the transaction
     * Ensures 60/40 split is applied correctly
     */
    static async finalizeSessionBilling(readingId, clientId, readerId, totalAmount) {
        return this.processReadingPayment(readingId, clientId, readerId, totalAmount);
    }
}
