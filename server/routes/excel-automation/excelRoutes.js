// Routes for Excel automation feature
const express = require('express');
const router = express.Router();
const excelController = require('../../controller/excel-automation/excelController');
const multer = require('multer');
const path = require('path');
const { csrfProtection, csrfTokenMiddleware } = require('../../middleware/csrfMiddleware');

// Configure multer for file uploads in memory
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Excel automation page
router.get('/', csrfTokenMiddleware, excelController.showExcelPage);

// Upload Excel file
router.post('/upload', csrfProtection, upload.single('excelFile'), excelController.uploadExcel);

// Process Excel file in memory
router.post('/process', csrfProtection, upload.single('excelFile'), excelController.processExcelInMemory);

// Select sheet
router.post('/select-sheet', csrfProtection, excelController.selectSheet);

// Save edited data
router.post('/save', csrfProtection, excelController.saveChanges);

// Export to Excel
router.get('/export/:id', csrfTokenMiddleware, excelController.exportExcel);

module.exports = router;