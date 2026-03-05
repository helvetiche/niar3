/**
 * File size limits and thresholds
 */
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  LARGE_FILE_THRESHOLD: 100 * 1024 * 1024, // 100MB
  RESUMABLE_THRESHOLD: 500 * 1024 * 1024, // 500MB
} as const;

/**
 * Template file size limits
 */
export const TEMPLATE_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
} as const;
