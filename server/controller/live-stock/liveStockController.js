const { fetchLiveDataBatch, fetchChart, fetchFundamentals, fetchOptionsChain, fetchInsider, fetchRecommendations } = require('../../utils/live-stock/yahooFinanceFetcher');
const { getLiveSnapshot, getUpdateProgress, subscribeToDataUpdates } = require('../../utils/live-stock/backgroundUpdater');

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

// Function to get all symbols for the UI (from in-memory snapshot)
async function getSymbols(req, res) {
  try {
    const symbols = getLiveSnapshot().map(s => ({
      symbol: s.symbol,
      yahooSymbol: s.yahooSymbol
    }));
    res.json({ success: true, data: symbols });
  } catch (error) {
    console.error('Error in getSymbols:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch symbols' });
  }
}

// Function to get cached symbol list (for UI display) from in-memory snapshot
async function getCachedData(req, res) {
  try {
    const data = getLiveSnapshot();
    res.json({ success: true, data, timestamp: new Date().toISOString() });
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

// Function to get live data for all symbols (in-memory snapshot)
async function getLiveData(req, res) {
  try {
    const result = getLiveSnapshot();
    res.json({ 
      success: true, 
      data: result,
      timestamp: new Date().toISOString(),
      note: 'Data is updated by background process. Use WebSocket for real-time updates.'
    });
  } catch (error) {
    console.error('Error in getLiveData:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Function to get live data for a single symbol (from in-memory snapshot)
async function getLiveSymbolData(req, res) {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }
    
    const snapshot = getLiveSnapshot();
    const found = snapshot.find(s => s.yahooSymbol.toLowerCase() === symbol.toLowerCase() || s.symbol.toLowerCase() === symbol.toLowerCase());
    
    if (!found) {
      return res.status(404).json({ success: false, error: 'Symbol not found' });
    }
    
    res.json({ 
      success: true, 
      data: found,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getLiveSymbolData:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch symbol data' });
  }
}

// Chart-only endpoint with range selector (1d/5d/1mo/1y/max)
async function getSymbolChart(req, res) {
  try {
    const { symbol } = req.params;
    const { range } = req.query;
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }

    const chart = await fetchChart(symbol, range || '1mo');
    res.json({
      success: true,
      data: chart,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getSymbolChart:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch symbol chart' });
  }
}

// Deep insights for a symbol
async function getSymbolInsights(req, res) {
  try {
    const { symbol } = req.params;
    const { range } = req.query;
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }

    const [chart, fundamentals, optionsChain, insider, recommendations] = await Promise.all([
      fetchChart(symbol, range || '1mo'),
      fetchFundamentals(symbol),
      fetchOptionsChain(symbol),
      fetchInsider(symbol),
      fetchRecommendations(symbol)
    ]);

    res.json({
      success: true,
      data: {
        chart,
        fundamentals,
        options: optionsChain,
        insider,
        recommendations
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getSymbolInsights:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch symbol insights' });
  }
}

module.exports = {
  getSymbols,
  getCachedData,
  getUpdateProgressEndpoint,
  getRecentUpdates,
  getLiveData,
  getLiveSymbolData,
  getSymbolInsights,
  getSymbolChart
};
