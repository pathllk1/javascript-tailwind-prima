/**
 * Fetch OHLCV Data for a Random Symbol
 * This script fetches OHLCV (Open, High, Low, Close, Volume) data for a randomly selected symbol
 * from the yahoo_finance_symbols_with_prices.json file
 */

const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2').default;

// Instantiate Yahoo Finance client
const yahooFinance = new YahooFinance();

// Configuration
const INPUT_FILE = path.join(__dirname, 'public', 'yahoo_finance_symbols_with_prices.json');

// Function to get a random symbol from the file
function getRandomSymbol(symbols) {
  const randomIndex = Math.floor(Math.random() * symbols.length);
  return symbols[randomIndex];
}

// Function to fetch OHLCV data for a symbol
async function fetchOHLCVData(symbolObj) {
  try {
    console.log(`Fetching OHLCV data for: ${symbolObj.yahooSymbol}`);
    
    // Fetch chart data (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const chartData = await yahooFinance.chart(symbolObj.yahooSymbol, {
      period1: thirtyDaysAgo,
      period2: today,
    });
    
    // Fetch quote summary for additional data
    const quoteSummary = await yahooFinance.quoteSummary(symbolObj.yahooSymbol, {
      modules: ['price', 'summaryDetail']
    });
    
    // Extract OHLCV data from chart results
    const ohlcvData = chartData.quotes.map(q => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume
    }));
    
    return {
      symbol: symbolObj.symbol,
      yahooSymbol: symbolObj.yahooSymbol,
      currentPrice: symbolObj.currentPrice,
      historicalData: ohlcvData,
      quoteSummary: quoteSummary,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to fetch OHLCV data for ${symbolObj.yahooSymbol}:`, error.message);
    throw error;
  }
}
// Main function
async function main() {
  try {
    console.log('Starting random symbol OHLCV data fetch...');
    
    // Read the symbols file
    const symbolsData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`Loaded ${symbolsData.length} symbols`);
    
    // Get a random symbol
    const randomSymbol = getRandomSymbol(symbolsData);
    console.log(`Selected random symbol: ${randomSymbol.yahooSymbol}`);
    
    // Fetch OHLCV data for the random symbol
    const ohlcvData = await fetchOHLCVData(randomSymbol);
    
    // Display the results
    console.log('\n=== OHLCV DATA ===');
    console.log(`Symbol: ${ohlcvData.symbol} (${ohlcvData.yahooSymbol})`);
    console.log(`Current Price: ${ohlcvData.currentPrice}`);
    
    // Display recent historical data (last 5 days)
    console.log('\n--- Recent Historical Data (Last 5 days) ---');
    const recentData = ohlcvData.historicalData.slice(-5);
    recentData.forEach(day => {
      console.log(`${day.date}: O=${day.open}, H=${day.high}, L=${day.low}, C=${day.close}, V=${day.volume}`);
    });
    
    // Display some key quote summary data
    console.log('\n--- Key Financial Data ---');
    const priceData = ohlcvData.quoteSummary.price;
    const summaryData = ohlcvData.quoteSummary.summaryDetail;
    
    console.log(`Previous Close: ${summaryData?.previousClose}`);
    console.log(`Open: ${priceData?.regularMarketOpen}`);
    console.log(`Day Range: ${summaryData?.dayLow} - ${summaryData?.dayHigh}`);
    console.log(`52 Week Range: ${summaryData?.fiftyTwoWeekLow} - ${summaryData?.fiftyTwoWeekHigh}`);
    console.log(`Market Cap: ${summaryData?.marketCap?.fmt || summaryData?.marketCap}`);
    console.log(`PE Ratio: ${summaryData?.trailingPE}`);
    console.log(`Dividend Yield: ${summaryData?.dividendYield}`);    
    console.log('\n=== END OF DATA ===');
    
  } catch (error) {
    console.error('Error in main process:', error.message);
  }
}

// Run the script
main();