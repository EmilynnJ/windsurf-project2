// ============================================================
// SoulSeer API Client
// Centralized API service with auth token injection
// ============================================================

import type {
  ReadersResponse,
  ReaderPublic,
  User,
  Reading,
  ReadingWithUsers,
  Transaction,
  ForumPost,
  ForumComment,
  ReviewWithAuthor,
  ForumCategory,
  ReadingType,
} from '../types';

const API_BASE = '/api';

// ============================================================
// Token Management
// ============================================================

let getAccessTokenFn: (() => Promise<string>) | null = null;

/** Called once from useAuth hook to inject the Auth0 token getter */
export function setTokenGetter(fn: () => Promise<string>): void {
  getAccessTokenFn = fn;
}

// ============================================================
// Base Request Helper
// ============================================================

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, params } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth && getAccessTokenFn) {
    try {
      const token = await getAccessTokenFn();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Token fetch failed — will proceed without auth header
      // The server will return 401 and we handle it below
    }
  }

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiRequestError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json() as Promise<T>;
}

export class ApiRequestError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.data = data;
  }
}

// ============================================================
// Auth Endpoints
// ============================================================

export const authApi = {
  /** Sync Auth0 user to our database on first login */
  syncUser(data: { email: string; username: string; fullName: string }) {
    return apiRequest<{ message: string; user: User }>('/auth/sync', {
      method: 'POST',
      body: data,
      auth: true,
    });
  },

  /** Get current authenticated user profile */
  getMe() {
    return apiRequest<User>('/auth/me', { auth: true });
  },
};

// ============================================================
// Reader Endpoints
// ============================================================

export const readersApi = {
  /** Get all readers with optional filters */
  getReaders(filters?: {
    q?: string;
    specialties?: string;
    isOnline?: boolean;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }) {
    return apiRequest<ReadersResponse>('/readers', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  /** Get a single reader by ID */
  getReader(id: number) {
    return apiRequest<ReaderPublic>(`/readers/${id}`);
  },

  /** Update authenticated reader's profile */
  updateProfile(data: Partial<{
    bio: string;
    specialties: string;
    profileImage: string;
    pricingChat: number;
    pricingVoice: number;
    pricingVideo: number;
    isOnline: boolean;
  }>) {
    return apiRequest<{ message: string; reader: ReaderPublic }>('/readers/me', {
      method: 'PUT',
      body: data,
      auth: true,
    });
  },

  /** Toggle reader online status */
  toggleOnline(isOnline: boolean) {
    return apiRequest<{ message: string; reader: Pick<ReaderPublic, 'id' | 'isOnline'> }>(
      '/readers/me/online',
      { method: 'PATCH', body: { isOnline }, auth: true }
    );
  },

  /** Update reader pricing */
  updatePricing(pricing: Partial<{
    pricingChat: number;
    pricingVoice: number;
    pricingVideo: number;
  }>) {
    return apiRequest<{ message: string }>('/readers/me/pricing', {
      method: 'PATCH',
      body: pricing,
      auth: true,
    });
  },
};

// ============================================================
// Reading Endpoints
// ============================================================

export const readingsApi = {
  /** Create a new reading request */
  create(data: { readerId: number; type: ReadingType }) {
    return apiRequest<Reading>('/readings', {
      method: 'POST',
      body: data,
      auth: true,
    });
  },

  /** Get reading by ID */
  getById(id: number) {
    return apiRequest<ReadingWithUsers>(`/readings/${id}`, { auth: true });
  },

  /** Start a reading session */
  start(id: number) {
    return apiRequest<Reading>(`/readings/${id}/start`, { method: 'PATCH', auth: true });
  },

  /** End a reading session */
  end(id: number) {
    return apiRequest<Reading>(`/readings/${id}/end`, { method: 'PATCH', auth: true });
  },

  /** Send a chat message in a reading */
  sendMessage(id: number, content: string) {
    return apiRequest<{ message: string }>(`/readings/${id}/message`, {
      method: 'POST',
      body: { content },
      auth: true,
    });
  },

  /** Get user's reading history */
  getHistory(params?: { limit?: number; offset?: number }) {
    return apiRequest<{ readings: ReadingWithUsers[]; count: number }>('/readings', {
      auth: true,
      params: params as Record<string, string | number | boolean | undefined>,
    });
  },

  /** Get Agora token for reading session */
  getAgoraToken(readingId: number) {
    return apiRequest<{ token: string; channelName: string; uid: number }>(
      `/readings/${readingId}/agora-token`,
      { auth: true }
    );
  },
};

// ============================================================
// Balance / Payment Endpoints
// ============================================================

export const balanceApi = {
  /** Get current balance */
  getBalance() {
    return apiRequest<{ balance: number }>('/balance', { auth: true });
  },

  /** Create Stripe checkout for adding funds */
  createCheckout(amount: number) {
    return apiRequest<{ url: string }>('/payment/create-checkout', {
      method: 'POST',
      body: { amount },
      auth: true,
    });
  },

  /** Get transaction history */
  getTransactions(params?: { limit?: number; offset?: number }) {
    return apiRequest<{ transactions: Transaction[]; count: number }>('/balance/transactions', {
      auth: true,
      params: params as Record<string, string | number | boolean | undefined>,
    });
  },
};

// ============================================================
// User / Admin Endpoints
// ============================================================

export const usersApi = {
  /** Update user profile */
  updateProfile(data: Partial<{
    username: string;
    fullName: string;
    bio: string;
    profileImage: string;
  }>) {
    return apiRequest<{ message: string; user: User }>('/users/me', {
      method: 'PUT',
      body: data,
      auth: true,
    });
  },
};

export const adminApi = {
  /** Get all users (admin only) */
  getUsers(params?: { role?: string; limit?: number; offset?: number }) {
    return apiRequest<{ users: User[]; count: number }>('/admin/users', {
      auth: true,
      params: params as Record<string, string | number | boolean | undefined>,
    });
  },

  /** Update user role (admin only) */
  updateUserRole(userId: number, role: string) {
    return apiRequest<{ message: string }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role },
      auth: true,
    });
  },

  /** Adjust user balance (admin only) */
  adjustBalance(userId: number, amount: number, note: string) {
    return apiRequest<{ message: string }>(`/admin/users/${userId}/balance`, {
      method: 'PATCH',
      body: { amount, note },
      auth: true,
    });
  },

  /** Get all readings (admin only) */
  getReadings(params?: { limit?: number; offset?: number }) {
    return apiRequest<{ readings: ReadingWithUsers[]; count: number }>('/admin/readings', {
      auth: true,
      params: params as Record<string, string | number | boolean | undefined>,
    });
  },

  /** Get all transactions (admin only) */
  getTransactions(params?: { limit?: number; offset?: number }) {
    return apiRequest<{ transactions: Transaction[]; count: number }>('/admin/transactions', {
      auth: true,
      params: params as Record<string, string | number | boolean | undefined>,
    });
  },

  /** Trigger payout for a reader */
  triggerPayout(readerId: number) {
    return apiRequest<{ message: string }>(`/admin/payouts/${readerId}`, {
      method: 'POST',
      auth: true,
    });
  },
};

// ============================================================
// Forum Endpoints
// ============================================================

export const forumApi = {
  /** Get forum posts */
  getPosts(params?: { category?: ForumCategory; limit?: number; offset?: number }) {
    return apiRequest<{ posts: ForumPost[]; count: number; total: number }>('/community/posts', {
      params: params as Record<string, string | number | boolean | undefined>,
    });
  },

  /** Get a single forum post with comments */
  getPost(id: number) {
    return apiRequest<{ post: ForumPost; comments: ForumComment[] }>(`/community/posts/${id}`);
  },

  /** Create a new forum post */
  createPost(data: { title: string; content: string; category: ForumCategory }) {
    return apiRequest<{ post: ForumPost }>('/community/posts', {
      method: 'POST',
      body: data,
      auth: true,
    });
  },

  /** Add a comment to a post */
  createComment(postId: number, data: { content: string; parentCommentId?: number }) {
    return apiRequest<{ comment: ForumComment }>(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: data,
      auth: true,
    });
  },

  /** Delete a post (admin only) */
  deletePost(id: number) {
    return apiRequest<{ message: string }>(`/community/posts/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  },
};

// ============================================================
// Reviews Endpoints
// ============================================================

export const reviewsApi = {
  /** Get reviews for a reader */
  getReaderReviews(readerId: number, params?: { limit?: number; offset?: number }) {
    return apiRequest<{ reviews: ReviewWithAuthor[]; count: number; averageRating: number }>(
      `/readers/${readerId}/reviews`,
      { params: params as Record<string, string | number | boolean | undefined> }
    );
  },

  /** Submit a review for a reading */
  submitReview(readingId: number, data: { rating: number; review?: string }) {
    return apiRequest<{ message: string }>(`/readings/${readingId}/review`, {
      method: 'POST',
      body: data,
      auth: true,
    });
  },
};
