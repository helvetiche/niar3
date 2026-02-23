# SWRFT Generator Implementation

## Overview
The SWRFT Generator creates bi-monthly accomplishment reports for an entire year. It generates 24 files (2 per month) with automatic weekend detection and merges them into a single Excel workbook.

## Features
- Generates 24 reports per year (1-15 and 16-31 for each month)
- Auto-detects weekends (Saturday/Sunday) and replaces task text with day name
- Populates cells A13-A41 with sequential numbers (1-15)
- Fills B13-B41 with standard tasks or weekend labels
- Merges all 24 files into one downloadable workbook
- Filename format: `{fullName} - SWRFT - {year}.xlsx`

## Architecture

### Backend
- `lib/swrftGenerator.ts` - Core generation logic
- `app/api/v1/generate-swrft/route.ts` - API endpoint with auth guards
- Uses Firebase Admin SDK for template storage access
- Follows security pattern: Request → Guards → Validation → Business Logic → Response

### Frontend
- `components/SwrftTool.tsx` - User interface component
- `hooks/useSwrft.ts` - State management hook
- `lib/api/swrft.ts` - Client API wrapper
- Uses SWR for template fetching (caching enabled)

### Integration
- Added "swrft" scope to template system
- Integrated into workspace hub and navigation
- Reuses existing merge functionality

## Template Requirements
The Excel template must have:
- Cell A7: Period covered text
- Cell B9: Full name
- Cell B10: Report type
- Cells A13-A41: Number column (2-row spacing)
- Cells B13-B41: Task column (2-row spacing)

## Usage Flow
1. User uploads SWRFT template via Template Manager
2. User navigates to SWRFT Generator
3. Enters full name, selects report type and year
4. Selects template from dropdown
5. Clicks "Generate & Download"
6. System generates 24 files and merges them
7. Downloads single Excel file with all sheets

## Security
- All API calls require Firebase authentication
- Templates stored in Firebase Storage (server-side only)
- Input sanitization for filenames
- Audit trail logging for all operations
- No client-side Firebase Storage access

## Performance
- Template caching via SWR (30s deduping)
- Efficient buffer operations
- Single merged file download (no multiple downloads)
- Optimistic UI updates during generation
