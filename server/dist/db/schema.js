import { boolean, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar, } from "drizzle-orm/pg-core";
/**
 * Complete Drizzle ORM schema for SoulSeer platform
 * This schema defines all database tables, relationships, indexes, and constraints
 * required for the production application.
 */
// ============================================================================
// 1. ENUM DEFINITIONS
// ============================================================================
/**
 * User role enum
 * Defines the different roles users can have in the system
 */
export const userRoleEnum = pgEnum("user_role", ["client", "reader", "admin"]);
/**
 * Reading type enum
 * Defines the different types of readings available
 */
export const readingTypeEnum = pgEnum("reading_type", ["chat", "voice", "video"]);
/**
 * Reading status enum
 * Defines the lifecycle statuses of a reading session
 */
export const readingStatusEnum = pgEnum("reading_status", [
    "pending",
    "accepted",
    "in_progress",
    "completed",
    "cancelled",
]);
/**
 * Transaction type enum
 * Defines the different types of financial transactions
 */
export const transactionTypeEnum = pgEnum("transaction_type", [
    "top_up",
    "reading_charge",
    "paid_message",
    "payout",
    "adjustment",
]);
/**
 * Forum category enum
 * Defines the categories available in the community forum
 */
export const forumCategoryEnum = pgEnum("forum_category", [
    "General",
    "Readings",
    "Spiritual Growth",
    "Ask a Reader",
    "Announcements",
]);
/**
 * Message status enum
 * Defines the status of messages between users
 */
export const messageStatusEnum = pgEnum("message_status", [
    "sent",
    "delivered",
    "read",
    "locked",
    "unlocked",
]);
/**
 * Payment status enum
 * Defines the status of payments and financial transactions
 */
export const paymentStatusEnum = pgEnum("payment_status", [
    "unpaid",
    "paid",
    "refunded",
    "failed",
    "pending",
]);
/**
 * Flag status enum
 * Defines the status of content flags in the forum
 */
export const flagStatusEnum = pgEnum("flag_status", [
    "pending",
    "reviewed",
    "resolved",
    "rejected",
]);
/**
 * Notification type enum
 * Defines the types of notifications sent to users
 */
export const notificationTypeEnum = pgEnum("notification_type", [
    "reading_request",
    "reading_accepted",
    "reading_started",
    "reading_completed",
    "message_received",
    "payment_received",
    "balance_low",
    "forum_reply",
    "admin_announcement",
]);
/**
 * Notification status enum
 * Defines the status of user notifications
 */
export const notificationStatusEnum = pgEnum("notification_status", [
    "unread",
    "read",
    "archived",
]);
// ============================================================================
// 2. USERS TABLE
// ============================================================================
/**
 * Users table - stores all user accounts
 * This is the core table for authentication and user management
 */
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    auth0Id: varchar("auth0_id", { length: 255 }).unique(),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 50 }).unique(),
    fullName: varchar("full_name", { length: 255 }),
    role: userRoleEnum("role").notNull().default("client"),
    bio: text("bio"),
    specialties: text("specialties"),
    profileImage: text("profile_image"),
    pricingChat: integer("pricing_chat").notNull().default(0),
    pricingVoice: integer("pricing_voice").notNull().default(0),
    pricingVideo: integer("pricing_video").notNull().default(0),
    accountBalance: integer("account_balance").notNull().default(0),
    isOnline: boolean("is_online").notNull().default(false),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    stripeAccountId: varchar("stripe_account_id", { length: 255 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 3. READINGS TABLE
// ============================================================================
/**
 * Readings table - stores all reading sessions
 * This is the core table for the pay-per-minute reading system
 */
export const readings = pgTable("readings", {
    id: serial("id").primaryKey(),
    readerId: integer("reader_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: readingTypeEnum("type").notNull(),
    status: readingStatusEnum("status").notNull().default("pending"),
    pricePerMinute: integer("price_per_minute").notNull(),
    channelName: varchar("channel_name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    duration: integer("duration").notNull().default(0),
    billedMinutes: integer("billed_minutes").notNull().default(0),
    totalPrice: integer("total_price").notNull().default(0),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    chatTranscript: jsonb("chat_transcript").$type(),
    rating: integer("rating"),
    review: text("review"),
    reviewCreatedAt: timestamp("review_created_at", { withTimezone: true }),
});
// ============================================================================
// 4. TRANSACTIONS TABLE
// ============================================================================
/**
 * Transactions table - stores all financial transactions
 * This table provides a complete audit trail of all financial activity
 */
export const transactions = pgTable("transactions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    readingId: integer("reading_id").references(() => readings.id, {
        onDelete: "set null",
    }),
    messageId: integer("message_id"),
    stripeId: varchar("stripe_id", { length: 255 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
    stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 5. MESSAGES TABLE
// ============================================================================
/**
 * Messages table - stores all direct messages between users
 * Supports both free and paid messaging
 */
export const messages = pgTable("messages", {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    receiverId: integer("receiver_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    parentMessageId: integer("parent_message_id").references(() => messages.id, {
        onDelete: "set null",
    }),
    content: text("content").notNull(),
    isPaid: boolean("is_paid").notNull().default(false),
    price: integer("price"),
    readerAmount: integer("reader_amount"),
    platformAmount: integer("platform_amount"),
    status: messageStatusEnum("status").notNull().default("sent"),
    isUnlocked: boolean("is_unlocked").notNull().default(true),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
    deletedBySender: boolean("deleted_by_sender").notNull().default(false),
    deletedByReceiver: boolean("deleted_by_receiver").notNull().default(false),
});
// ============================================================================
// 6. FORUM POSTS TABLE
// ============================================================================
/**
 * Forum posts table - stores all forum posts
 * Core table for the community forum functionality
 */
export const forumPosts = pgTable("forum_posts", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    category: forumCategoryEnum("category").notNull(),
    flagCount: integer("flag_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    isPinned: boolean("is_pinned").notNull().default(false),
    isLocked: boolean("is_locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 7. FORUM COMMENTS TABLE
// ============================================================================
/**
 * Forum comments table - stores all forum comments
 * Supports threaded discussions on forum posts
 */
export const forumComments = pgTable("forum_comments", {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
        .notNull()
        .references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    parentCommentId: integer("parent_comment_id").references(() => forumComments.id, {
        onDelete: "set null",
    }),
    content: text("content").notNull(),
    flagCount: integer("flag_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 8. FORUM FLAGS TABLE
// ============================================================================
/**
 * Forum flags table - stores content moderation flags
 * Enables community-driven content moderation
 */
export const forumFlags = pgTable("forum_flags", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").references(() => forumPosts.id, {
        onDelete: "cascade",
    }),
    commentId: integer("comment_id").references(() => forumComments.id, {
        onDelete: "cascade",
    }),
    reporterId: integer("reporter_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: flagStatusEnum("status").notNull().default("pending"),
    reviewedBy: integer("reviewed_by").references(() => users.id, {
        onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    actionTaken: text("action_taken"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 9. NOTIFICATIONS TABLE
// ============================================================================
/**
 * Notifications table - stores user notifications
 * Supports real-time user notifications across the platform
 */
export const notifications = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    referenceId: integer("reference_id"),
    referenceType: varchar("reference_type", { length: 50 }),
    status: notificationStatusEnum("status").notNull().default("unread"),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 10. READING RATINGS TABLE
// ============================================================================
/**
 * Reading ratings table - stores detailed reading ratings and reviews
 * Separated from readings table for better data organization
 */
export const readingRatings = pgTable("reading_ratings", {
    id: serial("id").primaryKey(),
    readingId: integer("reading_id")
        .notNull()
        .unique()
        .references(() => readings.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    readerId: integer("reader_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull().min(1).max(5),
    review: text("review"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 11. USER SESSIONS TABLE
// ============================================================================
/**
 * User sessions table - tracks active user sessions
 * Used for presence detection and session management
 */
export const userSessions = pgTable("user_sessions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 12. API KEYS TABLE
// ============================================================================
/**
 * API keys table - stores API keys for external integrations
 * Used for admin API access and third-party integrations
 */
export const apiKeys = pgTable("api_keys", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 255 }).notNull().unique(),
    hash: varchar("hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    permissions: jsonb("permissions").$type(),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});
// ============================================================================
// 13. AUDIT LOGS TABLE
// ============================================================================
/**
 * Audit logs table - comprehensive audit trail of all system actions
 * Critical for security, compliance, and debugging
 */
export const auditLogs = pgTable("audit_logs", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: integer("entity_id"),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    status: varchar("status", { length: 20 }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 14. BILLING SESSIONS TABLE
// ============================================================================
/**
 * Billing sessions table - tracks active billing sessions for readings
 * Critical for the pay-per-minute billing system
 */
export const billingSessions = pgTable("billing_sessions", {
    id: serial("id").primaryKey(),
    readingId: integer("reading_id")
        .notNull()
        .unique()
        .references(() => readings.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    readerId: integer("reader_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    pricePerMinute: integer("price_per_minute").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    lastBilledAt: timestamp("last_billed_at", { withTimezone: true }),
    billedMinutes: integer("billed_minutes").notNull().default(0),
    totalCharged: integer("total_charged").notNull().default(0),
    readerEarnings: integer("reader_earnings").notNull().default(0),
    platformFee: integer("platform_fee").notNull().default(0),
    status: varchar("status", { length: 20 })
        .notNull()
        .default("active")
        .$type(),
    gracePeriodEndsAt: timestamp("grace_period_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 15. PAYOUT REQUESTS TABLE
// ============================================================================
/**
 * Payout requests table - tracks reader payout requests
 * Manages the process of paying readers their earnings
 */
export const payoutRequests = pgTable("payout_requests", {
    id: serial("id").primaryKey(),
    readerId: integer("reader_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
    status: varchar("status", { length: 20 })
        .notNull()
        .default("pending")
        .$type(),
    processedBy: integer("processed_by").references(() => users.id, {
        onDelete: "set null",
    }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 16. READER AVAILABILITY TABLE
// ============================================================================
/**
 * Reader availability table - tracks reader availability schedules
 * Enables clients to see when readers are available
 */
export const readerAvailability = pgTable("reader_availability", {
    id: serial("id").primaryKey(),
    readerId: integer("reader_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull().min(0).max(6),
    startTime: varchar("start_time", { length: 8 }).notNull(),
    endTime: varchar("end_time", { length: 8 }).notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 17. READER BLOCKED CLIENTS TABLE
// ============================================================================
/**
 * Reader blocked clients table - tracks clients blocked by readers
 * Enables readers to manage their client relationships
 */
export const readerBlockedClients = pgTable("reader_blocked_clients", {
    id: serial("id").primaryKey(),
    readerId: integer("reader_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 18. USER PREFERENCES TABLE
// ============================================================================
/**
 * User preferences table - stores user-specific preferences
 * Enables personalized user experiences
 */
export const userPreferences = pgTable("user_preferences", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    theme: varchar("theme", { length: 20 }).default("dark"),
    language: varchar("language", { length: 10 }).default("en"),
    emailNotifications: boolean("email_notifications").notNull().default(true),
    pushNotifications: boolean("push_notifications").notNull().default(true),
    smsNotifications: boolean("sms_notifications").notNull().default(false),
    preferredReaders: jsonb("preferred_readers").$type(),
    blockedReaders: jsonb("blocked_readers").$type(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 19. SUPPORT TICKETS TABLE
// ============================================================================
/**
 * Support tickets table - tracks user support requests
 * Manages customer support workflow
 */
export const supportTickets = pgTable("support_tickets", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 200 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    priority: varchar("priority", { length: 20 })
        .notNull()
        .default("medium")
        .$type(),
    status: varchar("status", { length: 20 })
        .notNull()
        .default("open")
        .$type(),
    assignedTo: integer("assigned_to").references(() => users.id, {
        onDelete: "set null",
    }),
    resolvedBy: integer("resolved_by").references(() => users.id, {
        onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 20. SUPPORT MESSAGES TABLE
// ============================================================================
/**
 * Support messages table - stores support ticket messages
 * Tracks communication on support tickets
 */
export const supportMessages = pgTable("support_messages", {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
        .notNull()
        .references(() => supportTickets.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, {
        onDelete: "set null",
    }),
    senderType: varchar("sender_type", { length: 20 })
        .notNull()
        .$type(),
    message: text("message").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// 21. DATABASE INDEXES
// ============================================================================
// Users table indexes
users.indexes([
    {
        name: "users_email_idx",
        columns: ["email"],
        unique: true,
    },
    {
        name: "users_auth0_id_idx",
        columns: ["auth0Id"],
        unique: true,
    },
    {
        name: "users_username_idx",
        columns: ["username"],
        unique: true,
    },
    {
        name: "users_role_idx",
        columns: ["role"],
    },
    {
        name: "users_is_online_idx",
        columns: ["isOnline"],
    },
]);
// Readings table indexes
readings.indexes([
    {
        name: "readings_reader_id_idx",
        columns: ["readerId"],
    },
    {
        name: "readings_client_id_idx",
        columns: ["clientId"],
    },
    {
        name: "readings_status_idx",
        columns: ["status"],
    },
    {
        name: "readings_type_idx",
        columns: ["type"],
    },
    {
        name: "readings_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
    {
        name: "readings_completed_at_idx",
        columns: ["completedAt"],
        descending: true,
    },
    {
        name: "readings_payment_status_idx",
        columns: ["paymentStatus"],
    },
]);
// Transactions table indexes
transactions.indexes([
    {
        name: "transactions_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "transactions_reading_id_idx",
        columns: ["readingId"],
    },
    {
        name: "transactions_type_idx",
        columns: ["type"],
    },
    {
        name: "transactions_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
]);
// Messages table indexes
messages.indexes([
    {
        name: "messages_sender_id_idx",
        columns: ["senderId"],
    },
    {
        name: "messages_receiver_id_idx",
        columns: ["receiverId"],
    },
    {
        name: "messages_parent_message_id_idx",
        columns: ["parentMessageId"],
    },
    {
        name: "messages_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
    {
        name: "messages_is_paid_idx",
        columns: ["isPaid"],
    },
    {
        name: "messages_status_idx",
        columns: ["status"],
    },
]);
// Forum posts table indexes
forumPosts.indexes([
    {
        name: "forum_posts_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "forum_posts_category_idx",
        columns: ["category"],
    },
    {
        name: "forum_posts_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
    {
        name: "forum_posts_last_activity_at_idx",
        columns: ["lastActivityAt"],
        descending: true,
    },
    {
        name: "forum_posts_is_pinned_idx",
        columns: ["isPinned"],
    },
]);
// Forum comments table indexes
forumComments.indexes([
    {
        name: "forum_comments_post_id_idx",
        columns: ["postId"],
    },
    {
        name: "forum_comments_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "forum_comments_parent_comment_id_idx",
        columns: ["parentCommentId"],
    },
    {
        name: "forum_comments_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
]);
// Forum flags table indexes
forumFlags.indexes([
    {
        name: "forum_flags_reporter_id_idx",
        columns: ["reporterId"],
    },
    {
        name: "forum_flags_post_id_idx",
        columns: ["postId"],
    },
    {
        name: "forum_flags_comment_id_idx",
        columns: ["commentId"],
    },
    {
        name: "forum_flags_status_idx",
        columns: ["status"],
    },
    {
        name: "forum_flags_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
]);
// Notifications table indexes
notifications.indexes([
    {
        name: "notifications_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "notifications_status_idx",
        columns: ["status"],
    },
    {
        name: "notifications_is_read_idx",
        columns: ["isRead"],
    },
    {
        name: "notifications_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
]);
// Reading ratings table indexes
readingRatings.indexes([
    {
        name: "reading_ratings_reading_id_idx",
        columns: ["readingId"],
        unique: true,
    },
    {
        name: "reading_ratings_client_id_idx",
        columns: ["clientId"],
    },
    {
        name: "reading_ratings_reader_id_idx",
        columns: ["readerId"],
    },
    {
        name: "reading_ratings_rating_idx",
        columns: ["rating"],
    },
]);
// User sessions table indexes
userSessions.indexes([
    {
        name: "user_sessions_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "user_sessions_session_id_idx",
        columns: ["sessionId"],
        unique: true,
    },
    {
        name: "user_sessions_is_active_idx",
        columns: ["isActive"],
    },
    {
        name: "user_sessions_expires_at_idx",
        columns: ["expiresAt"],
    },
]);
// API keys table indexes
apiKeys.indexes([
    {
        name: "api_keys_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "api_keys_key_idx",
        columns: ["key"],
        unique: true,
    },
    {
        name: "api_keys_is_active_idx",
        columns: ["isActive"],
    },
]);
// Audit logs table indexes
auditLogs.indexes([
    {
        name: "audit_logs_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "audit_logs_entity_type_idx",
        columns: ["entityType"],
    },
    {
        name: "audit_logs_entity_id_idx",
        columns: ["entityId"],
    },
    {
        name: "audit_logs_action_idx",
        columns: ["action"],
    },
    {
        name: "audit_logs_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
]);
// Billing sessions table indexes
billingSessions.indexes([
    {
        name: "billing_sessions_reading_id_idx",
        columns: ["readingId"],
        unique: true,
    },
    {
        name: "billing_sessions_client_id_idx",
        columns: ["clientId"],
    },
    {
        name: "billing_sessions_reader_id_idx",
        columns: ["readerId"],
    },
    {
        name: "billing_sessions_status_idx",
        columns: ["status"],
    },
]);
// Payout requests table indexes
payoutRequests.indexes([
    {
        name: "payout_requests_reader_id_idx",
        columns: ["readerId"],
    },
    {
        name: "payout_requests_status_idx",
        columns: ["status"],
    },
    {
        name: "payout_requests_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
]);
// Reader availability table indexes
readerAvailability.indexes([
    {
        name: "reader_availability_reader_id_idx",
        columns: ["readerId"],
    },
    {
        name: "reader_availability_day_of_week_idx",
        columns: ["dayOfWeek"],
    },
]);
// Reader blocked clients table indexes
readerBlockedClients.indexes([
    {
        name: "reader_blocked_clients_reader_id_idx",
        columns: ["readerId"],
    },
    {
        name: "reader_blocked_clients_client_id_idx",
        columns: ["clientId"],
    },
    {
        name: "reader_blocked_clients_unique_idx",
        columns: ["readerId", "clientId"],
        unique: true,
    },
]);
// User preferences table indexes
userPreferences.indexes([
    {
        name: "user_preferences_user_id_idx",
        columns: ["userId"],
        unique: true,
    },
]);
// Support tickets table indexes
supportTickets.indexes([
    {
        name: "support_tickets_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "support_tickets_category_idx",
        columns: ["category"],
    },
    {
        name: "support_tickets_priority_idx",
        columns: ["priority"],
    },
    {
        name: "support_tickets_status_idx",
        columns: ["status"],
    },
    {
        name: "support_tickets_assigned_to_idx",
        columns: ["assignedTo"],
    },
]);
// Support messages table indexes
supportMessages.indexes([
    {
        name: "support_messages_ticket_id_idx",
        columns: ["ticketId"],
    },
    {
        name: "support_messages_user_id_idx",
        columns: ["userId"],
    },
    {
        name: "support_messages_created_at_idx",
        columns: ["createdAt"],
        descending: true,
    },
]);
// ============================================================================
// 22. DATABASE RELATIONSHIPS AND CONSTRAINTS
// ============================================================================
// Add additional constraints and triggers as needed
// These would typically be implemented via database migrations
// ============================================================================
// 23. SCHEMA EXPORTS
// ============================================================================
/**
 * Export all tables and enums for use in the application
 */
export const schema = {
    // Enums
    userRoleEnum,
    readingTypeEnum,
    readingStatusEnum,
    transactionTypeEnum,
    forumCategoryEnum,
    messageStatusEnum,
    paymentStatusEnum,
    flagStatusEnum,
    notificationTypeEnum,
    notificationStatusEnum,
    // Tables
    users,
    readings,
    transactions,
    messages,
    forumPosts,
    forumComments,
    forumFlags,
    notifications,
    readingRatings,
    userSessions,
    apiKeys,
    auditLogs,
    billingSessions,
    payoutRequests,
    readerAvailability,
    readerBlockedClients,
    userPreferences,
    supportTickets,
    supportMessages,
};
/**
 * Default export for easy import
 */
export default schema;
