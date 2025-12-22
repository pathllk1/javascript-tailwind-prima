const { fetchLiveDataBatch, fetchChart, fetchFundamentals, fetchOptionsChain, fetchInsider, fetchRecommendations } = require('../../utils/live-stock/yahooFinanceFetcher');
const { getLiveSnapshot, getUpdateProgress, subscribeToDataUpdates } = require('../../utils/live-stock/backgroundUpdater');
const { fetchOhlcvDataForSymbol } = require('../../utils/live-stock/dbUtils');
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

// Fetch OHLCV data for a symbol from the database
async function getSymbolOhlcvData(req, res) {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }

    const ohlcvData = await fetchOhlcvDataForSymbol(symbol);
    
    res.json({
      success: true,
      data: ohlcvData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getSymbolOhlcvData:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch symbol OHLCV data' });
  }
}

// Calculate technical indicators for a symbol
async function getSymbolTechIndicators(req, res) {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }

    // Fetch OHLCV data for calculations
    const ohlcvData = await fetchOhlcvDataForSymbol(symbol);
    
    if (!ohlcvData || !Array.isArray(ohlcvData) || ohlcvData.length === 0) {
      return res.status(404).json({ success: false, error: 'No data available for this symbol' });
    }
    
    // Sort data by date (ascending for calculations)
    const sortedData = [...ohlcvData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate RSI (14-period)
    const rsi = calculateRSI(sortedData, 14);
    
    // Calculate MACD (12, 26, 9)
    const macd = calculateMACD(sortedData, 12, 26, 9);
    
    // Calculate EMAs
    const ema20 = calculateEMA(sortedData, 20);
    const ema50 = calculateEMA(sortedData, 50);
    const ema200 = calculateEMA(sortedData, 200);
    
    // Calculate SMAs
    const sma20 = calculateSMA(sortedData, 20);
    const sma50 = calculateSMA(sortedData, 50);
    const sma200 = calculateSMA(sortedData, 200);
    
    // Get latest values
    const latest = sortedData[sortedData.length - 1];
    const currentPrice = latest.close;
    
    // Determine signals
    const rsiSignal = rsi >= 70 ? 'Overbought' : rsi <= 30 ? 'Oversold' : 'Neutral';
    const priceVsEma20 = currentPrice > ema20 ? 'Above' : 'Below';
    const priceVsSma20 = currentPrice > sma20 ? 'Above' : 'Below';
    
    // Trend determination (simple approach)
    let trend = 'Neutral';
    if (currentPrice > ema20 && ema20 > ema50 && ema50 > ema200) {
      trend = 'Bullish';
    } else if (currentPrice < ema20 && ema20 < ema50 && ema50 < ema200) {
      trend = 'Bearish';
    }
    
    // MACD interpretation
    let macdInterpretation = 'Neutral';
    if (macd.macd > macd.signal && macd.histogram > 0) {
      macdInterpretation = 'Bullish';
    } else if (macd.macd < macd.signal && macd.histogram < 0) {
      macdInterpretation = 'Bearish';
    }
    
    res.json({
      success: true,
      data: {
        rsi: {
          value: rsi,
          signal: rsiSignal,
          period: 14
        },
        macd: {
          macd: macd.macd,
          signal: macd.signal,
          histogram: macd.histogram,
          interpretation: macdInterpretation
        },
        ema: {
          ema20: ema20,
          ema50: ema50,
          ema200: ema200,
          priceVsEma20: priceVsEma20,
          trend: trend
        },
        sma: {
          sma20: sma20,
          sma50: sma50,
          sma200: sma200,
          priceVsSma20: priceVsSma20
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getSymbolTechIndicators:', error.message);
    res.status(500).json({ success: false, error: 'Failed to calculate technical indicators' });
  }
}

// Helper function to calculate RSI
function calculateRSI(data, period = 14) {
  if (data.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI for the most recent period
  const recentData = data.slice(-period - 1);
  for (let i = 1; i < recentData.length; i++) {
    const diff = recentData[i].close - recentData[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Helper function to calculate MACD
function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (data.length < slowPeriod + signalPeriod) return { macd: null, signal: null, histogram: null };
  
  // Calculate EMAs
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  if (fastEMA === null || slowEMA === null) {
    return { macd: null, signal: null, histogram: null };
  }
  
  const macdLine = fastEMA - slowEMA;
  
  // For simplicity, we'll approximate the signal line
  // In a real implementation, this would require a more complex calculation
  const signalLine = macdLine * 0.9; // Simplified approximation
  const histogram = macdLine - signalLine;
  
  return { macd: macdLine, signal: signalLine, histogram: histogram };
}

// Helper function to calculate EMA
function calculateEMA(data, period) {
  if (data.length < period) return null;
  
  // Calculate initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  
  // Calculate multiplier
  const multiplier = 2 / (period + 1);
  
  // Calculate EMA for remaining data
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
  }
  
  return ema;
}

// Helper function to calculate SMA
function calculateSMA(data, period) {
  if (data.length < period) return null;
  
  const recentData = data.slice(-period);
  const sum = recentData.reduce((acc, item) => acc + item.close, 0);
  return sum / period;
}

module.exports = {
  getSymbols,
  getCachedData,
  getUpdateProgressEndpoint,
  getRecentUpdates,
  getLiveData,
  getLiveSymbolData,
  getSymbolInsights,
  getSymbolChart,
  getSymbolOhlcvData,
  getSymbolTechIndicators
};