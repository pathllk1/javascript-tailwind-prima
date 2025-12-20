const YahooFinance = require('yahoo-finance2').default;

// Instantiate Yahoo Finance client
const yahooFinance = new YahooFinance();

async function fetchChart(symbol, range = '1mo') {
  const safeRange = typeof range === 'string' ? range.toLowerCase() : '1mo';
  const rangeToInterval = {
    '1d': '5m',
    '5d': '15m',
    '1mo': '1d',
    '1y': '1wk',
    'max': '1mo'
  };
  const interval = rangeToInterval[safeRange] || '1d';

  const period2 = new Date();
  const period1 = new Date(period2);
  if (safeRange === '1d') {
    period1.setDate(period1.getDate() - 1);
  } else if (safeRange === '5d') {
    period1.setDate(period1.getDate() - 5);
  } else if (safeRange === '1y') {
    period1.setFullYear(period1.getFullYear() - 1);
  } else if (safeRange === 'max') {
    // A safe "max" proxy. Yahoo will return as much as it can for the symbol.
    period1.setFullYear(1970);
    period1.setMonth(0);
    period1.setDate(1);
  } else {
    // default 1mo
    period1.setDate(period1.getDate() - 30);
  }

  // yahoo-finance2 v3.x validates options and requires period1/period2 (no "range" key).
  const chartData = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval
  });

  const points = (chartData?.quotes || []).map((q) => ({
    date: q.date,
    open: q.open,
    high: q.high,
    low: q.low,
    close: q.close,
    volume: q.volume
  }));

  return { range: safeRange, interval, period1, period2, points };
}

async function fetchFundamentals(symbol) {
  const summary = await yahooFinance.quoteSummary(symbol, {
    modules: ['price', 'summaryDetail', 'financialData']
  });
  return summary || {};
}

async function fetchOptionsChain(symbol) {
  const chain = await yahooFinance.options(symbol);
  // Normalize expiries and current chain for first expiry
  const expiries = chain?.expirationDates || [];
  const firstExpiry = expiries?.[0];
  let options = { calls: [], puts: [] };
  if (firstExpiry) {
    const chainForExpiry = await yahooFinance.options(symbol, { date: firstExpiry });
    options = chainForExpiry?.options?.[0] || options;
  }
  return { expiries, options };
}

async function fetchInsider(symbol) {
  if (typeof yahooFinance.insiderTransactions === 'function') {
    const data = await yahooFinance.insiderTransactions(symbol);
    return data || [];
  }
  const summary = await yahooFinance.quoteSummary(symbol, {
    modules: ['insiderTransactions']
  });
  const tx = summary?.insiderTransactions?.transactions;
  return Array.isArray(tx) ? tx : [];
}

async function fetchRecommendations(symbol) {
  if (typeof yahooFinance.recommendationsBySymbol === 'function') {
    const data = await yahooFinance.recommendationsBySymbol(symbol);
    return data || [];
  }
  const summary = await yahooFinance.quoteSummary(symbol, {
    modules: ['recommendationTrend']
  });
  const trends = summary?.recommendationTrend?.trend;
  return Array.isArray(trends) ? trends : [];
}

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
  fetchLiveDataBatch,
  fetchChart,
  fetchFundamentals,
  fetchOptionsChain,
  fetchInsider,
  fetchRecommendations
};