/**
 * Unit tests for the Brevo transactional email service.
 *
 * Covers:
 *  - disabled behaviour (no API key) -> no fetch call, returns reason='disabled'
 *  - successful send -> calls the correct Brevo endpoint with correct headers
 *    and body, returns sent=true with the Brevo messageId
 *  - HTTP failure -> returns sent=false with reason='http_<status>' and does
 *    NOT throw
 *  - welcome-email flag (NEWSLETTER_WELCOME_ENABLED=false) -> short-circuits
 *    with reason='welcome_disabled'
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

async function loadServiceWithEnv(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  const mod = await import('../services/brevo-service');
  return mod.brevoService;
}

describe('BrevoService', () => {
  const ORIGINAL_FETCH = globalThis.fetch;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    process.env = { ...ORIGINAL_ENV };
  });

  it('is disabled when BREVO_API_KEY is empty; send() is a no-op', async () => {
    const svc = await loadServiceWithEnv({ BREVO_API_KEY: '' });
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    expect(svc.enabled).toBe(false);
    const result = await svc.send({
      to: { email: 't@example.com' },
      subject: 'Hi',
      htmlContent: '<p>Hi</p>',
    });

    expect(result).toEqual({ sent: false, reason: 'disabled' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts to the Brevo v3 endpoint with correct headers and body', async () => {
    const svc = await loadServiceWithEnv({
      BREVO_API_KEY: 'test-key-xyz',
      BREVO_SENDER_EMAIL: 'noreply@soulseer.test',
      BREVO_SENDER_NAME: 'SoulSeer Test',
    });

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messageId: '<abc@brevo>' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await svc.send({
      to: { email: 'user@example.com', name: 'User' },
      subject: 'Welcome',
      htmlContent: '<p>Hi</p>',
      tags: ['welcome'],
    });

    expect(result).toEqual({ sent: true, messageId: '<abc@brevo>' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['api-key']).toBe('test-key-xyz');
    expect(headers['content-type']).toBe('application/json');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.sender).toEqual({
      email: 'noreply@soulseer.test',
      name: 'SoulSeer Test',
    });
    expect(body.to).toEqual([{ email: 'user@example.com', name: 'User' }]);
    expect(body.subject).toBe('Welcome');
    expect(body.tags).toEqual(['welcome']);
  });

  it('returns sent=false with reason=http_<status> on HTTP error (does not throw)', async () => {
    const svc = await loadServiceWithEnv({ BREVO_API_KEY: 'test-key' });
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response('{"message":"bad"}', { status: 400 }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await svc.send({
      to: { email: 't@example.com' },
      subject: 'x',
      htmlContent: '<p>x</p>',
    });
    expect(result).toEqual({ sent: false, reason: 'http_400' });
  });

  it('short-circuits sendNewsletterWelcome when NEWSLETTER_WELCOME_ENABLED=false', async () => {
    const svc = await loadServiceWithEnv({
      BREVO_API_KEY: 'test-key',
      NEWSLETTER_WELCOME_ENABLED: 'false',
    });
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await svc.sendNewsletterWelcome('a@b.com');
    expect(result).toEqual({ sent: false, reason: 'welcome_disabled' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sendNewsletterWelcome posts a welcome email when enabled', async () => {
    const svc = await loadServiceWithEnv({ BREVO_API_KEY: 'test-key' });
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messageId: '<m1>' }), { status: 201 }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await svc.sendNewsletterWelcome('a@b.com');
    expect(result.sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect((body.to as Array<{ email: string }>)[0]!.email).toBe('a@b.com');
    expect(body.subject).toContain('Welcome');
    expect(body.tags).toContain('newsletter');
  });
});
