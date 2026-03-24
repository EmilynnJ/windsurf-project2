/* ─── User & Auth ─────────────────────────────────────────────── */

export type UserRole = 'client' | 'reader' | 'admin';

export interface User {
  id: number;
  email: string;
  username?: string;
  fullName?: string;
  profileImage?: string;
  role: UserRole;
  isOnline: boolean;
  balance: number; // cents
  bio?: string;
  specialties?: string;
  pricingChat: number;
  pricingVoice: number;
  pricingVideo: number;
  totalReadings: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshUser?: () => void;
}

/* ─── Reader (Public view) ────────────────────────────────────── */

export interface ReaderPublic {
  id: number;
  username?: string;
  fullName?: string;
  bio?: string;
  profileImage?: string;
  specialties?: string;
  isOnline: boolean;
  pricingChat: number;
  pricingVoice: number;
  pricingVideo: number;
  totalReadings: number;
  avgRating?: number;
  reviewCount?: number;
}

/* ─── Readings ────────────────────────────────────────────────── */

export type ReadingType = 'chat' | 'voice' | 'video';
export type ReadingStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled' | 'missed';

export interface Reading {
  id: number;
  clientId: number;
  readerId: number;
  readingType: ReadingType;
  status: ReadingStatus;
  ratePerMinute: number;
  durationSeconds: number;
  totalCharged: number;
  readerEarned: number;
  platformEarned: number;
  agoraChannel?: string;
  agoraToken?: string;
  rating?: number;
  review?: string;
  startedAt?: string;
  completedAt?: string;
  lastHeartbeat?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields (from server queries)
  readerName?: string;
  readerUsername?: string;
  readerImage?: string;
  clientName?: string;
  clientUsername?: string;
}

/* ─── Transactions ────────────────────────────────────────────── */

export type TransactionType = 'topup' | 'reading_charge' | 'reader_payout' | 'refund' | 'admin_adjustment';

export interface Transaction {
  id: number;
  userId: number;
  readingId?: number;
  type: TransactionType;
  amount: number; // cents (positive = credit, negative = debit)
  balanceAfter: number;
  note?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
}

/* ─── Forum ───────────────────────────────────────────────────── */

export type ForumCategory = 'General' | 'Readings' | 'Spiritual Growth' | 'Ask a Reader' | 'Announcements';

export interface ForumPost {
  id: number;
  authorId: number;
  authorName?: string;
  authorUsername?: string;
  authorImage?: string;
  category: ForumCategory;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ForumComment {
  id: number;
  postId: number;
  authorId: number;
  authorName?: string;
  authorUsername?: string;
  authorImage?: string;
  content: string;
  createdAt: string;
}

/* ─── Reviews ─────────────────────────────────────────────────── */

export interface Review {
  id: number;
  readingId: number;
  clientId: number;
  readerId: number;
  rating: number;
  review?: string;
  completedAt: string;
  clientName?: string;
  clientUsername?: string;
}

/* ─── API ─────────────────────────────────────────────────────── */

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  posts: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
