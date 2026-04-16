import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes rich-text email body HTML before wrapping and sending via nodemailer.
 * Links and code blocks are stripped (not supported in the composer).
 */
export const sanitizeComposeEmailBodyHtml = (dirty: string): string =>
  sanitizeHtml(dirty, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "span",
      "div",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "hr",
    ],
    allowedAttributes: {
      span: ["style"],
      div: ["style"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      li: ["style"],
      ul: ["style"],
      ol: ["style"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/, /^rgba\(/],
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
        "font-size": [/^\d+(?:px|pt|em|rem|%)$/],
      },
    },
  });
