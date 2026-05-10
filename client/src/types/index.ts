/* ────────────────────────────────────────────────────────────── User & Auth ───── */

export type UserRole = 'client' | 'reader' | 'admin';

export interface User {
  id: number;
  email: string;
  username?: string;
  fullName?: string;
  profileImage?: string;
  role: UserRole;
  isOnline: boolean;
  balance: number; // cents (alias for accountBalance for compatibility)
  accountBalance: number; // cents - same as balance
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
  hasSession: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshUser?: () => void;
}

/* ─────────────────────────────────────────────────────── Reader (Public view) ───── */

export interface ReaderPublic {
  id: number;
  username?: string;
  fullName?: string;
  bio?: string;
  profileImage?: string;
  avatar?: string; // alias for profileImage for compatibility
  specialties?: string;
  isOnline: boolean;
  pricingChat: number;
  pricingVoice: number;
  pricingVideo: number;
  totalReadings: number;
  avgRating?: number;
  reviewCount?: number;
}

/* ─────────────────────────────────────────────────────────────── Readings ───── */

export type ReadingType = 'chat' | 'voice' | 'video';
export type ReadingStatus = 'pending' | 'accepted' | 'in_progress' | 'active' | 'paused' | 'completed' | 'cancelled' | 'missed';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface Reading {
  id: number;
  clientId: number;
  readerId: number;
  readingType: ReadingType;
  type: ReadingType; // alias for readingType for compatibility
  status: ReadingStatus;
  ratePerMinute: number;
  durationSeconds: number;
  duration: number; // alias for durationSeconds for compatibility
  totalCharged: number;
  totalCost: number; // alias for totalCharged for compatibility
  readerEarned: number;
  platformEarned: number;
  agoraChannel?: string;
  agoraToken?: string;
  paymentStatus: PaymentStatus;
  chatTranscript?: any[];
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

/* ─────────────────────────────────────────────────────────── Transactions ───── */

export type TransactionType = 'topup' | 'reading_charge' | 'reader_payout' | 'refund' | 'admin_adjustment';

export interface Transaction {
  id: number;
  userId: number;
  readingId?: number;
  type: TransactionType;
  amount: number; // cents (positive = credit, negative = debit)
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
}

/* ───────────────────────────────────────────────────────────────── Forum ───── */

export type ForumCategory = 'General' | 'Readings' | 'Spiritual Growth' | 'Ask a Reader' | 'Announcements';

export interface ForumPost {
  id: number;
  authorId: number;
  userId: number; // alias for authorId for compatibility
  authorName?: string;
  userName?: string; // alias for authorName for compatibility
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

/* ─────────────────────────────────────────────────────────────── Reviews ───── */

export interface Review {
  id: number;
  readingId: number;
  clientId: number;
  readerId: number;
  rating: number;
  review?: string;
  completedAt: string;
  createdAt: string; // added for compatibility
  clientName?: string;
  clientUsername?: string;
}

/* ─────────────────────────────────────────────────────────────────── API ───── */

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
