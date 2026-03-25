/**
 * Application configuration constants
 * Centralized place for all magic numbers and configuration values
 */

// Session & Auth
export const SESSION_COOKIE_NAME = "__session";
export const SESSION_COOKIE_MAX_AGE_DAYS = 5;
export const SESSION_COOKIE_MAX_AGE_MS =
  SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

// CSRF
export const CSRF_COOKIE_NAME = "__csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_TOKEN_LENGTH = 32;
export const CSRF_TOKEN_MAX_AGE_HOURS = 24;

// Cache
export const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const ACCOUNT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// File Upload
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
export const TEMPLATE_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
export const TEMPLATE_MAX_FILE_COUNT = 1;
export const ALLOWED_TEMPLATE_EXTENSIONS = [".xlsx", ".xls"];
export const ALLOWED_TEMPLATE_MIME_SUBSTRINGS = ["sheet", "excel"];

// Rate Limiting
export const RATE_LIMIT_API_REQUESTS = 10;
export const RATE_LIMIT_API_WINDOW_SECONDS = 10;
export const RATE_LIMIT_AUTH_REQUESTS = 5;
export const RATE_LIMIT_AUTH_WINDOW_SECONDS = 60;
export const RATE_LIMIT_PUBLIC_REQUESTS = 30;
export const RATE_LIMIT_PUBLIC_WINDOW_SECONDS = 60;
export const RATE_LIMIT_HEAVY_REQUESTS = 5;
export const RATE_LIMIT_HEAVY_WINDOW_SECONDS = 60;

// Audit Trail
export const AUDIT_TRAIL_MAX_STRING_LENGTH = 500;
export const AUDIT_TRAIL_MAX_ARRAY_LENGTH = 50;
export const AUDIT_TRAIL_MAX_OBJECT_KEYS = 50;
export const AUDIT_TRAIL_MAX_DEPTH = 3;
export const AUDIT_TRAIL_MAX_ERROR_MESSAGE_LENGTH = 200;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// UI
export const LOADING_SCREEN_DURATION_MS = 2000;
export const TOAST_DURATION_MS = 3000;
export const ANIMATION_DURATION_MS = 300;
