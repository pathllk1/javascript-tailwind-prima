/**
 * Fetch OHLCV Data for All Symbols and Store in SQLite Database
 * This script fetches maximum historical OHLCV data for all symbols and stores it in a SQLite database
 * Processes symbols in batches to maintain rate limits
 */

const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2').default;
const Database = require('better-sqlite3');

// Instantiate Yahoo Finance client
const yahooFinance = new YahooFinance();

// Configuration
const INPUT_FILE = path.join(__dirname, 'public', 'yahoo_finance_symbols_with_prices.json');
const DB_FILE = path.join(__dirname, 'yahoo_finance_data.db');
const BATCH_SIZE = 10; // Number of symbols to process in each batch
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds delay between batches

// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to initialize database
function initializeDatabase() {
  console.log('Initializing SQLite database...');
  
  const db = new Database(DB_FILE);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT UNIQUE NOT NULL,
      yahoo_symbol TEXT NOT NULL,
      series TEXT,
      current_price REAL,
      last_updated TIMESTAMP
    )
  `);
  
  db.exec(`
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
  `);
  
  // Create indexes for better performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_date ON ohlcv_data(symbol_id, date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_symbols_yahoo_symbol ON symbols(yahoo_symbol)`);
  
  console.log('Database initialized successfully');
  return db;
}

// Function to insert or update symbol information
function upsertSymbol(db, symbolObj) {
  const stmt = db.prepare(`
    INSERT INTO symbols (symbol, yahoo_symbol, series, current_price, last_updated)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      yahoo_symbol = excluded.yahoo_symbol,
      series = excluded.series,
      current_price = excluded.current_price,
      last_updated = excluded.last_updated
  `);
  
  return stmt.run(
    symbolObj.symbol,
    symbolObj.yahooSymbol,
    symbolObj.series,
    symbolObj.currentPrice,
    symbolObj.lastUpdated
  );
}

// Function to insert OHLCV data
function insertOHLCVData(db, symbolId, ohlcvData) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO ohlcv_data (symbol_id, date, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((symbolId, data) => {
    for (const record of data) {
      stmt.run(
        symbolId,
        record.date,
        record.open,
        record.high,
        record.low,
        record.close,
        record.volume
      );
    }
  });
  
  insertMany(symbolId, ohlcvData);
}

// Function to fetch OHLCV data for a symbol
async function fetchOHLCVData(symbolObj) {
  try {
    console.log(`Fetching OHLCV data for: ${symbolObj.yahooSymbol}`);
    
    // Fetch maximum historical data (from 1970 to now)
    const startDate = new Date('1970-01-01');
    const endDate = new Date();
    
    const chartData = await yahooFinance.chart(symbolObj.yahooSymbol, {
      period1: startDate,
      period2: endDate,
    });
    
    // Extract OHLCV data from chart results
    const ohlcvData = chartData.quotes.map(q => ({
      date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : 
             (typeof q.date === 'string' ? q.date.split('T')[0] : q.date),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume
    }));
    
    return {
      symbol: symbolObj.symbol,
      yahooSymbol: symbolObj.yahooSymbol,
      ohlcvData: ohlcvData,
      success: true
    };
  } catch (error) {
    console.error(`Failed to fetch OHLCV data for ${symbolObj.yahooSymbol}:`, error.message);
    return {
      symbol: symbolObj.symbol,
      yahooSymbol: symbolObj.yahooSymbol,
      ohlcvData: [],
      success: false,
      error: error.message
    };
  }
}

// Function to process symbols in batches
async function processSymbolsInBatches(db, symbols) {
  let successCount = 0;
  let failureCount = 0;
  const failedSymbols = [];
  
  console.log(`Processing ${symbols.length} symbols in batches of ${BATCH_SIZE}`);
  
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(symbols.length/BATCH_SIZE);
    
    console.log(`\nProcessing batch ${batchNumber}/${totalBatches} (${batch.length} symbols)`);
    
    // Process batch concurrently
    const batchPromises = batch.map(symbolObj => fetchOHLCVData(symbolObj));
    const batchResults = await Promise.all(batchPromises);
    
    // Process results and insert into database
    for (const result of batchResults) {
      if (result.success) {
        try {
          // Insert or update symbol information
          const symbolInfo = batch.find(s => s.yahooSymbol === result.yahooSymbol);
          const symbolResult = upsertSymbol(db, symbolInfo);
          const symbolId = symbolResult.lastInsertRowid || db.prepare('SELECT id FROM symbols WHERE symbol = ?').get(symbolInfo.symbol).id;
          
          // Insert OHLCV data
          if (result.ohlcvData.length > 0) {
            insertOHLCVData(db, symbolId, result.ohlcvData);
            console.log(`Inserted ${result.ohlcvData.length} records for ${result.yahooSymbol}`);
          } else {
            console.log(`No OHLCV data for ${result.yahooSymbol}`);
          }
          
          successCount++;
        } catch (dbError) {
          console.error(`Database error for ${result.yahooSymbol}:`, dbError.message);
          failureCount++;
          failedSymbols.push({
            symbol: result.symbol,
            yahooSymbol: result.yahooSymbol,
            error: `Database error: ${dbError.message}`
          });
        }
      } else {
        failureCount++;
        failedSymbols.push({
          symbol: result.symbol,
          yahooSymbol: result.yahooSymbol,
          error: result.error
        });
      }
    }
    
    // Delay before next batch (except for the last batch)
    if (i + BATCH_SIZE < symbols.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }
  
  return { successCount, failureCount, failedSymbols };
}

// Function to generate summary report
function generateSummaryReport(db) {
  console.log('\n=== DATABASE SUMMARY REPORT ===');
  
  // Count symbols
  const symbolCount = db.prepare('SELECT COUNT(*) as count FROM symbols').get().count;
  console.log(`Total symbols in database: ${symbolCount}`);
  
  // Count OHLCV records
  const ohlcvCount = db.prepare('SELECT COUNT(*) as count FROM ohlcv_data').get().count;
  console.log(`Total OHLCV records in database: ${ohlcvCount}`);
  
  // Average records per symbol
  if (symbolCount > 0) {
    const avgRecords = Math.round(ohlcvCount / symbolCount);
    console.log(`Average OHLCV records per symbol: ${avgRecords}`);
  }
  
  // Sample data
  console.log('\nSample data:');
  const sampleStmt = db.prepare(`
    SELECT s.symbol, s.yahoo_symbol, COUNT(o.id) as record_count, MIN(o.date) as earliest_date, MAX(o.date) as latest_date
    FROM symbols s
    LEFT JOIN ohlcv_data o ON s.id = o.symbol_id
    GROUP BY s.id
    ORDER BY s.id
    LIMIT 5
  `);
  
  const samples = sampleStmt.all();
  samples.forEach(sample => {
    console.log(`  ${sample.symbol} (${sample.yahoo_symbol}): ${sample.record_count} records (${sample.earliest_date} to ${sample.latest_date})`);
  });
}

// Main function
async function main() {
  try {
    console.log('Starting OHLCV data fetch and SQLite storage process...');
    
    // Initialize database
    const db = initializeDatabase();
    
    // Read the symbols file
    const symbolsData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`Loaded ${symbolsData.length} symbols`);
    
    // Process symbols in batches
    const { successCount, failureCount, failedSymbols } = await processSymbolsInBatches(db, symbolsData);
    
    // Generate summary report
    generateSummaryReport(db);
    
    // Close database connection
    db.close();
    
    // Print final summary
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Total symbols processed: ${symbolsData.length}`);
    console.log(`Successful fetches: ${successCount}`);
    console.log(`Failed fetches: ${failureCount}`);
    
    // Save failed symbols to file if any
    if (failedSymbols.length > 0) {
      const failedSymbolsFile = path.join(__dirname, 'failed_symbols_detailed.json');
      fs.writeFileSync(failedSymbolsFile, JSON.stringify(failedSymbols, null, 2));
      console.log(`Failed symbols saved to: ${failedSymbolsFile}`);
    } else {
      console.log('All symbols processed successfully!');
    }
    
  } catch (error) {
    console.error('Error in main process:', error.message);
  }
}

// Run the script
main();