// Controller for Excel automation feature
const path = require('path');
const ExcelJS = require('exceljs');
const excelProcessor = require('../../utils/excel-automation/excelProcessor');

// Render the Excel automation page
exports.showExcelPage = (req, res) => {
  res.render('pages/excel-automation/index', {
    title: 'Excel Automation',
    user: req.user,
    _csrf: req.csrfToken ? req.csrfToken() : null
  });
};

// Handle Excel file upload
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    // Process the Excel file (default to first sheet)
    const result = await excelProcessor.processExcelFile(req.file.path);
    
    // Store data in session for later use
    req.session.excelData = result.data;
    req.session.originalFileName = req.file.originalname;
    req.session.sheetNames = result.sheetNames;
    req.session.selectedSheet = result.selectedSheet;
    req.session.filePath = req.file.path; // Store file path for sheet switching
    
    res.json({ 
      success: true, 
      data: result.data,
      fileName: req.file.originalname,
      sheetNames: result.sheetNames,
      selectedSheet: result.selectedSheet
    });
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error processing Excel file: ' + error.message 
    });
  }
};

// Handle sheet selection
exports.selectSheet = async (req, res) => {
  try {
    const { sheetName } = req.body;
    
    if (!sheetName) {
      return res.status(400).json({ 
        success: false, 
        error: 'No sheet name provided' 
      });
    }
    
    if (!req.session.filePath) {
      return res.status(400).json({ 
        success: false, 
        error: 'No Excel file uploaded' 
      });
    }
    
    // Process the specific sheet
    const result = await excelProcessor.processExcelFile(req.session.filePath, sheetName);
    
    // Update session data
    req.session.excelData = result.data;
    req.session.selectedSheet = result.selectedSheet;
    
    res.json({ 
      success: true, 
      data: result.data,
      selectedSheet: result.selectedSheet
    });
  } catch (error) {
    console.error('Error selecting sheet:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error selecting sheet: ' + error.message 
    });
  }
};

// Save edited data back to session
exports.saveChanges = (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        success: false, 
        error: 'No data provided' 
      });
    }
    
    // Update session data
    req.session.excelData = data;
    
    res.json({ 
      success: true, 
      message: 'Data saved successfully' 
    });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error saving data: ' + error.message 
    });
  }
};

// Export data to Excel file
exports.exportExcel = async (req, res) => {
  try {
    const data = req.session.excelData;
    
    if (!data) {
      return res.status(400).json({ 
        success: false, 
        error: 'No data available for export' 
      });
    }
    
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Add data to worksheet
    excelProcessor.jsonToWorksheet(worksheet, data);
    
    // Generate file name
    const fileName = req.session.originalFileName ? 
      req.session.originalFileName.replace(/\.[^/.]+$/, '') + '_edited.xlsx' : 
      'exported_data.xlsx';
    
    // Set headers for download
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    
    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting Excel file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error exporting Excel file: ' + error.message 
    });
  }
};