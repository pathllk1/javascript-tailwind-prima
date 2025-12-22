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
    let liveUpdatesPaused = false;
    // Data/state for search & sort
    let allStocks = [];
    let sortKey = null;
    let sortDir = 'asc'; // 'asc' | 'desc'
    let searchTerm = '';
    // Top performers data
    let topGainers = [];
    let topLosers = [];
    // Modal refs
    let modalEl = null;
    let modalContentEl = null;
    let modalCloseBtn = null;
    let modalTabMainBtn = null;
    let modalTabDataBtn = null;
    let modalTabTechBtn = null;
    let modalPanelMain = null;
    let modalPanelData = null;
    let modalPanelTech = null;
    let insightsChartInstance = null;
    // OHLCV data view variables
    let currentOhlcvData = [];
    let currentSortConfig = { sortBy: 'date', sortOrder: 'desc' };

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

    function applyLiveUpdatesPauseState(state) {
        const paused = Boolean(state && state.paused);
        if (paused === liveUpdatesPaused) return;
        liveUpdatesPaused = paused;
        if (paused) {
            const reason = state?.reason ? ` (${state.reason})` : '';
            setConnectionStatus(`Live updates paused${reason}`, 'warn');
        } else {
            setConnectionStatus('Live updates resumed', 'success');
            setTimeout(() => {
                if (!liveUpdatesPaused) setConnectionStatus('Live updates: connected', 'success');
            }, 2500);
        }
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
    
    // Function to format percentage for top performers (with arrow)
    function formatTopPerformerPercentage(value) {
        if (value === undefined || value === null) return 'N/A';
        
        const formatted = value.toFixed(2);
        const className = value >= 0 ? 'text-green-600' : 'text-red-600';
        const sign = value >= 0 ? '+' : '';
        const arrow = value >= 0 ? '▲' : '▼';
        
        return `<span class="${className}">${arrow} ${sign}${formatted}%</span>`;
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
    
    // Function to compute change percentage
    function computeChangePercent(currentPrice, previousClose) {
        if (currentPrice !== undefined && previousClose !== undefined && previousClose !== 0) {
            return ((currentPrice - previousClose) / previousClose) * 100;
        }
        return null;
    }
    
    // Function to render top gainers and losers cards
    function renderTopPerformers() {
        const gainersContainer = document.getElementById('top-gainers');
        const losersContainer = document.getElementById('top-losers');
        
        if (!gainersContainer || !losersContainer) return;
        
        // Render top gainers
        if (topGainers.length > 0) {
            gainersContainer.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-bold text-gray-800">Top Gainers</h3>
                    <span class="text-xs text-gray-500">▲</span>
                </div>
                <div class="grid grid-cols-2 gap-1">
                    ${topGainers.slice(0, 10).map((stock, index) => `
                        <div class="flex items-center justify-between p-1 hover:bg-green-50 rounded text-xs">
                            <div class="flex items-center">
                                <span class="w-4 h-4 flex items-center justify-center text-[9px] font-bold text-white bg-green-500 rounded mr-1">${index + 1}</span>
                                <div class="truncate max-w-[70px]">
                                    <div class="font-medium">${stock.symbol}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-medium">${formatCurrency(stock.currentPrice)}</div>
                                <div class="text-[9px]">${formatTopPerformerPercentage(stock.changePercent)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            gainersContainer.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-bold text-gray-800">Top Gainers</h3>
                    <span class="text-xs text-gray-500">▲</span>
                </div>
                <div class="text-center py-2 text-gray-500 text-xs">
                    No data
                </div>
            `;
        }
        
        // Render top losers
        if (topLosers.length > 0) {
            losersContainer.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-bold text-gray-800">Top Losers</h3>
                    <span class="text-xs text-gray-500">▼</span>
                </div>
                <div class="grid grid-cols-2 gap-1">
                    ${topLosers.slice(0, 10).map((stock, index) => `
                        <div class="flex items-center justify-between p-1 hover:bg-red-50 rounded text-xs">
                            <div class="flex items-center">
                                <span class="w-4 h-4 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded mr-1">${index + 1}</span>
                                <div class="truncate max-w-[70px]">
                                    <div class="font-medium">${stock.symbol}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-medium">${formatCurrency(stock.currentPrice)}</div>
                                <div class="text-[9px]">${formatTopPerformerPercentage(stock.changePercent)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            losersContainer.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-bold text-gray-800">Top Losers</h3>
                    <span class="text-xs text-gray-500">▼</span>
                </div>
                <div class="text-center py-2 text-gray-500 text-xs">
                    No data
                </div>
            `;
        }
    }

    function ensureModal() {
        if (modalEl) return;
        
        // Safely get DOM elements, ensuring no errors if elements don't exist
        try {
            modalEl = document.getElementById('stock-modal');
            modalContentEl = document.getElementById('stock-modal-content');
            modalCloseBtn = document.getElementById('stock-modal-close');
            modalTabMainBtn = document.getElementById('stock-modal-tab-main');
            modalTabDataBtn = document.getElementById('stock-modal-tab-data');
            modalTabTechBtn = document.getElementById('stock-modal-tab-tech') || null;
            modalPanelMain = document.getElementById('stock-modal-panel-main');
            modalPanelData = document.getElementById('stock-modal-panel-data');
            modalPanelTech = document.getElementById('stock-modal-panel-tech') || null;
        } catch (e) {
            console.error('Error initializing modal elements:', e);
            return;
        }
        
        // Add event listeners only if elements exist
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeModal);
        }
        if (modalEl) {
            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) closeModal();
            });
        }
        if (modalTabMainBtn) {
            modalTabMainBtn.addEventListener('click', () => setModalTab('main'));
        }
        if (modalTabDataBtn) {
            modalTabDataBtn.addEventListener('click', () => setModalTab('data'));
        }
        if (modalTabTechBtn) {
            modalTabTechBtn.addEventListener('click', () => setModalTab('tech'));
        }
    }

    function setModalTab(tab) {
        // Check if required elements exist
        if (!modalTabMainBtn || !modalTabDataBtn || !modalPanelMain || !modalPanelData) return;
        
        // For tech tab, also check tech elements
        if (tab === 'tech' && (!modalTabTechBtn || !modalPanelTech)) return;

        const isMain = tab === 'main';
        const isData = tab === 'data';
        const isTech = tab === 'tech';

        // Toggle panel visibility
        if (modalPanelMain) modalPanelMain.classList.toggle('hidden', !isMain);
        if (modalPanelData) modalPanelData.classList.toggle('hidden', !isData);
        if (modalPanelTech) modalPanelTech.classList.toggle('hidden', !isTech);

        // Update main tab styling
        if (modalTabMainBtn) {
            modalTabMainBtn.classList.toggle('bg-gray-900', isMain);
            modalTabMainBtn.classList.toggle('text-white', isMain);
            modalTabMainBtn.classList.toggle('bg-gray-100', !isMain);
            modalTabMainBtn.classList.toggle('text-gray-700', !isMain);
            modalTabMainBtn.classList.toggle('hover:bg-gray-200', !isMain);
        }

        // Update data tab styling
        if (modalTabDataBtn) {
            modalTabDataBtn.classList.toggle('bg-gray-900', isData);
            modalTabDataBtn.classList.toggle('text-white', isData);
            modalTabDataBtn.classList.toggle('bg-gray-100', !isData);
            modalTabDataBtn.classList.toggle('text-gray-700', !isData);
            modalTabDataBtn.classList.toggle('hover:bg-gray-200', !isData);
        }
        
        // Update tech tab styling
        if (modalTabTechBtn) {
            modalTabTechBtn.classList.toggle('bg-gray-900', isTech);
            modalTabTechBtn.classList.toggle('text-white', isTech);
            modalTabTechBtn.classList.toggle('bg-gray-100', !isTech);
            modalTabTechBtn.classList.toggle('text-gray-700', !isTech);
            modalTabTechBtn.classList.toggle('hover:bg-gray-200', !isTech);
        }
        
        // If switching to data tab, load OHLCV data
        if (isData) {
            loadDataView();
        }
        
        // If switching to tech tab, load technical indicators
        if (isTech) {
            loadTechIndicators();
        }
    }    function closeModal() {
        if (insightsChartInstance) {
            insightsChartInstance.destroy();
            insightsChartInstance = null;
        }
        if (modalEl) modalEl.classList.add('hidden');
    }

    // Variable to store current symbol for data view
    let currentDataViewSymbol = null;
    // Variable to store current symbol for tech indicators view
    let currentTechViewSymbol = null;

    // Function to load and display OHLCV data in the data view tab
    async function loadDataView() {
        if (!modalPanelData) return;
        
        // Show loading indicator
        modalPanelData.innerHTML = `
            <div class="font-semibold text-gray-900 mb-3">Historical Data</div>
            <div class="flex items-center justify-center h-64">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600">Loading historical data...</span>
            </div>
        `;
        
        try {
            // Get the current symbol from the main panel
            const symbolHeader = document.querySelector('#stock-modal-content h3');
            if (!symbolHeader) {
                throw new Error('Unable to determine symbol');
            }
            
            const symbol = symbolHeader.textContent.trim();
            currentDataViewSymbol = symbol;
            
            // Fetch OHLCV data from the server
            const response = await fetch(`/live-stock/live-data/${encodeURIComponent(symbol)}/ohlcv`);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch data');
            }
            
            const ohlcvData = result.data;
            
            if (!Array.isArray(ohlcvData) || ohlcvData.length === 0) {
                modalPanelData.innerHTML = `
                    <div class="font-semibold text-gray-900 mb-3">Historical Data</div>
                    <div class="text-gray-500 py-8 text-center">No historical data available for ${symbol}</div>
                `;
                return;
            }
            
            // Store data for sorting and filtering
            currentOhlcvData = ohlcvData;
            
            // Reset sort config to default
            currentSortConfig = { sortBy: 'date', sortOrder: 'desc' };
            
            // Render the data in a table with default sorting (by date desc)
            renderOhlcvTable(ohlcvData, symbol, currentSortConfig);
        } catch (error) {
            console.error('Error loading data view:', error);
            modalPanelData.innerHTML = `
                <div class="font-semibold text-gray-900 mb-3">Historical Data</div>
                <div class="text-red-500 py-8 text-center">Failed to load historical data: ${error.message}</div>
            `;
        }
    }
    
    // Function to load and display technical indicators in the tech view tab
    async function loadTechIndicators() {
        if (!modalPanelTech) return;
        
        // Show loading indicator
        modalPanelTech.innerHTML = `
            <div class="font-semibold text-gray-900 mb-3">Technical Indicators</div>
            <div class="flex items-center justify-center h-64">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600">Loading technical indicators...</span>
            </div>
        `;
        
        try {
            // Get the current symbol from the main panel
            const symbolHeader = document.querySelector('#stock-modal-content h3');
            if (!symbolHeader) {
                throw new Error('Unable to determine symbol');
            }
            
            const symbol = symbolHeader.textContent.trim();
            currentTechViewSymbol = symbol;
            
            // Fetch technical indicators data from the server
            const response = await fetch(`/live-stock/live-data/${encodeURIComponent(symbol)}/tech-indicators`);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch data');
            }
            
            const techData = result.data;
            
            // Render the technical indicators
            renderTechIndicators(techData, symbol);
        } catch (error) {
            console.error('Error loading technical indicators:', error);
            modalPanelTech.innerHTML = `
                <div class="font-semibold text-gray-900 mb-3">Technical Indicators</div>
                <div class="text-red-500 py-8 text-center">Failed to load technical indicators: ${error.message}</div>
            `;
        }
    }

    // Function to render technical indicators
    function renderTechIndicators(data, symbol) {
        if (!modalPanelTech) return;
        
        // Extract indicators data
        const rsi = data.rsi || {};
        const macd = data.macd || {};
        const ema = data.ema || {};
        const sma = data.sma || {};
        
        // Format the technical indicators data
        const techHtml = `
            <div class="font-semibold text-gray-900 mb-3">Technical Indicators for ${symbol}</div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- RSI Section -->
                <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg shadow-sm p-4">
                    <h3 class="text-lg font-semibold text-purple-800 mb-3">RSI (Relative Strength Index)</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Current RSI:</span>
                            <span class="text-lg font-bold ${rsi.value >= 70 ? 'text-red-600' : rsi.value <= 30 ? 'text-green-600' : 'text-gray-800'}">${rsi.value !== undefined ? rsi.value.toFixed(2) : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Signal:</span>
                            <span class="font-medium ${rsi.signal === 'Overbought' ? 'text-red-600' : rsi.signal === 'Oversold' ? 'text-green-600' : 'text-gray-800'}">${rsi.signal || 'Neutral'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Period:</span>
                            <span class="font-medium text-gray-800">${rsi.period || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- MACD Section -->
                <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg shadow-sm p-4">
                    <h3 class="text-lg font-semibold text-blue-800 mb-3">MACD (Moving Average Convergence Divergence)</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">MACD Line:</span>
                            <span class="text-lg font-bold ${macd.macd >= 0 ? 'text-green-600' : 'text-red-600'}">${macd.macd !== undefined ? macd.macd.toFixed(2) : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Signal Line:</span>
                            <span class="font-medium ${macd.signal >= 0 ? 'text-green-600' : 'text-red-600'}">${macd.signal !== undefined ? macd.signal.toFixed(2) : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Histogram:</span>
                            <span class="font-medium ${macd.histogram >= 0 ? 'text-green-600' : 'text-red-600'}">${macd.histogram !== undefined ? macd.histogram.toFixed(2) : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Signal:</span>
                            <span class="font-medium ${macd.interpretation === 'Bullish' ? 'text-green-600' : macd.interpretation === 'Bearish' ? 'text-red-600' : 'text-gray-800'}">${macd.interpretation || 'Neutral'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Moving Averages Section -->
                <div class="md:col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm p-4">
                    <h3 class="text-lg font-semibold text-green-800 mb-3">Moving Averages</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- EMA Section -->
                        <div class="border border-gray-200 rounded p-3">
                            <h4 class="font-semibold text-gray-800 mb-2">EMA (Exponential Moving Average)</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">EMA 20:</span>
                                    <span class="font-medium ${ema.ema20 >= 0 ? 'text-green-600' : 'text-red-600'}">${ema.ema20 !== undefined ? ema.ema20.toFixed(2) : 'N/A'}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">EMA 50:</span>
                                    <span class="font-medium ${ema.ema50 >= 0 ? 'text-green-600' : 'text-red-600'}">${ema.ema50 !== undefined ? ema.ema50.toFixed(2) : 'N/A'}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">EMA 200:</span>
                                    <span class="font-medium ${ema.ema200 >= 0 ? 'text-green-600' : 'text-red-600'}">${ema.ema200 !== undefined ? ema.ema200.toFixed(2) : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- SMA Section -->
                        <div class="border border-gray-200 rounded p-3">
                            <h4 class="font-semibold text-gray-800 mb-2">SMA (Simple Moving Average)</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">SMA 20:</span>
                                    <span class="font-medium ${sma.sma20 >= 0 ? 'text-green-600' : 'text-red-600'}">${sma.sma20 !== undefined ? sma.sma20.toFixed(2) : 'N/A'}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">SMA 50:</span>
                                    <span class="font-medium ${sma.sma50 >= 0 ? 'text-green-600' : 'text-red-600'}">${sma.sma50 !== undefined ? sma.sma50.toFixed(2) : 'N/A'}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">SMA 200:</span>
                                    <span class="font-medium ${sma.sma200 >= 0 ? 'text-green-600' : 'text-red-600'}">${sma.sma200 !== undefined ? sma.sma200.toFixed(2) : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Comparison Section -->
                        <div class="border border-gray-200 rounded p-3">
                            <h4 class="font-semibold text-gray-800 mb-2">Price vs MA</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">Price vs EMA 20:</span>
                                    <span class="font-medium ${ema.priceVsEma20 === 'Above' ? 'text-green-600' : 'text-red-600'}">${ema.priceVsEma20 || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">Price vs SMA 20:</span>
                                    <span class="font-medium ${sma.priceVsSma20 === 'Above' ? 'text-green-600' : 'text-red-600'}">${sma.priceVsSma20 || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">Trend:</span>
                                    <span class="font-medium ${ema.trend === 'Bullish' ? 'text-green-600' : ema.trend === 'Bearish' ? 'text-red-600' : 'text-gray-800'}">${ema.trend || 'Neutral'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 text-xs text-gray-500">
                <p>Note: Technical indicators are calculated based on historical price data. Values are for informational purposes only and should not be considered as financial advice.</p>
            </div>
        `;
        
        modalPanelTech.innerHTML = techHtml;
    }
    
    // Function to render OHLCV data in a styled HTML table
    function renderOhlcvTable(data, symbol, sortConfig = { sortBy: 'date', sortOrder: 'desc' }) {
        if (!modalPanelData) return;
        
        // Update current sort config
        currentSortConfig = sortConfig;
        
        // Sort data based on sort config
        const sortedData = [...data].sort((a, b) => {
            let aValue = a[sortConfig.sortBy];
            let bValue = b[sortConfig.sortBy];
            
            // Special handling for date sorting
            if (sortConfig.sortBy === 'date') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            // Special handling for change % sorting
            if (sortConfig.sortBy === 'changePercent') {
                aValue = a.open && a.close ? ((a.close - a.open) / a.open) * 100 : 0;
                bValue = b.open && b.close ? ((b.close - b.open) / b.open) * 100 : 0;
            }
            
            // Handle null/undefined values
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            // Compare values
            let comparison = 0;
            if (typeof aValue === 'string') {
                comparison = aValue.localeCompare(bValue);
            } else {
                comparison = aValue - bValue;
            }
            
            return sortConfig.sortOrder === 'desc' ? -comparison : comparison;
        });
        
        // Get sort indicator for headers
        function getSortIndicator(column) {
            if (sortConfig.sortBy === column) {
                return sortConfig.sortOrder === 'asc' ? ' ↑' : ' ↓';
            }
            return '';
        }
        
        // Generate table HTML with all enhancements
        const tableHtml = `
            <div class="font-semibold text-gray-900 mb-3">Historical Data for ${symbol}</div>
            
            <!-- Date Range Filter Controls -->
            <div class="mb-4 flex flex-wrap gap-2 items-center">
                <label class="text-sm font-medium text-gray-700">From:</label>
                <input type="date" id="date-from" class="border rounded px-2 py-1 text-sm" />
                
                <label class="text-sm font-medium text-gray-700 ml-2">To:</label>
                <input type="date" id="date-to" class="border rounded px-2 py-1 text-sm" />
                
                <button id="apply-date-filter" class="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">Apply</button>
                <button id="clear-date-filter" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm">Clear</button>
            </div>
            
            <style>
                .scrollbar-styled::-webkit-scrollbar {
                    width: 8px;
                }
                
                .scrollbar-styled::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                
                .scrollbar-styled::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #4f46e5, #6366f1);
                    border-radius: 4px;
                }
                
                .scrollbar-styled::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #3730a3, #4338ca);
                }
                
                /* Firefox scrollbar styling */
                .scrollbar-styled {
                    scrollbar-width: thin;
                    scrollbar-color: #4f46e5 #f1f1f1;
                }
            </style>
            
            <div class="overflow-x-auto h-[400px] overflow-y-auto scrollbar-styled">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <!-- Enhanced Header with Gradient and Fixed Positioning -->
                    <thead class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white sticky top-0 z-10 shadow-md">
                        <tr>
                            <th class="px-4 py-3 text-left font-medium uppercase tracking-wider cursor-pointer hover:bg-blue-600" data-column="date">
                                Date${getSortIndicator('date')}
                            </th>
                            <th class="px-4 py-3 text-right font-medium uppercase tracking-wider cursor-pointer hover:bg-blue-600" data-column="open">
                                Open${getSortIndicator('open')}
                            </th>
                            <th class="px-4 py-3 text-right font-medium uppercase tracking-wider cursor-pointer hover:bg-blue-600" data-column="high">
                                High${getSortIndicator('high')}
                            </th>
                            <th class="px-4 py-3 text-right font-medium uppercase tracking-wider cursor-pointer hover:bg-blue-600" data-column="low">
                                Low${getSortIndicator('low')}
                            </th>
                            <th class="px-4 py-3 text-right font-medium uppercase tracking-wider cursor-pointer hover:bg-blue-600" data-column="close">
                                Close${getSortIndicator('close')}
                            </th>
                            <th class="px-4 py-3 text-right font-medium uppercase tracking-wider cursor-pointer hover:bg-blue-600" data-column="changePercent">
                                Change %${getSortIndicator('changePercent')}
                            </th>
                            <th class="px-4 py-3 text-right font-medium uppercase tracking-wider cursor-pointer hover:bg-blue-600" data-column="volume">
                                Volume${getSortIndicator('volume')}
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${sortedData.map(row => {
                            // Calculate change percentage
                            const changePercent = row.open && row.close ? ((row.close - row.open) / row.open) * 100 : 0;
                            const changeClass = changePercent > 0 ? 'text-green-600' : changePercent < 0 ? 'text-red-600' : 'text-gray-500';
                            
                            return `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 whitespace-nowrap text-gray-900">${formatDate(row.date)}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-right text-gray-900">${formatCurrency(row.open)}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-right text-gray-900">${formatCurrency(row.high)}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-right text-gray-900">${formatCurrency(row.low)}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-right text-gray-900">${formatCurrency(row.close)}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-right font-medium ${changeClass}">${changePercent.toFixed(2)}%</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-right text-gray-900">${formatVolume(row.volume)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-2 text-xs text-gray-500 text-right">Showing ${sortedData.length} records</div>
        `;
        
        modalPanelData.innerHTML = tableHtml;
        
        // Add event listeners for sorting
        const headers = modalPanelData.querySelectorAll('th[data-column]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                const newSortOrder = sortConfig.sortBy === column && sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
                const newSortConfig = { sortBy: column, sortOrder: newSortOrder };
                renderOhlcvTable(data, symbol, newSortConfig);
            });
        });
        
        // Add event listeners for date filtering
        const applyFilterBtn = modalPanelData.querySelector('#apply-date-filter');
        const clearFilterBtn = modalPanelData.querySelector('#clear-date-filter');
        
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => applyDateFilter(symbol));
        }
        
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => clearDateFilter(symbol));
        }
        
        // Set current date values if they exist
        const fromDateInput = modalPanelData.querySelector('#date-from');
        const toDateInput = modalPanelData.querySelector('#date-to');
        
        if (fromDateInput && toDateInput) {
            // We could set default values here if needed
        }
    }

    // Helper function to format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // Helper function to format currency
    function formatCurrency(value) {
        if (value === null || value === undefined) return 'N/A';
        return value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Helper function to format volume
    function formatVolume(volume) {
        if (volume === null || volume === undefined) return 'N/A';
        return volume.toLocaleString();
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
            if (!d || Number.isNaN(d.getTime())) return '';
            
            // For longer time ranges, include the year in the label
            const rangeInMonths = calculateRangeInMonths(points);
            if (rangeInMonths > 3) {
                return d.toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: '2-digit' });
            } else {
                return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
            }
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
                    tooltip: { 
                        enabled: true,
                        callbacks: {
                            title: function(tooltipItems) {
                                // Get the actual date from the data point, not from the label
                                const dataIndex = tooltipItems[0].dataIndex;
                                const point = points[dataIndex];
                                if (point && point.date) {
                                    const date = new Date(point.date);
                                    if (date && !isNaN(date.getTime())) {
                                        return date.toLocaleDateString(undefined, { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        });
                                    }
                                }
                                return '';
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        ticks: { 
                            maxTicksLimit: 8,
                            callback: function(value, index, values) {
                                // Improve x-axis label formatting
                                const label = this.getLabelForValue(value);
                                // If label contains year info (2-digit year), we can show more ticks
                                if (label && (label.includes("'") || label.includes("20") || label.includes("19"))) { // Year format detection
                                    return label;
                                }
                                return label;
                            }
                        } 
                    },
                    y: { ticks: { precision: 2 } }
                }
            }
        });
    }

    // Helper function to calculate the range in months between first and last data points
    function calculateRangeInMonths(points) {
        if (!points || points.length < 2) return 0;
        
        const firstDate = new Date(points[0].date);
        const lastDate = new Date(points[points.length - 1].date);
        
        if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) return 0;
        
        const yearsDiff = lastDate.getFullYear() - firstDate.getFullYear();
        const monthsDiff = lastDate.getMonth() - firstDate.getMonth();
        
        return yearsDiff * 12 + monthsDiff;
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
        setModalTab('main');
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
        // Prefer socketToken (readable non-httpOnly), fallback to others
        return getCookie('socketToken') || getCookie('accessToken') || localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null;
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
            
            // Request initial top performers data
            socket.emit('requestTopPerformers');
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
        
        // Listen for top performers updates
        socket.on('topPerformers', (data) => {
            console.log('Received top performers data:', data);
            if (!data) return;
            
            // Update local data
            topGainers = data.gainers || [];
            topLosers = data.losers || [];
            
            // Render the cards
            renderTopPerformers();
            
            console.log('Top performers updated:', { gainers: topGainers.length, losers: topLosers.length });
        });

        socket.on('liveUpdatesPauseChanged', (state) => {
            applyLiveUpdatesPauseState(state);
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
        window.liveStockIntervals.progressInterval = setInterval(async () => {
            try {
                const res = await fetch('/live-stock/update-progress');
                const json = await res.json();
                if (json?.success && json?.data) {
                    applyLiveUpdatesPauseState({
                        paused: Boolean(json.data.liveUpdatesPaused),
                        reason: json.data.liveUpdatesPauseReason,
                        pausedAt: json.data.liveUpdatesPausedAt
                    });
                }
            } catch (_) {}
        }, 15000);
        
        // Render initial empty cards
        setTimeout(renderTopPerformers, 100);
    } catch (error) {
        console.error('Error during initial data load:', error);
    }
    // Helper function to get sort indicator
    function getSortIndicator(column, sortConfig) {
        if (sortConfig.sortBy === column) {
            return sortConfig.sortOrder === 'asc' ? '↑' : '↓';
        }
        return '';
    }

    // Handle sorting
    function handleSort(column, symbol) {
        const newSortOrder = currentSortConfig.sortBy === column && currentSortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
        currentSortConfig = { sortBy: column, sortOrder: newSortOrder };
        renderOhlcvTable(currentOhlcvData, symbol, currentSortConfig);
    }

    // Apply date filter
    function applyDateFilter(symbol) {
        const fromDateInput = document.getElementById('date-from');
        const toDateInput = document.getElementById('date-to');
        
        if (!fromDateInput || !toDateInput) return;
        
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;
        
        if (!fromDate && !toDate) return;
        
        let filteredData = [...currentOhlcvData];
        
        if (fromDate) {
            const fromDateTime = new Date(fromDate).getTime();
            filteredData = filteredData.filter(row => {
                const rowDateTime = new Date(row.date).getTime();
                return rowDateTime >= fromDateTime;
            });
        }
        
        if (toDate) {
            const toDateTime = new Date(toDate).getTime();
            filteredData = filteredData.filter(row => {
                const rowDateTime = new Date(row.date).getTime();
                return rowDateTime <= toDateTime;
            });
        }
        
        renderOhlcvTable(filteredData, symbol, currentSortConfig);
    }

    // Clear date filter
    function clearDateFilter(symbol) {
        const fromDateInput = document.getElementById('date-from');
        const toDateInput = document.getElementById('date-to');
        
        if (fromDateInput) fromDateInput.value = '';
        if (toDateInput) toDateInput.value = '';
        
        renderOhlcvTable(currentOhlcvData, symbol, currentSortConfig);
    }
}

// Initialize when DOM is ready for direct page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLiveStock);
} else {
    initializeLiveStock();
}
