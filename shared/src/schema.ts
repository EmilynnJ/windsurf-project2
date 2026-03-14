import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "client",
  "reader",
  "admin",
]);

export const readingTypeEnum = pgEnum("reading_type", [
  "chat",
  "voice",
  "video",
]);

export const readingStatusEnum = pgEnum("reading_status", [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "refunded",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "top_up",
  "reading_charge",
  "reader_credit",
  "payout",
  "adjustment",
  "refund",
]);

export const forumCategoryEnum = pgEnum("forum_category", [
  "general",
  "readings",
  "spiritual_growth",
  "ask_a_reader",
  "announcements",
]);

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    auth0Id: varchar("auth0_id", { length: 255 }).unique().notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    username: varchar("username", { length: 50 }).unique(),
    fullName: varchar("full_name", { length: 255 }),
    role: userRoleEnum("role").notNull().default("client"),
    bio: text("bio"),
    specialties: text("specialties"),
    profileImage: varchar("profile_image", { length: 512 }),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    pricingChat: integer("pricing_chat").notNull().default(0),
    pricingVoice: integer("pricing_voice").notNull().default(0),
    pricingVideo: integer("pricing_video").notNull().default(0),
    accountBalance: integer("account_balance").notNull().default(0),
    totalEarnings: integer("total_earnings").notNull().default(0),
    totalSpent: integer("total_spent").notNull().default(0),
    isOnline: boolean("is_online").notNull().default(false),
    stripeAccountId: varchar("stripe_account_id", { length: 255 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    roleIdx: index("users_role_idx").on(table.role),
    isOnlineIdx: index("users_is_online_idx").on(table.isOnline),
    auth0IdIdx: uniqueIndex("users_auth0_id_idx").on(table.auth0Id),
  }),
);

// ─── Readings ───────────────────────────────────────────────────────────────

export const readings = pgTable(
  "readings",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => users.id),
    readerId: integer("reader_id")
      .notNull()
      .references(() => users.id),
    type: readingTypeEnum("type").notNull(),
    status: readingStatusEnum("status").notNull().default("pending"),
    agoraChannelName: varchar("agora_channel_name", { length: 255 }),
    agoraToken: text("agora_token"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    duration: integer("duration").default(0),
    pricePerMinute: integer("price_per_minute").notNull(),
    totalCost: integer("total_cost").notNull().default(0),
    platformFee: integer("platform_fee").notNull().default(0),
    readerEarnings: integer("reader_earnings").notNull().default(0),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    clientBalanceBefore: integer("client_balance_before"),
    clientBalanceAfter: integer("client_balance_after"),
    rating: integer("rating"),
    review: text("review"),
    chatTranscript: jsonb("chat_transcript").$type<
      Array<{
        senderId: number;
        senderName: string;
        content: string;
        timestamp: string;
      }>
    >(),
    billedMinutes: integer("billed_minutes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdIdx: index("readings_client_id_idx").on(table.clientId),
    readerIdIdx: index("readings_reader_id_idx").on(table.readerId),
    statusIdx: index("readings_status_idx").on(table.status),
    createdAtIdx: index("readings_created_at_idx").on(table.createdAt),
  }),
);

// ─── Transactions ───────────────────────────────────────────────────────────

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    type: transactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceBefore: integer("balance_before").notNull().default(0),
    balanceAfter: integer("balance_after").notNull().default(0),
    readingId: integer("reading_id").references(() => readings.id),
    stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
    readingIdIdx: index("transactions_reading_id_idx").on(table.readingId),
    typeIdx: index("transactions_type_idx").on(table.type),
    createdAtIdx: index("transactions_created_at_idx").on(table.createdAt),
  }),
);

// ─── Reviews ────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    readingId: integer("reading_id")
      .notNull()
      .references(() => readings.id)
      .unique(),
    clientId: integer("client_id")
      .notNull()
      .references(() => users.id),
    readerId: integer("reader_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    readerIdIdx: index("reviews_reader_id_idx").on(table.readerId),
    clientIdIdx: index("reviews_client_id_idx").on(table.clientId),
  }),
);

// ─── Messages (for chat readings) ──────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    readingId: integer("reading_id")
      .notNull()
      .references(() => readings.id),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    readingIdIdx: index("messages_reading_id_idx").on(table.readingId),
  }),
);

// ─── Forum Posts ────────────────────────────────────────────────────────────

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    category: forumCategoryEnum("category").notNull(),
    flagCount: integer("flag_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("forum_posts_user_id_idx").on(table.userId),
    categoryIdx: index("forum_posts_category_idx").on(table.category),
    createdAtIdx: index("forum_posts_created_at_idx").on(table.createdAt),
  }),
);

// ─── Forum Comments ─────────────────────────────────────────────────────────

export const forumComments = pgTable(
  "forum_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    flagCount: integer("flag_count").notNull().default(0),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    postIdIdx: index("forum_comments_post_id_idx").on(table.postId),
    userIdIdx: index("forum_comments_user_id_idx").on(table.userId),
  }),
);

// ─── Forum Flags ────────────────────────────────────────────────────────────

export const forumFlags = pgTable(
  "forum_flags",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").references(() => forumPosts.id, {
      onDelete: "cascade",
    }),
    commentId: integer("comment_id").references(() => forumComments.id, {
      onDelete: "cascade",
    }),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    postIdIdx: index("forum_flags_post_id_idx").on(table.postId),
    commentIdIdx: index("forum_flags_comment_id_idx").on(table.commentId),
    reporterIdIdx: index("forum_flags_reporter_id_idx").on(table.reporterId),
  }),
);

// ─── Newsletter Subscribers ─────────────────────────────────────────────────

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Relations ──────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  clientReadings: many(readings, { relationName: "clientReadings" }),
  readerReadings: many(readings, { relationName: "readerReadings" }),
  transactions: many(transactions),
  reviews: many(reviews, { relationName: "clientReviews" }),
  receivedReviews: many(reviews, { relationName: "readerReviews" }),
  messages: many(messages),
  forumPosts: many(forumPosts),
  forumComments: many(forumComments),
  forumFlags: many(forumFlags),
}));

export const readingsRelations = relations(readings, ({ one, many }) => ({
  client: one(users, {
    fields: [readings.clientId],
    references: [users.id],
    relationName: "clientReadings",
  }),
  reader: one(users, {
    fields: [readings.readerId],
    references: [users.id],
    relationName: "readerReadings",
  }),
  transactions: many(transactions),
  review: one(reviews),
  chatMessages: many(messages),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  reading: one(readings, {
    fields: [transactions.readingId],
    references: [readings.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reading: one(readings, {
    fields: [reviews.readingId],
    references: [readings.id],
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id],
    relationName: "clientReviews",
  }),
  reader: one(users, {
    fields: [reviews.readerId],
    references: [users.id],
    relationName: "readerReviews",
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  reading: one(readings, {
    fields: [messages.readingId],
    references: [readings.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [forumPosts.userId],
    references: [users.id],
  }),
  comments: many(forumComments),
  flags: many(forumFlags),
}));

export const forumCommentsRelations = relations(
  forumComments,
  ({ one }) => ({
    post: one(forumPosts, {
      fields: [forumComments.postId],
      references: [forumPosts.id],
    }),
    author: one(users, {
      fields: [forumComments.userId],
      references: [users.id],
    }),
  }),
);

export const forumFlagsRelations = relations(forumFlags, ({ one }) => ({
  post: one(forumPosts, {
    fields: [forumFlags.postId],
    references: [forumPosts.id],
  }),
  comment: one(forumComments, {
    fields: [forumFlags.commentId],
    references: [forumComments.id],
  }),
  reporter: one(users, {
    fields: [forumFlags.reporterId],
    references: [users.id],
  }),
}));
