/**
 * Schema smoke tests -- verify all tables and enums are defined correctly.
 */
import { describe, it, expect } from 'vitest';
import {
  users,
  readings,
  transactions,
  forumPosts,
  forumComments,
  forumFlags,
  userRoleEnum,
  readingTypeEnum,
  readingStatusEnum,
  paymentStatusEnum,
  transactionTypeEnum,
} from '../../src/db/schema';

describe('Database Schema', () => {
  it('exports the users table with expected columns', () => {
    expect(users).toBeDefined();
    // Verify key columns exist
    const cols = Object.keys(users);
    expect(cols).toContain('id');
    expect(cols).toContain('auth0Id');
    expect(cols).toContain('email');
    expect(cols).toContain('role');
    expect(cols).toContain('balance');
    expect(cols).toContain('isOnline');
    expect(cols).toContain('pricingChat');
    expect(cols).toContain('pricingVoice');
    expect(cols).toContain('pricingVideo');
    expect(cols).toContain('stripeAccountId');
    expect(cols).toContain('stripeCustomerId');
  });

  it('exports the readings table with expected columns', () => {
    expect(readings).toBeDefined();
    const cols = Object.keys(readings);
    expect(cols).toContain('id');
    expect(cols).toContain('clientId');
    expect(cols).toContain('readerId');
    expect(cols).toContain('readingType');
    expect(cols).toContain('status');
    expect(cols).toContain('ratePerMinute');
    expect(cols).toContain('totalCharged');
    expect(cols).toContain('paymentStatus');
    expect(cols).toContain('chatTranscript');
    expect(cols).toContain('rating');
    expect(cols).toContain('review');
  });

  it('exports the transactions table with expected columns', () => {
    expect(transactions).toBeDefined();
    const cols = Object.keys(transactions);
    expect(cols).toContain('id');
    expect(cols).toContain('userId');
    expect(cols).toContain('type');
    expect(cols).toContain('amount');
    expect(cols).toContain('balanceBefore');
    expect(cols).toContain('balanceAfter');
  });

  it('exports forum tables', () => {
    expect(forumPosts).toBeDefined();
    expect(forumComments).toBeDefined();
    expect(forumFlags).toBeDefined();
  });

  it('defines the correct user roles enum', () => {
    expect(userRoleEnum).toBeDefined();
    expect(userRoleEnum.enumValues).toEqual(['client', 'reader', 'admin']);
  });

  it('defines the correct reading type enum', () => {
    expect(readingTypeEnum).toBeDefined();
    expect(readingTypeEnum.enumValues).toEqual(['chat', 'voice', 'video']);
  });

  it('defines the correct reading status enum', () => {
    expect(readingStatusEnum).toBeDefined();
    expect(readingStatusEnum.enumValues).toContain('pending');
    expect(readingStatusEnum.enumValues).toContain('in_progress');
    expect(readingStatusEnum.enumValues).toContain('completed');
    expect(readingStatusEnum.enumValues).toContain('cancelled');
  });

  it('defines the correct payment status enum', () => {
    expect(paymentStatusEnum).toBeDefined();
    expect(paymentStatusEnum.enumValues).toEqual(['pending', 'paid', 'refunded']);
  });

  it('defines the correct transaction type enum', () => {
    expect(transactionTypeEnum).toBeDefined();
    expect(transactionTypeEnum.enumValues).toContain('topup');
    expect(transactionTypeEnum.enumValues).toContain('reading_charge');
    expect(transactionTypeEnum.enumValues).toContain('reader_payout');
  });
});
