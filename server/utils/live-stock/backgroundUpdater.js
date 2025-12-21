const fs = require('fs');
const path = require('path');
const { fetchLiveDataBatch } = require('./yahooFinanceFetcher');
const socketService = require('../socket');
const { calculateTopPerformers } = require('./topPerformers');
const liveStockEvents = require('./events');

// Background update interval (5 minutes in milliseconds)
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Flag to track if an update is currently running
let isUpdating = false;

// Progress tracking
let totalSymbols = 0;
let processedSymbols = 0;
let lastUpdateTimestamp = null;

// Track the current update in progress
let currentUpdate = null;

// Store for progress callbacks
let progressCallbacks = [];

// Store for incremental data callbacks
let dataCallbacks = [];

// Store for new socket connection callbacks
let socketConnectionCallbacks = [];

// In-memory live data store
let symbolList = [];
let liveDataMap = new Map(); // key: yahooSymbol, value: latest data

// Symbol validation (Yahoo room names / fetch)
const VALID_SYMBOL_RE = /^[A-Z0-9.\-]+$/i;

// Function to broadcast top performers
function broadcastTopPerformers() {
  try {
    const { gainers, losers } = calculateTopPerformers(liveDataMap);
    console.log(`Broadcasting top performers - Gainers: ${gainers.length}, Losers: ${losers.length}`);
    
    // Broadcast to all connected clients
    socketService?.broadcastEvent?.('topPerformers', {
      gainers,
      losers,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Broadcasted top performers: ${gainers.length} gainers, ${losers.length} losers`);
  } catch (error) {
    console.error('Error broadcasting top performers:', error.message);
  }
}

// Function to send top performers to a specific socket
function sendTopPerformersToSocket(socket) {
  try {
    const { gainers, losers } = calculateTopPerformers(liveDataMap);
    console.log(`Calculated top performers - Gainers: ${gainers.length}, Losers: ${losers.length}`);
    
    if (gainers && losers && (gainers.length > 0 || losers.length > 0)) {
      socket.emit('topPerformers', {
        gainers,
        losers,
        timestamp: new Date().toISOString()
      });
      console.log('Sent top performers to socket');
    } else {
      console.log('No top performers to send');
    }
  } catch (error) {
    console.error('Error sending top performers to socket:', error.message);
  }
}

// Load symbols from the public JSON file
function loadSymbolList() {
  try {
    const jsonPath = path.join(__dirname, '..', '..', '..', 'public', 'yahoo_finance_symbols_with_prices.json');
    const content = fs.readFileSync(jsonPath, 'utf-8');
    symbolList = (JSON.parse(content) || []).filter((s) => VALID_SYMBOL_RE.test(s.yahooSymbol));
    console.log(`Loaded ${symbolList.length} symbols from JSON (filtered invalid symbols)`);
  } catch (err) {
    console.error('Failed to load symbol list JSON:', err.message);
    symbolList = [];
  }
}

// Get snapshot for controllers (merge static symbol list + latest live data)
function getLiveSnapshot() {
  // Ensure symbol list is loaded so we can return something even before first fetch completes
  if (symbolList.length === 0) {
    loadSymbolList();
  }

  return symbolList.map((s) => {
    const latest = liveDataMap.get(s.yahooSymbol) || {};
    return {
      symbol: s.symbol || s.yahooSymbol,
      yahooSymbol: s.yahooSymbol,
      name: latest.name || s.symbol || s.yahooSymbol,
      currentPrice: latest.currentPrice ?? s.currentPrice ?? null,
      previousClose: latest.previousClose ?? null,
      dayHigh: latest.dayHigh ?? null,
      dayLow: latest.dayLow ?? null,
      volume: latest.volume ?? null,
      currency: latest.currency ?? 'INR',
      lastUpdated: latest.lastUpdated || s.lastUpdated || null
    };
  });
}

// Function to subscribe to progress updates
function subscribeToProgress(callback) {
  progressCallbacks.push(callback);
}

// Function to subscribe to data updates
function subscribeToDataUpdates(callback) {
  dataCallbacks.push(callback);
}

// Function to subscribe to new socket connections
function subscribeToSocketConnections(callback) {
  socketConnectionCallbacks.push(callback);
}

// Function to notify progress updates
function notifyProgress() {
  try {
    const progress = getUpdateProgress();
    progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error.message);
      }
    });
  } catch (err) {
    console.error('Error notifying progress:', err.message);
  }
}

// Function to notify data updates
function notifyDataUpdates(data) {
  dataCallbacks.forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error('Error in data callback:', error.message);
    }
  });
}

// Function to get update progress
function getUpdateProgress() {
  return {
    isUpdating,
    totalSymbols,
    processedSymbols,
    progressPercent: totalSymbols > 0 ? Math.round((processedSymbols / totalSymbols) * 100) : 0,
    lastUpdate: lastUpdateTimestamp
  };
}

// Function to perform background update
async function performBackgroundUpdate() {
  // If an update is already in progress, return the existing promise
  if (currentUpdate) {
    console.log('Background update already in progress, returning existing promise');
    return currentUpdate;
  }

  // Create a new update promise
  currentUpdate = (async () => {
    // Prevent multiple simultaneous updates with a lock
    if (isUpdating) {
      console.log('Background update already in progress, skipping...');
      return;
    }

    // Set the lock
    isUpdating = true;
    processedSymbols = 0;
    let updateSuccessful = false;

    try {
      console.log('Starting background update of stock data...');
      notifyProgress(); // Notify start

      // Load symbols from JSON once per run
      if (symbolList.length === 0) {
        loadSymbolList();
      }
      const symbols = symbolList;
      totalSymbols = symbols.length;

      if (symbols.length === 0) {
        console.log('No symbols found in database, skipping update');
        isUpdating = false;
        lastUpdateTimestamp = new Date().toISOString();
        notifyProgress(); // Notify completion
        return;
      }

      console.log(`Found ${symbols.length} symbols to update`);
      notifyProgress(); // Notify progress

      // Extract yahoo symbols
      const yahooSymbols = symbols.map(s => s.yahooSymbol);

      // Process symbols in batches
      const batchSize = 100;
      for (let i = 0; i < yahooSymbols.length; i += batchSize) {
        const batch = yahooSymbols.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(yahooSymbols.length / batchSize);

        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} symbols)`);

        try {
          // Fetch live data for this batch
          const { results, errors } = await fetchLiveDataBatch(batch, batch.length);

          // Process results sequentially within the batch
          for (const result of results) {
            try {
              if (result) {
                // Update in-memory store
                liveDataMap.set(result.symbol, {
                  ...result,
                  lastUpdated: new Date().toISOString()
                });

                // Notify frontend of this update via callbacks
                notifyDataUpdates(result);

                // Broadcast via WebSocket to subscribed clients
                socketService?.broadcastStockUpdate?.(result.symbol, {
                  currentPrice: result.currentPrice,
                  previousClose: result.previousClose,
                  dayHigh: result.dayHigh,
                  dayLow: result.dayLow,
                  volume: result.volume,
                  currency: result.currency
                });
              }
            } catch (updateError) {
              console.error(`Error updating ${result?.symbol || 'unknown'}:`, updateError.message);
              // Continue with next symbol even if one fails
            } finally {
              processedSymbols++;
              notifyProgress(); // Ensure progress is always updated
            }
          }

          // Wait between batches to respect rate limits
          if (i + batchSize < yahooSymbols.length) {
            console.log('Waiting 20 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 20000));
          }
        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError.message);
          // Continue with next batch even if one fails
          processedSymbols += batch.length;
          notifyProgress();
        }
      }
      
      lastUpdateTimestamp = new Date().toISOString();
      updateSuccessful = true;
      console.log('Background update completed.');
      notifyProgress(); // Notify completion
      
      // Broadcast top performers after successful batch completion
      broadcastTopPerformers();
      
      
    } catch (error) {
      console.error('Error in background update:', error.message);
      notifyProgress(); // Notify error
    } finally {
      // Only reset if this is the same update that set the lock
      if (isUpdating) {
        isUpdating = false;
        totalSymbols = 0;
        processedSymbols = 0;
        notifyProgress(); // Final notification
      }
      
      // If the update wasn't successful, schedule a retry after a delay
      if (!updateSuccessful) {
        console.log('Scheduling retry after error...');
        setTimeout(() => {
          console.log('Retrying background update after error...');
          performBackgroundUpdate();
        }, 30000); // Retry after 30 seconds
      }
    }
    
    // Clear the current update reference
    currentUpdate = null;
  })();
  
  return currentUpdate;
}

// Function to start the background updater
function startBackgroundUpdater() {
  console.log(`Starting background updater with ${UPDATE_INTERVAL/1000/60} minute interval`);
  
  // Listen for new socket connections
  liveStockEvents.on('newSocketConnection', (socket) => {
    sendTopPerformersToSocket(socket);
  });
  
  // Track if we're currently performing an update
  let isUpdating = false;
  
  // Function to safely perform an update
  const safeUpdate = async () => {
    if (isUpdating) {
      console.log('Update already in progress, skipping...');
      return;
    }
    
    try {
      isUpdating = true;
      await performBackgroundUpdate();
    } catch (error) {
      console.error('Background update failed:', error);
    } finally {
      isUpdating = false;
    }
  };
  
  // Perform initial update
  safeUpdate();
  
  // Schedule periodic updates
  setInterval(safeUpdate, UPDATE_INTERVAL);
}

module.exports = {
  startBackgroundUpdater,
  performBackgroundUpdate,
  getUpdateProgress,
  subscribeToProgress,
  subscribeToDataUpdates,
  subscribeToSocketConnections,
  getLiveSnapshot,
  sendTopPerformersToSocket
};