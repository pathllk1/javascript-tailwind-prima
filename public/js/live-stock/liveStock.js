// Expose initialization function for silent navigation
function initializeLiveStock() {
    
    // Clear any existing intervals to prevent duplicates
    if (typeof window.liveStockIntervals !== 'undefined') {
        if (window.liveStockIntervals.progressInterval) {
            clearInterval(window.liveStockIntervals.progressInterval);
        }
        if (window.liveStockIntervals.recentUpdatesInterval) {
            clearInterval(window.liveStockIntervals.recentUpdatesInterval);
        }
    }
    
    // Store intervals in window object to clear them later
    window.liveStockIntervals = {
        progressInterval: null,
        recentUpdatesInterval: null
    };
    
    const stockTable = document.getElementById('stock-data');
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('stock-search');
    const loadingIndicator = document.getElementById('loading-indicator');
    const progressBarContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const errorMessage = document.getElementById('error-message');
    const lastUpdated = document.getElementById('last-updated');
    
    // WebSocket state
    let socket = null;
    let socketConnected = false;
    let joinedSymbols = new Set();
    // Data/state for search & sort
    let allStocks = [];
    let sortKey = null;
    let sortDir = 'asc'; // 'asc' | 'desc'
    let searchTerm = '';
    // Modal refs
    let modalEl = null;
    let modalContentEl = null;
    let modalCloseBtn = null;
    let insightsChartInstance = null;

    // Initialize modal hooks early
    ensureModal();
    
    // Function to show progress bar
    function showProgressBar() {
        if (progressBarContainer) {
            progressBarContainer.classList.remove('hidden');
        }
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    }
    
    // Function to update progress bar
    function updateProgressBar(percent) {
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
    }
    
    // Function to hide progress bar
    function hideProgressBar() {
        if (progressBarContainer) {
            progressBarContainer.classList.add('hidden');
        }
    }
    
    // Function to show loading indicator
    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.classList.add('loading');
        }
    }
    
    // Function to hide loading indicator
    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
        }
    }
    
    // Function to show error message
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
            setTimeout(() => {
                errorMessage.classList.add('hidden');
            }, 5000);
        }
    }
    
    // Connection status badge helper
    function setConnectionStatus(message, type = 'info') {
        let badge = document.getElementById('ws-connection-status');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'ws-connection-status';
            badge.className = 'fixed bottom-4 right-4 px-3 py-2 text-sm rounded shadow-lg z-50';
            document.body.appendChild(badge);
        }
        const colors = {
            info: 'bg-gray-800 text-white',
            success: 'bg-green-600 text-white',
            warn: 'bg-yellow-500 text-black',
            error: 'bg-red-600 text-white'
        };
        badge.className = `fixed bottom-4 right-4 px-3 py-2 text-sm rounded shadow-lg z-50 ${colors[type] || colors.info}`;
        badge.textContent = message;
    }
    
    // Function to update last updated time
    function updateLastUpdated(timestamp) {
        if (lastUpdated) {
            const date = new Date(timestamp);
            lastUpdated.textContent = `Last updated: ${date.toLocaleTimeString()}`;
        }
    }
    
    // Function to format currency
    function formatCurrency(value, currency = 'INR') {
        if (value === undefined || value === null) return 'N/A';
        
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(value);
    }
    
    // Function to format percentage
    function formatPercentage(value) {
        if (value === undefined || value === null) return 'N/A';
        
        const formatted = value.toFixed(2);
        const className = value >= 0 ? 'text-green-600' : 'text-red-600';
        const sign = value >= 0 ? '+' : '';
        
        return `<span class="${className}">${sign}${formatted}%</span>`;
    }
    
    // Function to format volume
    function formatVolume(value) {
        if (value === undefined || value === null) return 'N/A';
        
        if (value >= 10000000) {
            return (value / 10000000).toFixed(2) + 'Cr';
        } else if (value >= 100000) {
            return (value / 100000).toFixed(2) + 'L';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(2) + 'K';
        }
        return value.toString();
    }
    
    // Function to format day range (high - low)
    function formatDayRange(high, low) {
        if (high === undefined || high === null || low === undefined || low === null) return 'N/A';
        return `${formatCurrency(low)} - ${formatCurrency(high)}`;
    }
    
    function computeChangePercent(currentPrice, previousClose) {
        if (currentPrice !== undefined && previousClose !== undefined && previousClose !== 0) {
            return ((currentPrice - previousClose) / previousClose) * 100;
        }
        return null;
    }

    function ensureModal() {
        if (modalEl) return;
        modalEl = document.getElementById('stock-modal');
        modalContentEl = document.getElementById('stock-modal-content');
        modalCloseBtn = document.getElementById('stock-modal-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeModal);
        }
        if (modalEl) {
            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) closeModal();
            });
        }
    }

    function closeModal() {
        if (insightsChartInstance) {
            insightsChartInstance.destroy();
            insightsChartInstance = null;
        }
        if (modalEl) modalEl.classList.add('hidden');
    }

    function renderChart(canvas, points, symbolLabel) {
        if (!canvas) return;

        // If Chart.js is not loaded, fail gracefully.
        if (!window.Chart) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#6b7280';
                ctx.font = '12px sans-serif';
                ctx.fillText('Chart library not loaded', 10, 20);
            }
            return;
        }

        const labels = (points || []).map((p) => {
            const d = p?.date ? new Date(p.date) : null;
            return d && !Number.isNaN(d.getTime())
                ? d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
                : '';
        });
        const closes = (points || []).map((p) => (p?.close ?? null));

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (insightsChartInstance) {
            insightsChartInstance.destroy();
            insightsChartInstance = null;
        }

        insightsChartInstance = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: symbolLabel ? `${symbolLabel} Close` : 'Close',
                        data: closes,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.15)',
                        pointRadius: 0,
                        tension: 0.25,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: { ticks: { maxTicksLimit: 8 } },
                    y: { ticks: { precision: 2 } }
                }
            }
        });
    }

    async function fetchInsights(symbol) {
        const res = await fetch(`/live-stock/live-data/${encodeURIComponent(symbol)}/insights`);
        if (!res.ok) throw new Error('Failed to fetch insights');
        const json = await res.json();
        if (!json || json.success !== true) throw new Error(json?.error || 'Failed to fetch insights');
        return json.data;
    }
    window.fetchInsights = fetchInsights;

    async function fetchChartData(symbol, range) {
        const qs = new URLSearchParams();
        if (range) qs.set('range', range);
        const res = await fetch(`/live-stock/live-data/${encodeURIComponent(symbol)}/chart?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch chart');
        const json = await res.json();
        if (!json || json.success !== true) throw new Error(json?.error || 'Failed to fetch chart');
        return json.data;
    }

    function openModal(stock) {
        ensureModal();
        if (!modalEl || !modalContentEl) return;
        const changePercent = computeChangePercent(stock.currentPrice, stock.previousClose);
        modalContentEl.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-900">${stock.symbol || stock.yahooSymbol || 'N/A'}</h3>
            <p class="text-xs text-gray-500">${stock.name || 'N/A'}</p>
            <div class="grid grid-cols-2 gap-3 mt-3 text-sm text-gray-800">
                <div><div class="text-gray-500">Current Price</div><div class="font-medium">${formatCurrency(stock.currentPrice)}</div></div>

                <div><div class="text-gray-500">Previous Close</div><div class="font-medium">${formatCurrency(stock.previousClose)}</div></div>
                <div><div class="text-gray-500">Day Range</div><div class="font-medium">${formatDayRange(stock.dayHigh, stock.dayLow)}</div></div>
                <div><div class="text-gray-500">Change %</div><div class="font-medium">${changePercent !== null ? formatPercentage(changePercent) : 'N/A'}</div></div>
                <div><div class="text-gray-500">Volume</div><div class="font-medium">${formatVolume(stock.volume)}</div></div>
                <div><div class="text-gray-500">Currency</div><div class="font-medium">${stock.currency || 'N/A'}</div></div>
                <div class="col-span-2"><div class="text-gray-500">Last Updated</div><div class="font-medium">${stock.lastUpdated ? new Date(stock.lastUpdated).toLocaleString() : 'N/A'}</div></div>
            </div>
            <div class="mt-4 border-t pt-3 space-y-4 text-sm text-gray-800">
              <div id="insights-loading" class="text-gray-500">Loading insights...</div>
              <div class="space-y-3">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 class="text-sm font-semibold text-gray-900">Price Chart</h4>
                  <div class="flex flex-wrap gap-2 text-xs" id="chart-range">
                    <label class="inline-flex items-center gap-1"><input type="radio" name="chart-range" value="1d" class="accent-blue-600">1D</label>
                    <label class="inline-flex items-center gap-1"><input type="radio" name="chart-range" value="5d" class="accent-blue-600">1W</label>
                    <label class="inline-flex items-center gap-1"><input type="radio" name="chart-range" value="1mo" class="accent-blue-600" checked>1M</label>
                    <label class="inline-flex items-center gap-1"><input type="radio" name="chart-range" value="1y" class="accent-blue-600">1Y</label>
                    <label class="inline-flex items-center gap-1"><input type="radio" name="chart-range" value="max" class="accent-blue-600">MAX</label>
                  </div>
                </div>
                <div class="w-full border border-gray-200 rounded p-2" style="height: 260px;">
                  <canvas id="insights-chart"></canvas>
                </div>
              </div>
              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-gray-900">Fundamentals</h4>
                <div id="insights-fundamentals" class="grid grid-cols-2 gap-2 text-xs"></div>
              </div>
              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-gray-900">Options</h4>
                <div id="insights-options" class="text-xs space-y-1"></div>
              </div>
              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-gray-900">Insider Transactions</h4>
                <div id="insights-insider" class="text-xs space-y-1"></div>
              </div>
              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-gray-900">Recommendations</h4>
                <div id="insights-recommendations" class="text-xs space-y-1"></div>
              </div>
            </div>
        `;
        modalEl.classList.remove('hidden');

        // Fetch and render insights
        const symbolKey = stock.yahooSymbol || stock.symbol;
        const range = '1mo';
        window.fetchInsights(symbolKey).then((data) => {
            const loading = document.getElementById('insights-loading');
            if (loading) loading.remove();

            // Chart
            const canvas = document.getElementById('insights-chart');
            renderChart(canvas, data.chart?.points || [], symbolKey);

            // Fundamentals
            const fundEl = document.getElementById('insights-fundamentals');
            if (fundEl) {
                const price = data.fundamentals?.price || {};
                const summary = data.fundamentals?.summaryDetail || {};
                const fin = data.fundamentals?.financialData || {};
                const rows = [
                    ['Market Cap', price.marketCap],
                    ['PE Ratio (TTM)', summary.trailingPE],
                    ['EPS (TTM)', fin.epsTrailingTwelveMonths],
                    ['52w High', summary.fiftyTwoWeekHigh],
                    ['52w Low', summary.fiftyTwoWeekLow],
                    ['Dividend Yield', summary.dividendYield ? (summary.dividendYield * 100).toFixed(2) + '%' : null],
                    ['Profit Margin', fin.profitMargins ? (fin.profitMargins * 100).toFixed(2) + '%' : null]
                ];
                fundEl.innerHTML = rows.map(([k, v]) => `
                    <div class="flex justify-between border-b border-gray-100 py-1">
                      <span class="text-gray-600">${k}</span>
                      <span class="text-gray-900 font-medium">${v !== undefined && v !== null ? v : 'N/A'}</span>
                    </div>
                `).join('');
            }

            // Options
            const optEl = document.getElementById('insights-options');
            if (optEl) {
                const expiries = data.options?.expiries || [];
                const opts = data.options?.options || {};
                const calls = opts.calls || [];
                const puts = opts.puts || [];
                optEl.innerHTML = `
                    <div class="text-gray-600">Expiries: ${expiries.slice(0, 5).join(', ') || 'N/A'}</div>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <div class="font-semibold text-gray-800 mb-1">Calls (top 3 OI)</div>
                        ${calls.slice(0, 3).map(c => `<div class="flex justify-between"><span>${c.strike}</span><span>OI:${c.openInterest ?? 'N/A'}</span></div>`).join('') || '<div class="text-gray-500">N/A</div>'}
                      </div>
                      <div>
                        <div class="font-semibold text-gray-800 mb-1">Puts (top 3 OI)</div>
                        ${puts.slice(0, 3).map(p => `<div class="flex justify-between"><span>${p.strike}</span><span>OI:${p.openInterest ?? 'N/A'}</span></div>`).join('') || '<div class="text-gray-500">N/A</div>'}
                      </div>
                    </div>
                `;
            }

            // Insider
            const insiderEl = document.getElementById('insights-insider');
            if (insiderEl) {
                const insider = data.insider || [];
                insiderEl.innerHTML = insider.slice(0, 5).map(tx => `
                    <div class="flex justify-between border-b border-gray-100 py-1">
                      <span>${tx.filerName || 'N/A'} (${tx.transactionText || 'N/A'})</span>
                      <span>${tx.shares || 'N/A'} ${tx.filerRelation ? '@ ' + tx.filerRelation : ''}</span>
                    </div>
                `).join('') || '<div class="text-gray-500">No data</div>';
            }

            // Recommendations
            const recEl = document.getElementById('insights-recommendations');
            if (recEl) {
                let recs = data.recommendations;
                if (Array.isArray(recs)) {
                    // ok
                } else if (recs && typeof recs === 'object') {
                    recs = recs.trend || recs.recommendations || recs.result || [];
                } else {
                    recs = [];
                }
                if (!Array.isArray(recs)) recs = [];
                recEl.innerHTML = recs.slice(0, 5).map(r => `
                    <div class="flex justify-between border-b border-gray-100 py-1">
                      <span>${r.firm || 'N/A'}</span>
                      <span>${r.toGrade || r.mean || r.strongBuy || 'N/A'}</span>
                    </div>
                `).join('') || '<div class="text-gray-500">No data</div>';
            }
        }).catch((err) => {
            const loading = document.getElementById('insights-loading');
            if (loading) loading.textContent = 'Failed to load insights';
            console.error('Insights fetch failed', err);
        });

        // Range switching (chart-only)
        const rangeContainer = document.getElementById('chart-range');
        if (rangeContainer) {
            rangeContainer.addEventListener('change', async (e) => {
                const target = e.target;
                if (!target || target.name !== 'chart-range') return;
                try {
                    const selected = target.value;
                    const canvas = document.getElementById('insights-chart');
                    const chart = await fetchChartData(symbolKey, selected);
                    renderChart(canvas, chart?.points || [], symbolKey);
                } catch (err) {
                    console.error('Chart range fetch failed', err);
                }
            }, { passive: true });
        }
    }

    function getSortValue(stock, key) {
        switch (key) {
            case 'dayRange':
                // sort by high - low spread
                if (stock.dayHigh !== undefined && stock.dayLow !== undefined) {
                    return stock.dayHigh - stock.dayLow;
                }
                return null;
            case 'changePercent':
                return stock._changePercent ?? computeChangePercent(stock.currentPrice, stock.previousClose);
            default:
                return stock[key];
        }
    }

    // Function to render stock data
    function renderStockData(data) {
        if (!stockTable) {
            console.error('UI: Stock table element not found');
            return;
        }

        // Preserve master data
        if (Array.isArray(data)) {
            allStocks = data.map((s) => ({
                ...s,
                _changePercent: computeChangePercent(s.currentPrice, s.previousClose)
            }));
        }

        // Apply search filter
        const term = searchTerm.trim().toLowerCase();
        let rows = allStocks;
        if (term) {
            rows = rows.filter(s => {
                const sym = (s.symbol || '').toLowerCase();
                const name = (s.name || '').toLowerCase();
                return sym.includes(term) || name.includes(term);
            });
        }

        // Apply sorting
        if (sortKey) {
            rows = [...rows].sort((a, b) => {
                const av = getSortValue(a, sortKey);
                const bv = getSortValue(b, sortKey);
                if (av === undefined || av === null) return 1;
                if (bv === undefined || bv === null) return -1;
                if (typeof av === 'string') {
                    const cmp = av.localeCompare(bv);
                    return sortDir === 'asc' ? cmp : -cmp;
                }
                const cmp = av - bv;
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }

        stockTable.innerHTML = '';
        
        if (!rows || rows.length === 0) {
            stockTable.innerHTML = '<tr><td colspan="8" class="text-center py-4">No data available</td></tr>';
            return;
        }
        
        rows.forEach(stock => {
            const row = document.createElement('tr');
            
            // Calculate change percentage
            const currentPrice = stock.currentPrice;
            const previousClose = stock.previousClose;
            const changePercent = stock._changePercent ?? computeChangePercent(currentPrice, previousClose);
            
            const rowSymbol = stock.yahooSymbol || stock.symbol;
            row.innerHTML = `
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                    <button class="view-stock-btn flex items-center gap-2 text-blue-600 hover:text-blue-800" data-symbol="${rowSymbol}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View</span>
                    </button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-symbol="${rowSymbol}">${stock.symbol || 'N/A'}</td>

                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${stock.name || stock.symbol || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${currentPrice !== undefined ? formatCurrency(currentPrice) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${previousClose !== undefined ? formatCurrency(previousClose) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDayRange(stock.dayHigh, stock.dayLow)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${changePercent !== null && changePercent !== undefined ? formatPercentage(changePercent) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${stock.volume !== undefined ? formatVolume(stock.volume) : 'N/A'}</td>
            `;
            
            stockTable.appendChild(row);
        });
    }
    
    // Function to update a single row in the table
    function updateStockRow(symbol, data) {
        if (!stockTable) {
            console.error('UI: Stock table element not found');
            return;
        }
        
        // Find the row for this symbol and update it
        const rows = stockTable.querySelectorAll('tr');
        
        for (let row of rows) {
            const symbolCell = row.querySelector('td[data-symbol]');
            if (symbolCell) {
                // Compare with data-symbol attribute which should match the yahoo_symbol
                if (symbolCell.dataset.symbol === symbol) {
                    // Calculate change percentage
                    let changePercent = 'N/A';
                    let currentPrice = data.currentPrice;
                    let previousClose = data.previousClose;
                    
                    if (currentPrice !== undefined && previousClose !== undefined && previousClose !== 0) {
                        changePercent = ((currentPrice - previousClose) / previousClose) * 100;
                    }
                    
                    // Update the cells (shifted by View column)
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 8) {
                        cells[3].innerHTML = currentPrice !== undefined ? formatCurrency(currentPrice) : 'N/A'; // Current Price
                        cells[4].innerHTML = previousClose !== undefined ? formatCurrency(previousClose) : 'N/A'; // Previous Close
                        cells[5].innerHTML = formatDayRange(data.dayHigh, data.dayLow); // Day Range
                        cells[6].innerHTML = changePercent !== 'N/A' ? formatPercentage(changePercent) : 'N/A'; // Change %
                        cells[7].innerHTML = data.volume !== undefined ? formatVolume(data.volume) : 'N/A'; // Volume
                    }
                    // visual impact: flash background on update
                    row.classList.remove('bg-amber-100');
                    void row.offsetWidth; // force reflow
                    row.classList.add('bg-amber-100');
                    setTimeout(() => row.classList.remove('bg-amber-100'), 600);
                    // Keep allStocks in sync so modal has fresh data
                    const idx = allStocks.findIndex((s) => (s.yahooSymbol || s.symbol) === symbol);
                    if (idx >= 0) {
                        allStocks[idx] = {
                            ...allStocks[idx],
                            currentPrice: data.currentPrice,
                            previousClose: data.previousClose,
                            dayHigh: data.dayHigh,
                            dayLow: data.dayLow,
                            volume: data.volume,
                            currency: data.currency,
                            _changePercent: changePercent === 'N/A' ? null : changePercent
                        };
                    }
                    break;
                }
            }
        }
    }
    
    // Initial snapshot fetch (one-time)
    async function fetchInitialSnapshot() {
        try {
            showLoading();
            const response = await fetch('/live-stock/live-data');
            const result = await response.json();
            if (result.success) {
                renderStockData(result.data);
                updateLastUpdated(result.timestamp);
                // Subscribe to all symbols so subsequent WebSocket batch updates reach the UI
                const symbolsToJoin = (result.data || [])
                    .map((s) => s.yahooSymbol || s.symbol)
                    .filter(Boolean);
                joinSocketRooms(symbolsToJoin);
            } else {
                showError(result.error || 'Failed to fetch live data');
            }
        } catch (error) {
            console.error('Error fetching live data:', error);
            showError('Failed to connect to server');
        } finally {
            hideLoading();
        }
    }
    
    // WebSocket helpers
    function getCookie(name) {
        const cookies = document.cookie ? document.cookie.split(';') : [];
        for (const c of cookies) {
            const [k, v] = c.split('=');
            if (k && k.trim() === name) {
                return decodeURIComponent(v || '');
            }
        }
        return null;
    }

    function getAuthToken() {
        // Prefer httpOnly cookie (sent automatically) but also check readable cookies/local storage
        return getCookie('accessToken') || localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null;
    }

    function connectSocket() {
        if (!window.io) {
            console.warn('Socket.io client not loaded; falling back to polling');
            return;
        }

        if (socket && socketConnected) return;

        const token = getAuthToken();
        socket = window.io('/', {
            auth: token ? { token } : {},
            transports: ['websocket'], // hard-disable HTTP polling fallback
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 8,
            reconnectionDelay: 800,
            reconnectionDelayMax: 8000,
            timeout: 15000
        });

        socket.on('connect', () => {
            socketConnected = true;
            console.log('WS: connected');
            setConnectionStatus('Live updates: connected', 'success');
            // Re-join rooms after reconnect
            joinedSymbols.forEach(sym => socket.emit('joinStockRoom', sym));
        });

        socket.on('disconnect', (reason) => {
            socketConnected = false;
            console.warn('WS: disconnected', reason);
            setConnectionStatus('Live updates: disconnected, retrying...', 'warn');
        });

        socket.on('connect_error', (err) => {
            socketConnected = false;
            console.error('WS connect error:', err.message);
            setConnectionStatus('Live updates: auth required or unreachable', 'error');
        });

        socket.on('stockUpdate', (data) => {
            if (!data || !data.symbol) return;
            updateStockRow(data.symbol, {
                currentPrice: data.currentPrice ?? data.price,
                previousClose: data.previousClose,
                dayHigh: data.dayHigh,
                dayLow: data.dayLow,
                volume: data.volume,
                currency: data.currency
            });
        });
    }

    function joinSocketRooms(symbols) {
        symbols.forEach(sym => {
            if (!sym) return;
            if (!joinedSymbols.has(sym)) {
                joinedSymbols.add(sym);
            }
            if (socket && socketConnected) {
                socket.emit('joinStockRoom', sym);
            }
        });
    }
    
    // Event listeners
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchInitialSnapshot);
    }
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value || '';
            renderStockData();
        });
    }
    // Sort header click handlers
    const headerCells = document.querySelectorAll('#stock-table thead th[data-sort-key]');
    headerCells.forEach((th) => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort-key');
            if (sortKey === key) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortDir = 'asc';
            }
            renderStockData();
        });
    });
    // View modal trigger (delegate on document to avoid missing events)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-stock-btn');
        if (!btn) return;
        const symbol = btn.getAttribute('data-symbol');
        if (!symbol) return;
        let stock = allStocks.find((s) => (s.yahooSymbol || s.symbol) === symbol);
        if (!stock) {
            // Fallback: build from DOM row if state is out of sync
            const row = btn.closest('tr');
            if (row) {
                const cells = row.querySelectorAll('td');
                stock = {
                    symbol,
                    yahooSymbol: symbol,
                    name: cells[2]?.textContent?.trim(),
                    currentPrice: cells[3]?.textContent,
                    previousClose: cells[4]?.textContent,
                    dayHigh: null,
                    dayLow: null,
                    volume: cells[7]?.textContent,
                    currency: 'INR',
                    lastUpdated: null
                };
            }
        }
        if (stock) openModal(stock);
    });
    // Initial data load (snapshot) and connect WS
    try {
        fetchInitialSnapshot();
        connectSocket();
    } catch (error) {
        console.error('Error during initial data load:', error);
    }
}

// Initialize when DOM is ready for direct page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLiveStock);
} else {
    initializeLiveStock();
}