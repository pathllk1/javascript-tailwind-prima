/**
 * Excel Silent Navigation Support
 * Handles Excel page initialization and re-initialization after silent navigation
 */

class ExcelSilentNavigationHandler {
  constructor() {
    this.init();
  }

  init() {
    // Listen for page changes
    window.addEventListener('page-changed', (e) => {
      const { url } = e.detail;
      if (url.includes('/excel')) {
        this.initializeExcel();
      }
    });

    // Initialize on first load if on Excel page
    if (window.location.pathname.includes('/excel')) {
      this.initializeExcel();
    }
  }

  initializeExcel() {
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupExcelHandlers();
      });
    } else {
      this.setupExcelHandlers();
    }
  }

  setupExcelHandlers() {
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
    const resetSection = document.getElementById('reset-section');
    const resetButton = document.getElementById('reset-upload');
    const sheetSelection = document.getElementById('sheet-selection');
    const sheetSelect = document.getElementById('sheet-select');

    if (!fileInput) return; // Excel page elements not found

    // Remove old listeners to prevent duplicates
    fileInput.removeEventListener('change', this.handleFileSelect);
    if (resetButton) {
      resetButton.removeEventListener('click', this.resetUpload);
    }
    if (sheetSelect) {
      sheetSelect.removeEventListener('change', this.handleSheetSelection);
    }

    // Re-add listeners
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e, this));
    
    if (resetButton) {
      resetButton.addEventListener('click', () => this.resetUpload(this));
    }

    if (sheetSelect) {
      sheetSelect.addEventListener('change', () => this.handleSheetSelection(this));
    }

    // Setup drag and drop
    this.setupDragAndDrop(uploadSection, this);
  }

  handleFileSelect(event, context) {
    const file = event.target.files[0];
    if (file) {
      context.uploadFile(file);
    }
  }

  setupDragAndDrop(uploadSection, context) {
    if (!uploadSection) return;

    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const highlight = () => {
      uploadSection.classList.add('drag-over');
    };

    const unhighlight = () => {
      uploadSection.classList.remove('drag-over');
    };

    const handleDrop = (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      if (file) {
        context.uploadFile(file);
      }
    };

    // Remove old listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadSection.removeEventListener(eventName, preventDefaults);
    });

    // Add new listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadSection.addEventListener(eventName, preventDefaults);
      document.body.addEventListener(eventName, preventDefaults);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      uploadSection.addEventListener(eventName, highlight);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadSection.addEventListener(eventName, unhighlight);
    });

    uploadSection.addEventListener('drop', handleDrop);
  }

  uploadFile(file) {
    const fileInput = document.getElementById('excel-file');
    const uploadSection = document.getElementById('upload-section');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const statusContainer = document.getElementById('status-container');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const csrfTokenInput = document.getElementById('csrf-token');
    const resetSection = document.getElementById('reset-section');

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      this.showError('Please select a valid Excel file (.xlsx or .xls)', true);
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      this.showError('File size exceeds 5MB limit', true);
      return;
    }

    // Show progress
    this.showProgress();

    // Create FormData object
    const formData = new FormData();
    formData.append('excelFile', file);

    // Add CSRF token if available
    if (csrfTokenInput) {
      formData.append('_csrf', csrfTokenInput.value);
    }

    // Create XMLHttpRequest
    const xhr = new XMLHttpRequest();

    // Update progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        this.updateProgress(percentComplete);
      }
    });

    // Handle response
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            this.showSuccess('File uploaded successfully!');
            // Display the data in the table
            this.displayExcelData(response.data, response.fileName, response.sheetNames);
          } else {
            this.showError(response.error || 'Error uploading file', true);
          }
        } catch (e) {
          this.showError('Invalid response from server', true);
        }
      } else {
        this.showError('Error uploading file: ' + xhr.statusText, true);
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      this.showError('Network error occurred', true);
    });

    // Send request
    xhr.open('POST', '/excel/upload', true);
    xhr.send(formData);
  }

  showProgress() {
    const progressContainer = document.getElementById('progress-container');
    const statusContainer = document.getElementById('status-container');
    if (progressContainer) {
      progressContainer.classList.remove('hidden');
    }
    if (statusContainer) {
      statusContainer.classList.remove('hidden');
    }
  }

  updateProgress(percent) {
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    if (progressBar) {
      progressBar.style.width = percent + '%';
    }
    if (progressPercent) {
      progressPercent.textContent = Math.round(percent) + '%';
    }
  }

  showSuccess(message) {
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const progressContainer = document.getElementById('progress-container');
    const statusContainer = document.getElementById('status-container');
    const resetSection = document.getElementById('reset-section');

    if (successMessage) {
      successMessage.classList.remove('hidden');
    }
    if (errorMessage) {
      errorMessage.classList.add('hidden');
    }
    if (progressContainer) {
      progressContainer.classList.add('hidden');
    }
    if (statusContainer) {
      statusContainer.classList.remove('hidden');
    }
    if (resetSection) {
      resetSection.classList.remove('hidden');
    }
  }

  showError(message, hideProgress = true) {
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const successMessage = document.getElementById('success-message');
    const progressContainer = document.getElementById('progress-container');
    const statusContainer = document.getElementById('status-container');

    if (errorText) {
      errorText.textContent = message;
    }
    if (errorMessage) {
      errorMessage.classList.remove('hidden');
    }
    if (successMessage) {
      successMessage.classList.add('hidden');
    }
    if (hideProgress && progressContainer) {
      progressContainer.classList.add('hidden');
    }
    if (statusContainer) {
      statusContainer.classList.remove('hidden');
    }
  }

  displayExcelData(data, fileName, sheetNames) {
    // Store data for display
    window.excelData = data;
    window.excelFileName = fileName;
    window.excelSheetNames = sheetNames || [];

    // Update sheet selection if multiple sheets
    if (sheetNames && sheetNames.length > 0) {
      const sheetSelect = document.getElementById('sheet-select');
      if (sheetSelect) {
        sheetSelect.innerHTML = '';
        sheetNames.forEach((name, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = name;
          sheetSelect.appendChild(option);
        });
      }

      const sheetSelection = document.getElementById('sheet-selection');
      if (sheetSelection) {
        sheetSelection.classList.remove('hidden');
      }
    }

    // Dispatch event for Excel page to handle display
    window.dispatchEvent(new CustomEvent('excel-data-loaded', { 
      detail: { data, fileName, sheetNames } 
    }));
  }

  resetUpload(context) {
    const fileInput = document.getElementById('excel-file');
    const statusContainer = document.getElementById('status-container');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const resetSection = document.getElementById('reset-section');
    const sheetSelection = document.getElementById('sheet-selection');
    const tableContainer = document.getElementById('table-container');

    if (fileInput) {
      fileInput.value = '';
    }
    if (statusContainer) {
      statusContainer.classList.add('hidden');
    }
    if (successMessage) {
      successMessage.classList.add('hidden');
    }
    if (errorMessage) {
      errorMessage.classList.add('hidden');
    }
    if (progressContainer) {
      progressContainer.classList.add('hidden');
    }
    if (progressBar) {
      progressBar.style.width = '0%';
    }
    if (resetSection) {
      resetSection.classList.add('hidden');
    }
    if (sheetSelection) {
      sheetSelection.classList.add('hidden');
    }
    if (tableContainer) {
      tableContainer.classList.add('hidden');
    }
  }

  handleSheetSelection(context) {
    // Dispatch event for Excel page to handle sheet selection
    window.dispatchEvent(new CustomEvent('sheet-selected'));
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ExcelSilentNavigationHandler();
  });
} else {
  new ExcelSilentNavigationHandler();
}
