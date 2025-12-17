const { getAllSymbols, getSymbolByYahooSymbol, updateSymbolData, db } = require('../../utils/live-stock/dbUtils');
const { fetchLiveDataBatch } = require('../../utils/live-stock/yahooFinanceFetcher');
const { getUpdateProgress, subscribeToDataUpdates } = require('../../utils/live-stock/backgroundUpdater');

// Store for real-time updates
let recentUpdates = {};

// Subscribe to data updates from background updater
subscribeToDataUpdates((data) => {
  // Store the latest data for each symbol
  recentUpdates[data.symbol] = data;
  
  // Keep only the most recent 100 updates to prevent memory issues
  const keys = Object.keys(recentUpdates);
  if (keys.length > 100) {
    // Remove the oldest entries
    const oldestKeys = keys.slice(0, keys.length - 100);
    oldestKeys.forEach(key => delete recentUpdates[key]);
  }
});

// Function to get all symbols for the UI
async function getSymbols(req, res) {
  try {
    const symbols = getAllSymbols();
    res.json({ success: true, data: symbols });
  } catch (error) {
    console.error('Error in getSymbols:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch symbols' });
  }
}

// Function to get cached symbol list (for UI display)
async function getCachedData(req, res) {
  try {
    // Get all symbols from database (just the symbol list, not the data)
    const symbols = getAllSymbols();
    res.json({ success: true, data: symbols, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error in getCachedData:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch symbol list' });
  }
}

// Function to get update progress
async function getUpdateProgressEndpoint(req, res) {
  try {
    const progress = getUpdateProgress();
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error in getUpdateProgressEndpoint:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch update progress' });
  }
}

// Function to get recent updates
async function getRecentUpdates(req, res) {
  try {
    res.json({ 
      success: true, 
      data: recentUpdates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getRecentUpdates:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch recent updates' });
  }
}

// Function to get live data for all symbols (correct approach - fetch fresh data)
async function getLiveData(req, res) {
  try {
    // Get all symbols from database
    const symbols = getAllSymbols();
    
    if (symbols.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Extract yahoo symbols
    const yahooSymbols = symbols.map(s => s.yahoo_symbol);
    
    // Fetch LIVE data directly from Yahoo Finance (not from database!)
    const { results, errors } = await fetchLiveDataBatch(yahooSymbols, 10);
    
    // Update database with current prices for caching
    for (const result of results) {
      if (result) {
        await updateSymbolData({
          yahooSymbol: result.symbol,
          currentPrice: result.currentPrice
        });
      }
    }
    
    res.json({ 
      success: true, 
      data: results.filter(r => r !== null),
      errors: errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getLiveData:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch live data' });
  }
}

// Function to get live data for a single symbol (correct approach - fetch fresh data)
async function getLiveSymbolData(req, res) {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }
    
    // Fetch LIVE data directly from Yahoo Finance (not from database!)
    const result = await fetchLiveData(symbol);
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Symbol not found' });
    }
    
    // Update database with current price for caching
    await updateSymbolData({
      yahooSymbol: result.symbol,
      currentPrice: result.currentPrice
    });
    
    res.json({ 
      success: true, 
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getLiveSymbolData:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch symbol data' });
  }
}

module.exports = {
  getSymbols,
  getCachedData,
  getUpdateProgressEndpoint,
  getRecentUpdates,
  getLiveData,
  getLiveSymbolData
};