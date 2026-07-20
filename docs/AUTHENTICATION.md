# Authentication System - Smart House Rental Platform

## Overview

This platform implements a **production-grade JWT authentication system** with **refresh token rotation** and **role-based access control (RBAC)**, following industry security best practices.

## Architecture

### Token Strategy

We use a **dual-token approach**:

1. **Access Token** (Short-lived: 15 minutes)
   - Stored in memory (frontend)
   - Contains user ID and role
   - Used for API authentication
   - Sent in `Authorization: Bearer <token>` header

2. **Refresh Token** (Long-lived: 7 days)
   - Stored in HTTP-Only cookie
   - Cannot be accessed by JavaScript (XSS protection)
   - Used only to generate new access tokens
   - Automatically rotated on each use

### Security Features

✅ **Token Rotation**: Refresh tokens are invalidated and replaced on each use  
✅ **Account Locking**: 5 failed login attempts = 30-minute lockout  
✅ **HTTP-Only Cookies**: Refresh tokens protected from XSS attacks  
✅ **CSRF Protection**: `SameSite=Strict` cookie policy  
✅ **Role-Based Access Control**: RENTER, OWNER, ADMIN roles  
✅ **Password Hashing**: bcrypt with 12 salt rounds  
✅ **Rate Limiting**: Prevents brute-force attacks

---

## API Endpoints

### 1. Register

**POST** `/api/auth/register`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "RENTER",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies Set:**

- `refreshToken` (HTTP-Only, Secure, SameSite=Strict)

---

### 2. Login

**POST** `/api/auth/login`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "RENTER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

- `401`: Invalid credentials
- `423`: Account locked (after 5 failed attempts)

---

### 3. Refresh Token

**POST** `/api/auth/refresh-token`

**Headers:**

- Cookie: `refreshToken=<token>`

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Behavior:**

- Old refresh token is invalidated
- New refresh token is set in cookie
- New access token is returned

---

### 4. Logout

**POST** `/api/auth/logout`

**Headers:**

- Cookie: `refreshToken=<token>`

**Response:**

```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

**Behavior:**

- Refresh token is invalidated in database
- Cookie is cleared

---

### 5. Get Current User

**GET** `/api/auth/me`

**Headers:**

- `Authorization: Bearer <accessToken>`

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "RENTER",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Frontend Integration

### 1. Login Flow

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important: sends cookies
  body: JSON.stringify({ email, password }),
});

const { data } = await response.json();
// Store access token in memory (React state, Zustand, Redux, etc.)
setAccessToken(data.accessToken);
```

### 2. Making Authenticated Requests

```typescript
const response = await fetch('/api/properties', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  credentials: 'include', // Important: sends refresh token cookie
});
```

### 3. Handling Token Expiry

```typescript
// Axios interceptor example
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If access token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh the token
        const { data } = await axios.post(
          '/api/auth/refresh-token',
          {},
          {
            withCredentials: true,
          }
        );

        // Update access token
        setAccessToken(data.accessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Role-Based Access Control (RBAC)

### Available Roles

- **RENTER**: Default role for regular users browsing properties
- **OWNER**: Property owners who list rentals
- **ADMIN**: Platform administrators

### Using RBAC in Routes

```typescript
import { requireAuth, restrictTo } from './middlewares/auth.middleware';

// Only authenticated users
router.get('/profile', requireAuth, controller.getProfile);

// Only owners and admins
router.post('/properties', requireAuth, restrictTo('OWNER', 'ADMIN'), controller.createProperty);

// Only admins
router.delete('/users/:id', requireAuth, restrictTo('ADMIN'), controller.deleteUser);
```

---

## Security Checklist

### ✅ Implemented

- [x] JWT with short-lived access tokens (15 min)
- [x] Refresh token rotation
- [x] HTTP-Only cookies for refresh tokens
- [x] Password hashing with bcrypt (12 rounds)
- [x] Account locking after failed attempts
- [x] Role-based access control
- [x] CORS with credentials support
- [x] Rate limiting on auth endpoints
- [x] Secure cookie flags (HttpOnly, Secure, SameSite)

### 🔄 Recommended Enhancements

- [ ] Email verification on registration
- [ ] Password reset via email/SMS
- [ ] Two-factor authentication (2FA)
- [ ] Session management (view active sessions)
- [ ] IP-based rate limiting
- [ ] Audit logging for security events

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-refresh-token-secret-must-be-different-and-at-least-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

---

## Database Schema

### User Model

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  password        String
  name            String?
  role            UserRole @default(RENTER)

  // Security fields
  isActive        Boolean  @default(true)
  failedAttempts  Int      @default(0)
  lockedUntil     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  refreshTokens   RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Testing

### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smart-rental.com","password":"Admin@123"}' \
  -c cookies.txt
```

### Test Authenticated Request

```bash
# Extract access token from login response
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Test Refresh Token

```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -b cookies.txt \
  -c cookies.txt
```

---

## Common Issues & Solutions

### Issue: "Refresh token not found"

**Cause**: Frontend not sending cookies  
**Solution**: Ensure `credentials: 'include'` in fetch/axios

### Issue: CORS error with cookies

**Cause**: CORS not configured for credentials  
**Solution**: Backend has `credentials: true` in CORS config

### Issue: Token expired immediately

**Cause**: Server/client time mismatch  
**Solution**: Sync system clocks or use longer expiry for testing

---

## License

MIT
