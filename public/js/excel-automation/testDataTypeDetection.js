// Test script for data type detection functionality

// Test data simulating different column types
const testData = {
  headers: ["Name", "Age", "Birth Date", "Active", "Score"],
  rows: [
    ["John Doe", 25, "1998-05-15", true, 85.5],
    ["Jane Smith", 30, "1993-12-01", false, 92.0],
    ["Bob Johnson", 35, "1988-03-22", true, 78.3],
    ["Alice Brown", 28, "1995-07-10", true, 95.7],
    ["Charlie Wilson", 42, "1981-11-30", false, 88.2],
    ["", "", "", "", ""], // Empty row for testing
    ["Diana Lee", 31, "invalid-date", "yes", "not-a-number"]
  ],
  rowCount: 7,
  columnCount: 5
};

console.log("Testing data type detection...");

// Wait for dataTypeDetector to be available
function waitForDataTypeDetector() {
  if (typeof dataTypeDetector !== 'undefined') {
    runTests();
  } else {
    setTimeout(waitForDataTypeDetector, 100);
  }
}

function runTests() {
  console.log("=== Data Type Detection Test Results ===");
  
  // Test analyzeAllColumns
  const columnMetadata = dataTypeDetector.analyzeAllColumns(testData);
  
  columnMetadata.forEach((metadata, index) => {
    console.log(`\nColumn ${index + 1}: ${metadata.header}`);
    console.log(`  Detected Type: ${metadata.type}`);
    console.log(`  Empty Count: ${metadata.stats.emptyCount}`);
    console.log(`  Total Count: ${metadata.stats.totalCount}`);
    
    if (metadata.stats.min !== null) {
      console.log(`  Min Value: ${metadata.stats.min}`);
    }
    
    if (metadata.stats.max !== null) {
      console.log(`  Max Value: ${metadata.stats.max}`);
    }
    
    console.log(`  Unique Values Count: ${metadata.stats.uniqueValues.size}`);
  });
  
  console.log("\n=== Individual Value Type Detection ===");
  
  // Test individual value detection
  const testValues = [
    "John",           // text
    25,               // number
    "1998-05-15",     // date
    true,             // boolean
    "true",           // boolean string
    "not-a-number",   // text
    "",               // empty
    null,             // null
    undefined,        // undefined
    "2024-13-45"      // invalid date
  ];
  
  testValues.forEach((value, index) => {
    const type = dataTypeDetector.detectValueType(value);
    console.log(`${index + 1}. "${value}" -> ${type}`);
  });
  
  console.log("\n=== Utility Function Tests ===");
  
  // Test utility functions
  console.log("isNumber(42):", dataTypeDetector.isNumber(42));
  console.log("isNumber('42'):", dataTypeDetector.isNumber('42'));
  console.log("isNumber('hello'):", dataTypeDetector.isNumber('hello'));
  
  console.log("isValidDate('2024-01-15'):", dataTypeDetector.isValidDate('2024-01-15'));
  console.log("isValidDate('invalid'):", dataTypeDetector.isValidDate('invalid'));
  
  console.log("isBoolean(true):", dataTypeDetector.isBoolean(true));
  console.log("isBoolean('false'):", dataTypeDetector.isBoolean('false'));
  console.log("isBoolean('yes'):", dataTypeDetector.isBoolean('yes'));
}

// Start the test when the page loads
document.addEventListener('DOMContentLoaded', function() {
  waitForDataTypeDetector();
});