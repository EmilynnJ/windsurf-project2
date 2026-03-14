(None) SoulSeer
(None) Initial Launch Build Guide
(None) Pay-Per-Minute Readings & Community
(None) A Community of Gifted Psychics
(None) SCOPE: This guide covers the initial public launch of SoulSeer. All features not listed here — live streaming, marketplace/shop, virtual gifting, scheduled bookings, and direct messaging — are deferred to a future build phase.
(Heading 1) 1. Purpose & Vision
(None) SoulSeer is a premium platform connecting spiritual readers with clients seeking guidance. The app embodies a mystical yet professional atmosphere while providing robust functionality for seamless spiritual consultations. All design elements should prioritize intuitive user experience alongside the ethereal aesthetic.
(None) This initial launch focuses exclusively on the two core pillars that deliver immediate value:
(List Paragraph) Pay-per-minute live readings (chat, voice, and video) via Agora
(List Paragraph) Community hub — public forum and links to the SoulSeer Discord and Facebook community group
(Heading 1) 2. Technology Stack
(None) ⚠️  Every integration listed here is required. Do not substitute alternatives.
(Heading 2) 2.1 Core Framework
(Heading 2) 2.2 Required Integrations
(None) ⚠️  Agora handles ALL real-time communication for readings. Do not implement custom WebRTC or WebSocket-based reading sessions.
(Heading 1) 3. Theme & Design System
(Heading 2) 3.1 Aesthetic
(None) Celestial, mystical, and ethereal. Dark-mode default. The design must feel premium and spiritual — not generic. Every screen should feel cohesive.
(Heading 2) 3.2 Color Palette
(Heading 2) 3.3 Typography
(List Paragraph) Headings: Alex Brush font, pink (#FF69B4)
(List Paragraph) Body text: Playfair Display
(List Paragraph) UI elements (buttons, labels, nav): consistent with above — never mix in system fonts
(List Paragraph) Accessibility: all text must meet WCAG AA contrast ratios
(Heading 2) 3.4 Visual Elements
(List Paragraph) Cosmic/celestial design elements: stars, moons, constellation patterns used as decorative accents
(List Paragraph) Smooth, subtle animations on transitions and interactive elements — animations must not hinder usability
(List Paragraph) Gold accents used sparingly for emphasis and borders
(List Paragraph) Background image: https://i.postimg.cc/sXdsKGTK/DALL-E-2025-06-06-14-36-29-A-vivid-ethereal-background-image-designed-for-a-psychic-reading-app.webp
(List Paragraph) Hero image: https://i.postimg.cc/tRLSgCPb/HERO-IMAGE-1.jpg
(List Paragraph) Founder image: https://i.postimg.cc/s2ds9RtC/FOUNDER.jpg
(Heading 2) 3.5 Mobile-First Requirement
(None) ⚠️  The app MUST be fully responsive and mobile-friendly. This is non-negotiable. Test every screen at 375px, 768px, and 1280px breakpoints.
(Heading 1) 4. Navigation Structure (Initial Launch)
(None) Only these pages exist in the initial launch. All other pages from the full build guide are deferred.
(None) ⚠️  Routes for /shop, /live, /messages, /gifts are NOT built in this phase. Do not scaffold them.
(Heading 1) 5. User Roles & Accounts
(Heading 2) 5.1 Role Definitions
(None) ⚠️  Reader accounts can ONLY be created by an admin through the admin dashboard. Readers cannot self-register.
(Heading 2) 5.2 Auth0 Configuration
(List Paragraph) Use Auth0 Universal Login for all client authentication
(List Paragraph) Social providers: Google and Apple (required for App Store compliance)
(List Paragraph) Email/password login also enabled
(List Paragraph) JWT tokens used for all API authentication — validate on every protected route
(List Paragraph) Auth0 user ID (sub) stored in DB and used as the link between Auth0 and internal user record
(List Paragraph) Role stored in the internal database, not in Auth0 metadata
(List Paragraph) On first login, create internal user record if one does not exist
(List Paragraph) Readers log in via Auth0 using credentials created by admin — admin sets their initial password and provides it to them
(Heading 1) 6. Home Page
(Heading 2) 6.1 Layout (top to bottom)
(List Paragraph) Header: 'SoulSeer' in Alex Brush font, pink, centered
(List Paragraph) Hero image directly below header
(List Paragraph) Tagline: 'A Community of Gifted Psychics' in Playfair Display, centered
(List Paragraph) Currently online readers grid — shows live availability, per-minute rates, and reading types offered
(List Paragraph) Newsletter signup input field with submit button
(List Paragraph) Community links: buttons to Facebook group and Discord server (open in new tab)
(Heading 2) 6.2 Online Readers Display
(List Paragraph) Fetch and display all readers where isOnline = true
(List Paragraph) Each reader card shows: profile photo, name, specialties, per-minute rate (per type), and an availability badge
(List Paragraph) 'Start Reading' button on each card — directs unauthenticated users to login first
(List Paragraph) Real-time updates: reader online/offline status must update without full page refresh (use polling every 30s or WebSocket broadcast)
(Heading 1) 7. Readers — Browse & Profiles
(Heading 2) 7.1 Browse Readers Page (/readers)
(List Paragraph) Grid of all reader profiles — online readers shown first
(List Paragraph) Filter by: specialty, reading type (chat/voice/video), and online status
(List Paragraph) Each card: profile photo, name, short bio excerpt, rating, specialties, per-minute rates per type, online badge
(Heading 2) 7.2 Reader Profile Page (/readers/:id)
(List Paragraph) Full bio
(List Paragraph) Specialties and services offered
(List Paragraph) Per-minute rate displayed separately for chat, voice, and video
(List Paragraph) Star rating and review count
(List Paragraph) Recent reviews from clients (reviewer name, star rating, text, date)
(List Paragraph) 'Start Reading' buttons for each available type — requires auth and minimum balance
(Heading 1) 8. Pay-Per-Minute Reading System
(None) ⚠️  Agora is used for ALL real-time communication. Do not build custom WebRTC or WebSocket-based audio/video. Agora handles chat, voice, and video sessions.
(Heading 2) 8.1 How It Works (User Flow)
(None) 1. Client browses readers and selects one who is online.
(None) 2. Client selects reading type: chat, voice, or video.
(None) 3. System checks client has minimum $5 account balance. If not, redirect to add funds.
(None) 4. Reading request is created in DB with status 'pending'. Reader receives a notification.
(None) 5. Reader accepts the request. Both users are connected to an Agora session.
(None) 6. Server-side billing starts the moment both participants have joined the Agora channel.
(None) 7. Either party can end the session. Billing stops, final cost is deducted from client balance.
(None) 8. Client is prompted to leave a star rating and written review.
(Heading 2) 8.2 Reading Types
(Heading 2) 8.3 Agora Integration Requirements
(List Paragraph) Agora App ID stored in server environment variable — never exposed to client
(List Paragraph) Server generates a short-lived Agora token per session using Agora Token Builder
(List Paragraph) Token endpoint: POST /api/readings/:id/agora-token — authenticated, participants only
(List Paragraph) Each reading session gets a unique Agora channel name (e.g., reading_[readingId])
(List Paragraph) Client fetches token from server before joining Agora channel
(List Paragraph) Token expiry: 3600 seconds (1 hour) — sufficient for any single session
(Heading 2) 8.4 Server-Side Billing
(None) ⚠️  Billing MUST be server-side. Never trust the client to report session duration.
(List Paragraph) When both participants join Agora and call POST /api/readings/:id/start, server records startedAt timestamp
(List Paragraph) Server-side billing timer fires every 60 seconds
(List Paragraph) Each tick: deduct pricePerMinute from client balance, credit reader 70%, platform keeps 30%
(List Paragraph) Before each deduction: check client has sufficient balance
(List Paragraph) If balance is insufficient: immediately end session, notify both parties via WebSocket push, finalize reading record
(List Paragraph) Session end: record duration, totalCost, completedAt. Mark paymentStatus = 'paid'.
(List Paragraph) Prevent race conditions: use database transactions for balance deduction + credit in a single atomic operation
(Heading 2) 8.5 Disconnection & Grace Period
(List Paragraph) If either participant disconnects unexpectedly: pause billing timer, start a 2-minute grace period
(List Paragraph) If the disconnected user reconnects within 2 minutes: resume session, restart billing
(List Paragraph) If grace period expires and both not reconnected: end session and finalize billing for time actually connected
(List Paragraph) Notify the other participant when their session partner disconnects
(List Paragraph) Reader going offline mid-session: treated as disconnect, grace period applies
(Heading 2) 8.6 Reading Database Schema
(Heading 2) 8.7 Reading Session UI
(List Paragraph) Show real-time elapsed time counter (MM:SS)
(List Paragraph) Show running cost counter updating every second (e.g., '$2.47')
(List Paragraph) Show client's remaining balance
(List Paragraph) 'End Session' button — confirms with user before ending
(List Paragraph) Low balance warning when remaining balance falls below 2 minutes of session cost
(List Paragraph) Chat sessions: message input, scrollable message history, timestamps
(List Paragraph) Voice sessions: mute/unmute button, end call button, participant indicators
(List Paragraph) Video sessions: local and remote video, mute audio, toggle camera, end call
(Heading 2) 8.8 Post-Session
(List Paragraph) Immediately after session ends: show session summary (duration, total cost)
(List Paragraph) Prompt client to rate 1–5 stars and leave a written review — can be skipped but shown once
(List Paragraph) Chat transcript stored in DB and viewable by both parties in their reading history
(Heading 1) 9. Dashboards
(Heading 2) 9.1 Client Dashboard
(List Paragraph) Account balance — prominently displayed with 'Add Funds' button
(List Paragraph) Reading history — list of completed readings with reader name, date, duration, cost, and their review
(List Paragraph) Upcoming/active readings — any pending or in-progress sessions
(List Paragraph) Transaction history — itemized list of balance top-ups and reading charges
(Heading 2) 9.2 Reader Dashboard
(List Paragraph) Online/offline toggle — clearly visible, easy to switch
(List Paragraph) Per-minute rate settings — set individually for chat, voice, and video
(List Paragraph) Earnings summary — today's earnings, total pending payout balance, historical earnings
(List Paragraph) Session history — list of completed readings with client (shown as 'Client #[id]' for privacy), date, duration, earnings
(List Paragraph) Reviews received — star ratings and written reviews from clients
(Heading 2) 9.3 Admin Dashboard
(None) ⚠️  This is the control hub. Build it completely and securely.
(List Paragraph) User list — all clients and readers, with account details and balance
(List Paragraph) Create reader — form with: full name, email, username, bio, specialties, per-type rates, profile image upload, generate initial password
(List Paragraph) Edit reader — update any reader profile field including profile image
(List Paragraph) All readings — searchable list of all sessions with status, participants, duration, revenue
(List Paragraph) Transaction ledger — all balance top-ups and reading charges platform-wide
(List Paragraph) Manual balance adjustment — add or deduct balance from any user account with reason logged
(List Paragraph) Forum moderation — view and delete any forum post or comment
(Heading 1) 10. Community Hub (/community)
(None) The Community page serves two purposes: linking users to the SoulSeer off-platform communities, and providing an on-platform public forum for connection and discussion.
(Heading 2) 10.1 Community Links
(List Paragraph) Prominent button: 'Join our Facebook Group' — links to SoulSeer Facebook community (opens new tab)
(List Paragraph) Prominent button: 'Join our Discord Server' — links to SoulSeer Discord (opens new tab)
(List Paragraph) Brief description of each community and what members can expect
(List Paragraph) These same links appear on the home page
(Heading 2) 10.2 Public Forum
(List Paragraph) Anyone can read posts — no login required to browse
(List Paragraph) Login required to post or comment
(List Paragraph) Posts have: title, body text, author display name, timestamp, comment count
(List Paragraph) Comments are threaded one level deep (replies to posts, not to other comments)
(List Paragraph) Pagination: 10 posts per page, ordered newest first
(List Paragraph) Categories: General, Readings, Spiritual Growth, Ask a Reader, Announcements
(List Paragraph) Announcements category: only admins can create posts, everyone can comment
(Heading 2) 10.3 Forum Moderation
(List Paragraph) Any user can flag a post or comment as inappropriate
(List Paragraph) Flagged content goes to an admin review queue in the admin dashboard
(List Paragraph) Admin can delete any post or comment
(List Paragraph) No automated content scanning required in this phase — manual moderation only
(Heading 1) 11. Payment & Balance System
(None) ⚠️  Clients prepay by adding funds to their account balance. They only spend what they use, calculated as minutes × reader's per-minute rate.
(Heading 2) 11.1 Adding Funds (Stripe)
(List Paragraph) Stripe Payment Element used for card collection — PCI compliant, no raw card data touches server
(List Paragraph) Preset amounts offered: $10, $25, $50, $100 — plus a custom amount input
(List Paragraph) Minimum top-up: $5
(List Paragraph) On Stripe payment_intent.succeeded webhook: credit user's accountBalance in DB
(List Paragraph) Stripe webhook endpoint must verify signature using Stripe-Signature header — never skip this
(List Paragraph) Balance stored in cents (integer) in DB — never store as float
(Heading 2) 11.2 Revenue Split
(List Paragraph) 70% of each reading's cost goes to the reader's accountBalance
(List Paragraph) 30% is retained by the platform
(List Paragraph) Split calculated and applied server-side at each billing tick and at session close
(List Paragraph) Use integer math only — Math.floor(amount * 0.70) for reader share
(Heading 2) 11.3 Reader Payouts (Stripe Connect)
(List Paragraph) Each reader has a Stripe Connect Express account created when admin creates their profile
(List Paragraph) Admin triggers payouts manually via admin dashboard (automated scheduling is a future phase feature)
(List Paragraph) Payout threshold: reader must have $15 or more in accountBalance to be paid out
(List Paragraph) On payout: transfer reader's accountBalance to their Stripe Connect account, reset accountBalance to 0
(List Paragraph) Stripe Connect onboarding link generated and sent to reader after account creation
(Heading 2) 11.4 Financial Security
(List Paragraph) All balance operations use DB transactions — never update two balances in separate queries
(List Paragraph) Every financial operation is logged with: userId, type, amount, timestamp, readingId (if applicable)
(List Paragraph) Double-deduction prevention: check reading status before processing payment — do not process if already marked 'paid'
(List Paragraph) Refund capability in admin dashboard for disputed sessions
(Heading 1) 12. API Route Reference
(None) All routes prefixed with /api. All routes except those marked Public require a valid Auth0 JWT in the Authorization header.
(Heading 2) 12.1 Auth
(Heading 2) 12.2 Users & Readers
(Heading 2) 12.3 Readings
(Heading 2) 12.4 Payments
(Heading 2) 12.5 Community Forum
(Heading 2) 12.6 Admin
(Heading 1) 13. Database Schema Overview
(None) Database: Neon (serverless Postgres). ORM: Drizzle. All schema defined in /shared/schema.ts.
(Heading 2) 13.1 Core Tables
(List Paragraph) users — id, auth0Id, email, username, fullName, role, bio, specialties, profileImage, pricingChat, pricingVoice, pricingVideo, accountBalance, isOnline, stripeAccountId, stripeCustomerId, createdAt
(List Paragraph) readings — see Section 8.6 for full schema
(List Paragraph) transactions — id, userId, type ('top_up' | 'reading_charge' | 'payout' | 'adjustment'), amount, balanceBefore, balanceAfter, readingId (nullable), stripeId (nullable), note, createdAt
(List Paragraph) forum_posts — id, userId, title, content, category, flagCount, createdAt
(List Paragraph) forum_comments — id, postId, userId, content, flagCount, createdAt
(List Paragraph) forum_flags — id, postId (nullable), commentId (nullable), reporterId, reason, reviewedAt (nullable)
(Heading 2) 13.2 Drizzle ORM Rules
(List Paragraph) All monetary values stored as integers (cents) — never DECIMAL or FLOAT
(List Paragraph) All timestamps stored as timestamp with timezone
(List Paragraph) Foreign keys defined with .references() — enforce referential integrity
(List Paragraph) Use Drizzle transactions (db.transaction()) for any operation that touches two or more tables
(Heading 1) 14. Security Requirements
(None) ⚠️  These are non-negotiable. Every item on this list must be implemented before launch.
(Heading 2) 14.1 Authentication & Authorization
(List Paragraph) All protected routes validate the Auth0 JWT on every request — no exceptions
(List Paragraph) Role checked server-side on every admin and reader route — never trust role from client
(List Paragraph) Reading session routes verify the requesting user is an actual participant (clientId or readerId)
(List Paragraph) Agora token endpoint verifies reading exists and user is a participant before issuing token
(Heading 2) 14.2 Input Validation
(List Paragraph) All API request bodies validated with Zod schemas before processing
(List Paragraph) Numeric inputs sanitized — check for NaN, negative values, unreasonably large values
(List Paragraph) String inputs sanitized — max length enforced, HTML stripped where applicable
(List Paragraph) File uploads (reader images via admin): type check (jpeg/png/webp only), size limit 5MB
(Heading 2) 14.3 Payment Security
(List Paragraph) Stripe webhook endpoint verifies Stripe-Signature header on every request — use stripe.webhooks.constructEvent()
(List Paragraph) Never credit balance from client-reported amounts — only from verified Stripe webhook events
(List Paragraph) Balance deductions use DB transactions to prevent race conditions and double charges
(List Paragraph) Log every financial operation for audit trail
(Heading 2) 14.4 API Hardening
(List Paragraph) Rate limiting on all public endpoints using express-rate-limit
(List Paragraph) Stricter rate limits on auth, payment, and reading creation endpoints
(List Paragraph) Helmet.js for HTTP security headers on all routes
(List Paragraph) CORS configured to allow only your frontend domain
(List Paragraph) No sensitive data (passwords, Stripe keys, Agora secrets) ever logged or returned in API responses
(List Paragraph) Environment variables for all secrets — never hardcoded
(Heading 2) 14.5 Data Privacy
(List Paragraph) Passwords: readers log in via Auth0 — no passwords stored in your DB
(List Paragraph) Client and reader identities in shared reading history shown with display names, not email addresses
(List Paragraph) GDPR/CCPA: include a privacy policy page (static) and honor account deletion requests
(Heading 1) 15. Error Handling & Reliability
(Heading 2) 15.1 Server Error Handling
(List Paragraph) Global Express error handler catches all unhandled errors and returns structured JSON
(List Paragraph) Never expose stack traces or internal error messages to the client in production
(List Paragraph) All async route handlers wrapped in try/catch — no unhandled promise rejections
(List Paragraph) Billing timer errors must be caught and logged — a billing failure must not silently lose money
(Heading 2) 15.2 Client Error Handling
(List Paragraph) Toast notifications for all user-facing errors with clear, plain-language messages
(List Paragraph) Agora connection errors show a reconnection attempt UI, not a blank screen
(List Paragraph) Low balance detected before session start — show top-up prompt, never let session start with insufficient funds
(List Paragraph) If session fails to start after reader accepts, reading status resets to 'cancelled' and client is notified
(Heading 2) 15.3 Logging
(List Paragraph) All server errors logged with: timestamp, route, userId (if authenticated), error message
(List Paragraph) All financial operations logged with full details
(List Paragraph) Use a structured logging library (pino or winston) — not raw console.log in production
(Heading 1) 16. Implementation Order
(None) ⚠️  Complete each phase fully before moving to the next. Do not scaffold future features.
(List Paragraph) Core infrastructure — monorepo setup, TypeScript config, Neon DB connection, Drizzle schema, environment variables
(List Paragraph) Auth0 integration — login, logout, JWT validation middleware, user sync on first login, role enforcement
(List Paragraph) User system — reader profiles, admin dashboard reader creation with image upload, online/offline toggle, pricing
(List Paragraph) Stripe payment integration — balance top-up flow, webhook handler with signature verification, transaction logging
(List Paragraph) Agora integration — token generation server, Agora RTC/RTM client setup, channel join/leave
(List Paragraph) Reading system — on-demand request flow, server-side billing, grace period disconnect handling, session UI for chat/voice/video
(List Paragraph) Post-session — rating and review submission, transcript storage and display, session summaries
(List Paragraph) Client and reader dashboards — balance display, reading history, earnings, review history
(List Paragraph) Community hub — forum (posts, comments, pagination, categories, flagging), community links to Discord and Facebook
(List Paragraph) Admin dashboard completion — full transaction ledger, payout trigger, forum moderation, manual balance adjustment
(List Paragraph) Home page — online readers display, newsletter signup, community links, hero image, full design polish
(List Paragraph) Security hardening — rate limiting, Helmet.js, CORS, full input validation audit, penetration test key flows
(List Paragraph) QA — test all user flows, edge cases (low balance, disconnect, billing errors), mobile responsiveness across devices
(Heading 1) 17. About Page (Verbatim Content)
(None) ⚠️  Use the exact text below on the About page. Do not paraphrase or rewrite.
(None) At SoulSeer, we are dedicated to providing ethical, compassionate, and judgment-free spiritual guidance. Our mission is twofold: to offer clients genuine, heart-centered readings and to uphold fair, ethical standards for our readers.
(None) Founded by psychic medium Emilynn, SoulSeer was created as a response to the corporate greed that dominates many psychic platforms. Unlike other apps, our readers keep the majority of what they earn and play an active role in shaping the platform.
(None) SoulSeer is more than just an app — it's a soul tribe. A community of gifted psychics united by our life's calling: to guide, heal, and empower those who seek clarity on their journey.
(List Paragraph) Founder image: https://i.postimg.cc/s2ds9RtC/FOUNDER.jpg
(Heading 1) 18. Deferred to Future Build Phase
(None) The following features from the full SoulSeer build guide are explicitly NOT part of this launch. Do not build, scaffold, or create placeholder routes for any of these.
(List Paragraph) Live streaming and virtual gifting
(List Paragraph) Marketplace and shop (physical and digital products)
(List Paragraph) Scheduled/booked readings (fixed-price, calendar-based)
(List Paragraph) Direct messaging between users
(List Paragraph) Automated reader payout scheduling (manual only in this phase)
(List Paragraph) Push notifications
(List Paragraph) Email marketing integration
(List Paragraph) PWA / offline functionality
(List Paragraph) Availability calendar for readers
(List Paragraph) Social sharing features
(None) ⚠️  The codebase must be built with modular architecture so these features can be added cleanly in the next phase without requiring a rewrite of core systems.