# Security System Implementation

This document outlines the security system implemented for the application, including user authentication, CSRF protection, and token management.

## Features Implemented

### 1. User Authentication (Login/Signup)
- Secure user registration with password hashing using bcrypt
- User login with credential validation
- Session management using JWT tokens
- Profile and settings pages for authenticated users

### 2. CSRF Protection
- Implementation of CSRF tokens for all forms
- Automatic CSRF token generation and validation
- Middleware integration with Express.js

### 3. Token Management
- Access tokens with 15-minute expiration
- Refresh tokens with 30-day expiration
- Secure storage of refresh tokens in database
- Automatic token refresh mechanism

### 4. Directory Structure
- Organized file structure following best practices
- Separation of concerns with dedicated folders for controllers, routes, middleware, and utilities

### 5. UI JavaScript
- Client-side JavaScript for enhanced user experience
- Form validation and password visibility toggle
- Auto-dismissal of alerts

## File Structure

```
server/
├── config/
│   └── authConfig.js          # Authentication configuration
├── controller/
│   ├── authController.js       # Authentication logic
│   └── publicController.js     # Public page logic
├── middleware/
│   ├── authMiddleware.js       # Authentication middleware
│   └── csrfMiddleware.js       # CSRF protection middleware
├── routes/
│   ├── authRoutes.js           # Authentication routes
│   ├── protectedRoutes.js      # Protected routes
│   └── publicRoutes.js         # Public routes
├── utils/
│   └── authUtils.js            # Authentication utilities
views/
├── js/
│   └── auth.js                 # Client-side JavaScript
├── layout/
│   ├── header.ejs              # Updated header with auth UI
│   └── footer.ejs              # Footer
├── pages/
│   ├── login.ejs               # Login page
│   ├── signup.ejs              # Signup page
│   ├── profile.ejs             # User profile page
│   ├── settings.ejs            # Account settings page
│   ├── about.ejs               # Updated about page
│   ├── contact.ejs             # Updated contact page
│   └── index.ejs               # Updated home page
```

## Security Features

### Authentication Flow
1. User registers with email, username, and password
2. Password is hashed before storing in database
3. Upon successful registration/login, JWT tokens are generated:
   - Access token (15 minutes expiry)
   - Refresh token (30 days expiry)
4. Tokens are stored in HTTP-only cookies for security
5. Access token is sent with each request for authentication
6. Refresh token is used to obtain new access tokens when expired

### CSRF Protection
- All forms include a hidden CSRF token field
- Middleware validates tokens on all POST requests
- Tokens are regenerated for each session

### Public vs Protected Routes
- Public routes (home, about, contact) are accessible without authentication
- Protected routes (profile, settings) require authentication
- Authentication middleware ensures only authorized users can access protected routes

## Environment Variables

Create a `.env` file with the following variables:

```
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"

# JWT Secrets
JWT_SECRET="your_jwt_secret_key_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key_here"

# Server Port
PORT=3000

# Node Environment
NODE_ENV=development
```

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables by copying `.env.example` to `.env` and updating values

3. Run database migrations:
   ```
   npm run migrate
   ```

4. Generate Prisma client:
   ```
   npm run generate
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## Dependencies Added

- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT token generation and validation
- `csurf`: CSRF protection
- `cookie-parser`: Cookie parsing middleware

## Security Best Practices Implemented

1. Passwords are hashed before storage
2. JWT tokens are signed with strong secrets
3. Tokens are stored in HTTP-only cookies to prevent XSS attacks
4. CSRF protection on all forms
5. Secure cookie attributes (httpOnly, secure, sameSite)
6. Input validation and sanitization
7. Separation of public and protected routes
8. Proper error handling without exposing sensitive information

## Future Improvements

1. Implement rate limiting for authentication endpoints
2. Add two-factor authentication (2FA)
3. Implement account lockout after failed attempts
4. Add email verification for new accounts
5. Implement password strength requirements
6. Add session management features
7. Implement logout on all devices functionality