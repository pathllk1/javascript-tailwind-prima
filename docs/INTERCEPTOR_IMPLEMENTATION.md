# Interceptor Implementation

This document describes the implementation of the client-side interceptor for automated CSRF protection and access/refresh token management.

## Overview

The interceptor automatically handles:
1. CSRF token injection for all AJAX requests
2. Access token refresh mechanism
3. Request/response interception for protected routes

## Files Modified

### 1. New Files
- `public/js/interceptor.js` - Main interceptor implementation

### 2. Modified Files
- `views/layout/header.ejs` - Added interceptor script and metadata tags
- `server/routes/protectedRoutes.js` - Added CSRF token middleware
- `server/routes/publicRoutes.js` - Added CSRF token middleware for contact page
- `server/routes/excel-automation/excelRoutes.js` - Added CSRF protection for Excel routes
- `server/controller/publicController.js` - Updated to pass CSRF token to views
- `server/controller/excel-automation/excelController.js` - Updated to pass CSRF token and token expiration to views

## Implementation Details

### Interceptor Features

1. **CSRF Protection**
   - Automatically adds `X-CSRF-Token` header to all non-GET requests
   - Retrieves CSRF token from meta tag in HTML head
   - Works with both `fetch()` and `XMLHttpRequest`

2. **Token Management**
   - Monitors access token expiration
   - Automatically refreshes tokens 1 minute before expiration
   - Queues requests during token refresh
   - Processes queued requests after successful refresh

3. **Integration Points**
   - Works seamlessly with existing authentication system
   - Compatible with current timer.js implementation
   - No breaking changes to existing functionality

### How It Works

1. **Initialization**
   - Interceptor initializes when DOM is loaded
   - Reads CSRF token and token expiration from meta tags
   - Overrides `fetch()` and `XMLHttpRequest` methods

2. **Request Interception**
   - For non-GET requests, automatically adds CSRF token header
   - Checks token expiration before sending requests
   - Queues requests if token refresh is in progress

3. **Token Refresh**
   - Triggers automatic refresh 1 minute before token expiration
   - Prevents multiple simultaneous refresh requests
   - Processes queued requests after successful refresh
   - Redirects to login page on refresh failure

## Usage

The interceptor works automatically once included in the page. No additional setup is required.

### Manual API

The interceptor exposes a global `AuthInterceptor` object with the following methods:

```javascript
// Update CSRF token
AuthInterceptor.updateCsrfToken(newToken);

// Update token expiration time
AuthInterceptor.updateTokenExpiration(expirationTimestamp);

// Force token refresh
AuthInterceptor.refreshToken();
```

## Security Considerations

1. CSRF tokens are stored in HTTP-only cookies and meta tags
2. Access tokens are automatically refreshed without user intervention
3. All AJAX requests to protected routes are secured with CSRF protection
4. Token refresh mechanism prevents session timeouts during active usage

## Testing

The interceptor has been tested with:
1. Standard form submissions
2. AJAX requests using fetch API
3. AJAX requests using XMLHttpRequest
4. Concurrent requests during token refresh
5. Token expiration scenarios
6. Network error handling

## Future Improvements

1. Add retry mechanism for failed requests
2. Implement more granular error handling
3. Add support for custom header names
4. Enhance logging for debugging purposes