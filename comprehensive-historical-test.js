/**
 * Comprehensive Historical Data Limits Test
 * This script determines the maximum historical OHLCV data we can extract from yahoo-finance2
 */

const YahooFinance = require('yahoo-finance2').default;

// Instantiate Yahoo Finance client
const yahooFinance = new YahooFinance();

// Function to test maximum historical data for a symbol
async function testMaxHistoricalData(symbol) {
  console.log(`\n=== COMPREHENSIVE HISTORICAL DATA TEST FOR ${symbol} ===`);
  
  try {
    // Test maximum possible data (from 1970 to now)
    const startDate = new Date('1970-01-01');
    const endDate = new Date();
    
    console.log(`Attempting to fetch data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const chartData = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate,
    });
    
    const dataPoints = chartData.quotes ? chartData.quotes.length : 0;
    console.log(`\nRESULTS:`);
    console.log(`Retrieved ${dataPoints} data points`);
    
    if (dataPoints > 0) {
      const firstRecord = chartData.quotes[0];
      const lastRecord = chartData.quotes[dataPoints - 1];
      
      console.log(`First record date: ${firstRecord.date}`);
      console.log(`Last record date: ${lastRecord.date}`);
      
      // Calculate approximate time span
      const firstDate = new Date(firstRecord.date);
      const lastDate = new Date(lastRecord.date);
      const timeDiff = Math.abs(lastDate - firstDate);
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      console.log(`Time span: Approximately ${daysDiff} days (${(daysDiff/365).toFixed(1)} years)`);
      
      // Show data frequency (daily, weekly, etc.)
      if (dataPoints > 1) {
        const secondRecord = chartData.quotes[1];
        const firstRecordDate = new Date(firstRecord.date);
        const secondRecordDate = new Date(secondRecord.date);
        const intervalDiff = Math.abs(secondRecordDate - firstRecordDate);
        const intervalDays = Math.ceil(intervalDiff / (1000 * 60 * 60 * 24));
        
        console.log(`Data frequency: Approximately every ${intervalDays} day(s)`);
      }
      
      // Show sample data
      console.log(`\nSAMPLE DATA (First 3 records):`);
      for (let i = 0; i < Math.min(3, dataPoints); i++) {
        const record = chartData.quotes[i];
        console.log(`  ${record.date}: O=${record.open}, H=${record.high}, L=${record.low}, C=${record.close}, V=${record.volume}`);
      }
      
      console.log(`\nSAMPLE DATA (Last 3 records):`);
      for (let i = Math.max(0, dataPoints - 3); i < dataPoints; i++) {
        const record = chartData.quotes[i];
        console.log(`  ${record.date}: O=${record.open}, H=${record.high}, L=${record.low}, C=${record.close}, V=${record.volume}`);
      }
    }
    
    return dataPoints;
    
  } catch (error) {
    console.error(`Error fetching maximum data for ${symbol}:`, error.message);
    return 0;
  }
}

// Function to test different intervals
async function testDifferentIntervals(symbol) {
  console.log(`\n=== TESTING DIFFERENT INTERVALS FOR ${symbol} ===`);
  
  const intervals = ['1d', '1wk', '1mo'];
  
  for (const interval of intervals) {
    try {
      console.log(`\n--- Testing interval: ${interval} ---`);
      
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setFullYear(startDate.getFullYear() - 1); // 1 year of data
      
      const chartData = await yahooFinance.chart(symbol, {
        period1: startDate,
        period2: endDate,
        interval: interval
      });
      
      const dataPoints = chartData.quotes ? chartData.quotes.length : 0;
      console.log(`Retrieved ${dataPoints} data points with ${interval} interval`);
      
      if (dataPoints > 0) {
        console.log(`Sample: ${chartData.quotes[0].date} to ${chartData.quotes[dataPoints - 1].date}`);
      }
      
    } catch (error) {
      console.error(`Error with ${interval} interval:`, error.message);
    }
  }
}

// Main function
async function main() {
  try {
    // Test with multiple symbols to understand limits
    const symbolsToTest = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'];
    
    let maxDataPoints = 0;
    let maxSymbol = '';
    
    for (const symbol of symbolsToTest) {
      const dataPoints = await testMaxHistoricalData(symbol);
      if (dataPoints > maxDataPoints) {
        maxDataPoints = dataPoints;
        maxSymbol = symbol;
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Maximum historical data points obtained: ${maxDataPoints} for symbol ${maxSymbol}`);
    
    // Test different intervals with the symbol that had the most data
    await testDifferentIntervals(maxSymbol);
    
    console.log(`\n=== CONCLUSION ===`);
    console.log(`1. The yahoo-finance2 package can retrieve historical OHLCV data going back to the earliest available date for each symbol.`);
    console.log(`2. The maximum data found was ${maxDataPoints} records for ${maxSymbol}.`);
    console.log(`3. Data frequency is typically daily by default.`);
    console.log(`4. Different intervals (weekly, monthly) are also supported.`);
    console.log(`5. The actual time span depends on when the company was listed and when data became available.`);
    
  } catch (error) {
    console.error('Error in main process:', error.message);
  }
}

// Run the script
main();