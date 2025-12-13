// Client-side JavaScript for Excel table editing functionality

// Global variable to store current table data
let currentTableData = null;
let originalTableData = null;

// Function to render table from JSON data
function renderTable(tableId, data) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  // Store data for later use
  currentTableData = JSON.parse(JSON.stringify(data));
  originalTableData = JSON.parse(JSON.stringify(data));
  
  // Clear existing content
  table.innerHTML = '';
  
  // Create table header
  const thead = document.createElement('thead');
  thead.className = 'bg-gray-50';
  
  const headerRow = document.createElement('tr');
  data.headers.forEach((header, index) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
    th.textContent = header;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  tbody.className = 'bg-white divide-y divide-gray-200';
  
  data.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    
    row.forEach((cell, cellIndex) => {
      const td = document.createElement('td');
      td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 editable-cell';
      td.dataset.row = rowIndex;
      td.dataset.col = cellIndex;
      
      // Create cell content container
      const contentDiv = document.createElement('div');
      contentDiv.className = 'cell-content';
      contentDiv.textContent = cell;
      
      // Create input for editing
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cell-input hidden w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500';
      input.value = cell;
      
      td.appendChild(contentDiv);
      td.appendChild(input);
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  
  // Attach event listeners for editing
  attachEditListeners();
  
  // Attach save and export button listeners
  attachActionListeners();
}

// Function to attach event listeners for cell editing
function attachEditListeners() {
  const editableCells = document.querySelectorAll('.editable-cell');
  
  editableCells.forEach(cell => {
    // Double-click to edit
    cell.addEventListener('dblclick', function() {
      enableEditing(this);
    });
    
    // Enter key to edit
    cell.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        enableEditing(this);
      }
    });
    
    // Handle input blur
    const input = cell.querySelector('.cell-input');
    input.addEventListener('blur', function() {
      saveCellValue(cell);
    });
    
    // Handle Enter key in input
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveCellValue(cell);
      }
    });
  });
}

// Function to enable cell editing
function enableEditing(cell) {
  const contentDiv = cell.querySelector('.cell-content');
  const input = cell.querySelector('.cell-input');
  
  contentDiv.classList.add('hidden');
  input.classList.remove('hidden');
  input.focus();
}

// Function to save cell value
function saveCellValue(cell) {
  const contentDiv = cell.querySelector('.cell-content');
  const input = cell.querySelector('.cell-input');
  const rowIndex = parseInt(cell.dataset.row);
  const colIndex = parseInt(cell.dataset.col);
  
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
    saveBtn.addEventListener('click', saveChanges);
  }
  
  // Export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToExcel);
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

// Make renderTable function globally available
window.renderTable = renderTable;