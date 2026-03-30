/**
 * Config smoke tests -- verify environment config loads properly.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../config';

describe('Server Config', () => {
  it('loads config from environment variables', () => {
    expect(config).toBeDefined();
    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(5001);
    expect(config.corsOrigin).toBe('http://localhost:3000');
  });

  it('has auth0 configuration', () => {
    expect(config.auth0).toBeDefined();
    expect(config.auth0.domain).toBe('test.auth0.com');
    expect(config.auth0.audience).toBe('https://api.soulseer.test');
    expect(config.auth0.issuerBaseURL).toBe('https://test.auth0.com');
  });

  it('has agora configuration', () => {
    expect(config.agora).toBeDefined();
    expect(config.agora.appId).toBeTruthy();
    expect(config.agora.tokenExpiration).toBe(3600);
  });

  it('has stripe configuration', () => {
    expect(config.stripe).toBeDefined();
    expect(config.stripe.secretKey).toBeTruthy();
    expect(config.stripe.webhookSecret).toBeTruthy();
  });

  it('has database configuration', () => {
    expect(config.database).toBeDefined();
    expect(config.database.url).toBeTruthy();
  });
});
