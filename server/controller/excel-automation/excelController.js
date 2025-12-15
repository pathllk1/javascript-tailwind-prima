// Controller for Excel automation feature
const path = require('path');
const ExcelJS = require('exceljs');
const excelProcessor = require('../../utils/excel-automation/excelProcessor');

// Render the Excel automation page
exports.showExcelPage = (req, res) => {
  res.render('pages/excel-automation/index', {
    title: 'Excel Automation',
    user: req.user,
    _csrf: res.locals.csrfToken,
    tokenExpiration: req.tokenExpiration
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

    // Process the Excel file from buffer (default to first sheet)
    const result = await excelProcessor.processExcelBuffer(req.file.buffer, req.file.originalname);
    
    // Store data in session for later use
    req.session.excelData = result.data;
    req.session.originalFileName = req.file.originalname;
    req.session.sheetNames = result.sheetNames;
    req.session.selectedSheet = result.selectedSheet;
    req.session.fileBuffer = req.file.buffer; // Store buffer for sheet switching
    
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
    
    // Check if we have file data in memory
    if (!req.session.fileBuffer) {
      return res.status(400).json({ 
        success: false, 
        error: 'No Excel file data available' 
      });
    }
    
    // Process the specific sheet from buffer
    const result = await excelProcessor.processExcelBuffer(req.session.fileBuffer, req.session.originalFileName, sheetName);
    
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

// Process Excel file in memory
exports.processExcelInMemory = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    // Get filename from uploaded file or header
    const fileName = req.file.originalname || req.headers['x-file-name'] || 'uploaded_file.xlsx';
    
    // Process the Excel data in memory
    const result = await excelProcessor.processExcelBuffer(req.file.buffer, fileName);
    
    // Store data in session for later use
    req.session.excelData = result.data;
    req.session.originalFileName = fileName;
    req.session.sheetNames = result.sheetNames;
    req.session.selectedSheet = result.selectedSheet;
    req.session.fileBuffer = req.file.buffer; // Store buffer for sheet switching
    
    res.json({ 
      success: true, 
      data: result.data,
      fileName: fileName,
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