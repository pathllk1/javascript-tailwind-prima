// Function to calculate top gainers and losers
function calculateTopPerformers(liveDataMap) {
  // Return empty arrays if no data is available
  if (!liveDataMap || liveDataMap.size === 0) {
    return { gainers: [], losers: [] };
  }
  
  const performers = [];
  
  // Convert map to array for sorting
  liveDataMap.forEach((data, symbol) => {
    if (data.currentPrice !== undefined && data.previousClose !== undefined && data.previousClose > 0) {
      const changePercent = ((data.currentPrice - data.previousClose) / data.previousClose) * 100;
      performers.push({
        symbol: data.symbol || symbol,
        name: data.name || symbol,
        currentPrice: data.currentPrice,
        previousClose: data.previousClose,
        changePercent: changePercent,
        changeAmount: data.currentPrice - data.previousClose
      });
    }
  });
  
  // Sort by change percentage
  performers.sort((a, b) => b.changePercent - a.changePercent);
  
  // Get top 10 gainers and losers
  const gainers = performers.slice(0, 10);
  const losers = performers.slice(-10).reverse(); // Reverse to show biggest losers first
  
  return { gainers, losers };
}



module.exports = { calculateTopPerformers };