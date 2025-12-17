const Database = require('better-sqlite3');
const path = require('path');

// Configuration
const DB_FILE = path.join(__dirname, 'yahoo_finance_data.db');

// Initialize database
const db = new Database(DB_FILE);

console.log('=== DATABASE STRUCTURE ===');

// Check tables
console.log('\nTables:');
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
tables.forEach(table => {
  console.log(`  - ${table.name}`);
});

// Check symbols table structure
console.log('\nSymbols table structure:');
const symbolsSchema = db.prepare(`PRAGMA table_info(symbols)`).all();
symbolsSchema.forEach(column => {
  console.log(`  ${column.name} (${column.type}) ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
});

// Check ohlcv_data table structure
console.log('\nOHLCV data table structure:');
const ohlcvSchema = db.prepare(`PRAGMA table_info(ohlcv_data)`).all();
ohlcvSchema.forEach(column => {
  console.log(`  ${column.name} (${column.type}) ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
});

// Check foreign key constraints
console.log('\nForeign key constraints:');
const foreignKeys = db.prepare(`PRAGMA foreign_key_list(ohlcv_data)`).all();
foreignKeys.forEach(fk => {
  console.log(`  ${fk.from} -> ${fk.table}.${fk.to}`);
});

// Check some sample data
console.log('\n=== SAMPLE DATA ===');

// Count symbols
const symbolCount = db.prepare('SELECT COUNT(*) as count FROM symbols').get().count;
console.log(`Total symbols: ${symbolCount}`);

// Count OHLCV records
const ohlcvCount = db.prepare('SELECT COUNT(*) as count FROM ohlcv_data').get().count;
console.log(`Total OHLCV records: ${ohlcvCount}`);

// Get a few symbols
console.log('\nFirst 5 symbols:');
const symbols = db.prepare('SELECT * FROM symbols LIMIT 5').all();
symbols.forEach(symbol => {
  console.log(`  ${symbol.symbol} (${symbol.yahoo_symbol}) - ID: ${symbol.id}`);
});

// Get OHLCV data for first symbol
if (symbols.length > 0) {
  const firstSymbolId = symbols[0].id;
  console.log(`\nOHLCV data for ${symbols[0].symbol}:`);
  const ohlcvData = db.prepare('SELECT * FROM ohlcv_data WHERE symbol_id = ? LIMIT 5').all(firstSymbolId);
  ohlcvData.forEach(data => {
    console.log(`  ${data.date}: O=${data.open}, H=${data.high}, L=${data.low}, C=${data.close}, V=${data.volume}`);
  });
}

// Close database
db.close();