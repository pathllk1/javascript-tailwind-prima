const express = require('express');
const router = express.Router();
const { getSymbols, getCachedData, getUpdateProgressEndpoint, getRecentUpdates, getLiveData, getLiveSymbolData } = require('../../controller/live-stock/liveStockController');

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

module.exports = router;