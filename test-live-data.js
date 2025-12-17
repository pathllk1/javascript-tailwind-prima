// Test script to verify the live stock data functionality
const axios = require('axios');

async function testLiveData() {
  try {
    console.log('Testing live stock data API...');
    
    // Test getting symbols
    console.log('\n1. Testing symbols endpoint...');
    const symbolsResponse = await axios.get('http://localhost:3000/live-stock/symbols');
    console.log(`Symbols endpoint returned ${symbolsResponse.data.data.length} symbols`);
    
    // Test getting live data for a single symbol
    console.log('\n2. Testing single symbol live data endpoint...');
    const singleSymbolResponse = await axios.get('http://localhost:3000/live-stock/live-data/RELIANCE.NS');
    console.log('Single symbol data:', JSON.stringify(singleSymbolResponse.data, null, 2));
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLiveData();