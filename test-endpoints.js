// Simple test to verify our endpoints are working
const http = require('http');

// Test the cached data endpoint
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/live-stock/cached-data',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    console.log('Body:', chunk.toString());
  });
  
  res.on('end', () => {
    console.log('Request completed');
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();