# 🔐 Hybrid Authentication Demo

A complete example demonstrating **hybrid authentication** using:
- **Access Token**: Stored in localStorage, sent in Authorization header
- **Refresh Token**: Stored in httpOnly cookie, automatically sent by browser

## 🎯 Why Hybrid Authentication?

### The Problem
- **Pure httpOnly cookies**: Can fail on mobile browsers, in-app browsers
- **Pure localStorage**: Vulnerable to XSS attacks
- **Hybrid approach**: Best of both worlds - secure + compatible

### The Solution
- **Access Token** (15 min): Short-lived, stored in localStorage, used for API calls
- **Refresh Token** (7 days): Long-lived, stored in httpOnly cookie, used only for refreshing

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Browser       │
│   (React)       │    │   (Express)     │    │   (Cookie)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Login Request      │                       │
         │──────────────────────▶│                       │
         │                       │                       │
         │ 2. Access Token       │                       │
         │◀──────────────────────│                       │
         │                       │                       │
         │ 3. Refresh Token      │                       │
         │◀──────────────────────│ 4. Store in Cookie    │
         │                       │──────────────────────▶│
         │                       │                       │
         │ 5. API Call           │                       │
         │ (Auth Header)         │                       │
         │──────────────────────▶│                       │
         │                       │                       │
         │ 6. Token Expired      │                       │
         │◀──────────────────────│                       │
         │                       │                       │
         │ 7. Refresh Request    │                       │
         │──────────────────────▶│ 8. Send Cookie       │
         │                       │◀──────────────────────│
         │                       │                       │
         │ 9. New Access Token   │                       │
         │◀──────────────────────│                       │
```

## 🚀 Quick Start

### 1. Start Backend
```bash
cd hybrid-storage
node server.js
```
Backend will run on: http://localhost:4000

### 2. Start Frontend
```bash
cd hybrid-storage/frontend
npm run dev
```
Frontend will run on: http://localhost:5173

### 3. Test Login
- **Email**: `user@example.com`
- **Password**: `password123`

## 🔧 How It Works

### Login Flow
1. User submits credentials
2. Backend validates and creates:
   - **Access Token** (15 min expiry) - returned in response body
   - **Refresh Token** (7 days expiry) - set as httpOnly cookie
3. Frontend stores access token in localStorage
4. Browser automatically stores refresh token in cookie storage

### API Request Flow
1. Frontend sends access token in `Authorization: Bearer <token>` header
2. Backend validates access token
3. If valid: returns data
4. If expired: returns 401 with `TOKEN_EXPIRED` code

### Token Refresh Flow
1. Frontend detects `TOKEN_EXPIRED` error
2. Frontend calls `/api/refresh-token` (no headers needed)
3. Browser automatically sends httpOnly refresh token cookie
4. Backend validates refresh token and issues new access token
5. Frontend updates localStorage with new access token
6. Original request is retried with new token

### Logout Flow
1. Frontend calls `/api/logout`
2. Backend clears refresh token from database
3. Backend clears httpOnly cookie
4. Frontend removes access token from localStorage

## 📁 Project Structure

```
hybrid-storage/
├── server.js              # Backend with hybrid auth
├── package.json           # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # React app with auth logic
│   │   ├── App.css        # Styling
│   │   └── main.jsx       # Entry point
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

## 🔑 Key Features

### Backend (`server.js`)
- ✅ JWT-based access and refresh tokens
- ✅ httpOnly cookie for refresh token
- ✅ Token rotation (new refresh token on each refresh)
- ✅ Database storage for refresh tokens (mock Map)
- ✅ Automatic token expiration handling
- ✅ CORS configuration for credentials

### Frontend (`App.jsx`)
- ✅ Custom `useApi` hook for automatic token refresh
- ✅ Access token stored in localStorage
- ✅ Automatic retry on token expiration
- ✅ Protected routes with React Router
- ✅ Clean login/logout flow
- ✅ Error handling and loading states

## 🛡️ Security Features

### Access Token
- **Short-lived** (15 minutes)
- **Stored in localStorage** (accessible to JavaScript)
- **Sent in Authorization header**
- **Vulnerable to XSS** (but short-lived)

### Refresh Token
- **Long-lived** (7 days)
- **Stored in httpOnly cookie** (not accessible to JavaScript)
- **Automatically sent by browser**
- **Protected from XSS**
- **Stored in database** (can be revoked)

## 🧪 Testing Scenarios

### 1. Normal Login
1. Visit http://localhost:5173
2. Login with test credentials
3. Verify dashboard loads with modules

### 2. Token Refresh
1. Login successfully
2. Wait 15 minutes (or modify server.js to use shorter expiry)
3. Make an API call
4. Verify token is automatically refreshed

### 3. Logout
1. Click logout button
2. Verify redirected to login
3. Verify cannot access dashboard

### 4. Browser DevTools
1. Open DevTools → Application → Storage
2. Check localStorage for access token
3. Check Cookies for refresh token (httpOnly)

## 🔄 Token Storage Comparison

| Storage Method | Access Token | Refresh Token | Security | Compatibility |
|----------------|--------------|---------------|----------|---------------|
| **localStorage** | ✅ | ❌ | Medium | High |
| **httpOnly Cookie** | ❌ | ✅ | High | Medium |
| **Hybrid** | ✅ | ✅ | High | High |

## 🚨 Production Considerations

### Security
- Use environment variables for secrets
- Enable HTTPS (`secure: true` for cookies)
- Implement rate limiting
- Add CSRF protection
- Use strong JWT secrets

### Database
- Replace Map with real database (Redis/PostgreSQL)
- Add refresh token blacklisting
- Implement token rotation policies

### Monitoring
- Log authentication events
- Monitor token refresh patterns
- Alert on suspicious activity

## 📚 Learn More

- [JWT.io](https://jwt.io/) - JWT documentation
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [MDN HTTP-only Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)
- [React Router Documentation](https://reactrouter.com/)

---

**This demo shows the recommended approach for modern web applications that need both security and cross-browser compatibility!** 🎉 