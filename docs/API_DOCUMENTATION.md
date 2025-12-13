# API Documentation

## Overview
This document describes the API endpoints available in the application, including request/response formats, authentication requirements, and error handling.

## Authentication Flow

### 1. User Registration
```
POST /auth/signup
Content-Type: application/x-www-form-urlencoded

name={string}&uname={string}&email={string}&password={string}
```

**Response:**
- On success: Redirect to home page with success message
- On validation error: Render signup page with error message
- On duplicate user: Render signup page with error message

### 2. User Login
```
POST /auth/login
Content-Type: application/x-www-form-urlencoded

email={string}&password={string}
```

**Response:**
- On success: Redirect to profile page with access and refresh tokens in HTTP-only cookies
- On validation error: Render login page with error message
- On invalid credentials: Render login page with error message

### 3. User Logout
```
GET /auth/logout
```

**Response:**
- Clears access and refresh token cookies
- Redirects to home page

### 4. Token Refresh
```
POST /auth/refresh-token
```

**Response:**
- On success: JSON response with new access token and expiration time
- On error: JSON response with error message

## Public Endpoints

### 1. Home Page
```
GET /
```

**Response:**
- Renders home page template
- Shows success messages if present in query parameters

### 2. About Page
```
GET /about
```

**Response:**
- Renders about page template

### 3. Contact Page
```
GET /contact
```

**Response:**
- Renders contact page template

### 4. Contact Form Submission
```
POST /contact
Content-Type: application/x-www-form-urlencoded

name={string}&email={string}&message={string}
```

**Response:**
- Renders contact page with success message

## Protected Endpoints

### 1. User Profile
```
GET /profile
Authorization: Required (authenticated user)
```

**Response:**
- Renders profile page with user information
- Shows token expiration timer

### 2. Account Settings
```
GET /settings
Authorization: Required (authenticated user)
```

**Response:**
- Renders settings page with user information
- Shows token expiration timer

## Request/Response Formats

### Error Responses
All error responses follow this format:
```json
{
  "message": "Error description"
}
```

With appropriate HTTP status codes:
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing or invalid authentication)
- 403: Forbidden (insufficient permissions)
- 500: Internal Server Error (unexpected server error)

### Success Responses
Most endpoints redirect to HTML pages, but the token refresh endpoint returns JSON:
```json
{
  "message": "Token refreshed successfully",
  "expiration": 1234567890123
}
```

## Authentication Headers
The application accepts authentication tokens in two ways:
1. HTTP-only cookies (preferred method)
2. Authorization header with Bearer token

## CSRF Protection
Forms that modify data require a CSRF token:
- Login and signup forms are exempt (public routes)
- Contact form, profile updates, and settings changes require CSRF protection

## Rate Limiting
Currently, the application does not implement rate limiting, which is a potential security improvement.

## CORS Policy
The application uses default CORS settings, which restrict cross-origin requests to the same origin.

## Security Headers
The application implements comprehensive security headers through Helmet.js:
- Content Security Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- HTTP Strict Transport Security
- Referrer Policy
- DNS Prefetch Control

## Cookie Security
Authentication tokens are stored in HTTP-only cookies with the following attributes:
- `httpOnly`: Prevents XSS attacks
- `secure`: Only sent over HTTPS in production
- `sameSite`: Prevents CSRF attacks
- `maxAge`: Sets expiration time

## Input Validation
All user inputs are validated and sanitized:
- Server-side validation for required fields
- Email format validation
- Password strength recommendations (not enforced)
- Input sanitization using DOMPurify

## Error Handling
The application implements graceful error handling:
- Database errors are caught and logged
- User-friendly error messages are displayed
- Sensitive information is not exposed in error responses
- Proper HTTP status codes are returned