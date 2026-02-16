import validator from 'validator'
import sanitizeHtml from 'sanitize-html'

/**
 * Input sanitization utilities. Use before storing or displaying user input.
 */

/**
 * Escape HTML entities to prevent XSS. Use for plain text.
 */
export function escapeHtml(str: string): string {
  return validator.escape(str)
}

/**
 * Trim and normalize whitespace.
 */
export function normalizeString(str: string): string {
  return validator.trim(str).replace(/\s+/g, ' ')
}

/**
 * Sanitize string: trim, escape HTML, enforce max length.
 */
export function sanitizeString(
  str: string,
  maxLength = 10_000
): string {
  const trimmed = validator.trim(str)
  if (trimmed.length > maxLength) {
    return validator.escape(trimmed.slice(0, maxLength))
  }
  return validator.escape(trimmed)
}

/**
 * Allow safe HTML tags. Use for rich text (comments, descriptions).
 * Strips scripts, event handlers, dangerous protocols.
 */
export function sanitizeHtmlInput(
  html: string,
  options?: sanitizeHtml.IOptions
): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    ],
    allowedAttributes: {
      a: ['href'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    ...options,
  })
}

/**
 * Strip all HTML. Use when you need plain text from potentially dirty input.
 */
export function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
}

/**
 * Sanitize for use in URL (path segments, query params).
 */
export function sanitizeForUrl(str: string): string {
  return validator.escape(validator.stripLow(str))
}
