// Client-side JavaScript for Excel table editing functionality

// Global variable to store current table data
let currentTableData = null;
let originalTableData = null;
let columnMetadata = []; // Store column metadata
let visibleRows = []; // Store currently visible rows after filtering
let sortState = {}; // Store sort state for each column
let globalSearchTerm = ''; // Store global search term

// Function to render table from JSON data
function renderTable(tableId, data) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  // Store data for later use
  currentTableData = JSON.parse(JSON.stringify(data));
  originalTableData = JSON.parse(JSON.stringify(data));
  
  // Make currentTableData globally accessible
  window.currentTableData = currentTableData;
  
  // Initialize sort state for each column
  sortState = {};
  data.headers.forEach((_, index) => {
    sortState[index] = { direction: null }; // null, 'asc', 'desc'
  });
  
  // Analyze column data types if dataTypeDetector is available
  if (typeof dataTypeDetector !== 'undefined' && dataTypeDetector.analyzeAllColumns) {
    columnMetadata = dataTypeDetector.analyzeAllColumns(data);
    console.log('Column metadata:', columnMetadata);
  }
  
  // Make columnMetadata globally accessible
  window.columnMetadata = columnMetadata;
  
  // Initialize filter engine
  if (typeof filterEngine !== 'undefined') {
    filterEngine.initialize(data);
    // Listen for filter changes
    filterEngine.onFilterChange = updateGlobalFilterBar;
  }
  
  // Show global filter bar
  const globalFilterBar = document.getElementById('global-filter-bar');
  if (globalFilterBar) {
    globalFilterBar.classList.remove('hidden');
  }
  
  // Update row count
  updateRowCount(data.rows.length, data.rows.length);
  
  // Clear existing content
  table.innerHTML = '';
  
  // Create table header with gradient and sorting capability
  const thead = document.createElement('thead');
  thead.className = 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
  
  const headerRow = document.createElement('tr');
  data.headers.forEach((header, index) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'px-3 py-1 text-left text-xs font-medium uppercase tracking-wider relative border border-gray-300 cursor-pointer';
    th.textContent = header;
    
    // Add sort indicator
    const sortIndicator = document.createElement('span');
    sortIndicator.className = 'sort-indicator ml-1';
    sortIndicator.textContent = '↕';
    th.appendChild(sortIndicator);
    
    // Add click event for sorting
    th.addEventListener('click', () => {
      handleColumnSort(index);
    });
    
    // Add filter icon to each header if we have metadata
    if (columnMetadata.length > 0) {
      const filterIcon = window.filterUI ? 
        window.filterUI.createFilterIcon(index, false) : 
        createSimpleFilterIcon(index);
      th.appendChild(filterIcon);
    }
    
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body with compact styling
  const tbody = document.createElement('tbody');
  tbody.className = 'bg-white';
  tbody.id = 'table-body';
  
  // Initialize visible rows
  visibleRows = [...data.rows];
  
  // Render all rows with compact styling and yellow-green hover
  renderTableBody(tbody, data.rows);
  
  table.appendChild(tbody);
  
  // Attach event listeners for editing
  attachEditListeners();
  
  // Attach save and export button listeners
  attachActionListeners();
  
  // Attach global filter bar listeners
  attachGlobalFilterListeners();
}

// Function to render table body
function renderTableBody(tbody, rows) {
  // Clear existing content
  tbody.innerHTML = '';
  
  // Render all rows with compact styling and yellow-green hover
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-lime-200 transition-colors duration-150';
    
    row.forEach((cellValue, colIndex) => {
      const td = document.createElement('td');
      td.className = 'px-3 py-1 text-xs text-gray-700 editable-cell border border-gray-300';
      td.dataset.row = rowIndex;
      td.dataset.col = colIndex;
      
      // Create cell content container
      const contentDiv = document.createElement('div');
      contentDiv.className = 'cell-content';
      contentDiv.textContent = cellValue !== null && cellValue !== undefined ? cellValue : '';
      
      // Create input for editing
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cell-input hidden w-full px-1 py-0 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs';
      input.value = cellValue !== null && cellValue !== undefined ? cellValue : '';
      
      td.appendChild(contentDiv);
      td.appendChild(input);
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
}

// Function to handle column sorting
function handleColumnSort(columnIndex) {
  if (!currentTableData || !currentTableData.rows) return;
  
  // Update sort state
  const currentDirection = sortState[columnIndex].direction;
  // Reset all other column sort states
  Object.keys(sortState).forEach(key => {
    if (parseInt(key) !== columnIndex) {
      sortState[key].direction = null;
    }
  });
  
  // Toggle sort direction
  if (currentDirection === null) {
    sortState[columnIndex].direction = 'asc';
  } else if (currentDirection === 'asc') {
    sortState[columnIndex].direction = 'desc';
  } else {
    sortState[columnIndex].direction = null;
  }
  
  // Update header indicators
  updateSortIndicators(columnIndex);
  
  // Sort the data
  if (sortState[columnIndex].direction !== null) {
    // Create a copy of rows with their original indices
    const rowsWithIndex = visibleRows.map((row, index) => ({
      row: row,
      originalIndex: currentTableData.rows.findIndex(r => r === row)
    }));
    
    // Sort based on column data type
    rowsWithIndex.sort((a, b) => {
      const aValue = a.row[columnIndex];
      const bValue = b.row[columnIndex];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      let comparison = 0;
      
      // Determine sort logic based on data type
      if (columnMetadata[columnIndex]) {
        switch (columnMetadata[columnIndex].type) {
          case 'number':
            comparison = parseFloat(aValue) - parseFloat(bValue);
            break;
          case 'date':
            const aDate = new Date(aValue);
            const bDate = new Date(bValue);
            comparison = aDate - bDate;
            break;
          case 'boolean':
            // Convert to comparable values
            const aBool = aValue === true || aValue === 'true' || aValue === 1;
            const bBool = bValue === true || bValue === 'true' || bValue === 1;
            comparison = (aBool ? 1 : 0) - (bBool ? 1 : 0);
            break;
          default:
            // Text comparison
            comparison = String(aValue).localeCompare(String(bValue));
        }
      } else {
        // Default text comparison
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortState[columnIndex].direction === 'desc' ? -comparison : comparison;
    });
    
    // Extract sorted rows
    visibleRows = rowsWithIndex.map(item => item.row);
  } else {
    // Reset to original order
    visibleRows = [...currentTableData.rows];
    
    // If filters are applied, restore filtered rows
    if (window.filterEngine && window.filterEngine.isFiltered) {
      updateVisibleRows();
    }
  }
  
  // Re-render table body with sorted data
  const tbody = document.getElementById('table-body');
  if (tbody) {
    renderTableBody(tbody, visibleRows);
    attachEditListeners();
  }
}

// Function to update sort indicators in headers
function updateSortIndicators(sortedColumnIndex) {
  const headers = document.querySelectorAll('#excel-table thead th');
  headers.forEach((th, index) => {
    const indicator = th.querySelector('.sort-indicator');
    if (indicator) {
      if (index === sortedColumnIndex) {
        const direction = sortState[index].direction;
        if (direction === 'asc') {
          indicator.textContent = '↑';
          indicator.className = 'sort-indicator ml-1 text-blue-200';
        } else if (direction === 'desc') {
          indicator.textContent = '↓';
          indicator.className = 'sort-indicator ml-1 text-blue-200';
        } else {
          indicator.textContent = '↕';
          indicator.className = 'sort-indicator ml-1';
        }
      } else {
        // Reset other indicators
        indicator.textContent = '↕';
        indicator.className = 'sort-indicator ml-1';
      }
    }
  });
}

// Function to create a simple filter icon (fallback)
function createSimpleFilterIcon(columnIndex) {
  const filterIcon = document.createElement('span');
  filterIcon.className = 'filter-icon ml-1 cursor-pointer text-gray-400 hover:text-blue-500';
  filterIcon.innerHTML = '🔍';
  filterIcon.dataset.columnIndex = columnIndex;
  filterIcon.title = 'Filter column';
  
  filterIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    if (window.filterUI) {
      window.filterUI.showFilterDropdown(columnIndex);
    } else {
      alert(`Filter for column ${columnIndex} would open here`);
    }
  });
  
  return filterIcon;
}

// Function to attach event listeners for cell editing
function attachEditListeners() {
  const editableCells = document.querySelectorAll('.editable-cell');
  
  editableCells.forEach(cell => {
    // Remove any existing listeners to prevent duplicates
    const clone = cell.cloneNode(true);
    cell.parentNode.replaceChild(clone, cell);
    
    // Double-click to edit
    clone.addEventListener('dblclick', function() {
      enableEditing(this);
    });
    
    // Enter key to edit
    clone.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        enableEditing(this);
      }
    });
    
    // Handle input blur
    const input = clone.querySelector('.cell-input');
    if (input) {
      input.addEventListener('blur', function() {
        saveCellValue(clone);
      });
      
      // Handle Enter key in input
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveCellValue(clone);
        }
      });
    }
  });
}

// Function to enable cell editing
function enableEditing(cell) {
  const contentDiv = cell.querySelector('.cell-content');
  const input = cell.querySelector('.cell-input');
  
  if (contentDiv && input) {
    contentDiv.classList.add('hidden');
    input.classList.remove('hidden');
    input.focus();
  }
}

// Function to save cell value
function saveCellValue(cell) {
  const contentDiv = cell.querySelector('.cell-content');
  const input = cell.querySelector('.cell-input');
  const rowIndex = parseInt(cell.dataset.row);
  const colIndex = parseInt(cell.dataset.col);
  
  if (!contentDiv || !input) return;
  
  // Update display
  contentDiv.textContent = input.value;
  
  // Update data model
  if (currentTableData && currentTableData.rows[rowIndex]) {
    currentTableData.rows[rowIndex][colIndex] = input.value;
  }
  
  // Switch back to display mode
  input.classList.add('hidden');
  contentDiv.classList.remove('hidden');
}

// Function to attach event listeners for save and export actions
function attachActionListeners() {
  // Save button
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    // Remove existing listener if any
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', saveChanges);
  }
  
  // Export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    // Remove existing listener if any
    const newExportBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
    newExportBtn.addEventListener('click', exportToExcel);
  }
}

// Function to save changes to server
function saveChanges() {
  if (!currentTableData) {
    showTableError('No data to save');
    return;
  }
  
  // Show saving state
  const saveBtn = document.getElementById('save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  
  // Get CSRF token
  const csrfTokenInput = document.getElementById('csrf-token');
  
  // Send data to server
  fetch('/excel/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfTokenInput && csrfTokenInput.value && {
        'X-CSRF-Token': csrfTokenInput.value
      })
    },
    body: JSON.stringify({ data: currentTableData })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showTableSuccess('Changes saved successfully!');
      // Update original data to reflect saved state
      originalTableData = JSON.parse(JSON.stringify(currentTableData));
    } else {
      showTableError(data.error || 'Error saving changes');
    }
  })
  .catch(error => {
    showTableError('Network error occurred while saving');
    console.error('Save error:', error);
  })
  .finally(() => {
    // Restore button state
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  });
}

// Function to export to Excel
function exportToExcel() {
  if (!currentTableData) {
    showTableError('No data to export');
    return;
  }
  
  // Show exporting state
  const exportBtn = document.getElementById('export-btn');
  const originalText = exportBtn.textContent;
  exportBtn.textContent = 'Exporting...';
  exportBtn.disabled = true;
  
  // Create a temporary link to trigger download
  const url = '/excel/export/temp';
  const link = document.createElement('a');
  link.href = url;
  link.download = 'exported-data.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Restore button state after a short delay
  setTimeout(() => {
    exportBtn.textContent = originalText;
    exportBtn.disabled = false;
  }, 1000);
}

// Function to show success message in table context
function showTableSuccess(message) {
  // Remove any existing messages
  hideTableMessages();
  
  // Create success message
  const successDiv = document.createElement('div');
  successDiv.className = 'mt-4 bg-green-50 text-green-800 p-4 rounded-md';
  successDiv.innerHTML = `
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium">${message}</p>
      </div>
    </div>
  `;
  
  // Insert before table container
  const tableContainer = document.getElementById('table-container');
  tableContainer.parentNode.insertBefore(successDiv, tableContainer);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 3000);
}

// Function to show error message in table context
function showTableError(message) {
  // Remove any existing messages
  hideTableMessages();
  
  // Create error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'mt-4 bg-red-50 text-red-800 p-4 rounded-md';
  errorDiv.innerHTML = `
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium">${message}</p>
      </div>
    </div>
  `;
  
  // Insert before table container
  const tableContainer = document.getElementById('table-container');
  tableContainer.parentNode.insertBefore(errorDiv, tableContainer);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Function to hide table messages
function hideTableMessages() {
  const messages = document.querySelectorAll('#table-container ~ div.bg-green-50, #table-container ~ div.bg-red-50');
  messages.forEach(msg => {
    if (msg.parentNode) {
      msg.parentNode.removeChild(msg);
    }
  });
}

// Function to update row count display
function updateRowCount(visibleRowsCount, totalRows) {
  const rowCountElement = document.getElementById('row-count');
  if (rowCountElement) {
    if (visibleRowsCount === totalRows) {
      rowCountElement.textContent = `Showing all ${totalRows} rows`;
    } else {
      rowCountElement.textContent = `Showing ${visibleRowsCount} of ${totalRows} rows`;
    }
  }
}

// Function to update global filter bar with active filters
function updateGlobalFilterBar() {
  const container = document.getElementById('active-filters-container');
  const clearAllBtn = document.getElementById('clear-all-filters');
  
  if (!container || !clearAllBtn) return;
  
  // Clear existing chips
  container.innerHTML = '';
  
  // Get active filters from filter engine
  if (window.filterEngine) {
    const activeFilters = filterEngine.getActiveFilters();
    const totalRows = currentTableData ? currentTableData.rows.length : 0;
    
    // Update row count
    updateRowCount(visibleRows.length, totalRows);
    
    // Get table body to re-render
    const tbody = document.getElementById('table-body');
    if (tbody) {
      // Clear and re-render table body with filtered data
      tbody.innerHTML = '';
      
      // Render filtered rows
      visibleRows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-lime-200 transition-colors duration-150';
        
        row.forEach((cellValue, colIndex) => {
          const td = document.createElement('td');
          td.className = 'px-3 py-1 text-xs text-gray-700 editable-cell border border-gray-300';
          // Use the actual row index from the original data for editing
          const actualRowIndex = currentTableData.rows.findIndex(r => r === row);
          td.dataset.row = actualRowIndex;
          td.dataset.col = colIndex;
          
          // Create cell content container
          const contentDiv = document.createElement('div');
          contentDiv.className = 'cell-content';
          contentDiv.textContent = cellValue !== null && cellValue !== undefined ? cellValue : '';
          
          // Create input for editing
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'cell-input hidden w-full px-1 py-0 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs';
          input.value = cellValue !== null && cellValue !== undefined ? cellValue : '';
          
          td.appendChild(contentDiv);
          td.appendChild(input);
          tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
      });
      
      // Reattach event listeners
      attachEditListeners();
    }
    
    // Create chips for active filters
    activeFilters.forEach(([columnIndex, filter]) => {
      const columnName = currentTableData && currentTableData.headers[columnIndex] || `Column ${columnIndex}`;
      
      const chip = document.createElement('span');
      chip.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
      chip.innerHTML = `
        ${columnName}: ${formatFilterDisplay(filter)}
        <button type="button" class="ml-1 inline-flex items-center rounded-full p-0.5 hover:bg-blue-200">
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      `;
      
      // Add click event to remove this filter
      const removeBtn = chip.querySelector('button');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.filterEngine) {
          filterEngine.removeFilter(columnIndex);
        }
      });
      
      container.appendChild(chip);
    });
    
    // Show/hide clear all button based on whether there are active filters or global search
    clearAllBtn.style.display = (activeFilters.length > 0 || globalSearchTerm) ? 'block' : 'none';
  }
}

// Enhanced updateVisibleRows function to incorporate global search
function updateVisibleRows() {
  if (!currentTableData || !window.filterEngine) return;
  
  // Start with all rows or filtered rows from column filters
  if (filterEngine.isFiltered) {
    // Create filtered rows array based on matching indices
    visibleRows = [];
    filterEngine.matchingIndices.forEach(index => {
      if (currentTableData.rows[index]) {
        visibleRows.push(currentTableData.rows[index]);
      }
    });
  } else {
    // Show all rows
    visibleRows = [...currentTableData.rows];
  }
  
  // Apply global search if there's a search term
  if (globalSearchTerm) {
    visibleRows = visibleRows.filter(row => {
      // Check if any cell in the row contains the search term
      return row.some((cellValue, colIndex) => {
        if (cellValue === null || cellValue === undefined) return false;
        return String(cellValue).toLowerCase().includes(globalSearchTerm.toLowerCase());
      });
    });
  }
}

// Function to format filter for display in chip
function formatFilterDisplay(filter) {
  switch (filter.type) {
    case 'text':
      return filter.value ? `"${filter.value}"` : '(empty)';
    case 'number':
      if (filter.operator === 'between' && filter.value !== null && filter.value2 !== null) {
        return `${filter.value} - ${filter.value2}`;
      } else if (filter.value !== null) {
        const opSymbols = {
          'equals': '=',
          'notEquals': '≠',
          'greater': '>',
          'greaterEqual': '≥',
          'less': '<',
          'lessEqual': '≤'
        };
        return `${opSymbols[filter.operator] || filter.operator} ${filter.value}`;
      }
      return '(invalid)';
    case 'date':
      if (filter.operator === 'between' && filter.value && filter.value2) {
        return `${filter.value} to ${filter.value2}`;
      } else if (filter.value) {
        const opSymbols = {
          'equals': '=',
          'before': '<',
          'after': '>'
        };
        return `${opSymbols[filter.operator] || filter.operator} ${filter.value}`;
      }
      return '(invalid)';
    case 'boolean':
      const parts = [];
      if (filter.showTrue) parts.push('True');
      if (filter.showFalse) parts.push('False');
      if (filter.showEmpty) parts.push('Empty');
      return parts.join(', ') || '(none)';
    default:
      return filter.value || '(empty)';
  }
}

// Function to attach event listeners for global filter actions
function attachGlobalFilterListeners() {
  const clearAllBtn = document.getElementById('clear-all-filters');
  if (clearAllBtn) {
    // Remove existing listener if any
    const newClearAllBtn = clearAllBtn.cloneNode(true);
    clearAllBtn.parentNode.replaceChild(newClearAllBtn, clearAllBtn);
    newClearAllBtn.addEventListener('click', () => {
      if (window.filterEngine) {
        filterEngine.clearAllFilters();
      }
      // Clear global search
      const globalSearchInput = document.getElementById('global-search');
      if (globalSearchInput) {
        globalSearchInput.value = '';
        globalSearchTerm = '';
        applyGlobalSearch();
      }
    });
  }
  
  // Add global search input listener
  const globalSearchInput = document.getElementById('global-search');
  if (globalSearchInput) {
    // Remove existing listener if any
    const newGlobalSearchInput = globalSearchInput.cloneNode(true);
    globalSearchInput.parentNode.replaceChild(newGlobalSearchInput, globalSearchInput);
    
    // Add input event listener with debounce
    let searchTimeout;
    newGlobalSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        globalSearchTerm = e.target.value.trim();
        applyGlobalSearch();
      }, 300); // 300ms debounce
    });
  }
}

// Function to apply global search across all columns
function applyGlobalSearch() {
  if (!currentTableData || !currentTableData.rows) return;
  
  // If search term is empty, show all rows (respecting other filters)
  if (!globalSearchTerm) {
    if (window.filterEngine && window.filterEngine.isFiltered) {
      // If there are column filters, apply those
      updateVisibleRows();
    } else {
      // Otherwise show all rows
      visibleRows = [...currentTableData.rows];
    }
  } else {
    // Filter rows based on global search term
    visibleRows = [];
    
    // If we have column filters applied, start with those filtered rows
    let rowsToSearch = currentTableData.rows;
    if (window.filterEngine && window.filterEngine.isFiltered) {
      rowsToSearch = [];
      window.filterEngine.matchingIndices.forEach(index => {
        if (currentTableData.rows[index]) {
          rowsToSearch.push(currentTableData.rows[index]);
        }
      });
    }
    
    // Apply global search across all columns
    rowsToSearch.forEach(row => {
      // Check if any cell in the row contains the search term
      const rowMatches = row.some((cellValue, colIndex) => {
        if (cellValue === null || cellValue === undefined) return false;
        return String(cellValue).toLowerCase().includes(globalSearchTerm.toLowerCase());
      });
      
      if (rowMatches) {
        visibleRows.push(row);
      }
    });
  }
  
  // Update row count display
  const totalRows = currentTableData.rows.length;
  updateRowCount(visibleRows.length, totalRows);
  
  // Re-render table body with filtered data
  const tbody = document.getElementById('table-body');
  if (tbody) {
    renderTableBody(tbody, visibleRows);
    attachEditListeners();
  }
}

// Make renderTable function globally available
window.renderTable = renderTable;