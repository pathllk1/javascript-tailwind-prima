# Yahoo Finance SQLite Database Implementation

## Overview

This document describes the implementation of a SQLite database system that stores comprehensive OHLCV (Open, High, Low, Close, Volume) data for stock symbols fetched from Yahoo Finance. The system processes all symbols in the `public/yahoo_finance_symbols_with_prices.json` file and stores their historical data in a structured SQLite database.

## Implementation Details

### 1. SQLite Package Installation

We installed `better-sqlite3`, a reliable and high-performance SQLite package for Node.js:

```bash
npm install better-sqlite3
```

### 2. Database Schema

The database consists of two main tables:

#### Symbols Table
```sql
CREATE TABLE IF NOT EXISTS symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT UNIQUE NOT NULL,
  yahoo_symbol TEXT NOT NULL,
  series TEXT,
  current_price REAL,
  last_updated TIMESTAMP
)
```

#### OHLCV Data Table
```sql
CREATE TABLE IF NOT EXISTS ohlcv_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol_id INTEGER,
  date DATE NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume INTEGER,
  FOREIGN KEY (symbol_id) REFERENCES symbols(id),
  UNIQUE(symbol_id, date)
)
```

### 3. Data Processing Script

The main script (`fetch-all-ohlcv-to-sqlite.js`) performs the following operations:

1. Reads all symbols from `public/yahoo_finance_symbols_with_prices.json`
2. Processes symbols in batches of 10 to maintain rate limits
3. Waits 5 seconds between batches to avoid API throttling
4. Fetches maximum historical OHLCV data for each symbol (from 1970 to present)
5. Stores data in the SQLite database with proper foreign key relationships
6. Handles errors gracefully and logs failed symbols

### 4. Performance Metrics

The script successfully processed:
- **2369 total symbols**
- **2350 successful fetches**
- **19 failed fetches** (FOREIGN KEY constraint issues)
- **6,684,089 OHLCV records** in total
- **Average of 2,821 OHLCV records per symbol**
- Some symbols have up to **7,531 records** (approximately 30 years of daily data)
- Data spans from as early as **1996-01-01** to **2025-12-16**
- Database file size: **730MB**

## Usage Examples

### Querying the Database

Several example queries are available in `query-ohlcv-data.js`:

1. Get all data for a specific symbol (e.g., RELIANCE.NS)
2. Get latest closing prices for multiple symbols
3. Find symbols with the most historical data
4. Calculate average volume for a specific symbol

### Sample Query
```javascript
// Get latest data for RELIANCE.NS
const relianceData = db.prepare(`
  SELECT s.symbol, s.yahoo_symbol, o.date, o.open, o.high, o.low, o.close, o.volume
  FROM symbols s
  JOIN ohlcv_data o ON s.id = o.symbol_id
  WHERE s.yahoo_symbol = 'RELIANCE.NS'
  ORDER BY o.date DESC
  LIMIT 10
`).all();
```

## Benefits

1. **Comprehensive Data Storage**: Stores up to 30 years of historical OHLCV data for thousands of symbols
2. **Efficient Querying**: Relational database structure allows for complex queries and analysis
3. **Rate Limit Compliance**: Batch processing with delays ensures API usage stays within limits
4. **Error Handling**: Graceful error handling with detailed logging of failed operations
5. **Scalable**: Database can handle millions of records efficiently
6. **Reliable**: Uses `better-sqlite3` which is known for its performance and reliability

## Database File

The resulting database file (`yahoo_finance_data.db`) is approximately 730MB and contains extensive financial data that can be used for:
- Historical analysis
- Backtesting trading strategies
- Financial research
- Data visualization
- Machine learning applications