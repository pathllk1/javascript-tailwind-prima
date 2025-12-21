# Excel Automation System Documentation

## Overview
The Excel Automation System is a comprehensive feature that allows users to upload, process, edit, and export Excel files directly within the web browser. This system provides a rich, interactive experience similar to desktop spreadsheet applications while maintaining the convenience of a web-based interface.

## Key Features

### File Upload and Processing
- **Drag-and-Drop Support**: Intuitive file upload through drag-and-drop or traditional file selection
- **File Validation**: Accepts .xlsx and .xls files with a 5MB size limit
- **Multi-sheet Support**: Ability to work with Excel files containing multiple worksheets
- **In-Memory Processing**: Files are processed in memory without being saved to disk

### Interactive Table Editor
- **Cell Editing**: Double-click or press Enter to edit cell values directly in the browser
- **Data Type Detection**: Automatic detection of column data types (text, number, date, boolean)
- **Visual Feedback**: Yellow-green hover effect for improved usability

### Advanced Filtering
- **Column-Specific Filters**: Each column has its own filter interface based on detected data type
- **Type-Appropriate Filters**: 
  - Text columns: Contains search with case sensitivity option
  - Number columns: Range filters with operators (equals, greater than, between, etc.)
  - Date columns: Date range filters with preset options (today, last 7 days, etc.)
  - Boolean columns: Checkbox filters for True/False/Empty values
- **Global Search**: Search across all columns simultaneously
- **Active Filter Display**: Visual chips showing active filters with easy removal
- **Filter Persistence**: Filters are saved in localStorage for continuity

### Data Organization
- **Column Sorting**: Click column headers to sort data ascending or descending
- **Row Count Display**: Shows total rows and currently visible rows after filtering

### Data Management
- **Session Storage**: Edited data is stored in user sessions
- **Save Functionality**: Persist edited data to the server
- **Export Capability**: Download edited data as Excel files

## System Architecture

### Backend Components

#### Excel Controller (`server/controller/excel-automation/excelController.js`)
Handles all Excel-related HTTP requests:
- `showExcelPage`: Renders the Excel automation page
- `uploadExcel`: Processes uploaded Excel files
- `selectSheet`: Handles worksheet selection for multi-sheet files
- `processExcelInMemory`: Processes Excel files in memory
- `saveChanges`: Saves edited data to session
- `exportExcel`: Exports data to Excel format

#### Excel Processor (`server/utils/excel-automation/excelProcessor.js`)
Core utility for Excel file processing:
- `getSheetNames`: Extracts sheet names from Excel files
- `processExcelFile`: Processes specific sheets from file paths
- `processExcelBuffer`: Processes specific sheets from file buffers
- `worksheetToJson`: Converts Excel worksheets to JSON format
- `jsonToWorksheet`: Converts JSON data to Excel worksheets

#### Excel Routes (`server/routes/excel-automation/excelRoutes.js`)
Defines all Excel automation API endpoints with appropriate middleware:
- GET `/excel`: Excel automation page
- POST `/excel/upload`: Upload Excel file
- POST `/excel/process`: Process Excel file in memory
- POST `/excel/select-sheet`: Select worksheet
- POST `/excel/save`: Save edited data
- GET `/excel/export/:id`: Export data to Excel file

### Frontend Components

#### Excel Main Script (`public/js/excel-automation/excel.js`)
Manages the overall Excel automation UI:
- File upload handling with drag-and-drop support
- Progress indication during file upload
- Error handling and user feedback
- Sheet selection for multi-sheet files
- Integration with other Excel components

#### Table Editor (`public/js/excel-automation/tableEditor.js`)
Provides the interactive table editing interface:
- Dynamic table rendering from JSON data
- Cell editing functionality
- Sorting capabilities
- Integration with filtering system
- Save and export functionality

#### Data Type Detector (`public/js/excel-automation/dataTypeDetector.js`)
Analyzes column data to determine appropriate filter types:
- Type detection for individual values
- Column type determination based on predominant data type
- Statistical analysis for columns (min, max, unique values)
- Support for text, number, date, and boolean types

#### Filter Engine (`public/js/excel-automation/filterEngine.js`)
Core filtering logic and state management:
- Filter configuration validation
- Filter evaluation for different data types
- Matching index calculation
- Filter persistence using localStorage
- Integration with UI components

#### Filter UI (`public/js/excel-automation/filterUI.js`)
Visual components for the filtering interface:
- Dynamic filter dropdowns based on column types
- Type-appropriate filter controls
- Active filter display and management
- Keyboard navigation support

#### Excel Page Template (`views/pages/excel-automation/index.ejs`)
Main user interface for the Excel automation system:
- File upload area with drag-and-drop support
- Progress indicators and status messages
- Sheet selection dropdown
- Global filter bar with active filter display
- Interactive table container
- Toolbar with save and export buttons

## Data Flow

1. **File Upload**: User uploads Excel file via drag-and-drop or file selection
2. **Server Processing**: File is sent to server and processed in memory using ExcelJS
3. **Data Extraction**: Worksheet data is converted to JSON format with headers and rows
4. **Client Rendering**: Data is sent to client and rendered in interactive table
5. **User Interaction**: User can edit cells, apply filters, sort columns
6. **Data Persistence**: Edited data is saved to server session when requested
7. **Export**: User can export edited data as Excel file

## Security Considerations

- **File Validation**: Only Excel files (.xlsx, .xls) are accepted
- **Size Limiting**: 5MB file size limit to prevent resource exhaustion
- **CSRF Protection**: All state-changing operations are protected with CSRF tokens
- **Input Sanitization**: User inputs are sanitized to prevent XSS attacks
- **Session Storage**: Edited data is stored in user sessions, not accessible to other users

## Dependencies

- **ExcelJS**: For reading and writing Excel files
- **Multer**: For handling file uploads
- **Express.js**: Web framework for routing and middleware

## Future Enhancements

- **Formula Support**: Implementation of Excel-like formula calculations
- **Pivot Tables**: Data aggregation and summary views
- **Charting**: Visualization of data within the Excel interface
- **Conditional Formatting**: Cell styling based on data values
- **Undo/Redo**: History management for edits
- **Collaborative Editing**: Real-time collaboration on Excel files