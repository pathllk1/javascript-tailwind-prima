# Live Stock Data System

## Overview

This document describes the implementation of a live stock data system that provides real-time stock market information with automatic updates every 5 minutes. The system integrates with Yahoo Finance to fetch live data and presents it in a user-friendly web interface.

## Features

1. **Real-time Data**: Fetches live stock data from Yahoo Finance
2. **Automatic Updates**: Updates stock data every 5 minutes in the background
3. **Batch Processing**: Processes stock symbols in batches to respect API rate limits
4. **Web Interface**: Provides a clean, responsive UI to display stock data
5. **Security**: Implements proper authentication and CSRF protection
6. **Data Persistence**: Stores current prices in the SQLite database

## System Architecture

### Folder Structure
```
server/
├── controller/
│   └── live-stock/
│       └── liveStockController.js
├── database/
│   └── yahoo_finance_data.db
├── routes/
│   └── live-stock/
│       └── liveStockRoutes.js
└── utils/
    └── live-stock/
        ├── backgroundUpdater.js
        ├── dbUtils.js
        └── yahooFinanceFetcher.js

public/
└── js/
    └── live-stock/
        └── liveStock.js

views/
└── pages/
    └── live-stock/
        └── index.ejs
```

### Components

1. **Database Utilities** (`dbUtils.js`)
   - Connects to SQLite database
   - Provides functions to fetch and update symbol data

2. **Yahoo Finance Fetcher** (`yahooFinanceFetcher.js`)
   - Fetches live data from Yahoo Finance API
   - Implements batch processing with rate limiting

3. **Background Updater** (`backgroundUpdater.js`)
   - Automatically updates stock data every 5 minutes
   - Prevents concurrent updates

4. **Controller** (`liveStockController.js`)
   - Handles API requests for stock data
   - Coordinates between database and Yahoo Finance

5. **Routes** (`liveStockRoutes.js`)
   - Defines REST API endpoints for stock data

6. **Frontend** (`liveStock.js` and `index.ejs`)
   - Displays stock data in a responsive table
   - Provides real-time updates and manual refresh

## API Endpoints

- `GET /live-stock` - Display the live stock data page
- `GET /live-stock/symbols` - Get all stock symbols
- `GET /live-stock/live-data` - Get live data for all symbols
- `GET /live-stock/live-data/:symbol` - Get live data for a specific symbol

## Security Features

1. **Authentication**: All endpoints are protected and require user authentication
2. **CSRF Protection**: Implements CSRF tokens for all requests
3. **Input Sanitization**: Sanitizes all user inputs
4. **Security Headers**: Applies security headers to all responses

## Data Display

The UI displays the following information for each stock:
- Symbol
- Company name
- Current price
- Previous close price
- Change percentage
- Trading volume

The change percentage is color-coded:
- Green for positive changes
- Red for negative changes

## Auto-Refresh

The system automatically refreshes stock data every 5 minutes through a background service. Users can also manually refresh the data using the "Refresh Data" button.

## Performance

- Batch processing of symbols to respect API rate limits
- Efficient database queries
- Client-side caching of UI elements
- Responsive design for all device sizes

## Color Scheme

The UI uses a clean, professional color scheme:
- Primary: Blue (#3b82f6) for buttons and highlights
- Positive changes: Green (#10b981)
- Negative changes: Red (#ef4444)
- Background: Light gray (#f3f4f6)
- Text: Dark gray (#1f2937)

## Usage

1. Navigate to `/live-stock` after logging in
2. View real-time stock data in the table
3. Use the "Refresh Data" button for manual updates
4. The system automatically updates every 5 minutes

## Maintenance

- The database is automatically updated with current prices
- Error handling for failed symbol updates
- Logging of all background update activities