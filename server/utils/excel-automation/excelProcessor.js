// Utility functions for processing Excel files
const ExcelJS = require('exceljs');

/**
 * Get all sheet names from an Excel file
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Array<string>>} - Array of sheet names
 */
exports.getSheetNames = async (filePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook.worksheets.map(sheet => sheet.name);
  } catch (error) {
    throw new Error('Error reading Excel file: ' + error.message);
  }
};

/**
 * Process a specific sheet from an Excel file and convert it to JSON
 * @param {string} filePath - Path to the Excel file
 * @param {string|null} sheetName - Name of the sheet to process (null for first sheet)
 * @returns {Promise<Object>} - JSON representation of the Excel data with sheet info
 */
exports.processExcelFile = async (filePath, sheetName = null) => {
  try {
    // Load the workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    // Get the worksheet
    let worksheet;
    if (sheetName) {
      worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new Error(`Sheet '${sheetName}' not found in the Excel file`);
      }
    } else {
      // Get the first worksheet if no sheet name specified
      worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
      }
    }
    
    // Convert worksheet to JSON
    const jsonData = worksheetToJson(worksheet);
    
    // Get all sheet names
    const sheetNames = workbook.worksheets.map(sheet => sheet.name);
    
    return {
      data: jsonData,
      sheetNames: sheetNames,
      selectedSheet: worksheet.name
    };
  } catch (error) {
    throw new Error('Error processing Excel file: ' + error.message);
  }
};

/**
 * Process a specific sheet from an Excel buffer and convert it to JSON
 * @param {ArrayBuffer} buffer - Buffer containing Excel file data
 * @param {string} fileName - Original file name
 * @param {string|null} sheetName - Name of the sheet to process (null for first sheet)
 * @returns {Promise<Object>} - JSON representation of the Excel data with sheet info
 */
exports.processExcelBuffer = async (buffer, fileName, sheetName = null) => {
  try {
    // Load the workbook from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    // Get the worksheet
    let worksheet;
    if (sheetName) {
      worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new Error(`Sheet '${sheetName}' not found in the Excel file`);
      }
    } else {
      // Get the first worksheet if no sheet name specified
      worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
      }
    }
    
    // Convert worksheet to JSON
    const jsonData = worksheetToJson(worksheet);
    
    // Get all sheet names
    const sheetNames = workbook.worksheets.map(sheet => sheet.name);
    
    return {
      data: jsonData,
      sheetNames: sheetNames,
      selectedSheet: worksheet.name
    };
  } catch (error) {
    throw new Error('Error processing Excel buffer: ' + error.message);
  }
};

/**
 * Convert a worksheet to JSON format
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to convert
 * @returns {Object} - JSON representation with headers and rows
 */
function worksheetToJson(worksheet) {
  const result = {
    headers: [],
    rows: [],
    rowCount: 0,
    columnCount: 0
  };
  
  // Get the used range of the worksheet
  const usedRange = worksheet.getSheetValues();
  
  if (!usedRange || usedRange.length <= 1) {
    return result;
  }
  
  // Extract headers (first row)
  const headerRow = usedRange[1];
  if (headerRow) {
    result.headers = headerRow.filter(cell => cell !== undefined);
    result.columnCount = result.headers.length;
  }
  
  // Extract data rows
  for (let i = 2; i < usedRange.length; i++) {
    const row = usedRange[i];
    if (row) {
      const rowData = [];
      for (let j = 0; j < result.columnCount; j++) {
        const cellValue = row[j + 1]; // ExcelJS uses 1-based indexing
        
        // Preserve data types as much as possible
        let processedValue = cellValue;
        if (cellValue !== undefined) {
          // Handle different ExcelJS cell types
          if (cellValue instanceof Date) {
            // Format dates as ISO strings
            processedValue = cellValue.toISOString();
          } else if (typeof cellValue === 'object' && cellValue !== null) {
            // For other objects, convert to string
            processedValue = String(cellValue);
          }
        } else {
          processedValue = '';
        }
        
        rowData.push(processedValue);
      }
      result.rows.push(rowData);
    }
  }
  
  result.rowCount = result.rows.length;
  
  return result;
}

/**
 * Convert JSON data to a worksheet
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to populate
 * @param {Object} jsonData - The JSON data to convert
 */
exports.jsonToWorksheet = (worksheet, jsonData) => {
  try {
    // Add headers
    if (jsonData.headers && jsonData.headers.length > 0) {
      worksheet.addRow(jsonData.headers);
    }
    
    // Add data rows
    if (jsonData.rows && jsonData.rows.length > 0) {
      jsonData.rows.forEach(row => {
        worksheet.addRow(row);
      });
    }
    
    // Apply basic styling
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        // Add border to all cells
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        
        // Header row styling
        if (rowNumber === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFCCCCCC' }
          };
          cell.font = { bold: true };
        }
      });
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
  } catch (error) {
    throw new Error('Error converting JSON to worksheet: ' + error.message);
  }
};