import type { Schedule } from "@/types/schedule";

/** Matches workspace product name (`WorkspaceSidebar`). */
export const SCHEDULE_REMINDER_PRODUCT_NAME = "NIA Productivity Tools";

/**
 * Subject line for `sendReminderEmail` and the Schedules modal preview.
 */
export const buildScheduleReminderEmailSubject = (scheduleTitle: string): string =>
  `Reminder: ${scheduleTitle} · ${SCHEDULE_REMINDER_PRODUCT_NAME}`;

/** Production origin for email logo `<img src>`; override only via env or preview. */
const CANONICAL_EMAIL_LOGO_ORIGIN = "https://niatools.vercel.app";

export type ScheduleReminderEmailOptions = {
  /**
   * Optional origin for the logo only (no trailing slash), e.g. `window.location.origin`
   * in the schedule email preview iframe. Omit for sent mail so the logo uses
   * `NEXT_PUBLIC_EMAIL_LOGO_BASE_URL` or `https://niatools.vercel.app`.
   */
  assetBaseUrl?: string;
};

/**
 * Base URL for the logo in HTML emails (no trailing slash).
 * - With `previewOverride` (e.g. browser preview): loads logo from that origin.
 * - Without: `NEXT_PUBLIC_EMAIL_LOGO_BASE_URL`, else canonical production URL.
 */
export const resolveEmailLogoBaseUrl = (previewOverride?: string): string => {
  if (previewOverride?.trim()) return previewOverride.replace(/\/$/, "");
  const env =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_EMAIL_LOGO_BASE_URL
      ? String(process.env.NEXT_PUBLIC_EMAIL_LOGO_BASE_URL).replace(/\/$/, "").trim()
      : "";
  if (env) return env;
  return CANONICAL_EMAIL_LOGO_ORIGIN;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Converts schedule `deadline.time` (24h `HH:mm` from forms) to 12-hour, e.g. `5:00 PM`. */
const formatScheduleTimeForEmail = (time24: string | undefined): string => {
  const trimmed = time24?.trim() ?? "";
  if (!trimmed) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return trimmed;
  const h24 = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (h24 < 0 || h24 > 23 || minutes < 0 || minutes > 59) return trimmed;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = minutes.toString().padStart(2, "0");
  return `${h12}:${mm} ${period}`;
};

const recurrenceAtTime = (time: string | undefined): string => {
  const t = formatScheduleTimeForEmail(time);
  return t ? ` at ${t}` : "";
};

/** Human-readable recurrence line — matches reminder emails. */
export const formatDeadlineTypeForReminderEmail = (schedule: Schedule): string => {
  const { deadline } = schedule;

  switch (deadline.type) {
    case "daily":
      return `Daily${recurrenceAtTime(deadline.time)}`;
    case "weekly": {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = days[deadline.dayOfWeek ?? 0];
      return `Every ${dayName}${recurrenceAtTime(deadline.time)}`;
    }
    case "monthly":
      return `Monthly on day ${deadline.dayOfMonth ?? 1}${recurrenceAtTime(deadline.time)}`;
    case "monthly-specific": {
      const months = [
        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const monthName = months[deadline.month ?? 1];
      return `Annually on ${monthName} ${deadline.day ?? 1}${recurrenceAtTime(deadline.time)}`;
    }
    case "interval":
      return `Every ${deadline.days ?? 1} day(s)${recurrenceAtTime(deadline.time)}`;
    case "hourly": {
      const hours = deadline.hours ?? 1;
      return hours === 1 ? "Every hour" : `Every ${hours} hours`;
    }
    case "per-minute": {
      const minutes = deadline.minutes ?? 1;
      return minutes === 1 ? "Every minute" : `Every ${minutes} minutes`;
    }
    case "custom":
      return "Custom schedule";
    default:
      return "Scheduled";
  }
};

/*
 * Workspace-aligned palette (Tailwind emerald + white overlays), matching
 * `bg-emerald-900`, `border-emerald-700/60`, and hub / schedules panels.
 */
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
  dashedBoxBorder: "rgba(255, 255, 255, 0.55)",
  dashedBoxBg: "rgba(255, 255, 255, 0.08)",
  detailBg: "rgba(6, 78, 59, 0.55)",
} as const;

const fontStack = "'Poppins',Arial,Helvetica,sans-serif";

/** Deadline line in emails: always 12-hour clock (en-US). */
const formatDeadlineForEmail = (deadlineDate: Date): string =>
  deadlineDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

type NiaTransactionalEmailShellParams = {
  documentTitle: string;
  preheaderPlain: string;
  pillLabel: string;
  mainColumnHtml: string;
  options?: ScheduleReminderEmailOptions;
};

/** Shared HTML shell (logo, NIA header, footer) for all O&amp;M transactional mail. */
const buildNiaTransactionalEmailShellHtml = ({
  documentTitle,
  preheaderPlain,
  pillLabel,
  mainColumnHtml,
  options,
}: NiaTransactionalEmailShellParams): string => {
  const logoBase = resolveEmailLogoBaseUrl(options?.assetBaseUrl);
  const logoUrl = encodeURI(`${logoBase}/logo.png`);
  const currentYear = new Date().getFullYear();
  const safeProduct = escapeHtml(SCHEDULE_REMINDER_PRODUCT_NAME);
  const preheaderSafe = escapeHtml(preheaderPlain);
  const safePill = escapeHtml(pillLabel);
  const safeDocTitle = escapeHtml(documentTitle);

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>${safeDocTitle}</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background-color:${C.page};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent;">${preheaderSafe}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:${C.page};">
      <tr>
        <td align="center" style="padding:28px 16px;font-family:${fontStack};">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:600px;width:100%;background-color:${C.panel};border:1px solid ${C.borderSoft};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 20px;border-bottom:1px solid ${C.borderSoft};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td valign="middle" style="width:156px;padding-right:16px;">
                      <img src="${logoUrl}" alt="NIA Logo" width="140" style="display:block;width:140px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;object-fit:contain;" />
                    </td>
                    <td valign="middle" style="font-family:${fontStack};">
                      <p style="margin:0;font-size:13px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};">${safeProduct}</p>
                      <h1 style="margin:6px 0 0;font-size:20px;line-height:1.25;font-weight:500;color:${C.white};font-family:${fontStack};">National Irrigation Administration</h1>
                      <p style="margin:6px 0 0;font-size:13px;line-height:1.45;color:${C.subtle};font-weight:300;">Region 3 · Operation &amp; Maintenance (O&amp;M)</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;border-collapse:separate;border-spacing:0;">
                  <tr>
                    <td align="left" style="padding:6px 14px;border:1px solid ${C.pillBorder};background-color:${C.pillBg};border-radius:999px;font-family:${fontStack};-webkit-border-radius:999px;">
                      <span style="font-size:12px;font-weight:500;color:${C.white};line-height:1.35;">${safePill}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 28px;font-family:${fontStack};">
                ${mainColumnHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 22px;background-color:rgba(0,0,0,0.2);border-top:1px solid ${C.borderSoft};">
                <p style="margin:0;font-size:12px;line-height:1.55;color:${C.subtle};text-align:center;font-family:${fontStack};font-weight:300;">Automated message from <strong style="font-weight:500;color:${C.muted};">${safeProduct}</strong> · NIA Region 3 O&amp;M</p>
                <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:${C.subtle};text-align:center;font-family:${fontStack};font-weight:300;">&copy; ${currentYear} National Irrigation Administration. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `.trim();
};

/**
 * HTML body for schedule reminders — aligned with workspace UI (emerald shell, logo, Poppins).
 */
export const buildScheduleReminderEmailHtml = (
  schedule: Schedule,
  deadlineDate: Date,
  options?: ScheduleReminderEmailOptions
): string => {
  const formattedDeadline = formatDeadlineForEmail(deadlineDate);

  const safeAssigned = escapeHtml(schedule.personAssigned);
  const safeTitle = escapeHtml(schedule.title);
  const safeDeadlineLabel = escapeHtml(formattedDeadline);
  const scheduleLine = escapeHtml(formatDeadlineTypeForReminderEmail(schedule));

  const preheaderPlain = `${schedule.title} — due ${formattedDeadline}. ${SCHEDULE_REMINDER_PRODUCT_NAME}.`;

  const descriptionBlock = schedule.description
    ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-collapse:collapse;">
                  <tr>
                    <td style="padding:16px 18px;background-color:${C.detailBg};border:1px solid ${C.borderStrong};border-radius:12px;">
                      <p style="margin:0 0 8px;font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${C.subtle};font-family:${fontStack};">Description</p>
                      <p style="margin:0;font-size:14px;line-height:1.65;color:${C.muted};text-align:left;font-family:${fontStack};font-weight:400;">${escapeHtml(schedule.description)}</p>
                    </td>
                  </tr>
                </table>`
    : "";

  const mainColumnHtml = `
                <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${C.white};font-weight:400;">Hello <strong style="font-weight:500;color:${C.white};">${safeAssigned}</strong>,</p>
                <p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:${C.muted};font-weight:300;">The task below has an upcoming deadline. Please complete it on time to support compliance and day-to-day operations.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;">
                  <tr>
                    <td style="padding:18px 20px;border:2px dashed ${C.dashedBoxBorder};background-color:${C.dashedBoxBg};border-radius:12px;-webkit-border-radius:12px;">
                      <p style="margin:0 0 6px;font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${C.subtle};font-family:${fontStack};">Task</p>
                      <p style="margin:0 0 18px;font-size:17px;line-height:1.45;font-weight:500;color:${C.white};font-family:${fontStack};">${safeTitle}</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid ${C.borderSoft};">
                        <tr>
                          <td style="padding:14px 12px 8px 0;vertical-align:top;width:36%;">
                            <p style="margin:0;font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${C.subtle};font-family:${fontStack};">Due</p>
                          </td>
                          <td style="padding:14px 0 8px;vertical-align:top;">
                            <p style="margin:0;font-size:15px;line-height:1.5;font-weight:500;color:${C.white};font-family:${fontStack};">${safeDeadlineLabel}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 12px 0 0;vertical-align:top;">
                            <p style="margin:0;font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${C.subtle};font-family:${fontStack};">Recurrence</p>
                          </td>
                          <td style="padding:8px 0 0;vertical-align:top;">
                            <p style="margin:0;font-size:14px;line-height:1.55;color:${C.muted};font-family:${fontStack};font-weight:300;">${scheduleLine}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                ${descriptionBlock}
                <p style="margin:22px 0 0;font-size:13px;line-height:1.55;color:${C.subtle};font-weight:300;">If you have already completed this task for the current period, you may disregard this message.</p>
  `;

  return buildNiaTransactionalEmailShellHtml({
    documentTitle: "Schedule reminder",
    preheaderPlain,
    pillLabel: "Schedule reminder",
    mainColumnHtml,
    options,
  });
};

export const buildSmtpTestEmailSubject = (): string =>
  `Connection test · ${SCHEDULE_REMINDER_PRODUCT_NAME}`;

/**
 * HTML for the authenticated "test email" action — same shell as schedule reminders.
 */
export const buildSmtpTestEmailHtml = (
  options?: ScheduleReminderEmailOptions
): string => {
  const sentAt = formatDeadlineForEmail(new Date());
  const safeSentAt = escapeHtml(sentAt);

  const mainColumnHtml = `
                <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${C.white};font-weight:400;">Hello,</p>
                <p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:${C.muted};font-weight:300;">This message confirms that outbound email for automated schedule reminders is configured and deliverable.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:16px 18px;background-color:${C.detailBg};border:1px solid ${C.borderStrong};border-radius:12px;">
                      <p style="margin:0 0 10px;font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${C.subtle};font-family:${fontStack};">Verified</p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${C.muted};font-family:${fontStack};font-weight:300;">SMTP credentials and transport are working.</p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${C.muted};font-family:${fontStack};font-weight:300;">Reminder emails use the same layout and branding as this test.</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:${C.muted};font-family:${fontStack};font-weight:300;">Sent at: <strong style="font-weight:500;color:${C.white};">${safeSentAt}</strong></p>
                    </td>
                  </tr>
                </table>
  `;

  return buildNiaTransactionalEmailShellHtml({
    documentTitle: "Email connection test",
    preheaderPlain: `SMTP connection test · ${SCHEDULE_REMINDER_PRODUCT_NAME}`,
    pillLabel: "Connection test",
    mainColumnHtml,
    options,
  });
};

export const buildSmtpTestEmailText = (): string => {
  const year = new Date().getFullYear();
  const sentAt = formatDeadlineForEmail(new Date());
  return [
    SCHEDULE_REMINDER_PRODUCT_NAME.toUpperCase(),
    "National Irrigation Administration · Region 3 · O&M",
    "────────────────────────────────────────",
    "",
    "CONNECTION TEST",
    "",
    "This message confirms that outbound email for automated schedule reminders is configured.",
    "",
    "SMTP credentials and transport are working.",
    "Reminder emails use the same layout and branding as this test.",
    "",
    `Sent at: ${sentAt}`,
    "",
    "---",
    `Automated message from ${SCHEDULE_REMINDER_PRODUCT_NAME} (NIA Region 3).`,
    `© ${year} National Irrigation Administration. All rights reserved.`,
  ].join("\n");
};

export const buildScheduleReminderEmailText = (
  schedule: Schedule,
  deadlineDate: Date
): string => {
  const formattedDeadline = formatDeadlineForEmail(deadlineDate);

  const year = new Date().getFullYear();
  const recurrence = formatDeadlineTypeForReminderEmail(schedule);

  const lines = [
    SCHEDULE_REMINDER_PRODUCT_NAME.toUpperCase(),
    "National Irrigation Administration · Region 3 · O&M",
    "────────────────────────────────────────",
    "",
    `Hello ${schedule.personAssigned},`,
    "",
    "The following assigned task has an upcoming deadline. Please complete it on time to support compliance and operations.",
    "",
    `TASK: ${schedule.title}`,
    "",
    `DUE: ${formattedDeadline}`,
    "",
    `RECURRENCE: ${recurrence}`,
    "",
  ];

  if (schedule.description?.trim()) {
    lines.push("DESCRIPTION:", schedule.description.trim(), "");
  }

  lines.push(
    "If you have already completed this task for the current period, you may disregard this message.",
    "",
    "---",
    `Automated message from ${SCHEDULE_REMINDER_PRODUCT_NAME} (NIA Region 3).`,
    `© ${year} National Irrigation Administration. All rights reserved.`
  );

  return lines.join("\n");
};
