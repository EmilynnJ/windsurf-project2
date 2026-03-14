# SoulSeer Admin Panel Documentation

## Overview

The SoulSeer Admin Panel provides comprehensive administrative capabilities for managing the SoulSeer platform. This includes user management, financial oversight, content moderation, and real-time monitoring of platform activities.

## Features

### 1. Admin Dashboard (Main Overview)

- **URL**: `/admin`
- **Purpose**: Central dashboard with key metrics and statistics
- **Features**:
  - Total users count and role breakdown
  - Online users count
  - Platform financial overview (revenue, payouts, net balance)
  - Reading session statistics
  - Balance distribution statistics
  - Recent registration trends

### 2. User Management

- **URL**: `/admin/users`
- **Purpose**: Complete user lifecycle management
- **Features**:
  - Search users by name, email, or username
  - Filter by role (client, reader, admin) and online status
  - View detailed user profiles
  - Create new users with full control
  - Update user information (role, balance, pricing, etc.)
  - Delete users with confirmation
  - Bulk operations (update multiple users at once)
  - Pagination for large user lists

### 3. Financial Ledger

- **URL**: `/admin/transactions`
- **Purpose**: Comprehensive financial tracking and oversight
- **Features**:
  - Filter transactions by type, user, date range
  - View all transaction types:
    - Top-ups (user deposits)
    - Reading charges (session payments)
    - Paid messages (message unlock fees)
    - Payouts (reader withdrawals)
    - Manual adjustments
  - Financial summary cards (total revenue, payouts, net balance)
  - Detailed transaction history with user information
  - Stripe integration tracking

### 4. Reading Sessions Monitoring

- **URL**: `/admin/readings`
- **Purpose**: Monitor and manage reading sessions
- **Features**:
  - Filter by status (pending, accepted, in_progress, completed, cancelled)
  - Filter by type (chat, voice, video)
  - Filter by reader or client ID
  - View session details:
    - Duration and billed minutes
    - Pricing and total cost
    - User ratings and reviews
    - Session timestamps
  - Active session monitoring
  - Revenue tracking per session type

### 5. Forum Moderation

- **URL**: `/admin/forum`
- **Purpose**: Content moderation for community forums
- **Features**:
  - View flagged posts and comments
  - Filter by review status (pending, reviewed)
  - Content preview with truncation
  - Moderation actions:
    - Approve content
    - Remove content
    - Ban users
  - Reporter information
  - Content context (post title, comment content)

### 6. Manual Balance Adjustment

- **URL**: `/admin/balance`
- **Purpose**: Manual balance management for users
- **Features**:
  - Search and select users
  - Enter adjustment amount (positive or negative)
  - Provide reason for adjustment
  - Add optional notes
  - Real-time balance display
  - Success confirmation with new balance

## API Endpoints

### Admin Authentication

All admin endpoints require:

- **Authentication**: Bearer token in Authorization header
- **Authorization**: User must have admin role
- **Headers**: `Authorization: Bearer <token>`

### User Management Endpoints

#### GET `/api/admin/stats`

- **Purpose**: Get platform statistics
- **Response**: Comprehensive stats including user counts, financial data, reading stats
- **Example Response**:

```json
{
  "totalUsers": 150,
  "roleBreakdown": {"client": 120, "reader": 25, "admin": 5},
  "onlineUsers": 23,
  "balanceStats": {"total": 5000, "average": 33.33, "min": 0, "max": 500},
  "financialStats": {"totalRevenue": 2500, "totalPayouts": 1800, "totalTransactions": 150}
}
```

#### GET `/api/admin/users/search`

- **Purpose**: Search and filter users
- **Query Parameters**:
  - `q`: Search query (name, email, username)
  - `role`: Filter by role
  - `isOnline`: Filter by online status
  - `limit`: Results per page (default: 20)
  - `offset`: Pagination offset
- **Response**: Paginated user list with full details

#### POST `/api/admin/users`

- **Purpose**: Create new user
- **Body**: User creation data
- **Validation**: Email and username uniqueness required

#### PUT `/api/admin/users/:id`

- **Purpose**: Update user information
- **Body**: Partial user update data
- **Restrictions**: Cannot change own admin role

#### DELETE `/api/admin/users/:id`

- **Purpose**: Delete user
- **Restrictions**: Cannot delete other admins or self

#### PATCH `/api/admin/users/bulk-update`

- **Purpose**: Update multiple users at once
- **Body**:

```json
{
  "userIds": [1, 2, 3],
  "updates": {"role": "reader", "isOnline": true}
}
```

#### DELETE `/api/admin/users/bulk-delete`

- **Purpose**: Delete multiple users
- **Body**:

```json
{
  "userIds": [1, 2, 3],
  "reason": "Spam accounts"
}
```

### Financial Endpoints

#### GET `/api/admin/transactions`

- **Purpose**: Get transaction history
- **Query Parameters**:
  - `type`: Filter by transaction type
  - `userId`: Filter by user
  - `startDate`, `endDate`: Date range filtering
  - `limit`, `offset`: Pagination

#### POST `/api/admin/balance/adjust`

- **Purpose**: Manually adjust user balance
- **Body**:

```json
{
  "userId": 123,
  "amount": 50,
  "reason": "Manual adjustment",
  "note": "Bonus for good behavior"
}
```

### Reading Session Endpoints

#### GET `/api/admin/readings`

- **Purpose**: Get reading session history
- **Query Parameters**:
  - `status`: Filter by session status
  - `type`: Filter by session type
  - `readerId`, `clientId`: Filter by participants

### Forum Moderation Endpoints

#### GET `/api/admin/forum/flags`

- **Purpose**: Get flagged content for moderation
- **Query Parameters**:
  - `reviewed`: Filter by review status

#### POST `/api/admin/forum/moderate`

- **Purpose**: Perform moderation actions
- **Body**:

```json
{
  "action": "approve|remove|ban_user",
  "reason": "Moderation reason",
  "postId": 123,
  "commentId": 456,
  "userId": 789
}
```

#### GET `/api/admin/sessions/active`

- **Purpose**: Get currently active reading sessions
- **Response**: List of in-progress sessions with participant details

## Frontend Components

### AdminNavigation

- **Location**: `client/src/components/AdminNavigation.tsx`
- **Purpose**: Sidebar navigation for admin panel
- **Features**: Route-based active states, logout functionality

### AdminLayout

- **Location**: `client/src/pages/admin/AdminLayout.tsx`
- **Purpose**: Main layout wrapper for admin pages
- **Features**: Header with admin panel branding, content area

### AdminDashboard

- **Location**: `client/src/pages/admin/AdminDashboard.tsx`
- **Purpose**: Main dashboard page
- **Features**: Statistics cards, data visualization, responsive design

### UserManagement

- **Location**: `client/src/pages/admin/UserManagement.tsx`
- **Purpose**: User management interface
- **Features**: Search, filtering, bulk operations, pagination

### FinancialLedger

- **Location**: `client/src/pages/admin/FinancialLedger.tsx`
- **Purpose**: Financial tracking interface
- **Features**: Transaction filtering, financial summaries, detailed views

### ReadingSessions

- **Location**: `client/src/pages/admin/ReadingSessions.tsx`
- **Purpose**: Reading session monitoring
- **Features**: Session filtering, duration tracking, rating display

### ForumModeration

- **Location**: `client/src/pages/admin/ForumModeration.tsx`
- **Purpose**: Content moderation interface
- **Features**: Flag management, content preview, moderation actions

### BalanceAdjustment

- **Location**: `client/src/pages/admin/BalanceAdjustment.tsx`
- **Purpose**: Manual balance management
- **Features**: User search, adjustment forms, real-time validation

## Security Features

### Authentication

- JWT token-based authentication
- Admin role verification
- Token expiration handling

### Authorization

- Role-based access control
- Admin-only endpoint protection
- Self-protection (cannot modify own admin role)

### Data Validation

- Input validation on all endpoints
- Zod schema validation
- SQL injection protection through parameterized queries

### Audit Trail

- All admin actions are logged
- Transaction history maintained
- User modification tracking

## Error Handling

### Client-Side Errors

- Network error handling
- Validation error display
- Loading states and spinners
- Success/error message notifications

### Server-Side Errors

- Proper HTTP status codes
- Detailed error messages
- Graceful degradation
- Logging for debugging

## Performance Considerations

### Database Optimization

- Indexed queries for user search
- Paginated results for large datasets
- Efficient joins for related data

### Frontend Optimization

- Lazy loading of components
- Efficient state management
- Optimized rendering with memoization

### Caching

- API response caching where appropriate
- Database query optimization
- Frontend data caching for better UX

## Deployment

### Environment Variables

- `AUTH0_DOMAIN`: Auth0 domain for authentication
- `AUTH0_AUDIENCE`: Auth0 audience for JWT validation
- `CORS_ORIGIN`: Allowed CORS origins
- `PORT`: Server port (default: 3001)

### Database Setup

- Ensure all tables are migrated
- Indexes created for performance
- Proper foreign key constraints

### Frontend Build

- Production build optimization
- Bundle size optimization
- Static asset optimization

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check JWT token validity
   - Verify admin role assignment
   - Ensure proper Authorization header format

2. **Database Connection Issues**
   - Verify database URL and credentials
   - Check database server status
   - Ensure proper migrations

3. **Frontend Build Errors**
   - Check Node.js version compatibility
   - Verify package dependencies
   - Clear build cache if needed

### Debug Information

- Server logs for API issues
- Browser console for frontend issues
- Network tab for API call debugging
- Database logs for query issues

## Future Enhancements

### Planned Features

- Real-time dashboard updates with WebSockets
- Advanced analytics and reporting
- Bulk import/export functionality
- Role-based permissions system
- Audit log viewer
- Performance monitoring dashboard

### Integration Opportunities

- External payment processor dashboards
- Customer support ticket system
- Advanced analytics platforms
- Email notification system

## Support

For technical support or questions about the admin panel:

1. Check this documentation first
2. Review server and client logs
3. Verify environment configuration
4. Contact the development team with specific error details

## Version History

- **v1.0.0**: Initial admin panel implementation
  - Complete user management system
  - Financial ledger and transaction tracking
  - Reading session monitoring
  - Forum moderation capabilities
  - Manual balance adjustment system
  - Comprehensive API endpoints
  - Responsive frontend interface
