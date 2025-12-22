const Realm = require('realm');
const path = require('path');

// Schema definitions for OHLCV data
const SymbolSchema = {
  name: 'Symbol',
  primaryKey: 'symbol',
  properties: {
    symbol: 'string',
    yahooSymbol: { type: 'string', indexed: true },
    series: 'string?',
    currentPrice: 'double?',
    lastUpdated: 'date?',
    fetchStatus: 'string?',
    ohlcvLastDate: { type: 'string', indexed: true, optional: true },
  },
};

const OHLCVSchema = {
  name: 'OHLCV',
  primaryKey: 'id',
  properties: {
    id: 'string',
    symbol: { type: 'string', indexed: true },
    date: { type: 'string', indexed: true },
    open: 'double?',
    high: 'double?',
    low: 'double?',
    close: 'double?',
    volume: 'int?',
  },
};

const IngestMetaSchema = {
  name: 'IngestMeta',
  primaryKey: 'key',
  properties: {
    key: 'string',
    value: 'string?',
    updatedAt: 'date',
  },
};

// Path to the OHLCV Realm database
const REALM_FILE = path.join(__dirname, '../../../data/yahoo_finance_ohlcv.realm');

let realmPromise = null;

// Function to open the OHLCV Realm database
async function openOhlcvRealm() {
  if (realmPromise) return realmPromise;
  realmPromise = Realm.open({
    path: REALM_FILE,
    schema: [SymbolSchema, OHLCVSchema, IngestMetaSchema],
    schemaVersion: 2,
    migration() {},
  });
  return realmPromise;
}

// Function to fetch OHLCV data for a specific symbol
async function fetchOhlcvDataForSymbol(symbol) {
  try {
    const realm = await openOhlcvRealm();
    
    // Query OHLCV data for the symbol, sorted by date descending
    const ohlcvData = realm.objects('OHLCV')
      .filtered('symbol == $0', symbol)
      .sorted('date', true); // true for descending order
    
    // Convert to plain JavaScript objects
    return ohlcvData.map(record => ({
      id: record.id,
      symbol: record.symbol,
      date: record.date,
      open: record.open,
      high: record.high,
      low: record.low,
      close: record.close,
      volume: record.volume
    }));
  } catch (error) {
    console.error(`Error fetching OHLCV data for symbol ${symbol}:`, error);
    throw error;
  }
}

// Function to get symbol information
async function getSymbolInfo(symbol) {
  try {
    const realm = await openOhlcvRealm();
    
    // Query symbol information
    const symbolObj = realm.objectForPrimaryKey('Symbol', symbol);
    
    if (!symbolObj) {
      return null;
    }
    
    return {
      symbol: symbolObj.symbol,
      yahooSymbol: symbolObj.yahooSymbol,
      series: symbolObj.series,
      currentPrice: symbolObj.currentPrice,
      lastUpdated: symbolObj.lastUpdated,
      fetchStatus: symbolObj.fetchStatus,
      ohlcvLastDate: symbolObj.ohlcvLastDate
    };
  } catch (error) {
    console.error(`Error fetching symbol info for ${symbol}:`, error);
    throw error;
  }
}

module.exports = {
  fetchOhlcvDataForSymbol,
  getSymbolInfo
};