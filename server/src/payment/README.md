# SoulSeer Payment System

This directory contains the implementation of the payment system for SoulSeer, which handles balance top-ups and transaction logging using Stripe.

## Components

### 1. Stripe Service (`stripe-service.ts`)
Handles all Stripe-related functionality:
- Creating payment intents for balance top-ups
- Processing successful payments
- Verifying webhook signatures
- Retrieving transaction history
- Getting current user balances

### 2. Webhook Handler (`webhook-handler.ts`)
Processes incoming webhooks from Stripe:
- Handles successful payment events
- Handles failed payment events
- Validates webhook signatures for security
- Updates user balances upon successful payments

### 3. Payment Routes (`payment-routes.ts`)
Exposes API endpoints for payment functionality:
- `/create-payment-intent` - Creates a new payment intent for top-ups
- `/balance` - Retrieves current user balance
- `/history` - Retrieves transaction history
- `/webhook` - Receives and processes Stripe webhooks

## API Endpoints

### POST /api/payment/create-payment-intent
Creates a new payment intent for balance top-up.

**Headers**: Authorization Bearer token
**Body**:
```json
{
  "amount": 20.00
}
```

**Response**:
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 20
}
```

### GET /api/payment/balance
Retrieves the current user's account balance.

**Headers**: Authorization Bearer token
**Response**:
```json
{
  "balance": 50.00
}
```

### GET /api/payment/history
Retrieves the user's transaction history.

**Headers**: Authorization Bearer token
**Query Parameters**:
- `limit` (optional, default: 20) - Number of records to return (max: 100)
- `offset` (optional, default: 0) - Number of records to skip

**Response**:
```json
{
  "transactions": [...],
  "limit": 20,
  "offset": 0
}
```

### POST /api/payment/webhook
Stripe webhook endpoint (requires raw body middleware).

## Security Measures

- Input validation using Zod schemas
- JWT authentication for all user-facing endpoints
- Webhook signature verification for security
- Rate limiting considerations
- SQL injection prevention through parameterized queries

## Environment Variables

- `STRIPE_SECRET_KEY` - Stripe secret key for API access
- `STRIPE_WEBHOOK_SECRET` - Secret for verifying webhook signatures

## Transaction Logging

All payment transactions are logged in the `transactions` table with:
- User ID
- Transaction type (top_up, reading_charge, etc.)
- Amount
- Balance before and after
- Stripe ID reference
- Timestamp
- Optional note

## Development Notes

The system now uses real Stripe integration. Make sure to set the following environment variables:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your webhook signing secret from Stripe dashboard

For testing, you can use Stripe's test keys.