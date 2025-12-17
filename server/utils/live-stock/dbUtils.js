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

// Function to get all symbols from the database
function getAllSymbols() {
  try {
    const symbols = db.prepare('SELECT symbol, yahoo_symbol FROM symbols ORDER BY symbol').all();
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
      SET current_price = ?, last_updated = ?
      WHERE yahoo_symbol = ?
    `);
    
    return stmt.run(
      symbolData.currentPrice,
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