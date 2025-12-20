const express = require('express');
const router = express.Router();
const { getSymbols, getCachedData, getUpdateProgressEndpoint, getRecentUpdates, getLiveData, getLiveSymbolData, getSymbolInsights, getSymbolChart } = require('../../controller/live-stock/liveStockController');

// Route to get all symbols
router.get('/symbols', getSymbols);

// Route to get cached symbol list (for UI display)
router.get('/cached-data', getCachedData);

// Route to get update progress
router.get('/update-progress', getUpdateProgressEndpoint);

// Route to get recent updates
router.get('/recent-updates', getRecentUpdates);

// Route to get live data for all symbols
router.get('/live-data', getLiveData);

// Route to get live data for a specific symbol
router.get('/live-data/:symbol', getLiveSymbolData);

// Route to get chart for a symbol with range selector
router.get('/live-data/:symbol/chart', getSymbolChart);

// Route to get deep insights for a specific symbol (chart, fundamentals, options, insider, recommendations)
router.get('/live-data/:symbol/insights', getSymbolInsights);

module.exports = router;