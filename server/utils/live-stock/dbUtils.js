const Database = require('better-sqlite3');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '..', '..', 'database', 'yahoo_finance_data.db');

// Initialize database
let db;

try {
  db = new Database(DB_PATH);
  console.log('Database connected successfully');
} catch (error) {
  console.error('Error connecting to database:', error.message);
  process.exit(1);
}

// Ensure schema has required columns for market data
function ensureSchema() {
  const info = db.prepare(`PRAGMA table_info(symbols);`).all();
  const existing = new Set(info.map((c) => c.name));
  const missingClauses = [];
  if (!existing.has('previous_close')) missingClauses.push('previous_close REAL');
  if (!existing.has('day_high')) missingClauses.push('day_high REAL');
  if (!existing.has('day_low')) missingClauses.push('day_low REAL');
  if (!existing.has('volume')) missingClauses.push('volume INTEGER');
  if (!existing.has('currency')) missingClauses.push('currency TEXT');
  if (!existing.has('last_updated')) missingClauses.push('last_updated TEXT');
  if (missingClauses.length > 0) {
    missingClauses.forEach((clause) => {
      try {
        db.exec(`ALTER TABLE symbols ADD COLUMN ${clause};`);
        console.log(`Schema updated: ADD COLUMN ${clause}`);
      } catch (e) {
        // ignore "duplicate column name" to be idempotent
        if (!/duplicate column name/i.test(e.message)) {
          console.error('Schema alter error:', e.message);
        }
      }
    });
  }
}

ensureSchema();

// Function to get all symbols from the database (including cached market fields)
function getAllSymbols() {
  try {
    const symbols = db.prepare('SELECT * FROM symbols ORDER BY symbol').all();
    return symbols;
  } catch (error) {
    console.error('Error fetching symbols:', error.message);
    return [];
  }
}

// Function to get symbol by yahoo symbol
function getSymbolByYahooSymbol(yahooSymbol) {
  try {
    const symbol = db.prepare('SELECT * FROM symbols WHERE yahoo_symbol = ?').get(yahooSymbol);
    return symbol;
  } catch (error) {
    console.error('Error fetching symbol:', error.message);
    return null;
  }
}

// Function to update symbol data
function updateSymbolData(symbolData) {
  try {
    const stmt = db.prepare(`
      UPDATE symbols 
      SET 
        current_price = ?,
        previous_close = COALESCE(?, previous_close),
        day_high = COALESCE(?, day_high),
        day_low = COALESCE(?, day_low),
        volume = COALESCE(?, volume),
        currency = COALESCE(?, currency),
        last_updated = ?
      WHERE yahoo_symbol = ?
    `);
    
    return stmt.run(
      symbolData.currentPrice,
      symbolData.previousClose ?? null,
      symbolData.dayHigh ?? null,
      symbolData.dayLow ?? null,
      symbolData.volume ?? null,
      symbolData.currency ?? null,
      new Date().toISOString(),
      symbolData.yahooSymbol
    );
  } catch (error) {
    console.error('Error updating symbol data:', error.message);
    return null;
  }
}

module.exports = {
  getAllSymbols,
  getSymbolByYahooSymbol,
  updateSymbolData,
  db
};