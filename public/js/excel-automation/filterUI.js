// UI components for Excel filtering functionality
// This module handles the visual aspects of filtering

/**
 * Filter UI - Manages filter UI components and interactions
 */
class FilterUI {
  constructor() {
    this.activeDropdowns = new Map(); // Map<columnIndex, dropdownElement>
  }
  
  /**
   * Create filter icon for a column header
   * @param {number} columnIndex - The column index
   * @param {boolean} isActive - Whether the filter is active
   * @returns {HTMLElement} - The filter icon element
   */
  createFilterIcon(columnIndex, isActive = false) {
    const filterIcon = document.createElement('span');
    filterIcon.className = 'filter-icon ml-1 cursor-pointer text-gray-400 hover:text-blue-500';
    filterIcon.innerHTML = '🔍'; // Simple filter icon
    filterIcon.dataset.columnIndex = columnIndex;
    filterIcon.title = 'Filter column';
    
    // Change color if filter is active
    if (isActive) {
      filterIcon.classList.remove('text-gray-400');
      filterIcon.classList.add('text-blue-500');
    }
    
    // Add click event
    filterIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showFilterDropdown(columnIndex);
    });
    
    return filterIcon;
  }
  
  /**
   * Show filter dropdown for a column
   * @param {number} columnIndex - The column index
   */
  showFilterDropdown(columnIndex) {
    // Close any existing dropdowns
    this.closeAllDropdowns();
    
    // Get column metadata from global scope
    const globalMetadata = window.columnMetadata;
    if (!globalMetadata || !Array.isArray(globalMetadata)) {
      console.warn('No global column metadata found');
      return;
    }
    
    const metadata = globalMetadata[columnIndex];
    if (!metadata) {
      console.warn('No metadata found for column', columnIndex, 'Available metadata:', globalMetadata);
      return;
    }
    
    // Get the filter icon
    const filterIcon = document.querySelector(`.filter-icon[data-column-index="${columnIndex}"]`);
    if (!filterIcon) {
      console.warn('Filter icon not found for column', columnIndex);
      return;
    }
    
    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'filter-dropdown absolute z-20 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 p-4';
    dropdown.dataset.columnIndex = columnIndex;
    
    // Position dropdown below the filter icon
    const rect = filterIcon.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Position relative to viewport
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '1000';
    
    // Check if this is the last column to adjust positioning
    const isLastColumn = window.currentTableData && 
                         window.currentTableData.headers && 
                         columnIndex === window.currentTableData.headers.length - 1;
    
    if (isLastColumn) {
      // For the last column, position dropdown to the left of the icon
      dropdown.style.top = (rect.bottom + 5) + 'px';
      dropdown.style.right = (window.innerWidth - rect.right + scrollLeft) + 'px';
    } else {
      // For other columns, position dropdown to the right of the icon
      dropdown.style.top = (rect.bottom + 5) + 'px';
      dropdown.style.left = (rect.left + scrollLeft) + 'px';
    }
    
    // Create dropdown content based on column type
    const content = this.createFilterContent(columnIndex, metadata);
    dropdown.innerHTML = content;
    
    // Add to document
    document.body.appendChild(dropdown);
    
    // Store reference
    this.activeDropdowns.set(columnIndex, dropdown);
    
    // Add event listeners
    this.attachFilterEventListeners(columnIndex, dropdown);
    
    // Close dropdown when clicking elsewhere
    const closeHandler = (e) => {
      if (!e.target.closest(`.filter-dropdown[data-column-index="${columnIndex}"]`) && 
          !e.target.closest(`.filter-icon[data-column-index="${columnIndex}"]`)) {
        this.closeDropdown(columnIndex);
        document.removeEventListener('click', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }
  
  /**
   * Create filter content based on column type
   * @param {number} columnIndex - The column index
   * @param {Object} metadata - The column metadata
   * @returns {string} - HTML content for the filter dropdown
   */
  createFilterContent(columnIndex, metadata) {
    let content = `
      <div class="filter-header mb-3 pb-2 border-b border-gray-200">
        <h3 class="text-sm font-medium text-gray-900">Filter: ${this.escapeHtml(metadata.header)}</h3>
        <p class="text-xs text-gray-500">Type: ${this.escapeHtml(metadata.type)}</p>
      </div>
    `;
    
    switch (metadata.type) {
      case 'text':
        content += this.createTextFilterUI(columnIndex, metadata);
        break;
        
      case 'number':
        content += this.createNumberFilterUI(columnIndex, metadata);
        break;
        
      case 'date':
        content += this.createDateFilterUI(columnIndex, metadata);
        break;
        
      case 'boolean':
        content += this.createBooleanFilterUI(columnIndex, metadata);
        break;
        
      default:
        content += this.createDefaultFilterUI(columnIndex, metadata);
    }
    
    // Add action buttons
    content += `
      <div class="filter-actions flex justify-between pt-3 border-t border-gray-200 mt-3">
        <button class="clear-filter text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Clear</button>
        <button class="apply-filter bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">Apply</button>
      </div>
    `;
    
    return content;
  }
  
  /**
   * Create text filter UI
   * @param {number} columnIndex - The column index
   * @param {Object} metadata - The column metadata
   * @returns {string} - HTML for text filter
   */
  createTextFilterUI(columnIndex, metadata) {
    return `
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1">Contains</label>
        <input type="text" class="filter-input w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
               placeholder="Search..." data-column="${columnIndex}">
      </div>
      <div class="flex items-center mb-3">
        <input type="checkbox" id="caseSensitive-${columnIndex}" class="case-sensitive mr-2" data-column="${columnIndex}">
        <label for="caseSensitive-${columnIndex}" class="text-xs text-gray-700">Case sensitive</label>
      </div>
      ${
        metadata.stats.uniqueValues.size > 0 && metadata.stats.uniqueValues.size <= 20 ? 
        `<div class="mb-3">
          <label class="block text-xs font-medium text-gray-700 mb-1">Quick Select</label>
          <select class="filter-quick-select w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" data-column="${columnIndex}">
            <option value="">-- Select Value --</option>
            ${Array.from(metadata.stats.uniqueValues)
              .filter(val => val !== null && val !== undefined && val !== '')
              .sort()
              .map(val => `<option value="${this.escapeHtml(String(val))}">${this.escapeHtml(String(val))}</option>`)
              .join('')}
          </select>
        </div>` : ''
      }
    `;
  }
  
  /**
   * Create number filter UI
   * @param {number} columnIndex - The column index
   * @param {Object} metadata - The column metadata
   * @returns {string} - HTML for number filter
   */
  createNumberFilterUI(columnIndex, metadata) {
    return `
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1">Operator</label>
        <select class="filter-operator w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2" data-column="${columnIndex}">
          <option value="equals">Equals</option>
          <option value="notEquals">Not Equals</option>
          <option value="greater">Greater Than</option>
          <option value="greaterEqual">Greater Than or Equal</option>
          <option value="less">Less Than</option>
          <option value="lessEqual">Less Than or Equal</option>
          <option value="between" selected>Between</option>
        </select>
      </div>
      <div class="filter-values mb-3">
        <div class="filter-single-value hidden">
          <label class="block text-xs font-medium text-gray-700 mb-1">Value</label>
          <input type="number" step="any" class="filter-value w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                 placeholder="Enter number" data-column="${columnIndex}">
        </div>
        <div class="filter-range-values">
          <label class="block text-xs font-medium text-gray-700 mb-1">Range</label>
          <div class="flex items-center space-x-2">
            <input type="number" step="any" class="filter-min w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                   placeholder="Min" value="${metadata.stats.min || ''}" data-column="${columnIndex}">
            <span class="text-gray-500 text-sm">to</span>
            <input type="number" step="any" class="filter-max w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                   placeholder="Max" value="${metadata.stats.max || ''}" data-column="${columnIndex}">
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Create date filter UI
   * @param {number} columnIndex - The column index
   * @param {Object} metadata - The column metadata
   * @returns {string} - HTML for date filter
   */
  createDateFilterUI(columnIndex, metadata) {
    return `
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1">Operator</label>
        <select class="filter-operator w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2" data-column="${columnIndex}">
          <option value="equals">Equals</option>
          <option value="before">Before</option>
          <option value="after">After</option>
          <option value="between" selected>Between</option>
        </select>
      </div>
      <div class="filter-values mb-3">
        <div class="filter-single-date hidden">
          <label class="block text-xs font-medium text-gray-700 mb-1">Date</label>
          <input type="date" class="filter-date w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                 data-column="${columnIndex}">
        </div>
        <div class="filter-date-range">
          <label class="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
          <div class="flex items-center space-x-2">
            <input type="date" class="filter-date-from w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                   data-column="${columnIndex}">
            <span class="text-gray-500 text-sm">to</span>
            <input type="date" class="filter-date-to w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                   data-column="${columnIndex}">
          </div>
        </div>
      </div>
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1">Quick Presets</label>
        <div class="grid grid-cols-2 gap-1">
          <button class="preset-today text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded" data-preset="today">Today</button>
          <button class="preset-week text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded" data-preset="week">Last 7 Days</button>
          <button class="preset-month text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded" data-preset="month">Last 30 Days</button>
          <button class="preset-year text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded" data-preset="year">This Year</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Create boolean filter UI
   * @param {number} columnIndex - The column index
   * @param {Object} metadata - The column metadata
   * @returns {string} - HTML for boolean filter
   */
  createBooleanFilterUI(columnIndex, metadata) {
    return `
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1">Show Values</label>
        <div class="space-y-2">
          <div class="flex items-center">
            <input type="checkbox" id="bool-true-${columnIndex}" class="filter-bool-true mr-2" data-column="${columnIndex}" checked>
            <label for="bool-true-${columnIndex}" class="text-sm text-gray-700">True</label>
          </div>
          <div class="flex items-center">
            <input type="checkbox" id="bool-false-${columnIndex}" class="filter-bool-false mr-2" data-column="${columnIndex}" checked>
            <label for="bool-false-${columnIndex}" class="text-sm text-gray-700">False</label>
          </div>
          <div class="flex items-center">
            <input type="checkbox" id="bool-empty-${columnIndex}" class="filter-bool-empty mr-2" data-column="${columnIndex}" checked>
            <label for="bool-empty-${columnIndex}" class="text-sm text-gray-700">Empty</label>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Create default filter UI (for mixed/unknown types)
   * @param {number} columnIndex - The column index
   * @param {Object} metadata - The column metadata
   * @returns {string} - HTML for default filter
   */
  createDefaultFilterUI(columnIndex, metadata) {
    return `
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1">Search</label>
        <input type="text" class="filter-input w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
               placeholder="Search..." data-column="${columnIndex}">
      </div>
      ${
        metadata.stats.uniqueValues.size > 0 && metadata.stats.uniqueValues.size <= 15 ? 
        `<div class="mb-3">
          <label class="block text-xs font-medium text-gray-700 mb-1">Quick Select</label>
          <div class="max-h-32 overflow-y-auto border rounded p-1">
            ${Array.from(metadata.stats.uniqueValues)
              .filter(val => val !== null && val !== undefined && val !== '')
              .sort()
              .slice(0, 15)
              .map(val => `
                <div class="flex items-center mb-1">
                  <input type="checkbox" id="chk-${columnIndex}-${this.escapeHtml(String(val)).replace(/\s+/g, '-')}" 
                         class="filter-checkbox mr-2" data-value="${this.escapeHtml(String(val))}" data-column="${columnIndex}">
                  <label for="chk-${columnIndex}-${this.escapeHtml(String(val)).replace(/\s+/g, '-')}" class="text-xs text-gray-700">
                    ${this.escapeHtml(String(val))}
                  </label>
                </div>
              `).join('')}
          </div>
        </div>` : ''
      }
    `;
  }
  
  /**
   * Attach event listeners to filter controls
   * @param {number} columnIndex - The column index
   * @param {HTMLElement} dropdown - The dropdown element
   */
  attachFilterEventListeners(columnIndex, dropdown) {
    // Apply button
    const applyBtn = dropdown.querySelector('.apply-filter');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyFilter(columnIndex);
      });
    }
    
    // Clear button
    const clearBtn = dropdown.querySelector('.clear-filter');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearFilter(columnIndex);
      });
    }
    
    // Operator change for number/date filters
    const operatorSelect = dropdown.querySelector('.filter-operator');
    if (operatorSelect) {
      operatorSelect.addEventListener('change', (e) => {
        this.handleOperatorChange(columnIndex, e.target.value);
      });
    }
    
    // Quick select for text filters
    const quickSelect = dropdown.querySelector('.filter-quick-select');
    if (quickSelect) {
      quickSelect.addEventListener('change', (e) => {
        const input = dropdown.querySelector('.filter-input');
        if (input && e.target.value) {
          input.value = e.target.value;
        }
      });
    }
    
    // Date presets
    const presetButtons = dropdown.querySelectorAll('[data-preset]');
    presetButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const preset = e.target.dataset.preset;
        this.applyDatePreset(columnIndex, preset);
      });
    });
    
    // Keyboard navigation
    this.setupKeyboardNavigation(dropdown);
  }
  
  /**
   * Setup keyboard navigation for filter dropdown
   * @param {HTMLElement} dropdown - The dropdown element
   */
  setupKeyboardNavigation(dropdown) {
    dropdown.addEventListener('keydown', (e) => {
      // Close dropdown with Escape key
      if (e.key === 'Escape') {
        const columnIndex = dropdown.dataset.columnIndex;
        if (columnIndex) {
          this.closeDropdown(parseInt(columnIndex));
        }
        e.stopPropagation();
      }
      
      // Focus trap for dropdown
      const focusableElements = dropdown.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    });
  }
  
  /**
   * Apply date preset
   * @param {number} columnIndex - The column index
   * @param {string} preset - The preset type (today, week, month, year)
   */
  applyDatePreset(columnIndex, preset) {
    const dropdown = this.activeDropdowns.get(columnIndex);
    if (!dropdown) return;
    
    const fromDateInput = dropdown.querySelector('.filter-date-from');
    const toDateInput = dropdown.querySelector('.filter-date-to');
    
    if (!fromDateInput || !toDateInput) return;
    
    const today = new Date();
    let fromDate, toDate;
    
    switch (preset) {
      case 'today':
        fromDate = today;
        toDate = today;
        break;
      case 'week':
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        toDate = today;
        break;
      case 'month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
        toDate = today;
        break;
      case 'year':
        fromDate = new Date(today.getFullYear(), 0, 1);
        toDate = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }
    
    // Format dates as YYYY-MM-DD
    fromDateInput.value = fromDate.toISOString().split('T')[0];
    toDateInput.value = toDate.toISOString().split('T')[0];
  }
  
  /**
   * Handle operator change for number/date filters
   * @param {number} columnIndex - The column index
   * @param {string} operator - The selected operator
   */
  handleOperatorChange(columnIndex, operator) {
    const dropdown = this.activeDropdowns.get(columnIndex);
    if (!dropdown) return;
    
    // Toggle visibility of value inputs based on operator
    const singleValue = dropdown.querySelector('.filter-single-value');
    const rangeValues = dropdown.querySelector('.filter-range-values');
    const singleDate = dropdown.querySelector('.filter-single-date');
    const dateRange = dropdown.querySelector('.filter-date-range');
    
    if (singleValue && rangeValues) {
      if (operator === 'between') {
        singleValue.classList.add('hidden');
        rangeValues.classList.remove('hidden');
      } else {
        singleValue.classList.remove('hidden');
        rangeValues.classList.add('hidden');
      }
    }
    
    if (singleDate && dateRange) {
      if (operator === 'between') {
        singleDate.classList.add('hidden');
        dateRange.classList.remove('hidden');
      } else {
        singleDate.classList.remove('hidden');
        dateRange.classList.add('hidden');
      }
    }
  }
  
  /**
   * Apply filter for a column
   * @param {number} columnIndex - The column index
   */
  applyFilter(columnIndex) {
    const dropdown = this.activeDropdowns.get(columnIndex);
    if (!dropdown) return;
    
    // Get column metadata from global scope
    const globalMetadata = window.columnMetadata;
    if (!globalMetadata || !Array.isArray(globalMetadata)) {
      console.warn('No global column metadata found');
      return;
    }
    
    const metadata = globalMetadata[columnIndex];
    if (!metadata) {
      console.warn('No metadata found for column', columnIndex);
      return;
    }
    
    // Create filter config based on UI values
    let filterConfig = null;
    
    switch (metadata.type) {
      case 'text':
        filterConfig = this.getTextFilterConfig(columnIndex, dropdown);
        break;
        
      case 'number':
        filterConfig = this.getNumberFilterConfig(columnIndex, dropdown);
        break;
        
      case 'date':
        filterConfig = this.getDateFilterConfig(columnIndex, dropdown);
        break;
        
      case 'boolean':
        filterConfig = this.getBooleanFilterConfig(columnIndex, dropdown);
        break;
        
      default:
        filterConfig = this.getDefaultFilterConfig(columnIndex, dropdown);
    }
    
    // Apply filter through filter engine
    if (filterConfig && window.filterEngine) {
      window.filterEngine.setFilter(columnIndex, filterConfig);
    }
    
    // Close dropdown
    this.closeDropdown(columnIndex);
  }
  
  /**
   * Get text filter configuration
   * @param {number} columnIndex - The column index
   * @param {HTMLElement} dropdown - The dropdown element
   * @returns {Object|null} - Filter configuration or null
   */
  getTextFilterConfig(columnIndex, dropdown) {
    const input = dropdown.querySelector('.filter-input');
    const caseSensitive = dropdown.querySelector('.case-sensitive');
    
    if (!input) return null;
    
    return {
      type: 'text',
      value: input.value.trim(),
      caseSensitive: caseSensitive ? caseSensitive.checked : false
    };
  }
  
  /**
   * Get number filter configuration
   * @param {number} columnIndex - The column index
   * @param {HTMLElement} dropdown - The dropdown element
   * @returns {Object|null} - Filter configuration or null
   */
  getNumberFilterConfig(columnIndex, dropdown) {
    const operatorSelect = dropdown.querySelector('.filter-operator');
    const singleValue = dropdown.querySelector('.filter-value');
    const minValue = dropdown.querySelector('.filter-min');
    const maxValue = dropdown.querySelector('.filter-max');
    
    if (!operatorSelect) return null;
    
    const operator = operatorSelect.value;
    
    switch (operator) {
      case 'between':
        return {
          type: 'number',
          operator: 'between',
          value: minValue && minValue.value !== '' ? parseFloat(minValue.value) : null,
          value2: maxValue && maxValue.value !== '' ? parseFloat(maxValue.value) : null
        };
        
      default:
        return {
          type: 'number',
          operator: operator,
          value: singleValue && singleValue.value !== '' ? parseFloat(singleValue.value) : null
        };
    }
  }
  
  /**
   * Get date filter configuration
   * @param {number} columnIndex - The column index
   * @param {HTMLElement} dropdown - The dropdown element
   * @returns {Object|null} - Filter configuration or null
   */
  getDateFilterConfig(columnIndex, dropdown) {
    const operatorSelect = dropdown.querySelector('.filter-operator');
    const singleDate = dropdown.querySelector('.filter-date');
    const fromDate = dropdown.querySelector('.filter-date-from');
    const toDate = dropdown.querySelector('.filter-date-to');
    
    if (!operatorSelect) return null;
    
    const operator = operatorSelect.value;
    
    switch (operator) {
      case 'between':
        return {
          type: 'date',
          operator: 'between',
          value: fromDate ? fromDate.value : null,
          value2: toDate ? toDate.value : null
        };
        
      default:
        return {
          type: 'date',
          operator: operator,
          value: singleDate ? singleDate.value : null
        };
    }
  }
  
  /**
   * Get boolean filter configuration
   * @param {number} columnIndex - The column index
   * @param {HTMLElement} dropdown - The dropdown element
   * @returns {Object|null} - Filter configuration or null
   */
  getBooleanFilterConfig(columnIndex, dropdown) {
    const showTrue = dropdown.querySelector('.filter-bool-true');
    const showFalse = dropdown.querySelector('.filter-bool-false');
    const showEmpty = dropdown.querySelector('.filter-bool-empty');
    
    return {
      type: 'boolean',
      showTrue: showTrue ? showTrue.checked : true,
      showFalse: showFalse ? showFalse.checked : true,
      showEmpty: showEmpty ? showEmpty.checked : true
    };
  }
  
  /**
   * Get default filter configuration
   * @param {number} columnIndex - The column index
   * @param {HTMLElement} dropdown - The dropdown element
   * @returns {Object|null} - Filter configuration or null
   */
  getDefaultFilterConfig(columnIndex, dropdown) {
    const input = dropdown.querySelector('.filter-input');
    const checkboxes = dropdown.querySelectorAll('.filter-checkbox:checked');
    
    // If checkboxes are selected, use them; otherwise use text input
    if (checkboxes.length > 0) {
      const values = Array.from(checkboxes).map(cb => cb.dataset.value);
      return {
        type: 'mixed',
        values: values
      };
    } else if (input) {
      return {
        type: 'text',
        value: input.value.trim(),
        caseSensitive: false
      };
    }
    
    return null;
  }
  
  /**
   * Clear filter for a column
   * @param {number} columnIndex - The column index
   */
  clearFilter(columnIndex) {
    // Remove filter from engine
    if (window.filterEngine) {
      window.filterEngine.removeFilter(columnIndex);
    }
    
    // Close dropdown
    this.closeDropdown(columnIndex);
  }
  
  /**
   * Close dropdown for a column
   * @param {number} columnIndex - The column index
   */
  closeDropdown(columnIndex) {
    const dropdown = this.activeDropdowns.get(columnIndex);
    if (dropdown) {
      dropdown.remove();
      this.activeDropdowns.delete(columnIndex);
    }
  }
  
  /**
   * Close all dropdowns
   */
  closeAllDropdowns() {
    for (const [columnIndex, dropdown] of this.activeDropdowns) {
      dropdown.remove();
    }
    this.activeDropdowns.clear();
  }
  
  /**
   * Update filter icon state
   * @param {number} columnIndex - The column index
   * @param {boolean} isActive - Whether the filter is active
   */
  updateFilterIconState(columnIndex, isActive) {
    const filterIcon = document.querySelector(`.filter-icon[data-column-index="${columnIndex}"]`);
    if (filterIcon) {
      if (isActive) {
        filterIcon.classList.remove('text-gray-400');
        filterIcon.classList.add('text-blue-500');
        // Add visual indicator for active filter
        filterIcon.innerHTML = '🔍<span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-blue-500"></span>';
      } else {
        filterIcon.classList.remove('text-blue-500');
        filterIcon.classList.add('text-gray-400');
        // Remove visual indicator
        filterIcon.innerHTML = '🔍';
      }
    }
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - The text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml(text) {
    if (typeof text !== 'string') {
      text = String(text);
    }
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Create global instance
const filterUI = new FilterUI();

// Export for global access
window.FilterUI = FilterUI;
window.filterUI = filterUI;