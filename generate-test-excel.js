const ExcelJS = require('exceljs');
const fs = require('fs');

async function generateTestExcel() {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  
  // Add a worksheet
  const worksheet = workbook.addWorksheet('Test Data');
  
  // Add headers
  worksheet.addRow(['Name', 'Age', 'City', 'Occupation']);
  
  // Add sample data
  worksheet.addRow(['John Doe', 30, 'New York', 'Engineer']);
  worksheet.addRow(['Jane Smith', 25, 'Los Angeles', 'Designer']);
  worksheet.addRow(['Bob Johnson', 35, 'Chicago', 'Manager']);
  worksheet.addRow(['Alice Brown', 28, 'Houston', 'Developer']);
  worksheet.addRow(['Charlie Wilson', 32, 'Phoenix', 'Analyst']);
  
  // Apply styling to header row
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });
  
  // Write to file
  await workbook.xlsx.writeFile('test-data/sample.xlsx');
  console.log('Test Excel file created successfully!');
}

// Run the function
generateTestExcel().catch(console.error);