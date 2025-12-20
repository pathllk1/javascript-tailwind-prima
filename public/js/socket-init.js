// Initialize socket connection when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize socket connection
  const socket = window.io('/');
  window.socket = socket;
  
  // Handle connection events
  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    
    // Authenticate user if logged in
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData?.id) {
      socket.emit('authenticate', { userId: userData.id });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('Disconnected from WebSocket server:', reason);
  });
  
  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });
  
  // Listen for stock updates
  socket.on('stockUpdate', (data) => {
    console.log('Received stock update:', data);
    updateStockInUI(data);
  });
  
  // Global functions for stock room management
  window.joinStockRoom = (symbol) => {
    if (socket) {
      socket.emit('joinStockRoom', symbol);
    }
  };
  
  window.leaveStockRoom = (symbol) => {
    if (socket) {
      socket.emit('leaveStockRoom', symbol);
    }
  };
  
  window.requestStockUpdate = (symbol) => {
    if (socket) {
      socket.emit('requestStock', { symbol });
    }
  };
});

// Function to update stock in the UI
function updateStockInUI(stockData) {
  // Find the stock element in the DOM and update it
  const stockElement = document.querySelector(`[data-stock-symbol="${stockData.symbol}"]`);
  if (stockElement) {
    // Update the price
    const priceElement = stockElement.querySelector('.stock-price');
    if (priceElement) {
      priceElement.textContent = stockData.price;
    }
    
    // Add a visual indicator for price changes
    if (stockData.previousPrice) {
      const change = stockData.price - stockData.previousPrice;
      const changeElement = stockElement.querySelector('.stock-change');
      if (changeElement) {
        changeElement.textContent = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
        changeElement.className = `stock-change ${change >= 0 ? 'text-green-500' : 'text-red-500'}`;
      }
    }
  }
}

// Handle page visibility changes to optimize WebSocket connection
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page is now visible, reconnect if needed
    if (window.socket && !window.socket.connected) {
      window.socket.connect();
    }
  } else {
    // Page is hidden, could disconnect or reduce update frequency
    // if (window.socket) window.socket.disconnect(); // Uncomment if you want to disconnect when tab is hidden
  }
});

// Handle beforeunload to clean up
window.addEventListener('beforeunload', () => {
  // Clean up any resources if needed
  // if (window.socket) window.socket.disconnect(); // Uncomment if you want to disconnect when leaving the page
});
