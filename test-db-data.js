const Database = require('better-sqlite3');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'server', 'database', 'yahoo_finance_data.db');

// Initialize database
let db;

try {
  db = new Database(DB_PATH);
  console.log('Database connected successfully');
  
  // Test query to see what data we have
  console.log('\n--- Testing Symbol Data ---');
  const stmt = db.prepare(`
    SELECT s.symbol, s.yahoo_symbol, s.current_price, s.last_updated,
           o.date as latest_date, o.open, o.high, o.low, o.close, o.volume
    FROM symbols s
    LEFT JOIN (
      SELECT symbol_id, date, open, high, low, close, volume,
             ROW_NUMBER() OVER (PARTITION BY symbol_id ORDER BY date DESC) as rn
      FROM ohlcv_data
    ) o ON s.id = o.symbol_id AND o.rn = 1
    WHERE s.yahoo_symbol = 'RELIANCE.NS'
    ORDER BY s.symbol
  `);
  
  const data = stmt.all();
  console.log('RELIANCE.NS data:', JSON.stringify(data, null, 2));
  
  // Check a few more symbols
  console.log('\n--- Testing Multiple Symbols ---');
  const stmt2 = db.prepare(`
    SELECT s.symbol, s.yahoo_symbol, s.current_price, s.last_updated,
           o.date as latest_date, o.open, o.high, o.low, o.close, o.volume
    FROM symbols s
    LEFT JOIN (
      SELECT symbol_id, date, open, high, low, close, volume,
             ROW_NUMBER() OVER (PARTITION BY symbol_id ORDER BY date DESC) as rn
      FROM ohlcv_data
    ) o ON s.id = o.symbol_id AND o.rn = 1
    ORDER BY s.symbol
    LIMIT 5
  `);
  
  const data2 = stmt2.all();
  console.log('First 5 symbols data:', JSON.stringify(data2, null, 2));
  
  db.close();
} catch (error) {
  console.error('Error:', error.message);
}