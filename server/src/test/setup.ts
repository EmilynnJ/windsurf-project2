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
