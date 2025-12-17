const { getAllSymbols, updateSymbolData } = require('./dbUtils');
const { fetchLiveDataBatch } = require('./yahooFinanceFetcher');

// Background update interval (5 minutes in milliseconds)
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Flag to track if an update is currently running
let isUpdating = false;

// Progress tracking
let totalSymbols = 0;
let processedSymbols = 0;
let lastUpdateTimestamp = null;

// Store for progress callbacks
let progressCallbacks = [];

// Store for incremental data callbacks
let dataCallbacks = [];

// Function to subscribe to progress updates
function subscribeToProgress(callback) {
  progressCallbacks.push(callback);
}

// Function to subscribe to data updates
function subscribeToDataUpdates(callback) {
  dataCallbacks.push(callback);
}

// Function to notify progress updates
function notifyProgress() {
  const progress = getUpdateProgress();
  progressCallbacks.forEach(callback => {
    try {
      callback(progress);
    } catch (error) {
      console.error('Error in progress callback:', error.message);
    }
  });
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
  // Prevent multiple simultaneous updates
  if (isUpdating) {
    console.log('Background update already in progress, skipping...');
    return;
  }
  
  isUpdating = true;
  processedSymbols = 0;
  
  try {
    console.log('Starting background update of stock data...');
    notifyProgress(); // Notify start
    
    // Get all symbols from database
    const symbols = getAllSymbols();
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
    const yahooSymbols = symbols.map(s => s.yahoo_symbol);
    
    // Process symbols in batches
    const batchSize = 10;
    for (let i = 0; i < yahooSymbols.length; i += batchSize) {
      const batch = yahooSymbols.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(yahooSymbols.length / batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} symbols)`);
      
      // Fetch live data for this batch
      const { results, errors } = await fetchLiveDataBatch(batch, batch.length);
      
      // Process results
      for (const result of results) {
        try {
          if (result) {
            // Update database
            await updateSymbolData({
              yahooSymbol: result.symbol,
              currentPrice: result.currentPrice
            });
            
            // Notify frontend of this update
            notifyDataUpdates(result);
            
            processedSymbols++;
            notifyProgress(); // Notify progress after each symbol
          }
        } catch (updateError) {
          console.error(`Error updating ${result?.symbol || 'unknown'}:`, updateError.message);
          processedSymbols++;
          notifyProgress(); // Notify progress even on error
        }
      }
      
      // Wait between batches to respect rate limits
      if (i + batchSize < yahooSymbols.length) {
        console.log('Waiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    lastUpdateTimestamp = new Date().toISOString();
    console.log('Background update completed.');
    notifyProgress(); // Notify completion
    
  } catch (error) {
    console.error('Error in background update:', error.message);
    notifyProgress(); // Notify error
  } finally {
    isUpdating = false;
    totalSymbols = 0;
    processedSymbols = 0;
    notifyProgress(); // Final notification
  }
}

// Function to start the background updater
function startBackgroundUpdater() {
  console.log(`Starting background updater with ${UPDATE_INTERVAL/1000/60} minute interval`);
  
  // Perform initial update
  performBackgroundUpdate();
  
  // Schedule periodic updates
  setInterval(performBackgroundUpdate, UPDATE_INTERVAL);
}

module.exports = {
  startBackgroundUpdater,
  performBackgroundUpdate,
  getUpdateProgress,
  subscribeToProgress,
  subscribeToDataUpdates
};