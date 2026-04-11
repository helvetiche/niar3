import nodemailer from "nodemailer";
import { Schedule } from "@/types/schedule";
import {
  buildScheduleReminderEmailHtml,
  buildScheduleReminderEmailSubject,
  buildScheduleReminderEmailText,
  buildSmtpTestEmailHtml,
  buildSmtpTestEmailSubject,
  buildSmtpTestEmailText,
} from "@/lib/schedule-reminder-email-html";

/**
 * Origin for absolute email asset URLs (e.g. logo). Ignores localhost so a
 * production deploy that still has NEXT_PUBLIC_SITE_URL from .env.local does
 * not embed broken links. On Vercel, falls back to VERCEL_URL.
 */
const resolvePublicOriginForServerEmail = (): string | undefined => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (raw) {
    try {
      const u = new URL(raw);
      const { hostname } = u;
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        return u.origin.replace(/\/$/, "");
      }
    } catch {
      /* invalid URL — try fallbacks below */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").split("/")[0];
    return `https://${host}`;
  }
  return undefined;
};

// Email configuration from environment variables
const getEmailConfig = () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "Email configuration missing. Check EMAIL_HOST, EMAIL_USER, and EMAIL_APP_PASSWORD environment variables."
    );
  }

  return { host, port, user, pass };
};

// Create reusable transporter
const createTransporter = () => {
  const config = getEmailConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

export interface SendReminderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type SendReminderEmailOptions = {
  /** When set (e.g. legacy callers), overrides the default reminder subject line. */
  subjectOverride?: string;
};

/**
 * Send a reminder email for a schedule
 */
export const sendReminderEmail = async (
  schedule: Schedule,
  deadlineDate: Date,
  sendOptions?: SendReminderEmailOptions
): Promise<SendReminderResult> => {
  try {
    const config = getEmailConfig();
    const transporter = createTransporter();

    const subject =
      sendOptions?.subjectOverride ?? buildScheduleReminderEmailSubject(schedule.title);

    const publicSite = resolvePublicOriginForServerEmail();

    const mailOptions = {
      from: `"Operation & Maintenance (O&M)" <${config.user}>`,
      to: schedule.personEmail,
      subject,
      text: buildScheduleReminderEmailText(schedule, deadlineDate),
      html: buildScheduleReminderEmailHtml(schedule, deadlineDate, {
        assetBaseUrl: publicSite,
      }),
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error sending email";
    console.error(
      `Failed to send reminder email for schedule ${schedule.id}:`,
      errorMessage
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Verify email configuration is valid
 */
export const verifyEmailConfig = async (): Promise<{
  valid: boolean;
  error?: string;
}> => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: errorMessage };
  }
};

// Legacy function for backward compatibility — uses the same HTML as `sendReminderEmail`.
export async function sendScheduleReminder(
  to: string,
  subject: string,
  scheduleTitle: string,
  scheduleDescription: string,
  deadline: string,
  personAssigned: string
) {
  const deadlineParsed = Date.parse(deadline);
  const hasParseableDeadline = !Number.isNaN(deadlineParsed);
  const deadlineDate = hasParseableDeadline ? new Date(deadlineParsed) : new Date();

  const descriptionParts: string[] = [];
  if (scheduleDescription.trim()) descriptionParts.push(scheduleDescription.trim());
  if (!hasParseableDeadline) descriptionParts.push(`Deadline: ${deadline}`);

  const schedule: Schedule = {
    id: "legacy-reminder",
    userId: "",
    title: scheduleTitle,
    description: descriptionParts.join("\n\n"),
    deadline: { type: "custom" },
    reminderDate: { type: "relative", daysBefore: 1 },
    personAssigned,
    personEmail: to,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await sendReminderEmail(schedule, deadlineDate, {
    subjectOverride: subject,
  });

  if (!result.success) {
    throw new Error(result.error ?? "Failed to send schedule reminder");
  }
}

export async function sendTestEmail(to: string) {
  const config = getEmailConfig();
  const transporter = createTransporter();
  const publicSite = resolvePublicOriginForServerEmail();

  await transporter.sendMail({
    from: `"Operation & Maintenance (O&M)" <${config.user}>`,
    to,
    subject: buildSmtpTestEmailSubject(),
    text: buildSmtpTestEmailText(),
    html: buildSmtpTestEmailHtml({ assetBaseUrl: publicSite }),
  });
}
