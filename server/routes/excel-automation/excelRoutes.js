// Routes for Excel automation feature
const express = require('express');
const router = express.Router();
const excelController = require('../../controller/excel-automation/excelController');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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
router.get('/', excelController.showExcelPage);

// Upload Excel file
router.post('/upload', upload.single('excelFile'), excelController.uploadExcel);

// Select sheet
router.post('/select-sheet', excelController.selectSheet);

// Save edited data
router.post('/save', excelController.saveChanges);

// Export to Excel
router.get('/export/:id', excelController.exportExcel);

module.exports = router;