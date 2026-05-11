import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
// Setup test environment
beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
});
beforeEach(async () => {
    // Clean up test data before each test if needed
});
afterAll(async () => {
    // Cleanup after all tests
});
// Mock external services for testing
vi.mock('stripe', () => {
    return {
        Stripe: vi.fn().mockImplementation(() => ({
            customers: {
                create: vi.fn(),
                retrieve: vi.fn(),
            },
            paymentIntents: {
                create: vi.fn(),
                retrieve: vi.fn(),
            },
            webhooks: {
                constructEvent: vi.fn(),
            },
        })),
    };
});
vi.mock('agora-access-token', () => ({
    RtcTokenBuilder: {
        buildTokenWithUid: vi.fn(() => 'test-rtc-token'),
    },
    RtmTokenBuilder: {
        buildToken: vi.fn(() => 'test-rtm-token'),
    },
}));
// Mock console.log for cleaner test output
const originalLog = console.log;
const originalError = console.error;
beforeAll(() => {
    console.log = vi.fn();
    console.error = vi.fn();
});
afterAll(() => {
    console.log = originalLog;
    console.error = originalError;
});
