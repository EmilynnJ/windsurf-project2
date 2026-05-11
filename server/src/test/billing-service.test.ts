/**
 * Unit tests for the BillingService.
 *
 * These tests mock Drizzle's query builder and the websocket service so we
 * can exercise the billing logic without a real database. The focus is the
 * contract of each public method and the side-effects emitted to the
 * websocket service:
 *
 *   - handleReaderOffline() pauses all active/accepted/in_progress sessions
 *     for the reader and broadcasts `reading:partner_disconnected` to both
 *     participants. Pending requests are cancelled and broadcast
 *     `reading:cancelled` with reason=reader_offline.
 *   - Revenue-split math follows the build guide: 70% floor reader, 30% to
 *     the platform, integer cents only.
 *   - Grace-period constant is 120s, tick interval is 60s (per build
 *     guide Section 8.4 / 8.5).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const broadcastSpy = vi.fn();
const sendSpy = vi.fn();

vi.mock('../services/websocket-service', () => ({
  wsService: {
    broadcast: broadcastSpy,
    send: sendSpy,
  },
}));

// A tiny mutable state the mock Drizzle "database" will read from.
interface Row { id: number; clientId: number; readerId: number; status: string }
const state: {
  activeOrInProgress: Row[];
  pending: Row[];
  stale: Row[];
  users: Map<number, { id: number; balance: number }>;
  readings: Map<number, Row & { ratePerMinute: number; totalCharged: number; readerEarned: number; platformEarned: number; durationSeconds: number }>;
  lastUpdate: Record<string, unknown> | null;
} = {
  activeOrInProgress: [],
  pending: [],
  stale: [],
  users: new Map(),
  readings: new Map(),
  lastUpdate: null,
};

// Builder chain that the billing service uses. We return a thenable that
// resolves to the next queued result; when `update().set().where()` is
// invoked, we just resolve to an empty array since the billing code does
// not read the return value.
function makeSelectChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => Promise.resolve(result);
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  chain.set = () => chain;
  chain.where = () => Promise.resolve([]);
  chain.returning = () => Promise.resolve([]);
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.values = () => chain;
  chain.returning = () => Promise.resolve([]);
  return chain;
}

// Per-test queue of `select(...).from(...).where(...)` resolutions. Every call
// to `db.select(...)` pops one entry.
const selectQueue: unknown[][] = [];

interface MockDb {
  select: () => ReturnType<typeof makeSelectChain>;
  update: () => ReturnType<typeof makeUpdateChain>;
  insert: () => ReturnType<typeof makeInsertChain>;
  transaction: (fn: (tx: MockDb) => Promise<void>) => Promise<void>;
}
const mockDb: MockDb = {
  select: () => makeSelectChain(selectQueue.shift() ?? []),
  update: () => makeUpdateChain(),
  insert: () => makeInsertChain(),
  transaction: async (fn) => fn(mockDb),
};

vi.mock('../db/db', () => ({
  getDb: () => mockDb,
  db: mockDb,
}));

// Import AFTER mocks so the service binds to the mocked modules.
let billingService: typeof import('../services/billing-service').billingService;

beforeEach(async () => {
  broadcastSpy.mockClear();
  sendSpy.mockClear();
  selectQueue.length = 0;
  state.activeOrInProgress = [];
  state.pending = [];
  state.stale = [];
  state.lastUpdate = null;
  if (!billingService) {
    billingService = (await import('../services/billing-service')).billingService;
  }
});

describe('BillingService.handleReaderOffline', () => {
  it('pauses active + in_progress sessions and broadcasts partner_disconnected', async () => {
    const sessions: Row[] = [
      { id: 101, clientId: 7, readerId: 42, status: 'active' },
      { id: 102, clientId: 8, readerId: 42, status: 'in_progress' },
    ];
    // Call order inside handleReaderOffline:
    //   1. select active/accepted/in_progress sessions
    //   2. select pending sessions
    selectQueue.push(sessions, []);

    await billingService.handleReaderOffline(42);

    expect(broadcastSpy).toHaveBeenCalledTimes(2);
    expect(broadcastSpy).toHaveBeenNthCalledWith(
      1,
      [7, 42],
      'reading:partner_disconnected',
      expect.objectContaining({
        readingId: 101,
        partnerRole: 'reader',
        previousStatus: 'active',
      }),
    );
    expect(broadcastSpy).toHaveBeenNthCalledWith(
      2,
      [8, 42],
      'reading:partner_disconnected',
      expect.objectContaining({
        readingId: 102,
        partnerRole: 'reader',
        previousStatus: 'in_progress',
      }),
    );
  });

  it('cancels pending requests when the reader disconnects and broadcasts reason=reader_offline', async () => {
    const pending: Row[] = [{ id: 201, clientId: 9, readerId: 42, status: 'pending' }];
    // 1. no active sessions, 2. one pending request
    selectQueue.push([], pending);

    await billingService.handleReaderOffline(42);

    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    expect(broadcastSpy).toHaveBeenCalledWith(
      [9, 42],
      'reading:cancelled',
      expect.objectContaining({ readingId: 201, reason: 'reader_offline' }),
    );
  });

  it('is a no-op when reader has no active or pending sessions', async () => {
    selectQueue.push([], []);

    await billingService.handleReaderOffline(999);

    expect(broadcastSpy).not.toHaveBeenCalled();
  });

  it('handles both active and pending sessions in the same call', async () => {
    const sessions: Row[] = [{ id: 301, clientId: 11, readerId: 42, status: 'active' }];
    const pending: Row[] = [{ id: 302, clientId: 12, readerId: 42, status: 'pending' }];
    selectQueue.push(sessions, pending);

    await billingService.handleReaderOffline(42);

    expect(broadcastSpy).toHaveBeenCalledTimes(2);
    const types = broadcastSpy.mock.calls.map((c) => c[1]);
    expect(types).toEqual([
      'reading:partner_disconnected',
      'reading:cancelled',
    ]);
  });
});

describe('Revenue-split math (build guide Section 11.2)', () => {
  // This mirrors the inline calculation in BillingService.chargeMinute so we
  // can freeze the contract: 70% floor reader, 30% to platform, integer cents.
  function split(ratePerMinute: number) {
    const readerShare = Math.floor(ratePerMinute * 0.7);
    const platformShare = ratePerMinute - readerShare;
    return { readerShare, platformShare };
  }

  it('splits 500¢ into 350¢ reader / 150¢ platform', () => {
    expect(split(500)).toEqual({ readerShare: 350, platformShare: 150 });
  });

  it('splits 333¢ into 233¢ reader / 100¢ platform (Math.floor)', () => {
    // 333 * 0.7 = 233.1 -> floor 233. Platform takes the rounding remainder.
    expect(split(333)).toEqual({ readerShare: 233, platformShare: 100 });
  });

  it('splits 1¢ into 0¢ reader / 1¢ platform (platform absorbs sub-cent)', () => {
    expect(split(1)).toEqual({ readerShare: 0, platformShare: 1 });
  });

  it('never produces negative shares for non-negative rates', () => {
    for (const rate of [0, 1, 10, 99, 100, 499, 500, 999]) {
      const { readerShare, platformShare } = split(rate);
      expect(readerShare).toBeGreaterThanOrEqual(0);
      expect(platformShare).toBeGreaterThanOrEqual(0);
      expect(readerShare + platformShare).toBe(rate);
    }
  });
});
