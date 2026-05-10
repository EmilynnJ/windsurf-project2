<<<<<<< HEAD
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
=======
/**
 * Vitest setup for server tests.
 * Runs before each test file.
 */

// Set test environment variables so config.ts doesn't exit the process
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/soulseer_test';
process.env.AUTH0_DOMAIN = 'test.auth0.com';
process.env.AUTH0_AUDIENCE = 'https://api.soulseer.test';
process.env.AGORA_APP_ID = 'test-agora-app-id';
process.env.AGORA_APP_CERTIFICATE = 'test-agora-cert';
process.env.STRIPE_SECRET_KEY = 'STRIPE_SECRET_KEY_TEST_PLACEHOLDER';
process.env.STRIPE_WEBHOOK_SECRET = 'STRIPE_WEBHOOK_SECRET_TEST_PLACEHOLDER';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '5001';
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
