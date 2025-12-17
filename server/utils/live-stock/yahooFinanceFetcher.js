const YahooFinance = require('yahoo-finance2').default;

// Instantiate Yahoo Finance client
const yahooFinance = new YahooFinance();

// Function to fetch live data for a single symbol (correct approach from fetch-random-ohlcv.js)
async function fetchLiveData(symbol) {
  try {
    // Fetch quote data (includes current price, previous close, volume, etc.)
    const quote = await yahooFinance.quote(symbol);
    
    // Fetch chart data for recent OHLCV (last 5 days to get high/low)
    const today = new Date();
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const chartData = await yahooFinance.chart(symbol, {
      period1: fiveDaysAgo,
      period2: today,
    });
    
    // Fetch quote summary for additional data
    const quoteSummary = await yahooFinance.quoteSummary(symbol, {
      modules: ['price', 'summaryDetail']
    });
    
    // Extract relevant data
    const liveData = {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || quote.symbol,
      currentPrice: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      currency: quote.currency,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      // Additional data from quoteSummary
      fiftyTwoWeekLow: quoteSummary.summaryDetail?.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: quoteSummary.summaryDetail?.fiftyTwoWeekHigh,
      lastUpdated: new Date().toISOString()
    };
    
    // If we have chart data, use the high/low from the most recent day
    if (chartData?.quotes?.length > 0) {
      const latestQuote = chartData.quotes[chartData.quotes.length - 1];
      if (latestQuote.high !== undefined) liveData.dayHigh = latestQuote.high;
      if (latestQuote.low !== undefined) liveData.dayLow = latestQuote.low;
    }
    
    return liveData;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    return null;
  }
}

// Function to fetch live data for multiple symbols in batches
async function fetchLiveDataBatch(symbols, batchSize = 10) {
  const results = [];
  const errors = [];
  
  console.log(`Fetching live data for ${symbols.length} symbols in batches of ${batchSize}`);
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(symbols.length / batchSize);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} symbols)`);
    
    // Process batch concurrently
    const batchPromises = batch.map(symbol => fetchLiveData(symbol));
    const batchResults = await Promise.all(batchPromises);
    
    // Collect results and errors
    batchResults.forEach((result, index) => {
      if (result) {
        results.push(result);
      } else {
        errors.push(batch[index]);
      }
    });
    
    // Wait between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      console.log('Waiting 5 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  return { results, errors };
}

module.exports = {
  fetchLiveData,
  fetchLiveDataBatch
};