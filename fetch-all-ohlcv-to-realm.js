const fs = require('fs');
const path = require('path');
const Realm = require('realm');
const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance();

const INPUT_FILE = path.join(__dirname, 'public', 'yahoo_finance_symbols_with_prices.json');
const REALM_FILE = path.join(__dirname, 'data', 'yahoo_finance_ohlcv.realm');
const BATCH_SIZE = 100;
const DELAY_BETWEEN_BATCHES = 20000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const SymbolSchema = {
  name: 'Symbol',
  primaryKey: 'symbol',
  properties: {
    symbol: 'string',
    yahooSymbol: { type: 'string', indexed: true },
    series: 'string?',
    currentPrice: 'double?',
    lastUpdated: 'date?',
    fetchStatus: 'string?'
  }
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
    volume: 'int?'
  }
};

async function openRealm() {
  const realm = await Realm.open({
    path: REALM_FILE,
    schema: [SymbolSchema, OHLCVSchema],
    schemaVersion: 1,
  });
  return realm;
}

function upsertSymbol(realm, symbolObj) {
  const lastUpdated = symbolObj.lastUpdated ? new Date(symbolObj.lastUpdated) : null;

  realm.create(
    'Symbol',
    {
      symbol: symbolObj.symbol,
      yahooSymbol: symbolObj.yahooSymbol,
      series: symbolObj.series ?? null,
      currentPrice: typeof symbolObj.currentPrice === 'number' ? symbolObj.currentPrice : null,
      lastUpdated,
      fetchStatus: symbolObj.fetchStatus ?? null,
    },
    'modified'
  );
}

function normalizeDateToYmd(value) {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value.split('T')[0];
  return String(value);
}

function upsertOHLCVRecords(realm, symbol, ohlcvData) {
  for (const record of ohlcvData) {
    const date = normalizeDateToYmd(record.date);
    realm.create(
      'OHLCV',
      {
        id: `${symbol}|${date}`,
        symbol,
        date,
        open: record.open ?? null,
        high: record.high ?? null,
        low: record.low ?? null,
        close: record.close ?? null,
        volume: typeof record.volume === 'number' ? Math.trunc(record.volume) : null,
      },
      'modified'
    );
  }
}

async function fetchOHLCVData(symbolObj) {
  try {
    console.log(`Fetching OHLCV data for: ${symbolObj.yahooSymbol}`);

    const startDate = new Date('1970-01-01');
    const endDate = new Date();

    const chartData = await yahooFinance.chart(symbolObj.yahooSymbol, {
      period1: startDate,
      period2: endDate,
    });

    const quotes = Array.isArray(chartData?.quotes) ? chartData.quotes : [];
    const ohlcvData = quotes.map(q => ({
      date: normalizeDateToYmd(q.date),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));

    return {
      symbol: symbolObj.symbol,
      yahooSymbol: symbolObj.yahooSymbol,
      ohlcvData,
      success: true,
    };
  } catch (error) {
    console.error(`Failed to fetch OHLCV data for ${symbolObj.yahooSymbol}:`, error.message);
    return {
      symbol: symbolObj.symbol,
      yahooSymbol: symbolObj.yahooSymbol,
      ohlcvData: [],
      success: false,
      error: error.message,
    };
  }
}

async function processSymbolsInBatches(realm, symbols) {
  let successCount = 0;
  let failureCount = 0;
  const failedSymbols = [];

  console.log(`Processing ${symbols.length} symbols in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);

    console.log(`\nProcessing batch ${batchNumber}/${totalBatches} (${batch.length} symbols)`);

    const batchResults = await Promise.all(batch.map(symbolObj => fetchOHLCVData(symbolObj)));

    for (const result of batchResults) {
      if (!result.success) {
        failureCount++;
        failedSymbols.push({
          symbol: result.symbol,
          yahooSymbol: result.yahooSymbol,
          error: result.error,
        });
        continue;
      }

      const symbolInfo = batch.find(s => s.yahooSymbol === result.yahooSymbol);
      if (!symbolInfo) {
        failureCount++;
        failedSymbols.push({
          symbol: result.symbol,
          yahooSymbol: result.yahooSymbol,
          error: 'Symbol metadata not found in batch',
        });
        continue;
      }

      try {
        realm.write(() => {
          upsertSymbol(realm, symbolInfo);
          if (result.ohlcvData.length > 0) {
            upsertOHLCVRecords(realm, symbolInfo.symbol, result.ohlcvData);
          }
        });

        if (result.ohlcvData.length > 0) {
          console.log(`Upserted ${result.ohlcvData.length} records for ${result.yahooSymbol}`);
        } else {
          console.log(`No OHLCV data for ${result.yahooSymbol}`);
        }

        successCount++;
      } catch (dbError) {
        console.error(`Realm error for ${result.yahooSymbol}:`, dbError.message);
        failureCount++;
        failedSymbols.push({
          symbol: result.symbol,
          yahooSymbol: result.yahooSymbol,
          error: `Realm error: ${dbError.message}`,
        });
      }
    }

    if (i + BATCH_SIZE < symbols.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  return { successCount, failureCount, failedSymbols };
}

function generateSummaryReport(realm) {
  console.log('\n=== REALM SUMMARY REPORT ===');

  const symbolCount = realm.objects('Symbol').length;
  const ohlcvCount = realm.objects('OHLCV').length;

  console.log(`Total symbols in database: ${symbolCount}`);
  console.log(`Total OHLCV records in database: ${ohlcvCount}`);

  if (symbolCount > 0) {
    const avgRecords = Math.round(ohlcvCount / symbolCount);
    console.log(`Average OHLCV records per symbol: ${avgRecords}`);
  }

  console.log('\nSample data:');
  const symbols = realm.objects('Symbol').sorted('symbol');
  const sampleCount = Math.min(5, symbols.length);
  for (let i = 0; i < sampleCount; i++) {
    const s = symbols[i];
    const recordCount = realm.objects('OHLCV').filtered('symbol == $0', s.symbol).length;
    const earliest = realm.objects('OHLCV').filtered('symbol == $0', s.symbol).sorted('date')[0];
    const latest = realm.objects('OHLCV').filtered('symbol == $0', s.symbol).sorted('date', true)[0];
    const earliestDate = earliest ? earliest.date : null;
    const latestDate = latest ? latest.date : null;

    console.log(`  ${s.symbol} (${s.yahooSymbol}): ${recordCount} records (${earliestDate} to ${latestDate})`);
  }
}

async function main() {
  let realm;
  try {
    console.log('Starting OHLCV data fetch and Realm storage process...');

    realm = await openRealm();

    const symbolsData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`Loaded ${symbolsData.length} symbols`);

    const { successCount, failureCount, failedSymbols } = await processSymbolsInBatches(realm, symbolsData);

    generateSummaryReport(realm);

    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Realm file: ${REALM_FILE}`);
    console.log(`Total symbols processed: ${symbolsData.length}`);
    console.log(`Successful fetches: ${successCount}`);
    console.log(`Failed fetches: ${failureCount}`);

    if (failedSymbols.length > 0) {
      const failedSymbolsFile = path.join(__dirname, 'failed_symbols_realm.json');
      fs.writeFileSync(failedSymbolsFile, JSON.stringify(failedSymbols, null, 2));
      console.log(`Failed symbols saved to: ${failedSymbolsFile}`);
    } else {
      console.log('All symbols processed successfully!');
    }
  } catch (error) {
    console.error('Error in main process:', error.message);
  } finally {
    if (realm && !realm.isClosed) {
      realm.close();
    }
  }
}

if (require.main === module) {
  main();
}
