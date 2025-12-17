/**
 * Test Historical Data Limits
 * This script tests how much historical OHLCV data we can extract from yahoo-finance2
 */

const YahooFinance = require('yahoo-finance2').default;

// Instantiate Yahoo Finance client
const yahooFinance = new YahooFinance();

// Function to test different time periods
async function testHistoricalLimits(symbol) {
  console.log(`Testing historical data limits for: ${symbol}`);
  
  const periodsToTest = [
    { name: '1 Month', months: 1 },
    { name: '3 Months', months: 3 },
    { name: '6 Months', months: 6 },
    { name: '1 Year', months: 12 },
    { name: '2 Years', months: 24 },
    { name: '5 Years', months: 60 },
    { name: '10 Years', months: 120 },
    { name: 'Maximum', months: -1 } // Special case for maximum data
  ];
  
  for (const period of periodsToTest) {
    try {
      console.log(`\n--- Testing ${period.name} ---`);
      
      const endDate = new Date();
      let startDate;
      
      if (period.months === -1) {
        // For maximum data, we'll try to go back as far as possible
        startDate = new Date('1970-01-01'); // Unix epoch
      } else {
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - period.months);
      }
      
      console.log(`Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      const chartData = await yahooFinance.chart(symbol, {
        period1: startDate,
        period2: endDate,
      });
      
      const dataPoints = chartData.quotes ? chartData.quotes.length : 0;
      console.log(`Retrieved ${dataPoints} data points`);
      
      if (dataPoints > 0) {
        const firstDate = chartData.quotes[0].date;
        const lastDate = chartData.quotes[dataPoints - 1].date;
        console.log(`Date range: ${firstDate} to ${lastDate}`);
      }
      
    } catch (error) {
      console.error(`Error fetching ${period.name} data:`, error.message);
    }
  }
}

// Main function
async function main() {
  try {
    // Test with a well-known symbol that likely has long historical data
    await testHistoricalLimits('RELIANCE.NS');
    
    // Test with another symbol to confirm findings
    console.log('\n\n=== SECOND TEST WITH DIFFERENT SYMBOL ===');
    await testHistoricalLimits('TCS.NS');
    
  } catch (error) {
    console.error('Error in main process:', error.message);
  }
}
// Run the script
main();