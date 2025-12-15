// Client-side JavaScript for Excel automation functionality

// Create a reusable function for initialization
function initializeExcelHandlers() {
  // Get DOM elements
  const fileInput = document.getElementById('excel-file');
  const uploadSection = document.getElementById('upload-section');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressPercent = document.getElementById('progress-percent');
  const statusContainer = document.getElementById('status-container');
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const toolbar = document.getElementById('toolbar');
  const tableContainer = document.getElementById('table-container');
  const fileName = document.getElementById('file-name');
  const fileInfo = document.getElementById('file-info');
  const csrfTokenInput = document.getElementById('csrf-token');
  const resetSection = document.getElementById('reset-section');
  const resetButton = document.getElementById('reset-upload');
  const sheetSelection = document.getElementById('sheet-selection');
  const sheetSelect = document.getElementById('sheet-select');
  
  // Exit if not on Excel page
  if (!fileInput) return;
  
  // Remove old listeners to prevent duplicates
  fileInput.removeEventListener('change', handleFileSelect);
  if (resetButton) {
    resetButton.removeEventListener('click', resetUpload);
  }
  if (sheetSelect) {
    sheetSelect.removeEventListener('change', handleSheetSelection);
  }
  
  // Handle file selection
  fileInput.addEventListener('change', handleFileSelect);
  
  // Setup drag and drop
  setupDragAndDrop();
  
  // Setup reset button
  if (resetButton) {
    resetButton.addEventListener('click', resetUpload);
  }
  
  // Setup sheet selection
  if (sheetSelect) {
    sheetSelect.addEventListener('change', handleSheetSelection);
  }
  
  // Function to handle file selection
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      uploadFile(file);
    }
  }
  
  // Function to setup drag and drop functionality
  function setupDragAndDrop() {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadSection.removeEventListener(eventName, preventDefaults, false);
      uploadSection.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadSection.removeEventListener(eventName, highlight, false);
      uploadSection.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      uploadSection.removeEventListener(eventName, unhighlight, false);
      uploadSection.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadSection.removeEventListener('drop', handleDrop, false);
    uploadSection.addEventListener('drop', handleDrop, false);
  }
  
  // Prevent default drag behaviors
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // Highlight drop area
  function highlight() {
    uploadSection.classList.add('drag-over');
  }
  
  // Unhighlight drop area
  function unhighlight() {
    uploadSection.classList.remove('drag-over');
  }
  
  // Handle dropped files
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file) {
      uploadFile(file);
    }
  }
  
  // Function to upload file
  function uploadFile(file) {
    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showError('Please select a valid Excel file (.xlsx or .xls)', true);
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size exceeds 5MB limit', true);
      return;
    }
    
    // Show progress
    showProgress();
    
    // Create FormData
    const formData = new FormData();
    formData.append('excelFile', file);
    
    // Create XMLHttpRequest
    const xhr = new XMLHttpRequest();
    
    // Update progress
    xhr.upload.addEventListener('progress', function(e) {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        updateProgress(percentComplete);
      }
    });
    
    // Handle response
    xhr.addEventListener('load', function() {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            showSuccess('File processed successfully!');
            // Display the data in the table
            displayExcelData(response.data, response.fileName, response.sheetNames);
          } else {
            showError(response.error || 'Error processing file', true);
          }
        } catch (e) {
          showError('Invalid response from server', true);
        }
      } else {
        showError('Error processing file: ' + xhr.statusText, true);
      }
    });
    
    // Handle errors
    xhr.addEventListener('error', function() {
      showError('Network error occurred', true);
    });
    
    // Send request
    xhr.open('POST', '/excel/process');
    
    // Add CSRF token if available
    if (csrfTokenInput && csrfTokenInput.value) {
      xhr.setRequestHeader('X-CSRF-Token', csrfTokenInput.value);
    }
    
    xhr.send(formData);
  }
  
  // Function to show progress
  function showProgress() {
    uploadSection.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    statusContainer.classList.add('hidden');
    updateProgress(0);
  }
  
  // Function to update progress
  function updateProgress(percent) {
    const roundedPercent = Math.round(percent);
    progressBar.style.width = roundedPercent + '%';
    progressPercent.textContent = roundedPercent + '%';
  }
  
  // Function to show success message
  function showSuccess(message) {
    successMessage.querySelector('p').textContent = message;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    statusContainer.classList.remove('hidden');
  }
  
  // Function to show error message
  function showError(message, allowRetry = false) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');
    statusContainer.classList.remove('hidden');
    
    // Hide progress
    progressContainer.classList.add('hidden');
    
    // Show reset button if retry is allowed
    if (allowRetry) {
      resetSection.classList.remove('hidden');
      uploadSection.classList.remove('hidden');
    } else {
      // Hide reset button for fatal errors
      resetSection.classList.add('hidden');
    }
  }
  
  // Function to reset upload
  function resetUpload() {
    // Reset file input
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Hide reset section
    resetSection.classList.add('hidden');
    
    // Hide status container
    statusContainer.classList.add('hidden');
    
    // Keep upload section visible
    uploadSection.classList.remove('hidden');
    
    // Hide other sections
    sheetSelection.classList.add('hidden');
    if (toolbar) toolbar.classList.add('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
  }
  
  // Function to display Excel data in table
  function displayExcelData(data, originalFileName, sheetNames) {
    // Update file info
    if (fileName) fileName.textContent = originalFileName || 'Uploaded File';
    if (fileInfo) fileInfo.textContent = `Rows: ${data.rowCount}, Columns: ${data.columnCount}`;
    
    // Show toolbar and table container
    if (toolbar) toolbar.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    
    // Handle sheet selection if multiple sheets
    if (sheetNames && sheetNames.length > 1) {
      // Populate sheet select dropdown
      sheetSelect.innerHTML = '';
      sheetNames.forEach(sheetName => {
        const option = document.createElement('option');
        option.value = sheetName;
        option.textContent = sheetName;
        sheetSelect.appendChild(option);
      });
      
      // Show sheet selection
      sheetSelection.classList.remove('hidden');
    } else {
      // Hide sheet selection if only one sheet
      sheetSelection.classList.add('hidden');
    }
    
    // Render table using tableEditor
    if (typeof renderTable === 'function') {
      renderTable('excel-table', data);
    }
    
    // Hide progress
    progressContainer.classList.add('hidden');
    
    // Show reset button
    resetSection.classList.remove('hidden');
  }
  
  // Function to handle sheet selection
  function handleSheetSelection() {
    const selectedSheet = sheetSelect.value;
    
    // Show loading state
    if (tableContainer) tableContainer.classList.add('opacity-50');
    
    // Get CSRF token
    const csrfToken = csrfTokenInput && csrfTokenInput.value ? csrfTokenInput.value : null;
    
    // Send request to select sheet
    fetch('/excel/select-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
      },
      body: JSON.stringify({ sheetName: selectedSheet })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update table with new data
        if (typeof renderTable === 'function') {
          renderTable('excel-table', data.data);
          
          // Update file info
          if (fileInfo) fileInfo.textContent = `Rows: ${data.data.rowCount}, Columns: ${data.data.columnCount}`;
        }
      } else {
        showError(data.error || 'Error selecting sheet');
      }
    })
    .catch(error => {
      console.error('Sheet selection error:', error);
      showError('Network error occurred while selecting sheet');
    })
    .finally(() => {
      // Remove loading state
      if (tableContainer) tableContainer.classList.remove('opacity-50');
    });
  }
}

// Initialize on first load
document.addEventListener('DOMContentLoaded', initializeExcelHandlers);

// Re-initialize after silent navigation
window.addEventListener('page-changed', (e) => {
  const { url } = e.detail;
  if (url && url.includes('/excel')) {
    // Use setTimeout to ensure DOM is updated
    setTimeout(initializeExcelHandlers, 50);
  }
});