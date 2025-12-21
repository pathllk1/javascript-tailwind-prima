const fs = require('fs');
const path = require('path');
const Realm = require('realm');
const YahooFinance = require('yahoo-finance2').default;
const socketService = require('../socket');
const liveStockEvents = require('./events');

const yahooFinance = new YahooFinance();

const INPUT_FILE = path.join(process.cwd(), 'public', 'yahoo_finance_symbols_with_prices.json');
const REALM_FILE = path.join(process.cwd(), 'data', 'yahoo_finance_ohlcv.realm');

const DEFAULT_BATCH_CONCURRENCY = Number(process.env.OHLCV_FETCH_CONCURRENCY ?? 100);
const DEFAULT_LOOKBACK_DAYS = Number(process.env.OHLCV_LOOKBACK_DAYS ?? 30);
const DEFAULT_SEED_DAYS = Number(process.env.OHLCV_SEED_DAYS ?? 30);
const IST_DAILY_HOUR = Number(process.env.OHLCV_IST_DAILY_HOUR ?? 22);
const IST_DAILY_MINUTE = Number(process.env.OHLCV_IST_DAILY_MINUTE ?? 0);
const SYMBOL_BATCH_SIZE = Number(process.env.OHLCV_SYMBOL_BATCH_SIZE ?? 100);
const DELAY_BETWEEN_BATCHES_MS = Number(process.env.OHLCV_DELAY_BETWEEN_BATCHES_MS ?? 20000);
const SYMBOL_LIMIT = process.env.OHLCV_SYMBOL_LIMIT ? Number(process.env.OHLCV_SYMBOL_LIMIT) : null;

const VALID_SYMBOL_RE = /^[A-Z0-9.\-]+$/i;
const TIME_ZONE = 'Asia/Kolkata';

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

let realmPromise = null;
let ingestPromise = null;
let scheduleTimer = null;

function normalizeDateToYmd(value) {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value.split('T')[0];
  return String(value);
}

function getYmdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTzParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const p = getTzParts(date, timeZone);
  const asUtcMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtcMs - date.getTime()) / 60000);
}

function getYmdInTimeZone(date, timeZone) {
  const p = getTzParts(date, timeZone);
  const y = String(p.year).padStart(4, '0');
  const m = String(p.month).padStart(2, '0');
  const d = String(p.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYmdIst(now = new Date()) {
  return getYmdInTimeZone(now, TIME_ZONE);
}

function getRunUtcMsForTzDateParts({ year, month, day }, hour, minute, timeZone) {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMin = getTimeZoneOffsetMinutes(new Date(guessUtcMs), timeZone);
  return guessUtcMs - offsetMin * 60 * 1000;
}

function computeRunUtcMsForToday(now = new Date()) {
  const p = getTzParts(now, TIME_ZONE);
  return getRunUtcMsForTzDateParts(p, IST_DAILY_HOUR, IST_DAILY_MINUTE, TIME_ZONE);
}

function computeNextRunDelayMs(now = new Date()) {
  const nowMs = now.getTime();
  const p = getTzParts(now, TIME_ZONE);
  let runUtcMs = getRunUtcMsForTzDateParts(p, IST_DAILY_HOUR, IST_DAILY_MINUTE, TIME_ZONE);
  if (runUtcMs <= nowMs) {
    const tomorrowUtcMs = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) + 24 * 60 * 60 * 1000;
    const tomorrowParts = getTzParts(new Date(tomorrowUtcMs), TIME_ZONE);
    runUtcMs = getRunUtcMsForTzDateParts(tomorrowParts, IST_DAILY_HOUR, IST_DAILY_MINUTE, TIME_ZONE);
  }
  return Math.max(0, runUtcMs - nowMs);
}

function parseYmdAsUtcDate(ymd) {
  const [y, m, d] = String(ymd).split('-').map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function addDaysUtc(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function loadSymbolsFromJson() {
  const raw = fs.readFileSync(INPUT_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : [];
  const cleaned = list.filter((s) => VALID_SYMBOL_RE.test(s?.yahooSymbol));
  return SYMBOL_LIMIT ? cleaned.slice(0, SYMBOL_LIMIT) : cleaned;
}

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

function getMeta(realm, key) {
  const obj = realm.objectForPrimaryKey('IngestMeta', key);
  return obj ? obj.value : null;
}

function setMeta(realm, key, value) {
  realm.create(
    'IngestMeta',
    {
      key,
      value: value ?? null,
      updatedAt: new Date(),
    },
    'modified'
  );
}

function getSymbolLastDate(realm, symbol) {
  const sym = realm.objectForPrimaryKey('Symbol', symbol);
  if (sym?.ohlcvLastDate) return sym.ohlcvLastDate;

  const latest = realm.objects('OHLCV').filtered('symbol == $0', symbol).sorted('date', true)[0];
  const latestYmd = latest?.date ?? null;
  if (latestYmd) {
    realm.create('Symbol', { symbol, ohlcvLastDate: latestYmd }, 'modified');
  }
  return latestYmd;
}

async function fetchOhlcvDaily(symbolObj, startDateUtc, endDateUtc) {
  const chartData = await yahooFinance.chart(symbolObj.yahooSymbol, {
    period1: startDateUtc,
    period2: endDateUtc,
    interval: '1d',
  });
  const quotes = Array.isArray(chartData?.quotes) ? chartData.quotes : [];
  return quotes
    .map((q) => ({
      date: normalizeDateToYmd(q.date),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }))
    .filter((r) => typeof r.date === 'string' && r.date.length === 10);
}

async function runWithConcurrency(items, concurrency, worker) {
  const limit = Math.max(1, Number(concurrency) || 1);
  const results = new Array(items.length);
  let nextIndex = 0;

  const runners = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await worker(items[idx], idx);
    }
  });

  await Promise.all(runners);
  return results;
}

async function runDailyOhlcvIngest({ reason } = {}) {
  if (ingestPromise) return ingestPromise;

  ingestPromise = (async () => {
    const realm = await openOhlcvRealm();
    const symbols = loadSymbolsFromJson();
    const now = new Date();
    const todayYmd = getYmdIst(now);

    let success = 0;
    let failed = 0;

    console.log(`[OHLCV] ingest started (reason=${reason || 'unknown'}) at ${now.toISOString()}`);

    const pauseState = liveStockEvents.setLiveUpdatesPaused(true, 'ohlcv_daily_ingest');
    socketService?.broadcastEvent?.('liveUpdatesPauseChanged', pauseState);

    realm.write(() => {
      setMeta(realm, 'ohlcvDailyLastAttemptAt', new Date().toISOString());
      setMeta(realm, 'ohlcvDailyLastAttemptReason', reason || 'unknown');
    });

    const endDateUtc = now;

    const batches = [];
    for (let i = 0; i < symbols.length; i += SYMBOL_BATCH_SIZE) {
      batches.push(symbols.slice(i, i + SYMBOL_BATCH_SIZE));
    }

    const outcomes = [];
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const batchOutcomes = await runWithConcurrency(batch, DEFAULT_BATCH_CONCURRENCY, async (symbolObj) => {
      const symbol = symbolObj.symbol || symbolObj.yahooSymbol;
      const yahooSymbol = symbolObj.yahooSymbol;

      try {
        const lookbackDays = Number.isFinite(DEFAULT_LOOKBACK_DAYS) ? DEFAULT_LOOKBACK_DAYS : 30;
        const seedDays = Number.isFinite(DEFAULT_SEED_DAYS) ? DEFAULT_SEED_DAYS : 30;

        const lastYmd = realm.write(() => getSymbolLastDate(realm, symbol));
        const lastUtc = lastYmd ? parseYmdAsUtcDate(lastYmd) : null;
        const startUtc = lastUtc ? addDaysUtc(lastUtc, -lookbackDays) : addDaysUtc(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), -seedDays);

        const ohlcv = await fetchOhlcvDaily(symbolObj, startUtc, endDateUtc);
        if (ohlcv.length === 0) {
          realm.write(() => {
            realm.create(
              'Symbol',
              {
                symbol,
                yahooSymbol,
                series: symbolObj.series ?? null,
                currentPrice: typeof symbolObj.currentPrice === 'number' ? symbolObj.currentPrice : null,
                lastUpdated: symbolObj.lastUpdated ? new Date(symbolObj.lastUpdated) : null,
                fetchStatus: 'no_data',
              },
              'modified'
            );
          });
          return { symbol, yahooSymbol, ok: true, upserted: 0 };
        }

        const latestYmd = ohlcv.reduce((max, r) => (r.date > max ? r.date : max), ohlcv[0].date);
        realm.write(() => {
          realm.create(
            'Symbol',
            {
              symbol,
              yahooSymbol,
              series: symbolObj.series ?? null,
              currentPrice: typeof symbolObj.currentPrice === 'number' ? symbolObj.currentPrice : null,
              lastUpdated: symbolObj.lastUpdated ? new Date(symbolObj.lastUpdated) : null,
              fetchStatus: 'ok',
              ohlcvLastDate: latestYmd,
            },
            'modified'
          );

          for (const r of ohlcv) {
            realm.create(
              'OHLCV',
              {
                id: `${symbol}|${r.date}`,
                symbol,
                date: r.date,
                open: r.open ?? null,
                high: r.high ?? null,
                low: r.low ?? null,
                close: r.close ?? null,
                volume: typeof r.volume === 'number' ? Math.trunc(r.volume) : null,
              },
              'modified'
            );
          }
        });

        return { symbol, yahooSymbol, ok: true, upserted: ohlcv.length };
      } catch (err) {
        realm.write(() => {
          realm.create(
            'Symbol',
            {
              symbol,
              yahooSymbol,
              series: symbolObj.series ?? null,
              fetchStatus: `error:${String(err?.message || err)}`.slice(0, 200),
            },
            'modified'
          );
        });
        return { symbol, yahooSymbol, ok: false, error: String(err?.message || err) };
      }
    });
      outcomes.push(...batchOutcomes);

      if (batchIndex + 1 < batches.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    for (const o of outcomes) {
      if (o?.ok) success += 1;
      else failed += 1;
    }

    try {
      realm.write(() => {
        setMeta(realm, 'ohlcvDailyLastSuccessYmd', todayYmd);
        setMeta(realm, 'ohlcvDailyLastSuccessAt', new Date().toISOString());
        setMeta(realm, 'ohlcvDailyLastSuccessCount', String(success));
        setMeta(realm, 'ohlcvDailyLastFailureCount', String(failed));
      });

      console.log(`[OHLCV] ingest finished (success=${success}, failed=${failed}, total=${symbols.length})`);
      return { success, failed, total: symbols.length, todayYmd };
    } finally {
      const resumeState = liveStockEvents.setLiveUpdatesPaused(false);
      socketService?.broadcastEvent?.('liveUpdatesPauseChanged', resumeState);
    }
  })().finally(() => {
    ingestPromise = null;
  });

  return ingestPromise;
}

async function startOhlcvDailyRecorder() {
  const realm = await openOhlcvRealm();
  const now = new Date();
  const todayYmd = getYmdIst(now);
  const lastSuccessYmd = getMeta(realm, 'ohlcvDailyLastSuccessYmd');

  const todayRunUtcMs = computeRunUtcMsForToday(now);
  const shouldCatchUp =
    (!lastSuccessYmd || lastSuccessYmd < todayYmd) &&
    now.getTime() >= todayRunUtcMs;

  if (shouldCatchUp) {
    runDailyOhlcvIngest({ reason: 'startup_catchup_missed' }).catch((err) => {
      console.error('OHLCV daily ingest failed:', err?.message || err);
    });
  }

  if (scheduleTimer) clearTimeout(scheduleTimer);
  const delayMs = computeNextRunDelayMs(now);
  const nextRunAtUtc = new Date(now.getTime() + delayMs).toISOString();
  console.log(`[OHLCV] next scheduled run in ${Math.round(delayMs / 1000)}s (at ${nextRunAtUtc}, tz=${TIME_ZONE})`);
  scheduleTimer = setTimeout(async () => {
    try {
      await runDailyOhlcvIngest({ reason: 'scheduled' });
    } catch (err) {
      console.error('OHLCV scheduled ingest failed:', err?.message || err);
    } finally {
      startOhlcvDailyRecorder().catch(() => {});
    }
  }, delayMs);
}

module.exports = {
  startOhlcvDailyRecorder,
  runDailyOhlcvIngest,
};
