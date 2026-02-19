export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  NO_FILES_UPLOADED: "No files uploaded.",
  NO_SOURCE_FILES: "No source Excel files uploaded",
  MISSING_TEMPLATE:
    "Template is required. Upload a template or select a saved template.",
  MISSING_CONSOLIDATION_TEMPLATE:
    "Consolidation template is required when create consolidation is enabled.",
  FAILED_LOAD_NOTES: "Failed to load notes",
  FAILED_SAVE_NOTES: "Failed to save notes",
  FAILED_LOAD_TEMPLATES: "Failed to load consolidation templates.",
  FAILED_GENERATE_BILLING_UNITS: "Failed to generate billing unit files.",
  FAILED_UPLOAD_TEMPLATE: "Failed to upload template",
  FAILED_GENERATE_PROFILES: "Failed to generate profiles.",
  TEMPLATE_NOT_FOUND: "Selected template not found",
  CONSOLIDATION_TEMPLATE_NOT_FOUND: "Selected consolidation template not found.",
  NO_LOT_RECORDS:
    "No lot records found in uploaded files. Check spreadsheet format and upload valid source files.",
} as const;
