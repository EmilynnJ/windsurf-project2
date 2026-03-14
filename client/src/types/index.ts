/* ─── User & Auth ─────────────────────────────────────────────── */

export type UserRole = 'client' | 'reader' | 'admin';

export interface User {
  id: number;
  auth0Id: string;
  email: string;
  username?: string;
  fullName?: string;
  displayName?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  isOnline: boolean;
  accountBalance: number;
  bio?: string;
  specialties?: string;
  pricingChat: number;
  pricingVoice: number;
  pricingVideo: number;
  stripeCustomerId?: string;
  createdAt: string;
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
  avatar?: string;
  profileImage?: string;
  specialties?: string;
  isOnline: boolean;
  pricingChat: number;
  pricingVoice: number;
  pricingVideo: number;
  avgRating?: number;
  reviewCount?: number;
}

/* ─── Readings ────────────────────────────────────────────────── */

export type ReadingType = 'chat' | 'voice' | 'video';
export type ReadingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Reading {
  id: number;
  clientId: number;
  readerId: number;
  type: ReadingType;
  status: ReadingStatus;
  ratePerMinute: number;
  duration: number;
  totalCost: number;
  readerEarnings: number;
  agoraChannel?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

/* ─── Transactions ────────────────────────────────────────────── */

export type TransactionType = 'top_up' | 'reading_charge' | 'reader_payout' | 'refund' | 'admin_adjustment';

export interface Transaction {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  readingId?: number;
  stripePaymentIntentId?: string;
  description?: string;
  createdAt: string;
}

/* ─── Forum ───────────────────────────────────────────────────── */

export type ForumCategory = 'general' | 'readings' | 'spiritual_growth' | 'introductions' | 'off_topic';

export interface ForumPost {
  id: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  category: ForumCategory;
  title: string;
  content: string;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ForumComment {
  id: number;
  postId: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
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
  createdAt: string;
}

/* ─── API ─────────────────────────────────────────────────────── */

export interface ApiError {
  message: string;
  statusCode: number;
}
