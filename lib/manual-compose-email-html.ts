import {
  SCHEDULE_REMINDER_PRODUCT_NAME,
  resolveEmailLogoBaseUrl,
} from "@/lib/schedule-reminder-email-html";

const fontStack = "'Poppins',Arial,Helvetica,sans-serif";

/** Workspace-aligned palette — same family as schedule / transactional mail. */
const C = {
  page: "#064e3b",
  panel: "#052e22",
  borderSoft: "rgba(16, 185, 129, 0.35)",
  borderStrong: "#047857",
  white: "#ffffff",
  muted: "rgba(255, 255, 255, 0.78)",
  subtle: "rgba(255, 255, 255, 0.55)",
  pillBorder: "rgba(255, 255, 255, 0.4)",
  pillBg: "rgba(255, 255, 255, 0.1)",
  bodySurface: "#ffffff",
  metaBg: "#f8fafc",
  metaBorder: "#e2e8f0",
  bodyText: "#0f172a",
} as const;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Derives a readable display name from an email local-part (e.g. maria.santos → Maria Santos).
 */
export const formatSenderDisplayFromEmail = (email: string): string => {
  const trimmed = email.trim();
  if (!trimmed) return "NIA Productivity Tools user";
  const [local] = trimmed.split("@");
  if (!local) return trimmed;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return trimmed;
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
};

export type ManualComposeEmailMeta = {
  senderDisplayName: string;
  senderEmail: string;
  sentAtLabel: string;
  /** Shown in the HTML body so readers see what was sent (MIME parts are still attached). */
  attachmentFilenames?: readonly string[];
};

export type ManualComposeEmailHtmlOptions = {
  assetBaseUrl?: string;
};

/**
 * Full HTML document for workspace-composed mail: logo, branding, sender block, message body.
 */
export const buildManualComposeEmailDocumentHtml = (
  sanitizedInnerBodyHtml: string,
  meta: ManualComposeEmailMeta,
  options?: ManualComposeEmailHtmlOptions
): string => {
  const year = new Date().getFullYear();
  const logoBase = resolveEmailLogoBaseUrl(options?.assetBaseUrl);
  const logoUrl = encodeURI(`${logoBase}/logo.png`);

  const safeProduct = escapeHtml(SCHEDULE_REMINDER_PRODUCT_NAME);
  const safeName = escapeHtml(meta.senderDisplayName);
  const safeEmail = escapeHtml(meta.senderEmail);
  const safeSent = escapeHtml(meta.sentAtLabel);
  const docTitle = escapeHtml(`Message · ${SCHEDULE_REMINDER_PRODUCT_NAME}`);

  const mailtoHref = encodeURIComponent(meta.senderEmail.trim());

  const attachmentBlock =
    meta.attachmentFilenames && meta.attachmentFilenames.length > 0
      ? `<div style="margin-top:18px;padding-top:16px;border-top:1px solid ${C.metaBorder};">
              <p style="margin:0 0 8px;font-family:${fontStack};font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Attached files</p>
              <ul style="margin:0;padding-left:18px;font-family:${fontStack};font-size:13px;line-height:1.5;font-weight:300;color:${C.bodyText};">
                ${meta.attachmentFilenames
                  .map((name) => `<li>${escapeHtml(name)}</li>`)
                  .join("")}
              </ul>
            </div>`
      : "";

  const senderBlock =
    meta.senderEmail.trim().length > 0
      ? `<p style="margin:0 0 4px;font-family:${fontStack};font-size:12px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">From</p>
              <p style="margin:0;font-family:${fontStack};font-size:16px;font-weight:500;color:${C.bodyText};">${safeName}</p>
              <p style="margin:6px 0 0;font-family:${fontStack};font-size:14px;font-weight:300;color:#334155;"><a href="mailto:${mailtoHref}" style="color:#047857;text-decoration:none;">${safeEmail}</a></p>
              <p style="margin:10px 0 0;font-family:${fontStack};font-size:12px;font-weight:300;color:#64748b;">Sent ${safeSent}</p>`
      : `<p style="margin:0 0 4px;font-family:${fontStack};font-size:12px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">From</p>
              <p style="margin:0;font-family:${fontStack};font-size:16px;font-weight:500;color:${C.bodyText};">${safeName}</p>
              <p style="margin:10px 0 0;font-family:${fontStack};font-size:12px;font-weight:300;color:#64748b;">Sent ${safeSent}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${docTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />
  <style type="text/css">
    .compose-email-body, .compose-email-body p, .compose-email-body li { font-weight: 300; }
    .compose-email-body strong, .compose-email-body b { font-weight: 500; }
    .compose-email-body h1, .compose-email-body h2, .compose-email-body h3 { font-weight: 500; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.page};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:${C.page};">
    <tr>
      <td align="center" style="padding:24px 14px;font-family:${fontStack};">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:600px;width:100%;background-color:${C.panel};border:1px solid ${C.borderSoft};border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:18px 22px 16px;border-bottom:1px solid ${C.borderSoft};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="top" style="width:84px;padding:2px 14px 0 0;">
                    <img src="${logoUrl}" alt="National Irrigation Administration" width="72" style="display:block;width:72px;max-width:72px;height:auto;border:0;outline:none;text-decoration:none;object-fit:contain;" />
                  </td>
                  <td valign="top" style="font-family:${fontStack};padding-top:2px;">
                    <p style="margin:0;font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">${safeProduct}</p>
                    <h1 style="margin:4px 0 0;font-size:17px;line-height:1.3;font-weight:500;color:${C.white};font-family:${fontStack};letter-spacing:-0.01em;">National Irrigation Administration</h1>
                    <p style="margin:4px 0 0;font-size:12px;line-height:1.45;color:${C.subtle};font-weight:300;">Region 3 · Operation &amp; Maintenance (O&amp;M)</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 0;border-collapse:separate;border-spacing:0;">
                      <tr>
                        <td align="left" style="padding:3px 10px;border:1px solid ${C.pillBorder};background-color:${C.pillBg};border-radius:999px;font-family:${fontStack};">
                          <span style="font-size:10px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;color:${C.muted};">Workspace message</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 0;font-family:${fontStack};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:${C.metaBg};border:1px solid ${C.metaBorder};border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    ${senderBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;font-family:${fontStack};font-size:14px;line-height:1.65;font-weight:300;color:${C.bodyText};background-color:${C.bodySurface};">
              <div class="compose-email-body">${sanitizedInnerBodyHtml}</div>
              ${attachmentBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 22px;background-color:rgba(0,0,0,0.2);border-top:1px solid ${C.borderSoft};">
              <p style="margin:0;font-size:12px;line-height:1.55;color:${C.subtle};text-align:center;font-family:${fontStack};font-weight:300;">You received this message through <strong style="font-weight:500;color:${C.muted};">${safeProduct}</strong> · NIA Region 3 O&amp;M</p>
              <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:${C.subtle};text-align:center;font-family:${fontStack};font-weight:300;">&copy; ${String(year)} National Irrigation Administration. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
