/**
 * API Service smoke tests -- verify the API client structure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.env for the API service
vi.stubGlobal('import', { meta: { env: { VITE_API_URL: '' } } });

describe('API Service', () => {
  it('can be imported', async () => {
    const module = await import('../services/api');
    expect(module).toBeDefined();
    expect(module.apiService).toBeDefined();
  });

  it('has standard HTTP methods', async () => {
    const { apiService } = await import('../services/api');
    expect(typeof apiService.get).toBe('function');
    expect(typeof apiService.post).toBe('function');
    expect(typeof apiService.put).toBe('function');
    expect(typeof apiService.patch).toBe('function');
    expect(typeof apiService.delete).toBe('function');
  });

  it('has setAccessToken method', async () => {
    const { apiService } = await import('../services/api');
    expect(typeof apiService.setAccessToken).toBe('function');
  });
});
