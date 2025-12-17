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
    const loadingIndicator = document.getElementById('loading-indicator');
    const progressBarContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const errorMessage = document.getElementById('error-message');
    const lastUpdated = document.getElementById('last-updated');
    
    
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
    
    // Function to render stock data
    function renderStockData(data) {
        if (!stockTable) {
            console.error('UI: Stock table element not found');
            return;
        }
        
        stockTable.innerHTML = '';
        
        if (!data || data.length === 0) {
            stockTable.innerHTML = '<tr><td colspan="7" class="text-center py-4">No data available</td></tr>';
            return;
        }
        
        data.forEach(stock => {
            const row = document.createElement('tr');
            
            // Calculate change percentage
            let changePercent = 'N/A';
            let currentPrice = stock.currentPrice;
            let previousClose = stock.previousClose;
            
            if (currentPrice !== undefined && previousClose !== undefined && previousClose !== 0) {
                changePercent = ((currentPrice - previousClose) / previousClose) * 100;
            }
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-symbol="${stock.symbol}">${stock.symbol || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${stock.name || stock.symbol || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${currentPrice !== undefined ? formatCurrency(currentPrice) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${previousClose !== undefined ? formatCurrency(previousClose) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDayRange(stock.dayHigh, stock.dayLow)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${changePercent !== 'N/A' ? formatPercentage(changePercent) : 'N/A'}</td>
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
            const symbolCell = row.querySelector('td:first-child');
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
                    
                    // Update the cells
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 7) {
                        cells[2].innerHTML = currentPrice !== undefined ? formatCurrency(currentPrice) : 'N/A'; // Current Price
                        cells[3].innerHTML = previousClose !== undefined ? formatCurrency(previousClose) : 'N/A'; // Previous Close
                        cells[4].innerHTML = formatDayRange(data.dayHigh, data.dayLow); // Day Range
                        cells[5].innerHTML = changePercent !== 'N/A' ? formatPercentage(changePercent) : 'N/A'; // Change %
                        cells[6].innerHTML = data.volume !== undefined ? formatVolume(data.volume) : 'N/A'; // Volume
                    }
                    break;
                }
            }
        }
    }
    
    // Function to fetch cached symbol list (immediate display)
    async function fetchSymbolList() {
        try {
            const response = await fetch('/live-stock/cached-data');
            const result = await response.json();
            
            if (result.success) {
                if (!stockTable) {
                    console.error('UI: Stock table element not found');
                    return;
                }
                
                // Create placeholder rows for all symbols
                stockTable.innerHTML = '';
                result.data.forEach(symbol => {
                    // Use yahoo_symbol for data-symbol to match backend updates
                    const displaySymbol = symbol.symbol || symbol.yahoo_symbol || 'N/A';
                    const dataSymbol = symbol.yahoo_symbol || symbol.symbol || 'N/A'; // Use yahoo_symbol for matching
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-symbol="${dataSymbol}">${displaySymbol}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${displaySymbol}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Loading...</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Loading...</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Loading...</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Loading...</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Loading...</td>
                    `;
                    stockTable.appendChild(row);
                });
                updateLastUpdated(result.timestamp);
            } else {
                showError(result.error || 'Failed to fetch symbol list');
            }
        } catch (error) {
            console.error('Error fetching symbol list:', error);
            showError('Failed to connect to server');
        }
    }
    
    // Function to fetch live data for all symbols
    async function fetchLiveData() {
        try {
            showLoading();
            showProgressBar();
            updateProgressBar(0);
            if (errorMessage) {
                errorMessage.classList.add('hidden');
            }
            
            // Start polling for progress
            startProgressPolling();
            
            const response = await fetch('/live-stock/live-data');
            const result = await response.json();
            
            if (result.success) {
                renderStockData(result.data);
                updateLastUpdated(result.timestamp);
                
                if (result.errors && result.errors.length > 0) {
                    console.warn('Some symbols failed to load:', result.errors);
                }
            } else {
                showError(result.error || 'Failed to fetch live data');
            }
        } catch (error) {
            console.error('Error fetching live data:', error);
            showError('Failed to connect to server');
        } finally {
            hideLoading();
            // Stop progress polling after a delay to ensure final update is captured
            setTimeout(() => {
                if (window.liveStockIntervals.progressInterval) {
                    clearInterval(window.liveStockIntervals.progressInterval);
                    window.liveStockIntervals.progressInterval = null;
                }
                hideProgressBar();
            }, 2000);
        }
    }
    
    // Function to poll for recent updates
    async function pollRecentUpdates() {
        try {
            const response = await fetch('/live-stock/recent-updates');
            const result = await response.json();
            
            if (result.success && result.data) {
                // Update individual rows as data becomes available
                Object.keys(result.data).forEach(symbol => {
                    updateStockRow(symbol, result.data[symbol]);
                });
            }
        } catch (error) {
            console.error('Error polling recent updates:', error);
        }
    }
    
    // Function to poll for update progress
    async function pollUpdateProgress() {
        try {
            const response = await fetch('/live-stock/update-progress');
            const result = await response.json();
            
            if (result.success) {
                if (result.data.isUpdating) {
                    showProgressBar();
                    updateProgressBar(result.data.progressPercent);
                    
                    // If update is complete, refresh the data
                    if (result.data.progressPercent >= 100) {
                        if (window.liveStockIntervals.progressInterval) {
                            clearInterval(window.liveStockIntervals.progressInterval);
                            window.liveStockIntervals.progressInterval = null;
                        }
                        hideProgressBar();
                        // Refresh the display with latest data
                        fetchLiveData();
                    }
                } else {
                    hideProgressBar();
                }
            }
        } catch (error) {
            console.error('Error polling update progress:', error);
        }
    }
    
    // Function to start polling for progress updates
    function startProgressPolling() {
        if (window.liveStockIntervals.progressInterval) {
            clearInterval(window.liveStockIntervals.progressInterval);
        }
        window.liveStockIntervals.progressInterval = setInterval(pollUpdateProgress, 1000); // Poll every second
    }
    
    // Function to start polling for recent updates
    function startRecentUpdatesPolling() {
        if (window.liveStockIntervals.recentUpdatesInterval) {
            clearInterval(window.liveStockIntervals.recentUpdatesInterval);
        }
        window.liveStockIntervals.recentUpdatesInterval = setInterval(pollRecentUpdates, 1000); // Poll every second
    }
    
    // Function to start auto-refresh
    function startAutoRefresh() {
        // Refresh every 5 minutes (300000 milliseconds)
        setInterval(() => {
            // Start polling for progress and fetch live data
            startProgressPolling();
            fetchLiveData();
        }, 300000);
    }
    
    // Event listeners
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchLiveData);
    }
    
    // Initial data load (symbol list for immediate display)
    try {
        fetchSymbolList();
        // Then fetch live data
        fetchLiveData();
    } catch (error) {
        console.error('Error during initial data load:', error);
    }
    
    // Start auto-refresh
    try {
        startAutoRefresh();
    } catch (error) {
        console.error('Error starting auto-refresh:', error);
    }
    
    // Start recent updates polling
    try {
        startRecentUpdatesPolling();
    } catch (error) {
        console.error('Error starting recent updates polling:', error);
    }
}

// Initialize when DOM is ready for direct page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLiveStock);
} else {
    initializeLiveStock();
}