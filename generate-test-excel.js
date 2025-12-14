const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read CSV file
const csvFilePath = path.join(__dirname, 'test-data', 'sample.csv');
const csvData = fs.readFileSync(csvFilePath, 'utf8');

// Parse CSV data
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1).map(line => {
  const values = line.split(',');
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index];
  });
  return row;
});

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Employees');

// Write to file
const xlsxFilePath = path.join(__dirname, 'test-data', 'sample.xlsx');
XLSX.writeFile(wb, xlsxFilePath);

console.log('Test Excel file created successfully at:', xlsxFilePath);