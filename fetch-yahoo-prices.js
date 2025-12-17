/**
 * Fetch Current Prices from Yahoo Finance
 * This script fetches current prices for symbols in batches to avoid rate limiting
 */

const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2').default;
// Configuration
const INPUT_FILE = path.join(__dirname, 'public', 'yahoo_finance_symbols.json');
const OUTPUT_FILE = path.join(__dirname, 'public', 'yahoo_finance_symbols_with_prices.json');
const FAILED_SYMBOLS_FILE = path.join(__dirname, 'public', 'failed_symbols.json');
const BATCH_SIZE = 25; // Number of symbols to fetch in each batch
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds delay between batches

// Instantiate Yahoo Finance client
const yahooFinance = new YahooFinance();
// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch price for a single symbol
async function fetchPriceForSymbol(symbolObj) {
  try {
    console.log(`Fetching data for: ${symbolObj.yahooSymbol}`);
    
    // Fetch quote data
    const quote = await yahooFinance.quoteSummary(symbolObj.yahooSymbol, {
      modules: ['price']
    });
    
    // Extract current price
    const priceData = quote.price;
    const currentPrice = priceData?.regularMarketPrice || null;
    
    return {
      ...symbolObj,
      currentPrice: currentPrice,
      lastUpdated: new Date().toISOString(),
      fetchStatus: 'success'
    };
  } catch (error) {
    console.error(`Failed to fetch data for ${symbolObj.yahooSymbol}:`, error.message);
    return {
      ...symbolObj,
      currentPrice: null,
      lastUpdated: new Date().toISOString(),
      fetchStatus: 'failed',
      errorMessage: error.message
    };
  }
}

// Function to process symbols in batches
async function processSymbolsInBatches(symbols) {
  const results = [];
  const failedSymbols = [];
  
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(symbols.length/BATCH_SIZE)}`);
    
    // Process batch concurrently
    const batchPromises = batch.map(symbolObj => fetchPriceForSymbol(symbolObj));
    const batchResults = await Promise.all(batchPromises);
    
    // Separate successful and failed results
    batchResults.forEach(result => {
      if (result.fetchStatus === 'success') {
        results.push(result);
      } else {
        results.push(result);
        failedSymbols.push(result);
      }
    });
    
    // Delay before next batch (except for the last batch)
    if (i + BATCH_SIZE < symbols.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }
  
  return { results, failedSymbols };
}

// Main function
async function main() {
  try {
    console.log('Starting Yahoo Finance price fetching...');
    
    // Read the symbols file
    const symbolsData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`Loaded ${symbolsData.length} symbols`);
    
    // Process symbols in batches
    const { results, failedSymbols } = await processSymbolsInBatches(symbolsData);
    
    // Save results to output file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`Successfully saved results to ${OUTPUT_FILE}`);
    
    // Save failed symbols to separate file
    if (failedSymbols.length > 0) {
      fs.writeFileSync(FAILED_SYMBOLS_FILE, JSON.stringify(failedSymbols, null, 2));
      console.log(`Saved ${failedSymbols.length} failed symbols to ${FAILED_SYMBOLS_FILE}`);
    } else {
      console.log('No failed symbols encountered');
      // Remove failed symbols file if it exists and there are no failed symbols
      if (fs.existsSync(FAILED_SYMBOLS_FILE)) {
        fs.unlinkSync(FAILED_SYMBOLS_FILE);
      }
    }
    
    // Print summary
    const successCount = results.filter(r => r.fetchStatus === 'success').length;
    console.log(`\nSummary:`);
    console.log(`Total symbols processed: ${results.length}`);
    console.log(`Successful fetches: ${successCount}`);
    console.log(`Failed fetches: ${failedSymbols.length}`);
    
  } catch (error) {
    console.error('Error in main process:', error.message);
  }
}

// Run the script
main();