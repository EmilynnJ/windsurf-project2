// ============================================================
// SoulSeer Client Type Definitions
// Must match server schema exactly
// ============================================================

/** User roles in the system */
export type UserRole = 'client' | 'reader' | 'admin';

/** Types of readings available */
export type ReadingType = 'chat' | 'voice' | 'video';

/** Reading session lifecycle statuses */
export type ReadingStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

/** Financial transaction types */
export type TransactionType = 'top_up' | 'reading_charge' | 'paid_message' | 'payout' | 'adjustment';

/** Forum post categories */
export type ForumCategory = 'General' | 'Readings' | 'Spiritual Growth' | 'Ask a Reader' | 'Announcements';

/** Payment status */
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed' | 'pending';

/** Notification types */
export type NotificationType =
  | 'reading_request'
  | 'reading_accepted'
  | 'reading_started'
  | 'reading_completed'
  | 'message_received'
  | 'payment_received'
  | 'balance_low'
  | 'forum_reply'
  | 'admin_announcement';

// ============================================================
// User / Reader Types
// ============================================================

export interface User {
  id: number;
  auth0Id?: string;
  email: string;
  username: string | null;
  fullName: string | null;
  role: UserRole;
  bio: string | null;
  specialties: string | null;
  profileImage: string | null;
  pricingChat: number;
  pricingVoice: number;
  pricingVideo: number;
  accountBalance: number;
  isOnline: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

/** Reader as returned from the public /api/readers endpoints */
export interface ReaderPublic {
  id: number;
  username: string | null;
  fullName: string | null;
  role: 'reader';
  bio: string | null;
  specialties: string | null;
  profileImage: string | null;
  pricingChat: number;
  pricingVoice: number;
  pricingVideo: number;
  isOnline: boolean;
  createdAt: string;
}

/** Reader with aggregated rating info (for profile page) */
export interface ReaderProfile extends ReaderPublic {
  averageRating: number | null;
  reviewCount: number;
}

// ============================================================
// Reading Types
// ============================================================

export interface ChatMessage {
  senderId: number;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface Reading {
  id: number;
  readerId: number;
  clientId: number;
  type: ReadingType;
  status: ReadingStatus;
  pricePerMinute: number;
  channelName: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  duration: number;
  billedMinutes: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  chatTranscript: ChatMessage[] | null;
}

/** Reading with joined reader/client info */
export interface ReadingWithUsers extends Reading {
  reader?: ReaderPublic;
  client?: Pick<User, 'id' | 'username' | 'fullName' | 'profileImage'>;
}

// ============================================================
// Transaction Types
// ============================================================

export interface Transaction {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  readingId: number | null;
  messageId: number | null;
  note: string | null;
  createdAt: string;
}

// ============================================================
// Rating / Review Types
// ============================================================

export interface ReadingRating {
  id: number;
  readingId: number;
  clientId: number;
  readerId: number;
  rating: number;
  review: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWithAuthor extends ReadingRating {
  author: {
    id: number;
    username: string | null;
    fullName: string | null;
    profileImage: string | null;
  };
}

// ============================================================
// Forum Types
// ============================================================

export interface ForumPost {
  id: number;
  userId: number;
  title: string;
  content: string;
  category: ForumCategory;
  flagCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    username: string | null;
    fullName: string | null;
    profileImage: string | null;
    role: UserRole;
  };
  commentCount?: number;
}

export interface ForumComment {
  id: number;
  postId: number;
  userId: number;
  parentCommentId: number | null;
  content: string;
  flagCount: number;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    username: string | null;
    fullName: string | null;
    profileImage: string | null;
    role: UserRole;
  };
  replies?: ForumComment[];
}

// ============================================================
// API Response Wrappers
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  limit: number;
  offset: number;
  total?: number;
}

export interface ReadersResponse {
  readers: ReaderPublic[];
  count: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// ============================================================
// Auth Types
// ============================================================

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  username: string | null;
  fullName: string | null;
  profileImage: string | null;
  accountBalance: number;
  isOnline: boolean;
}

// ============================================================
// Toast Notification Types
// ============================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
