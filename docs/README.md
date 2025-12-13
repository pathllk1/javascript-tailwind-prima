# Application Documentation

This document provides comprehensive information about the application, including setup instructions, architecture overview, and usage guidelines.

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Setup Instructions](#setup-instructions)
5. [API Documentation](#api-documentation)
6. [Security Analysis](#security-analysis)
7. [Reusable Components](#reusable-components)
8. [Additional Documentation](#additional-documentation)

## Overview
This is a secure web application built with Node.js, Express.js, and PostgreSQL. It features a complete authentication system with JWT tokens, CSRF protection, and comprehensive security measures.

## Features Implemented

### 1. User Authentication (Login/Signup)
- Secure user registration with password hashing using bcrypt
- User login with credential validation
- Session management using JWT tokens with dual-token approach
- Profile and settings pages for authenticated users
- Automatic token refresh mechanism

### 2. CSRF Protection
- Implementation of CSRF tokens for all forms
- Automatic CSRF token generation and validation
- Middleware integration with Express.js
- Selective application (exempt for public auth routes)

### 3. Token Management
- Access tokens with 15-minute expiration
- Refresh tokens with 30-day expiration
- Secure storage of refresh tokens in database
- Automatic token refresh mechanism

### 4. Directory Structure
- Organized file structure following best practices
- Separation of concerns with dedicated folders for controllers, routes, middleware, and utilities
- Reusable UI components in `views/components/` directory

### 5. UI JavaScript
- Client-side JavaScript for enhanced user experience
- Form validation and password visibility toggle
- Auto-dismissal of alerts
- Dropdown menu functionality
- Token expiration timer with automatic refresh

## Architecture
For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

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

5. (Optional) Set up sample users:
   ```
   npm run setup-db
   ```

6. Start the development server:
   ```
   npm run dev
   ```

## API Documentation
For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Security Analysis
For comprehensive security analysis, see [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md).

## Reusable Components
The application now includes a set of reusable UI components located in `views/components/`:

- **Alert**: Styled alert messages with different types
- **Button**: Consistent buttons with various styles and sizes
- **Card**: Content containers with optional header and footer
- **Form Field**: Consistent form inputs with labels and error handling
- **Navbar**: Navigation bar with user authentication status
- **Footer**: Consistent footer across all pages
- **Modal**: Overlay dialogs for additional content
- **Breadcrumb**: Navigation hierarchy for better UX

For detailed usage instructions, see [COMPONENTS_GUIDE.md](COMPONENTS_GUIDE.md).

## Additional Documentation

### Security Implementation Summary
See [SECURITY_IMPLEMENTATION_SUMMARY.md](SECURITY_IMPLEMENTATION_SUMMARY.md) for a detailed summary of security features.

### Environment Variables
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

### Dependencies Added
- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT token generation and validation
- `csurf`: CSRF protection
- `cookie-parser`: Cookie parsing middleware
- `helmet`: Security headers
- `dompurify`: Input sanitization
- `ejs`: Template engine

### Security Best Practices Implemented
1. Passwords are hashed before storage
2. JWT tokens are signed with strong secrets
3. Tokens are stored in HTTP-only cookies to prevent XSS attacks
4. CSRF protection on all forms
5. Secure cookie attributes (httpOnly, secure, sameSite)
6. Input validation and sanitization
7. Separation of public and protected routes
8. Proper error handling without exposing sensitive information

### Future Improvements
1. Implement rate limiting for authentication endpoints
2. Add two-factor authentication (2FA)
3. Implement account lockout after failed attempts
4. Add email verification for new accounts
5. Implement password strength requirements
6. Add session management features
7. Implement logout on all devices functionality