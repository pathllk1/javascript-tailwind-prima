# Live Stock Data System

## Overview

This document describes the implementation of a live stock data system that provides real-time stock market information with automatic updates every 5 minutes. The system integrates with Yahoo Finance to fetch live data and presents it in a user-friendly web interface.

The system is designed to handle large volumes of stock data efficiently while respecting API rate limits and providing a seamless user experience through WebSocket-based real-time updates.

## Features

1. **Real-time Data**: Fetches live stock data from Yahoo Finance API including current price, previous close, day range, volume, and more
2. **Automatic Updates**: Updates stock data every 5 minutes in the background using a scheduled service
3. **Batch Processing**: Processes stock symbols in batches of 25 to respect Yahoo Finance API rate limits
4. **Web Interface**: Provides a clean, responsive UI to display stock data with color-coded changes
5. **Security**: Implements proper authentication and CSRF protection for all endpoints
6. **Data Persistence**: Stores comprehensive OHLCV (Open, High, Low, Close, Volume) data in SQLite database
7. **WebSocket Integration**: Pushes real-time updates to connected clients without page refresh
8. **Detailed Insights**: Provides charts, fundamentals, options, insider transactions, and recommendations on demand
9. **Search and Sort**: Allows users to find and organize stocks by various criteria
10. **Error Handling**: Robust error handling for failed symbol updates and API issues

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
   - Connects to SQLite database using better-sqlite3
   - Provides functions to initialize database schema
   - Implements CRUD operations for stock symbols and data
   - Handles database transactions for data consistency
   - Provides functions to fetch and update symbol data
   - Implements efficient queries for large datasets

2. **Yahoo Finance Fetcher** (`yahooFinanceFetcher.js`)
   - Fetches live data from Yahoo Finance API using yahoo-finance2 library
   - Implements batch processing with rate limiting (25 symbols per batch)
   - Handles API errors and retries with exponential backoff
   - Processes comprehensive stock data including OHLCV information
   - Normalizes data format for consistent storage and display
   - Implements caching to reduce API calls

3. **Background Updater** (`backgroundUpdater.js`)
   - Automatically updates stock data every 5 minutes using setInterval
   - Prevents concurrent updates with locking mechanism
   - Implements graceful shutdown handling
   - Logs update activities and errors for monitoring
   - Handles partial updates in case of failures
   - Manages update scheduling and execution

4. **Controller** (`liveStockController.js`)
   - Handles API requests for stock data
   - Coordinates between database and Yahoo Finance
   - Implements data transformation for API responses
   - Handles detailed stock insights requests
   - Manages WebSocket communication for real-time updates
   - Implements error handling and logging

5. **Routes** (`liveStockRoutes.js`)
   - Defines REST API endpoints for stock data
   - Implements CSRF protection for state-changing operations
   - Handles authentication middleware for all endpoints
   - Defines routes for symbols, live data, and detailed insights

6. **Frontend** (`liveStock.js` and `index.ejs`)
   - Displays stock data in a responsive table with virtual scrolling for performance
   - Provides real-time updates and manual refresh
   - Implements WebSocket client for push notifications
   - Handles detailed stock insights display with Chart.js integration
   - Provides search and sorting functionality
   - Implements loading states and error handling
   - Uses EJS templating for server-side rendering
   - Integrates with client-side JavaScript for interactivity

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
- Day range (Low - High)
- Change percentage
- Trading volume

The change percentage is color-coded:
- Green for positive changes
- Red for negative changes

### Detailed Stock Insights

When users click on a stock, they can view detailed insights including:
- **Charts**: Interactive price charts using Chart.js
- **Fundamentals**: Key financial metrics and ratios
- **Options**: Available options contracts with pricing
- **Insider Transactions**: Recent insider buying and selling activity
- **Recommendations**: Analyst ratings and price targets

### Search and Sort

Users can:
- Search for stocks by symbol or company name
- Sort by any column (symbol, name, price, change, volume)
- Filter stocks based on various criteria

## Auto-Refresh

The system automatically refreshes stock data every 5 minutes through a background service. Users can also manually refresh the data using the "Refresh Data" button.

### Background Update Mechanism

The background updater (`backgroundUpdater.js`) implements a robust update mechanism:
- Uses `setInterval` to schedule updates every 5 minutes (300,000 milliseconds)
- Implements a locking mechanism to prevent concurrent updates
- Handles graceful shutdown to prevent incomplete updates
- Logs all update activities for monitoring and debugging
- Handles partial failures by continuing with remaining symbols

### Real-time Updates

The system uses WebSocket technology to push real-time updates to connected clients:
- Leverages Socket.IO for reliable WebSocket communication
- Automatically pushes updates to all connected clients when background updates complete
- Handles client disconnections and reconnections gracefully
- Implements efficient data serialization for network transmission

## Performance

- **Batch Processing**: Processes stock symbols in batches of 25 to respect Yahoo Finance API rate limits
- **Efficient Database Queries**: Uses indexed queries and prepared statements for optimal SQLite performance
- **Client-side Caching**: Implements virtual scrolling and data caching to handle large datasets efficiently
- **Responsive Design**: Uses Tailwind CSS for responsive design that works on all device sizes
- **WebSocket Efficiency**: Uses binary serialization for WebSocket messages to minimize bandwidth
- **Memory Management**: Implements efficient data structures to minimize memory footprint
- **Connection Pooling**: Reuses API connections to reduce overhead

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

- **Database Updates**: The database is automatically updated with current prices and comprehensive OHLCV data
- **Error Handling**: Robust error handling for failed symbol updates with detailed logging
- **Logging**: Comprehensive logging of all background update activities for monitoring and debugging
- **Data Cleanup**: Automatic cleanup of stale data to maintain database performance
- **Health Checks**: Periodic health checks to ensure system functionality
- **Backup Strategy**: Regular backups of the SQLite database for disaster recovery
- **Monitoring**: Real-time monitoring of update performance and API usage

## Dependencies

- **yahoo-finance2**: For fetching live stock data from Yahoo Finance API
- **better-sqlite3**: For efficient SQLite database operations
- **Socket.IO**: For real-time WebSocket communication
- **Chart.js**: For displaying interactive stock charts
- **Express.js**: Web framework for routing and middleware

## Future Enhancements

- **Portfolio Tracking**: Allow users to create and track custom portfolios
- **Alerts and Notifications**: Implement price alerts and news notifications
- **Technical Indicators**: Add support for technical analysis indicators
- **Historical Data**: Extend historical data storage and visualization
- **Comparative Analysis**: Enable comparison of multiple stocks
- **Export Functionality**: Allow export of stock data and charts
- **Customizable Dashboard**: Provide customizable dashboards for different user preferences