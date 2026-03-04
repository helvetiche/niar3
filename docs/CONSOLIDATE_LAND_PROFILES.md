# Consolidate Land Profiles Feature

## Overview
This feature consolidates multiple land profile Excel files into a single template file by extracting data from specific cells and placing them in the correct rows based on the filename. The template structure and formatting are PRESERVED - only cell values are populated.

## Key Implementation Detail
Uses `xlsx-populate` library (same as IFR Scanner) to preserve the template's original structure, formatting, formulas, and styling. Only the specified cells are populated with data - nothing else is modified.

## How It Works

### Input Files
1. **Template File**: A single Excel file with pre-formatted columns (A-M) and rows 1-2 reserved for headers
2. **Land Profile Files**: Multiple Excel files with specific naming convention

### Filename Convention
Land profile files must follow this pattern:
```
[NUMBER] [LOT_NO] [OWNER_NAME].xlsx
Example: 01 2512-C-10B PUNZALAN, TIBURCIO.xlsx
```

The leading number determines which row in the template to populate (e.g., "01" → row 3, "02" → row 4, etc.)

### Data Extraction

#### From Sheet: "00 ACC DETAILS 01"
- `C3` → Lot No.
- `C7` → Land Owner's First Name
- `C9` → Land Owner's Last Name
- `C11` → Land Tiller's First Name
- `C13` → Land Tiller's Last Name

#### From Sheet: "01 SOA 01"
- `G13` → Area
- `D100` → Principal
- `F100` → Penalty
- `G101` → Old Account

### Template Mapping
Data is written to the template at row = (filename number + 2):

| Column | Data |
|--------|------|
| A | Fixed number (1-500, pre-filled in template) |
| B | Lot No. |
| C | Owner Last Name |
| D | Owner First Name |
| F | Tiller Last Name |
| G | Tiller First Name |
| I | Area |
| J | Principal |
| K | Penalty |
| L | Old Account |

## Files Created

### Backend
- `lib/consolidate-land-profiles.ts` - Core processing logic using xlsx-populate
- `app/api/v1/consolidate-land-profiles/route.ts` - API endpoint

### Frontend
- `components/ConsolidateLandProfilesTool.tsx` - UI component

### Integration
- Updated `contexts/WorkspaceContext.tsx` - Added new tab type
- Updated `components/WorkspaceHub.tsx` - Added tool to hub
- Updated `app/workspace/page.tsx` - Added routing

## Usage

1. Navigate to the Workspace Hub
2. Click on "CONSOLIDATE LAND PROFILES"
3. Upload the template Excel file
4. Upload one or more land profile Excel files
5. Click "Consolidate & Download"
6. The consolidated file will be downloaded automatically

## Error Handling

The system validates:
- Template file presence
- At least one land profile file
- Correct sheet names in land profile files
- Valid filename format (must start with a number)

Errors are displayed in the UI with specific messages about which files failed and why.

## API Response

The API returns:
- The consolidated Excel file as a download (with preserved template formatting)
- Headers with metadata:
  - `X-Processed-Count`: Number of successfully processed files
  - `X-Error-Count`: Number of files with errors
  - `X-Errors`: JSON array of error messages

## Technical Notes

- Uses `xlsx-populate` instead of `xlsx` to preserve template structure
- Numeric values are automatically detected and stored as numbers
- Empty or "-" values are stored as empty strings
- All template formatting, formulas, and styling are preserved
