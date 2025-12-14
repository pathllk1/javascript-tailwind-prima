// Core filtering engine for Excel data
// This module manages filter state and evaluates conditions

/**
 * Filter Engine - Manages filter state and evaluates conditions
 */
class FilterEngine {
  constructor() {
    this.filters = new Map(); // Map<columnIndex, filterConfig>
    this.globalLogic = 'AND'; // AND or OR
    this.matchingIndices = new Set(); // Set of row indices that match all filters
    this.isFiltered = false; // Whether any filters are active
    this.debounceTimer = null; // For debouncing filter updates
    this.debounceDelay = 300; // ms
    this.data = null; // Reference to current data
    this.onFilterChange = null; // Callback for filter changes
    this.persistenceKey = 'excelFilters'; // Local storage key
  }
  
  /**
   * Initialize the filter engine with data
   * @param {Object} data - The table data {headers: [], rows: []}
   */
  initialize(data) {
    this.data = data;
    this.filters.clear();
    this.matchingIndices.clear();
    this.isFiltered = false;
    
    // Load saved filters if available
    this.loadFilters();
    
    // Notify of filter change
    this.notifyFilterChange();
  }
  
  /**
   * Set a filter for a column
   * @param {number} columnIndex - The column index
   * @param {Object} filterConfig - The filter configuration
   */
  setFilter(columnIndex, filterConfig) {
    // Validate filter config
    if (!this.isValidFilterConfig(filterConfig)) {
      console.warn('Invalid filter config:', filterConfig);
      return;
    }
    
    // Store filter
    this.filters.set(columnIndex, filterConfig);
    
    // Save filters
    this.saveFilters();
    
    // Update filter state with debounce
    this.debouncedUpdate();
  }
  
  /**
   * Remove a filter for a column
   * @param {number} columnIndex - The column index
   */
  removeFilter(columnIndex) {
    if (this.filters.has(columnIndex)) {
      this.filters.delete(columnIndex);
      this.saveFilters();
      this.debouncedUpdate();
    }
  }
  
  /**
   * Clear all filters
   */
  clearAllFilters() {
    if (this.filters.size > 0) {
      this.filters.clear();
      this.saveFilters();
      this.debouncedUpdate();
    }
  }
  
  /**
   * Get active filters
   * @returns {Array} - Array of [columnIndex, filterConfig] pairs
   */
  getActiveFilters() {
    return Array.from(this.filters.entries());
  }
  
  /**
   * Check if a column has an active filter
   * @param {number} columnIndex - The column index
   * @returns {boolean} - Whether the column has an active filter
   */
  hasFilter(columnIndex) {
    return this.filters.has(columnIndex);
  }
  
  /**
   * Validate filter configuration
   * @param {Object} filterConfig - The filter configuration
   * @returns {boolean} - Whether the config is valid
   */
  isValidFilterConfig(filterConfig) {
    if (!filterConfig || !filterConfig.type) {
      return false;
    }
    
    switch (filterConfig.type) {
      case 'text':
        return typeof filterConfig.value === 'string';
      case 'number':
        return filterConfig.operator && 
               (filterConfig.value !== undefined || 
                filterConfig.value2 !== undefined);
      case 'date':
        return filterConfig.operator && 
               (filterConfig.value !== undefined || 
                filterConfig.value2 !== undefined);
      case 'boolean':
        return typeof filterConfig.showTrue === 'boolean' &&
               typeof filterConfig.showFalse === 'boolean' &&
               typeof filterConfig.showEmpty === 'boolean';
      default:
        return true;
    }
  }
  
  /**
   * Save filters to localStorage
   */
  saveFilters() {
    try {
      // Convert Map to array for serialization
      const filtersArray = Array.from(this.filters.entries());
      const filterState = {
        filters: filtersArray,
        globalLogic: this.globalLogic
      };
      
      // Save to localStorage
      localStorage.setItem(this.persistenceKey, JSON.stringify(filterState));
    } catch (e) {
      console.warn('Failed to save filters to localStorage:', e);
    }
  }
  
  /**
   * Load filters from localStorage
   */
  loadFilters() {
    try {
      // Load from localStorage
      const savedState = localStorage.getItem(this.persistenceKey);
      if (savedState) {
        const filterState = JSON.parse(savedState);
        
        // Restore filters Map
        if (Array.isArray(filterState.filters)) {
          this.filters = new Map(filterState.filters);
        }
        
        // Restore global logic
        if (filterState.globalLogic) {
          this.globalLogic = filterState.globalLogic;
        }
        
        // If we loaded filters, mark as filtered
        this.isFiltered = this.filters.size > 0;
      }
    } catch (e) {
      console.warn('Failed to load filters from localStorage:', e);
    }
  }
  
  /**
   * Debounced update of filter state
   */
  debouncedUpdate() {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.updateFilterState();
    }, this.debounceDelay);
  }
  
  /**
   * Update filter state and matching indices
   */
  updateFilterState() {
    if (!this.data || !this.data.rows) {
      this.matchingIndices.clear();
      this.isFiltered = false;
      this.notifyFilterChange();
      return;
    }
    
    // If no filters, all rows match
    if (this.filters.size === 0) {
      this.matchingIndices.clear();
      for (let i = 0; i < this.data.rows.length; i++) {
        this.matchingIndices.add(i);
      }
      this.isFiltered = false;
      this.notifyFilterChange();
      return;
    }
    
    // Evaluate filters for each row
    this.matchingIndices.clear();
    
    for (let rowIndex = 0; rowIndex < this.data.rows.length; rowIndex++) {
      const row = this.data.rows[rowIndex];
      let matches = this.globalLogic === 'AND'; // Start with true for AND, false for OR
      
      for (const [columnIndex, filter] of this.filters) {
        const cellValue = row[columnIndex];
        const filterMatches = this.evaluateFilter(cellValue, filter);
        
        if (this.globalLogic === 'AND') {
          matches = matches && filterMatches;
          // Early exit if false
          if (!matches) break;
        } else { // OR
          matches = matches || filterMatches;
          // Early exit if true
          if (matches) break;
        }
      }
      
      if (matches) {
        this.matchingIndices.add(rowIndex);
      }
    }
    
    this.isFiltered = true;
    this.notifyFilterChange();
  }
  
  /**
   * Evaluate a filter against a cell value
   * @param {*} value - The cell value
   * @param {Object} filter - The filter configuration
   * @returns {boolean} - Whether the value matches the filter
   */
  evaluateFilter(value, filter) {
    const isEmpty = value === null || value === undefined || value === '';
    
    switch (filter.type) {
      case 'text':
        return this.evaluateTextFilter(value, filter);
      case 'number':
        if (isEmpty) return filter.includeEmpty || false;
        const numValue = Number(value);
        if (isNaN(numValue)) return false;
        return this.evaluateNumberFilter(numValue, filter);
      case 'date':
        if (isEmpty) return filter.includeEmpty || false;
        return this.evaluateDateFilter(value, filter);
      case 'boolean':
        // For boolean, empty means neither true nor false
        if (isEmpty) return filter.showEmpty || false;
        // Convert value to boolean
        const boolValue = this.convertToBoolean(value);
        if (boolValue === true) return filter.showTrue || false;
        if (boolValue === false) return filter.showFalse || false;
        // If conversion failed, treat as empty
        return filter.showEmpty || false;
      default:
        // Default text search for unknown types
        return this.evaluateTextFilter(value, {value: filter.value, caseSensitive: false});
    }
  }
  
  /**
   * Evaluate text filter
   * @param {*} value - The cell value
   * @param {Object} filter - The text filter config
   * @returns {boolean} - Whether the value matches
   */
  evaluateTextFilter(value, filter) {
    // Handle empty values
    if (value === null || value === undefined || value === '') {
      return filter.value === ''; // Only match if filter is explicitly looking for empty
    }
    
    const stringValue = String(value);
    const filterValue = filter.value || '';
    
    if (filter.caseSensitive) {
      return stringValue.includes(filterValue);
    } else {
      return stringValue.toLowerCase().includes(filterValue.toLowerCase());
    }
  }
  
  /**
   * Evaluate number filter
   * @param {number} value - The numeric cell value
   * @param {Object} filter - The number filter config
   * @returns {boolean} - Whether the value matches
   */
  evaluateNumberFilter(value, filter) {
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'notEquals':
        return value !== filter.value;
      case 'greater':
        return value > filter.value;
      case 'greaterEqual':
        return value >= filter.value;
      case 'less':
        return value < filter.value;
      case 'lessEqual':
        return value <= filter.value;
      case 'between':
        return value >= filter.value && value <= filter.value2;
      default:
        return false;
    }
  }
  
  /**
   * Evaluate date filter
   * @param {*} value - The cell value
   * @param {Object} filter - The date filter config
   * @returns {boolean} - Whether the value matches
   */
  evaluateDateFilter(value, filter) {
    // Try to parse the cell value as a date
    let cellDate = null;
    
    if (value instanceof Date) {
      cellDate = value;
    } else if (typeof value === 'string') {
      // Try different date formats
      cellDate = new Date(value);
      if (isNaN(cellDate.getTime())) {
        // Try parsing as Excel date serial number
        const serial = Number(value);
        if (!isNaN(serial)) {
          // Excel epoch starts on January 1, 1900
          cellDate = new Date((serial - 25569) * 86400 * 1000);
        }
      }
    } else if (typeof value === 'number') {
      // Assume it's an Excel date serial number
      cellDate = new Date((value - 25569) * 86400 * 1000);
    }
    
    // If we couldn't parse the date, it doesn't match
    if (!cellDate || isNaN(cellDate.getTime())) {
      return false;
    }
    
    // Parse filter dates
    const filterDate1 = filter.value ? new Date(filter.value) : null;
    const filterDate2 = filter.value2 ? new Date(filter.value2) : null;
    
    // Check if filter dates are valid
    if (filterDate1 && isNaN(filterDate1.getTime())) return false;
    if (filterDate2 && isNaN(filterDate2.getTime())) return false;
    
    switch (filter.operator) {
      case 'equals':
        return filterDate1 && 
               cellDate.getFullYear() === filterDate1.getFullYear() &&
               cellDate.getMonth() === filterDate1.getMonth() &&
               cellDate.getDate() === filterDate1.getDate();
      case 'before':
        return filterDate1 && cellDate < filterDate1;
      case 'after':
        return filterDate1 && cellDate > filterDate1;
      case 'between':
        return filterDate1 && filterDate2 && 
               cellDate >= filterDate1 && cellDate <= filterDate2;
      default:
        return false;
    }
  }
  
  /**
   * Convert a value to boolean
   * @param {*} value - The value to convert
   * @returns {boolean|null} - The boolean value or null if conversion failed
   */
  convertToBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'y') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'n') {
        return false;
      }
      return null;
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    return null;
  }
  
  /**
   * Notify of filter change
   */
  notifyFilterChange() {
    // Update UI to show which columns are filtered
    this.updateColumnFilterIndicators();
    
    // Call external callback if set
    if (typeof this.onFilterChange === 'function') {
      this.onFilterChange();
    }
  }
  
  /**
   * Update column filter indicators in the UI
   */
  updateColumnFilterIndicators() {
    // Update filter icons in column headers
    if (window.filterUI) {
      // Get all column indices
      const allColumns = Array.from(this.filters.keys());
      
      // Update each column's filter icon state
      allColumns.forEach(columnIndex => {
        const isActive = this.filters.has(columnIndex);
        filterUI.updateFilterIconState(columnIndex, isActive);
      });
    }
  }
}

// Create global instance
const filterEngine = new FilterEngine();

// Export for global access
window.FilterEngine = FilterEngine;
window.filterEngine = filterEngine;