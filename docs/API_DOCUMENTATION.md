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

## Excel Automation Endpoints

### 1. Excel Automation Page
```
GET /excel
Authorization: Required (authenticated user)
```

**Response:**
- Renders Excel automation page template
- Shows token expiration timer

### 2. Upload Excel File
```
POST /excel/upload
Authorization: Required (authenticated user)
CSRF Protection: Required
Content-Type: multipart/form-data

excelFile={file}
```

**Response:**
- On success: JSON response with processed data, file name, and sheet names
- On error: JSON response with error message

### 3. Process Excel File in Memory
```
POST /excel/process
Authorization: Required (authenticated user)
CSRF Protection: Required
Content-Type: multipart/form-data

excelFile={file}
```

**Response:**
- On success: JSON response with processed data, file name, and sheet names
- On error: JSON response with error message

### 4. Select Worksheet
```
POST /excel/select-sheet
Authorization: Required (authenticated user)
CSRF Protection: Required
Content-Type: application/json

{
  "sheetName": "string"
}
```

**Response:**
- On success: JSON response with data from selected sheet
- On error: JSON response with error message

### 5. Save Edited Data
```
POST /excel/save
Authorization: Required (authenticated user)
CSRF Protection: Required
Content-Type: application/json

{
  "data": {
    "headers": ["string"],
    "rows": [["any"]],
    "rowCount": 0,
    "columnCount": 0
  }
}
```

**Response:**
- On success: JSON response confirming data saved
- On error: JSON response with error message

### 6. Export to Excel
```
GET /excel/export/:id
Authorization: Required (authenticated user)
```

**Response:**
- On success: Excel file download
- On error: JSON response with error message

## Live Stock Data Endpoints

### 1. Live Stock Data Page
```
GET /live-stock
Authorization: Required (authenticated user)
```

**Response:**
- Renders live stock data page template
- Shows token expiration timer

### 2. Get All Stock Symbols
```
GET /live-stock/symbols
Authorization: Required (authenticated user)
```

**Response:**
- On success: JSON array of stock symbols
- On error: JSON response with error message

### 3. Get Live Data for All Symbols
```
GET /live-stock/live-data
Authorization: Required (authenticated user)
```

**Response:**
- On success: JSON array of live stock data for all symbols
- On error: JSON response with error message

### 4. Get Live Data for Specific Symbol
```
GET /live-stock/live-data/:symbol
Authorization: Required (authenticated user)
```

**Response:**
- On success: JSON object with detailed live data for specified symbol
- On error: JSON response with error message

### 5. Get Detailed Stock Insights
```
GET /live-stock/insights/:symbol
Authorization: Required (authenticated user)
```

**Response:**
- On success: JSON object with detailed stock insights (charts, fundamentals, options, etc.)
- On error: JSON response with error message

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

Excel Automation and Live Stock Data endpoints may return additional error codes:
- 413: Payload Too Large (file exceeds size limit)
- 415: Unsupported Media Type (invalid file type)
- 429: Too Many Requests (rate limiting)

### Success Responses
Most endpoints redirect to HTML pages, but the token refresh endpoint returns JSON:
```json
{
  "message": "Token refreshed successfully",
  "expiration": 1234567890123
}
```

Excel Automation endpoints return JSON responses with data:
```json
{
  "success": true,
  "data": {
    "headers": ["Symbol", "Name", "Price"],
    "rows": [["AAPL", "Apple Inc.", 150.00]],
    "rowCount": 1,
    "columnCount": 3
  },
  "fileName": "stocks.xlsx",
  "sheetNames": ["Sheet1"]
}
```

Live Stock Data endpoints return JSON responses with market data:
```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "currentPrice": 150.00,
  "previousClose": 149.50,
  "dayRange": "149.25 - 150.50",
  "changePercent": 0.33,
  "volume": 1000000
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
- All Excel Automation endpoints that modify data require CSRF protection
- All Live Stock Data endpoints that modify data require CSRF protection

## Rate Limiting
Currently, the application does not implement rate limiting, which is a potential security improvement. However, the Live Stock Data system implements batch processing of stock symbols to comply with Yahoo Finance API rate limits.

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