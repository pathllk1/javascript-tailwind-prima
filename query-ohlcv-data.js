const Database = require('better-sqlite3');
const path = require('path');

// Configuration
const DB_FILE = path.join(__dirname, 'yahoo_finance_data.db');

// Initialize database
const db = new Database(DB_FILE);

console.log('=== OHLCV DATA QUERY EXAMPLES ===');

// Example 1: Get all data for a specific symbol
console.log('\n1. Getting data for RELIANCE.NS:');
try {
  const relianceData = db.prepare(`
    SELECT s.symbol, s.yahoo_symbol, o.date, o.open, o.high, o.low, o.close, o.volume
    FROM symbols s
    JOIN ohlcv_data o ON s.id = o.symbol_id
    WHERE s.yahoo_symbol = 'RELIANCE.NS'
    ORDER BY o.date DESC
    LIMIT 10
  `).all();
  
  if (relianceData.length > 0) {
    console.log(`Found ${relianceData.length} records for RELIANCE.NS:`);
    relianceData.forEach(record => {
      console.log(`  ${record.date}: O=${record.open}, H=${record.high}, L=${record.low}, C=${record.close}, V=${record.volume}`);
    });
  } else {
    console.log('No data found for RELIANCE.NS');
  }
} catch (error) {
  console.error('Error querying RELIANCE.NS:', error.message);
}

// Example 2: Get latest closing prices for multiple symbols
console.log('\n2. Latest closing prices for top 5 symbols:');
try {
  const latestPrices = db.prepare(`
    SELECT s.symbol, s.yahoo_symbol, o.date, o.close
    FROM symbols s
    JOIN ohlcv_data o ON s.id = o.symbol_id
    WHERE o.date = (
      SELECT MAX(date) 
      FROM ohlcv_data o2 
      WHERE o2.symbol_id = s.id
    )
    ORDER BY s.symbol
    LIMIT 5
  `).all();
  
  latestPrices.forEach(record => {
    console.log(`  ${record.symbol}: ${record.close} on ${record.date}`);
  });
} catch (error) {
  console.error('Error getting latest prices:', error.message);
}

// Example 3: Get symbols with the most historical data
console.log('\n3. Symbols with the most historical data:');
try {
  const mostData = db.prepare(`
    SELECT s.symbol, s.yahoo_symbol, COUNT(o.id) as record_count, MIN(o.date) as earliest_date, MAX(o.date) as latest_date
    FROM symbols s
    JOIN ohlcv_data o ON s.id = o.symbol_id
    GROUP BY s.id
    ORDER BY record_count DESC
    LIMIT 5
  `).all();
  
  mostData.forEach(record => {
    console.log(`  ${record.symbol}: ${record.record_count} records (${record.earliest_date} to ${record.latest_date})`);
  });
} catch (error) {
  console.error('Error getting symbols with most data:', error.message);
}

// Example 4: Get average volume for a symbol
console.log('\n4. Average volume for TCS.NS:');
try {
  const avgVolume = db.prepare(`
    SELECT s.symbol, AVG(o.volume) as avg_volume
    FROM symbols s
    JOIN ohlcv_data o ON s.id = o.symbol_id
    WHERE s.yahoo_symbol = 'TCS.NS'
  `).get();
  
  if (avgVolume) {
    console.log(`  ${avgVolume.symbol}: Average volume = ${Math.round(avgVolume.avg_volume)}`);
  } else {
    console.log('No data found for TCS.NS');
  }
} catch (error) {
  console.error('Error calculating average volume:', error.message);
}

// Close database
db.close();

console.log('\n=== END OF EXAMPLES ===');