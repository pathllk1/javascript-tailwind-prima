# Application Documentation

This document provides comprehensive information about the application, including setup instructions, architecture overview, and usage guidelines.

## Table of Contents
1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Advanced Features](#advanced-features)
4. [Architecture](#architecture)
5. [Setup Instructions](#setup-instructions)
6. [API Documentation](#api-documentation)
7. [Security Analysis](#security-analysis)
8. [Reusable Components](#reusable-components)
9. [Additional Documentation](#additional-documentation)
## Overview
This is a secure web application built with Node.js, Express.js, and PostgreSQL. It features a complete authentication system with JWT tokens, CSRF protection, and comprehensive security measures.

## Core Features Implemented

### 1. User Authentication (Login/Signup)
- Secure user registration with password hashing using bcrypt (10 salt rounds)
- User login with credential validation and rate limiting protection
- Session management using JWT tokens with dual-token approach (15-minute access tokens, 30-day refresh tokens)
- Profile and settings pages for authenticated users with personalized content
- Automatic token refresh mechanism with queue management for concurrent requests
- Secure storage of refresh tokens in database with automatic cleanup of expired tokens
- Logout functionality that clears both client-side cookies and server-side tokens

### 2. CSRF Protection
- Implementation of CSRF tokens for all forms using csurf middleware
- Automatic CSRF token generation and validation on each request
- Middleware integration with Express.js for seamless protection
- Selective application (exempt for public auth routes)
- Double-submit cookie pattern for robust CSRF protection
- Automatic token refreshing to prevent expiration issues

### 3. Token Management
- Access tokens with 15-minute expiration for security
- Refresh tokens with 30-day expiration for user convenience
- Secure storage of refresh tokens in database with automatic cleanup of expired tokens
- Automatic token refresh mechanism with queue management for concurrent requests
- Token revocation functionality for enhanced security
- Refresh token rotation to prevent replay attacks

### 4. Silent Navigation System
- AJAX-based page transitions without full page reloads for improved performance
- Smooth user experience similar to Single Page Applications (SPAs)
- History API integration for proper browser navigation and back button support
- Lazy loading with hover-based prefetching for performance optimization
- Progress bar during navigation for better user feedback
- Error handling for failed navigation requests
- Component re-initialization after navigation to maintain functionality

### 5. Client-Side Interceptor
- Automated CSRF protection for all AJAX requests with automatic token injection
- Access/refresh token management with automatic refresh and expiration handling
- Request/response interception for protected routes with seamless authentication
- Queue management during token refresh to prevent request loss
- Error handling for authentication failures and redirects to login
- Configurable for different API endpoints and authentication schemes

### 6. Directory Structure
- Organized file structure following MVC and modular architecture
- Separation of concerns with dedicated folders for controllers, routes, middleware, and utilities
- Reusable UI components in `views/components/` directory
- Feature-based organization (Excel automation, Live Stock Data)
- Clear naming conventions for easy navigation
- Consistent structure across all modules
- Separation of client-side and server-side code
- Dedicated directories for static assets and templates

### 7. UI JavaScript
- Client-side JavaScript for enhanced user experience
- Form validation and password visibility toggle
- Auto-dismissal of alerts after configurable timeouts
- Dropdown menu functionality with keyboard navigation support
- Token expiration timer with automatic refresh and user notifications
- Comprehensive component re-initialization after navigation
- Responsive design adjustments for different screen sizes
- Accessibility features for improved usability

## Advanced Features Implemented

### 1. Excel Automation System
- Upload and process Excel files (.xlsx, .xls) with 5MB size validation
- Multi-sheet support with intuitive sheet selection interface
- Interactive table editor with cell editing capabilities (double-click or Enter to edit)
- Automatic data type detection for columns (text, number, date, boolean)
- Column-based filtering with type-appropriate filter interfaces
- Global search across all columns with real-time filtering
- Sorting capabilities for all columns (ascending/descending)
- Export functionality to download edited data as Excel files
- Session-based data persistence during user session
- Drag-and-drop file upload support
- Progress indication during file processing
- Error handling and user feedback for upload issues

### 2. Live Stock Data System
- Real-time stock market data with automatic updates every 5 minutes through background service
- Integration with Yahoo Finance API for comprehensive live data (OHLCV information)
- WebSocket-based real-time updates for instant data refresh to all connected clients
- Comprehensive stock data display (current price, previous close, day range, volume)
- Detailed stock insights with interactive charts, fundamentals, options, insider transactions, and recommendations
- Search and sort functionality for stock data with multiple criteria
- Responsive design for all device sizes with mobile-friendly interface
- Batch processing of stock symbols (25 per batch) to respect API rate limits
- Error handling for failed symbol updates with detailed logging
- Data persistence in SQLite database for historical reference

### 3. Database Systems
- PostgreSQL database with Prisma ORM for user authentication and session management
- SQLite database for comprehensive OHLCV (Open, High, Low, Close, Volume) stock data storage
- Batch processing of stock symbols with rate limiting compliance (25 symbols per batch)
- Efficient querying and data storage for millions of records
- Indexed queries and prepared statements for optimal performance
- Automatic database schema initialization and migration support
- Connection pooling for efficient database resource utilization
- Transaction management for data consistency
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

# Session Secret
SESSION_SECRET="your_session_secret_here"
```

#### Variable Descriptions
- `DATABASE_URL`: PostgreSQL connection string for user authentication database
- `JWT_SECRET`: Secret key for signing access tokens (should be strong random string)
- `JWT_REFRESH_SECRET`: Secret key for signing refresh tokens (should be different from JWT_SECRET)
- `PORT`: Server port to listen on (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `SESSION_SECRET`: Secret key for session encryption (should be strong random string)
### Dependencies Added
- `bcryptjs`: Password hashing with 10 salt rounds for secure storage
- `jsonwebtoken`: JWT token generation and validation for authentication
- `csurf`: CSRF protection middleware for form security
- `cookie-parser`: Cookie parsing middleware for token handling
- `helmet`: Security headers middleware for HTTP security
- `dompurify`: Input sanitization to prevent XSS attacks
- `ejs`: Template engine for server-side rendering
- `exceljs`: Excel file processing for reading and writing Excel files
- `multer`: File upload handling middleware for multipart forms
- `socket.io`: Real-time WebSocket communication for live updates
- `yahoo-finance2`: Yahoo Finance API integration for stock data
- `better-sqlite3`: SQLite database driver for efficient stock data storage
- `chart.js`: Data visualization library for interactive stock charts
- `express-session`: Session management for user sessions
- `pg`: PostgreSQL client for database connectivity
### Security Best Practices Implemented
1. Passwords are hashed before storage using bcrypt with 10 salt rounds
2. JWT tokens are signed with strong, unique secrets
3. Tokens are stored in HTTP-only cookies to prevent XSS attacks
4. CSRF protection on all forms using csurf middleware with double-submit cookie pattern
5. Secure cookie attributes (httpOnly, secure, sameSite) for enhanced protection
6. Input validation and sanitization with DOMPurify to prevent XSS attacks
7. Separation of public and protected routes with authentication middleware
8. Proper error handling without exposing sensitive information or stack traces
9. Content Security Policy with nonce-based inline scripts to prevent unauthorized script execution
10. Helmet.js for comprehensive security headers including HSTS, X-Frame-Options, and X-Content-Type-Options
11. Session management with express-session and secure configuration
12. Rate limiting compliance through batch processing of API requests
13. Refresh token rotation to prevent replay attacks
14. Token revocation functionality for enhanced security
15. Input length validation to prevent buffer overflow attacks

### Future Improvements
1. Implement rate limiting for authentication endpoints to prevent brute force attacks
2. Add two-factor authentication (2FA) for enhanced account security
3. Implement account lockout after failed attempts to prevent unauthorized access
4. Add email verification for new accounts to ensure valid user registration
5. Implement password strength requirements with complexity validation
6. Add comprehensive session management features with device tracking
7. Implement logout on all devices functionality for account security
8. Add audit logging for security events and user actions
9. Implement IP-based restrictions for suspicious activity
10. Add security question backup for account recovery
11. Implement automatic session timeout for inactive users
12. Add role-based access control for different user permissions