# Application Architecture Documentation

## Overview
This document provides a comprehensive overview of the application architecture, including the technology stack, directory structure, component interactions, and design patterns used.

## Technology Stack
- **Backend Framework**: Express.js v5.2.1
- **Frontend Templating**: EJS (Embedded JavaScript)
- **Database**: PostgreSQL with Prisma ORM for user authentication, SQLite for stock data
- **Authentication**: JWT (JSON Web Tokens) with bcrypt.js for password hashing
- **Security**: Helmet.js, csurf, DOMPurify
- **Styling**: Tailwind CSS
- **Build Tools**: Concurrently, Nodemon
- **Excel Processing**: ExcelJS for reading and writing Excel files
- **Real-time Communication**: Socket.IO for WebSocket connections
- **Financial Data**: yahoo-finance2 for fetching stock market data
- **Data Visualization**: Chart.js for displaying stock charts

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
│   │   └── excel-automation/ # Excel automation specific styles
│   └── js/                 # Client-side JavaScript
│       ├── excel-automation/ # Excel automation scripts
│       ├── live-stock/      # Live stock data scripts
│       └── services/        # Shared services (e.g., socketService.js)
├── server/                 # Server-side application code
│   ├── config/             # Configuration files
│   ├── controller/         # Route controllers
│   │   ├── excel-automation/ # Excel automation controllers
│   │   └── live-stock/      # Live stock data controllers
│   ├── middleware/         # Express middleware
│   ├── routes/             # Route definitions
│   │   ├── excel-automation/ # Excel automation routes
│   │   └── live-stock/      # Live stock data routes
│   └── utils/              # Utility functions
│       ├── excel-automation/ # Excel processing utilities
│       └── live-stock/      # Live stock data utilities
├── views/                  # EJS templates
│   ├── components/         # Reusable UI components
│   │   └── excel-automation/ # Excel automation components
│   ├── css/                # Source CSS files
│   ├── layout/             # Layout templates
│   └── pages/              # Page templates
│       ├── excel-automation/ # Excel automation pages
│       └── live-stock/      # Live stock data pages
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

### 5. Excel Automation System
The Excel Automation System provides comprehensive functionality for uploading, processing, editing, and exporting Excel files directly in the browser.

#### Key Features:
- File upload with drag-and-drop support
- Multi-sheet Excel file processing
- Interactive table editor with cell-level editing
- Automatic data type detection for columns
- Advanced filtering capabilities with type-specific filter interfaces
- Global search across all columns
- Column sorting (ascending/descending)
- Data persistence and export functionality

#### Key Files:
- `server/controller/excel-automation/excelController.js`: Handles Excel file upload, processing, and export
- `server/utils/excel-automation/excelProcessor.js`: Processes Excel files using ExcelJS library
- `server/routes/excel-automation/excelRoutes.js`: Defines Excel automation API endpoints
- `public/js/excel-automation/excel.js`: Client-side file upload and UI management
- `public/js/excel-automation/tableEditor.js`: Interactive table editing functionality
- `public/js/excel-automation/dataTypeDetector.js`: Automatic detection of column data types
- `public/js/excel-automation/filterEngine.js`: Core filtering logic and evaluation
- `public/js/excel-automation/filterUI.js`: UI components for filtering interface
- `views/pages/excel-automation/index.ejs`: Main Excel automation page template

#### Data Flow:
1. User uploads Excel file via drag-and-drop or file selection
2. File is sent to server for processing in memory (not saved to disk)
3. Server processes file using ExcelJS and extracts data
4. Data is sent back to client and displayed in interactive table
5. User can edit data directly in the browser
6. Edited data can be saved to the server session
7. User can export edited data as Excel file

### 6. Live Stock Data System
The Live Stock Data System provides real-time stock market information with automatic updates and comprehensive data display.

#### Key Features:
- Real-time stock data fetching from Yahoo Finance API
- Automatic background updates every 5 minutes
- Batch processing of stock symbols to respect API rate limits
- WebSocket-based real-time updates to connected clients
- Comprehensive stock data display (current price, previous close, day range, volume)
- Detailed stock insights with charts, fundamentals, options, insider transactions, and recommendations
- Search and sort functionality for stock data
- Responsive design for all device sizes

#### Key Files:
- `server/controller/live-stock/liveStockController.js`: Handles stock data requests and coordination
- `server/utils/live-stock/yahooFinanceFetcher.js`: Fetches live data from Yahoo Finance API
- `server/utils/live-stock/dbUtils.js`: Manages SQLite database operations for stock data
- `server/utils/live-stock/backgroundUpdater.js`: Automatic background stock data updates
- `server/routes/live-stock/liveStockRoutes.js`: Defines live stock data API endpoints
- `public/js/live-stock/liveStock.js`: Client-side stock data display and WebSocket integration
- `views/pages/live-stock/index.ejs`: Main live stock data page template

#### Data Flow:
1. Background service runs every 5 minutes to fetch updated stock data
2. Yahoo Finance API is queried for current stock prices
3. Data is stored in SQLite database for persistence
4. Connected clients receive real-time updates via WebSocket
5. Users can manually refresh data or view detailed stock information
6. Detailed stock insights are fetched on demand from Yahoo Finance API

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
- `GET /excel` - Excel automation page (requires authentication)
- `POST /excel/upload` - Upload Excel file (requires authentication and CSRF protection)
- `POST /excel/process` - Process Excel file in memory (requires authentication and CSRF protection)
- `POST /excel/select-sheet` - Select worksheet from multi-sheet file (requires authentication and CSRF protection)
- `POST /excel/save` - Save edited data (requires authentication and CSRF protection)
- `GET /excel/export/:id` - Export data to Excel file (requires authentication)
- `GET /live-stock` - Live stock data page (requires authentication)
- `GET /live-stock/symbols` - Get all stock symbols (requires authentication)
- `GET /live-stock/live-data` - Get live data for all symbols (requires authentication)
- `GET /live-stock/live-data/:symbol` - Get live data for a specific symbol (requires authentication)

## Middleware Chain
The application uses a layered middleware approach:

1. **CSP Nonce Middleware**: Generates nonce for Content Security Policy
2. **Security Headers**: Helmet.js sets security headers
3. **Input Sanitization**: Cleanses user inputs
4. **Cookie Parser**: Parses cookies
5. **Body Parser**: Parses request bodies
6. **View Engine**: Sets EJS as templating engine
7. **Optional Authentication**: Makes user info available to views
8. **Session Management**: Express-session for session handling
9. **Route Handlers**: Specific middleware for different route groups

The Excel Automation and Live Stock Data routes use the same middleware chain as other protected routes, with additional CSRF protection for state-changing operations.

## Design Patterns
- **MVC Pattern**: Model-View-Controller separation
- **Middleware Pattern**: Express middleware for cross-cutting concerns
- **Factory Pattern**: Utility functions for creating and verifying tokens
- **Singleton Pattern**: Prisma client instance
- **Observer Pattern**: Event-driven updates for real-time stock data via WebSocket
- **Strategy Pattern**: Different filter types and operators in the Excel filtering system
- **Module Pattern**: Encapsulation of functionality in client-side JavaScript modules

## Environment Configuration
The application uses environment variables for configuration:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for signing access tokens
- `JWT_REFRESH_SECRET`: Secret for signing refresh tokens
- `PORT`: Server port
- `NODE_ENV`: Environment (development/production)
- `SESSION_SECRET`: Secret for session management
- `YAHOO_FINANCE_API_KEY`: API key for Yahoo Finance (if required)

## Build Process
- **Development**: Uses nodemon for auto-restart and concurrently for parallel processes
- **CSS**: Tailwind CSS compiled with watch mode
- **Database**: Prisma migrations and client generation

## Error Handling
- Graceful error handling throughout the application
- User-friendly error messages
- Proper HTTP status codes
- Console logging for debugging