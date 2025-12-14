// Test script for filter engine functionality

// Test data
const testData = {
  headers: ["Name", "Age", "Salary", "Join Date", "Active"],
  rows: [
    ["John Doe", "28", "50000", "2020-01-15", "true"],
    ["Jane Smith", "32", "65000", "2019-03-22", "false"],
    ["Bob Johnson", "45", "75000", "2018-07-10", "true"],
    ["Alice Brown", "29", "55000", "2021-11-05", "true"],
    ["Charlie Wilson", "38", "80000", "2017-02-28", "false"],
    ["Diana Lee", "26", "48000", "2022-05-18", "true"],
    ["Edward Davis", "52", "95000", "2015-09-12", "true"],
    ["Fiona Clark", "31", "62000", "2020-12-03", "false"],
    ["George Miller", "41", "72000", "2019-06-30", "true"],
    ["Helen White", "27", "53000", "2021-04-17", "true"]
  ],
  rowCount: 10,
  columnCount: 5
};

console.log("Testing filter engine...");

// Wait for filterEngine to be available
function waitForFilterEngine() {
  if (typeof filterEngine !== 'undefined') {
    runTests();
  } else {
    setTimeout(waitForFilterEngine, 100);
  }
}

function runTests() {
  console.log("=== Filter Engine Test Results ===");
  
  // Initialize filter engine
  filterEngine.initialize(testData);
  
  // Test 1: Text filter
  console.log("\n--- Test 1: Text Filter ---");
  filterEngine.setFilter(0, {
    type: 'text',
    value: 'John',
    caseSensitive: false
  });
  
  console.log("Filter applied for 'John' in Name column");
  console.log("Matching indices:", Array.from(filterEngine.getMatchingIndices()));
  
  // Test 2: Number filter
  console.log("\n--- Test 2: Number Filter ---");
  filterEngine.setFilter(1, {
    type: 'number',
    operator: 'greaterEqual',
    value: 30
  });
  
  console.log("Filter applied for Age >= 30");
  console.log("Matching indices:", Array.from(filterEngine.getMatchingIndices()));
  
  // Test 3: Boolean filter
  console.log("\n--- Test 3: Boolean Filter ---");
  filterEngine.setFilter(4, {
    type: 'boolean',
    showTrue: true,
    showFalse: false
  });
  
  console.log("Filter applied for Active = true");
  console.log("Matching indices:", Array.from(filterEngine.getMatchingIndices()));
  
  // Test 4: Clear filter
  console.log("\n--- Test 4: Clear Filter ---");
  filterEngine.removeFilter(1);
  console.log("Removed Age filter");
  console.log("Matching indices:", Array.from(filterEngine.getMatchingIndices()));
  
  // Test 5: Clear all filters
  console.log("\n--- Test 5: Clear All Filters ---");
  filterEngine.clearAllFilters();
  console.log("Cleared all filters");
  console.log("Matching indices:", Array.from(filterEngine.getMatchingIndices()));
  
  console.log("\n=== Filter Engine Tests Completed ===");
}

// Start the test when the page loads
document.addEventListener('DOMContentLoaded', function() {
  waitForFilterEngine();
});