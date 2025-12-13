# Application Architecture Documentation

## Overview
This document provides a comprehensive overview of the application architecture, including the technology stack, directory structure, component interactions, and design patterns used.

## Technology Stack
- **Backend Framework**: Express.js v5.2.1
- **Frontend Templating**: EJS (Embedded JavaScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens) with bcrypt.js for password hashing
- **Security**: Helmet.js, csurf, DOMPurify
- **Styling**: Tailwind CSS
- **Build Tools**: Concurrently, Nodemon

## Directory Structure
```
.
├── docs/                   # Documentation files
├── generated/prisma/       # Generated Prisma client
├── lib/                    # Library files (Prisma client setup)
├── prisma/                 # Prisma schema and migrations
│   ├── migrations/         # Database migration files
│   └── schema.prisma       # Prisma schema definition
├── public/                 # Static assets
│   ├── css/                # Compiled CSS files
│   └── js/                 # Client-side JavaScript
├── server/                 # Server-side application code
│   ├── config/             # Configuration files
│   ├── controller/         # Route controllers
│   ├── middleware/         # Express middleware
│   ├── routes/             # Route definitions
│   └── utils/              # Utility functions
├── views/                  # EJS templates
│   ├── css/                # Source CSS files
│   ├── layout/             # Layout templates
│   └── pages/              # Page templates
├── tests/                  # Test files (currently empty)
├── .env.example            # Environment variable template
├── index.js                # Main application entry point
├── package.json            # Project dependencies and scripts
├── prisma.config.ts        # Prisma configuration
├── setup-db.js             # Database setup script
├── tailwind.config.js      # Tailwind CSS configuration
└── test-auth.js            # Authentication utilities test script
```

## Core Components

### 1. Authentication System
The authentication system is built around JWT tokens with a dual-token approach:
- **Access Token**: Short-lived (15 minutes) for immediate authentication
- **Refresh Token**: Long-lived (30 days) for seamless user experience

#### Key Files:
- `server/utils/authUtils.js`: Password hashing, token generation and verification
- `server/middleware/authMiddleware.js`: Authentication middleware
- `server/controller/authController.js`: Authentication route handlers
- `server/config/authConfig.js`: Authentication configuration

#### Data Flow:
1. User submits login/signup credentials
2. Password is hashed using bcrypt before storage
3. JWT tokens are generated upon successful authentication
4. Tokens are stored in HTTP-only cookies for security
5. Access token is verified on each protected request
6. Expired access tokens are automatically refreshed using refresh tokens

### 2. Security Implementation
Multiple layers of security protect the application:

#### Middleware Security:
- **Helmet.js**: Sets various HTTP headers for security
- **CSRF Protection**: Uses csurf middleware for form protection
- **Input Sanitization**: DOMPurify cleanses user inputs
- **CSP Nonce**: Content Security Policy with nonce-based inline script control

#### Cookie Security:
- HTTP-only cookies prevent XSS attacks
- Secure flag ensures cookies are only sent over HTTPS in production
- SameSite attribute prevents CSRF attacks

### 3. Database Layer
The application uses Prisma ORM with PostgreSQL:

#### Models:
- **User**: Stores user information (id, email, name, username, password)
- **Token**: Stores refresh tokens with expiration dates

#### Key Features:
- Unique constraints on email and username
- Foreign key relationship between User and Token models
- Automatic cleanup of expired tokens

### 4. Frontend Components
The frontend uses EJS templates with Tailwind CSS for styling:

#### Client-Side JavaScript:
- **auth.js**: Form validation, password visibility toggle, alert auto-dismissal
- **dropdown.js**: User menu dropdown functionality
- **timer.js**: Access token expiration timer with automatic refresh

#### Key Features:
- Responsive design
- Interactive UI components
- Real-time token expiration monitoring
- Accessible dropdown menus

## API Endpoints

### Public Routes
- `GET /` - Home page
- `GET /about` - About page
- `GET /contact` - Contact page
- `POST /contact` - Contact form submission (CSRF protected)

### Authentication Routes
- `GET /auth/login` - Login page
- `POST /auth/login` - Login submission
- `GET /auth/signup` - Signup page
- `POST /auth/signup` - Signup submission
- `GET /auth/logout` - Logout endpoint
- `POST /auth/refresh-token` - Token refresh endpoint

### Protected Routes
- `GET /profile` - User profile page (requires authentication)
- `GET /settings` - Account settings page (requires authentication)

## Middleware Chain
The application uses a layered middleware approach:

1. **CSP Nonce Middleware**: Generates nonce for Content Security Policy
2. **Security Headers**: Helmet.js sets security headers
3. **Input Sanitization**: Cleanses user inputs
4. **Cookie Parser**: Parses cookies
5. **Body Parser**: Parses request bodies
6. **View Engine**: Sets EJS as templating engine
7. **Optional Authentication**: Makes user info available to views
8. **Route Handlers**: Specific middleware for different route groups

## Design Patterns
- **MVC Pattern**: Model-View-Controller separation
- **Middleware Pattern**: Express middleware for cross-cutting concerns
- **Factory Pattern**: Utility functions for creating and verifying tokens
- **Singleton Pattern**: Prisma client instance

## Environment Configuration
The application uses environment variables for configuration:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for signing access tokens
- `JWT_REFRESH_SECRET`: Secret for signing refresh tokens
- `PORT`: Server port
- `NODE_ENV`: Environment (development/production)

## Build Process
- **Development**: Uses nodemon for auto-restart and concurrently for parallel processes
- **CSS**: Tailwind CSS compiled with watch mode
- **Database**: Prisma migrations and client generation

## Error Handling
- Graceful error handling throughout the application
- User-friendly error messages
- Proper HTTP status codes
- Console logging for debugging