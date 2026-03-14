# SoulSeer User System API Documentation

This document outlines all the API endpoints for the user system in SoulSeer, including user management, reader profiles, balance management, and profile images.

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## User Management Endpoints

### GET /api/users/:id

Get a user's profile by ID.

**Permissions**: Authenticated users can view their own profile. Admins can view any user's profile. Other users only see public information.

**Response**:

```json
{
  "id": 1,
  "username": "johndoe",
  "fullName": "John Doe",
  "role": "reader",
  "bio": "Experienced tarot reader",
  "specialties": "Tarot, Astrology",
  "profileImage": "https://example.com/image.jpg",
  "pricingChat": 100,
  "pricingVoice": 200,
  "pricingVideo": 300,
  "isOnline": true,
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### PUT /api/users/me

Update the authenticated user's profile.

**Permissions**: Authenticated user can update their own profile.

**Request Body**:

```json
{
  "username": "newusername",
  "fullName": "New Full Name",
  "bio": "New bio",
  "specialties": "New specialties",
  "profileImage": "https://example.com/new-image.jpg",
  "pricingChat": 150,
  "pricingVoice": 250,
  "pricingVideo": 350,
  "isOnline": false
}
```

**Response**:

```json
{
  "id": 1,
  "username": "newusername",
  "fullName": "New Full Name",
  "role": "reader",
  "bio": "New bio",
  "specialties": "New specialties",
  "profileImage": "https://example.com/new-image.jpg",
  "pricingChat": 150,
  "pricingVoice": 250,
  "pricingVideo": 350,
  "isOnline": false,
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### PATCH /api/users/me/online

Toggle the user's online status.

**Permissions**: Authenticated user can update their own status.

**Request Body**:

```json
{
  "isOnline": true
}
```

**Response**:

```json
{
  "message": "User is now online",
  "user": {
    "id": 1,
    "isOnline": true
  }
}
```

### GET /api/users

Search users with filters.

**Permissions**: Authenticated users can search users.

**Query Parameters**:

- `q`: Search term for username
- `role`: Filter by role (client, reader, admin)
- `isOnline`: Filter by online status (true/false)
- `limit`: Number of results to return (default: 20, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response**:

```json
{
  "users": [...],
  "count": 5,
  "limit": 20,
  "offset": 0
}
```

### POST /api/users

Create a new user (Admin only).

**Permissions**: Admin only.

**Request Body**:

```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "fullName": "New User",
  "role": "reader",
  "bio": "New user bio",
  "specialties": "Specialties",
  "pricingChat": 100,
  "pricingVoice": 200,
  "pricingVideo": 300,
  "accountBalance": 0,
  "isOnline": false
}
```

**Response**:

```json
{
  "message": "User created successfully",
  "user": { ... }
}
```

### PUT /api/users/:id

Update any user (Admin only).

**Permissions**: Admin only.

**Request Body**:
Same as PUT /api/users/me

**Response**:

```json
{
  "message": "User updated successfully",
  "user": { ... }
}
```

### DELETE /api/users/:id

Delete a user (Admin only).

**Permissions**: Admin only.

**Response**:

```json
{
  "message": "User deleted successfully"
}
```

### GET /api/users/all/:role?

Get all users with optional role filter (Admin only).

**Permissions**: Admin only.

**Query Parameters**:

- `limit`: Number of results to return (default: 20)
- `offset`: Offset for pagination (default: 0)

**Response**:

```json
{
  "users": [...],
  "count": 5,
  "limit": 20,
  "offset": 0
}
```

## Reader Endpoints

### GET /api/readers

Get all readers with filters.

**Permissions**: Public access.

**Query Parameters**:

- `q`: Search term for username
- `specialties`: Filter by specialties
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter
- `isOnline`: Filter by online status (true/false)
- `limit`: Number of results to return (default: 20, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response**:

```json
{
  "readers": [...],
  "count": 5,
  "limit": 20,
  "offset": 0
}
```

### GET /api/readers/:id

Get a specific reader by ID.

**Permissions**: Public access.

**Response**:

```json
{
  "id": 1,
  "username": "reader1",
  "fullName": "Reader One",
  "role": "reader",
  "bio": "Experienced reader",
  "specialties": "Tarot, Astrology",
  "profileImage": "https://example.com/image.jpg",
  "pricingChat": 100,
  "pricingVoice": 200,
  "pricingVideo": 300,
  "isOnline": true,
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### PUT /api/readers/me

Update the authenticated reader's profile.

**Permissions**: Reader only.

**Request Body**:

```json
{
  "bio": "Updated bio",
  "specialties": "Updated specialties",
  "profileImage": "https://example.com/new-image.jpg",
  "pricingChat": 150,
  "pricingVoice": 250,
  "pricingVideo": 350,
  "isOnline": true
}
```

**Response**:

```json
{
  "message": "Reader profile updated successfully",
  "reader": { ... }
}
```

### PATCH /api/readers/me/online

Toggle the reader's online status.

**Permissions**: Reader only.

**Request Body**:

```json
{
  "isOnline": true
}
```

**Response**:

```json
{
  "message": "Reader is now online",
  "reader": {
    "id": 1,
    "isOnline": true
  }
}
```

### PATCH /api/readers/me/pricing

Update the reader's pricing.

**Permissions**: Reader only.

**Request Body**:

```json
{
  "pricingChat": 150,
  "pricingVoice": 250,
  "pricingVideo": 350
}
```

**Response**:

```json
{
  "message": "Reader pricing updated successfully",
  "pricing": {
    "id": 1,
    "pricingChat": 150,
    "pricingVoice": 250,
    "pricingVideo": 350
  }
}
```

## Balance Management Endpoints

### GET /api/balance/me

Get the authenticated user's balance.

**Permissions**: Authenticated user.

**Response**:

```json
{
  "balance": 5000
}
```

### POST /api/balance/top-up

Top up the authenticated user's balance.

**Permissions**: Authenticated user.

**Request Body**:

```json
{
  "amount": 1000,
  "note": "Top-up from credit card"
}
```

**Response**:

```json
{
  "message": "Balance topped up successfully",
  "transaction": { ... },
  "newBalance": 6000
}
```

### PATCH /api/balance/adjust

Adjust any user's balance (Admin only).

**Permissions**: Admin only.

**Request Body**:

```json
{
  "userId": 1,
  "amount": 500,
  "note": "Bonus addition"
}
```

**Response**:

```json
{
  "message": "Balance adjusted successfully",
  "transaction": { ... },
  "newBalance": 5500
}
```

### GET /api/balance/transactions

Get the authenticated user's transaction history.

**Permissions**: Authenticated user.

**Query Parameters**:

- `limit`: Number of results to return (default: 20)
- `offset`: Offset for pagination (default: 0)

**Response**:

```json
{
  "transactions": [...],
  "count": 5,
  "limit": 20,
  "offset": 0
}
```

### GET /api/balance/transactions/:userId

Get any user's transaction history (Admin only).

**Permissions**: Admin only.

**Query Parameters**:

- `limit`: Number of results to return (default: 20)
- `offset`: Offset for pagination (default: 0)

**Response**:

```json
{
  "transactions": [...],
  "count": 5,
  "limit": 20,
  "offset": 0
}
```

## Profile Image Endpoints

### POST /api/profile-image/upload

Upload a profile image for the authenticated user.

**Permissions**: Authenticated user.

**Form Data**:

- `image`: Image file (JPEG, PNG, GIF, WEBP, max 5MB)

**Response**:

```json
{
  "message": "Profile image uploaded successfully",
  "imageUrl": "/uploads/profile-images/uuid.jpg"
}
```

### DELETE /api/profile-image/remove

Remove the authenticated user's profile image.

**Permissions**: Authenticated user.

**Response**:

```json
{
  "message": "Profile image removed successfully"
}
```

### POST /api/profile-image/upload/:userId

Upload a profile image for any user (Admin only).

**Permissions**: Admin only.

**Form Data**:

- `image`: Image file (JPEG, PNG, GIF, WEBP, max 5MB)

**Response**:

```json
{
  "message": "User profile image updated successfully",
  "imageUrl": "/uploads/profile-images/uuid.jpg"
}
```

## Notes

- Prices are stored in cents (smallest currency unit)
- Roles are: `client`, `reader`, `admin`
- All date/time values are in ISO 8601 format
- The system validates all input data using Zod schemas
- Role-based access control is enforced on all endpoints
- Pagination follows the pattern: `limit` and `offset` parameters
