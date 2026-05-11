/**
 * API Service — centralized HTTP client for SoulSeer.
 * Handles auth headers, error normalization, and base URL config.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiService {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorMessage = `Request failed (${res.status})`;
      let parseError: unknown = null;
      try {
        const data = await res.json();
        errorMessage = data.message || data.error || errorMessage;
      } catch (err) {
        parseError = err;
      }
      throw new Error(errorMessage, parseError ? { cause: parseError } : undefined);
    }

    // Handle 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json();
  }

  get<T = unknown>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Upload a multipart/form-data body (e.g. file uploads). Do NOT set
   * Content-Type manually — the browser will add the boundary for us.
   */
  async upload<T = unknown>(path: string, formData: FormData, method: string = 'POST'): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errorMessage = `Request failed (${res.status})`;
      let parseError: unknown = null;
      try {
        const data = await res.json();
        errorMessage = data.message || data.error || errorMessage;
      } catch (err) {
        parseError = err;
      }
      throw new Error(errorMessage, parseError ? { cause: parseError } : undefined);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }
}

export const apiService = new ApiService();
