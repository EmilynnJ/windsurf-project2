import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["client", "reader", "admin"]);

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
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const readingTypeEnum = pgEnum("reading_type", ["chat", "voice", "video"]);
export const readingStatusEnum = pgEnum("reading_status", [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
]);

export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  readerId: integer("reader_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  type: readingTypeEnum("type").notNull(),
  status: readingStatusEnum("status").notNull().default("pending"),
  pricePerMinute: integer("price_per_minute").notNull(),
  channelName: varchar("channel_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  duration: integer("duration").notNull().default(0),
  totalPrice: integer("total_price").notNull().default(0),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("unpaid"),
  billedMinutes: integer("billed_minutes").notNull().default(0),
  chatTranscript: jsonb("chat_transcript").$type<
    Array<{ senderId: number; senderName: string; content: string; timestamp: string }>
  >(),
  rating: integer("rating"),
  review: text("review"),
  resourceId: varchar("resource_id", { length: 255 }),
  sid: varchar("sid", { length: 255 }),
});

export const transactionTypeEnum = pgEnum("transaction_type", [
  "top_up",
  "reading_charge",
  "paid_message",
  "payout",
  "adjustment",
]);

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  readingId: integer("reading_id").references(() => readings.id),
  messageId: integer("message_id"),
  stripeId: varchar("stripe_id", { length: 255 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  parentMessageId: integer("parent_message_id").references((): any => messages.id),
  content: text("content").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  price: integer("price"),
  readerAmount: integer("reader_amount"),
  platformAmount: integer("platform_amount"),
  isUnlocked: boolean("is_unlocked").notNull().default(true),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const forumCategoryEnum = pgEnum("forum_category", [
  "General",
  "Readings",
  "Spiritual Growth",
  "Ask a Reader",
  "Announcements",
]);

export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  category: forumCategoryEnum("category").notNull(),
  flagCount: integer("flag_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forumComments = pgTable("forum_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => forumPosts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  flagCount: integer("flag_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forumFlags = pgTable("forum_flags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => forumPosts.id),
  commentId: integer("comment_id").references(() => forumComments.id),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});
