import sanitizeHtml from "sanitize-html";

/**
 * Plain-text alternative for multipart email (nodemailer `text` part).
 */
export const composeEmailHtmlToPlainText = (html: string): string => {
  const withBreaks = html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h[123]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n---\n");

  const stripped = sanitizeHtml(withBreaks, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return stripped.replace(/\n{3,}/g, "\n\n").trim();
};
