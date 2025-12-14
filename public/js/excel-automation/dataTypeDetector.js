// Utility functions for detecting data types in Excel columns
// This module provides functionality to analyze column data and determine appropriate filter types

/**
 * Check if a value is a valid number
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is a valid number
 */
function isNumber(value) {
  // Handle null, undefined, empty strings
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  // Convert to string for consistent checking
  const strValue = String(value).trim();
  
  // Check if it's a valid number (excluding NaN)
  const num = Number(strValue);
  return !isNaN(num) && isFinite(num) && strValue !== '';
}

/**
 * Check if a value is a valid date
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is a valid date
 */
function isValidDate(value) {
  // Handle null, undefined, empty strings
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  // Try to parse the value as a date
  const date = new Date(value);
  
  // Check if it's a valid date and not NaN
  return date instanceof Date && !isNaN(date) && date.toString() !== 'Invalid Date';
}

/**
 * Check if a value is a boolean
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is a boolean
 */
function isBoolean(value) {
  // Handle null, undefined, empty strings
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  // Check for boolean values or string representations
  const strValue = String(value).toLowerCase().trim();
  return strValue === 'true' || strValue === 'false' || 
         value === true || value === false;
}

/**
 * Detect the type of a single value
 * @param {*} value - The value to analyze
 * @returns {string} - The detected type ('number', 'date', 'boolean', 'text')
 */
function detectValueType(value) {
  if (isNumber(value)) return 'number';
  if (isValidDate(value)) return 'date';
  if (isBoolean(value)) return 'boolean';
  return 'text';
}

/**
 * Detect the predominant type in a column of data
 * @param {Array} columnValues - Array of values from a column
 * @returns {string} - The detected column type ('number', 'date', 'boolean', 'text', 'mixed')
 */
function detectColumnType(columnValues) {
  // Filter out empty values for type detection
  const nonEmptyValues = columnValues.filter(value => 
    value !== null && value !== undefined && value !== ''
  );
  
  // If column is mostly empty, treat as text
  if (nonEmptyValues.length === 0) {
    return 'text';
  }
  
  // Count occurrences of each type
  const typeCounts = {
    number: 0,
    date: 0,
    boolean: 0,
    text: 0
  };
  
  // Analyze each non-empty value
  nonEmptyValues.forEach(value => {
    const type = detectValueType(value);
    typeCounts[type]++;
  });
  
  // Determine predominant type
  const totalNonEmpty = nonEmptyValues.length;
  const threshold = 0.8; // 80% threshold for type consistency
  
  // Check if any type dominates
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count / totalNonEmpty >= threshold) {
      return type;
    }
  }
  
  // If no type dominates, it's mixed
  return 'mixed';
}

/**
 * Calculate statistics for a column of data
 * @param {Array} columnValues - Array of values from a column
 * @returns {Object} - Statistics object with min, max, unique values, etc.
 */
function getColumnStats(columnValues) {
  // Filter out empty values for statistical analysis
  const nonEmptyValues = columnValues.filter(value => 
    value !== null && value !== undefined && value !== ''
  );
  
  const stats = {
    min: null,
    max: null,
    uniqueValues: new Set(),
    emptyCount: columnValues.length - nonEmptyValues.length,
    totalCount: columnValues.length,
    isNumeric: false,
    isDate: false
  };
  
  // If no non-empty values, return basic stats
  if (nonEmptyValues.length === 0) {
    return stats;
  }
  
  // Add all values to unique set
  nonEmptyValues.forEach(value => {
    stats.uniqueValues.add(value);
  });
  
  // For numeric columns, calculate min/max
  const numericValues = nonEmptyValues.filter(isNumber).map(Number);
  if (numericValues.length > 0 && numericValues.length === nonEmptyValues.length) {
    stats.isNumeric = true;
    stats.min = Math.min(...numericValues);
    stats.max = Math.max(...numericValues);
  }
  
  // For date columns, calculate min/max
  const dateValues = nonEmptyValues.filter(isValidDate).map(value => new Date(value));
  if (dateValues.length > 0 && dateValues.length === nonEmptyValues.length) {
    stats.isDate = true;
    stats.min = new Date(Math.min(...dateValues));
    stats.max = new Date(Math.max(...dateValues));
  }
  
  return stats;
}

/**
 * Analyze all columns in table data
 * @param {Object} tableData - The table data with headers and rows
 * @returns {Array} - Array of column metadata objects
 */
function analyzeAllColumns(tableData) {
  const { headers, rows, columnCount } = tableData;
  const columnMetadata = [];
  
  // Process each column
  for (let i = 0; i < columnCount; i++) {
    // Extract column values
    const columnValues = rows.map(row => row[i]);
    
    // Detect column type
    const type = detectColumnType(columnValues);
    
    // Calculate statistics
    const stats = getColumnStats(columnValues);
    
    // Create metadata object
    const metadata = {
      index: i,
      header: headers[i] || `Column ${i + 1}`,
      type: type,
      stats: stats
    };
    
    columnMetadata.push(metadata);
  }
  
  return columnMetadata;
}

// Export functions
window.dataTypeDetector = {
  isNumber,
  isValidDate,
  isBoolean,
  detectValueType,
  detectColumnType,
  getColumnStats,
  analyzeAllColumns
};