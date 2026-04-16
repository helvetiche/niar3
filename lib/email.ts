import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import { Schedule } from "@/types/schedule";
import {
  buildScheduleReminderEmailHtml,
  buildScheduleReminderEmailSubject,
  buildScheduleReminderEmailText,
  buildSmtpTestEmailHtml,
  buildSmtpTestEmailSubject,
  buildSmtpTestEmailText,
  SCHEDULE_REMINDER_PRODUCT_NAME,
} from "@/lib/schedule-reminder-email-html";

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

    const mailOptions = {
      from: `"Operation & Maintenance (O&M)" <${config.user}>`,
      to: schedule.personEmail,
      subject,
      text: buildScheduleReminderEmailText(schedule, deadlineDate),
      html: buildScheduleReminderEmailHtml(schedule, deadlineDate),
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
  await transporter.sendMail({
    from: `"Operation & Maintenance (O&M)" <${config.user}>`,
    to,
    subject: buildSmtpTestEmailSubject(),
    text: buildSmtpTestEmailText(),
    html: buildSmtpTestEmailHtml(),
  });
}

export type SendManualComposedEmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendManualComposedEmailInput = {
  to: string;
  subject: string;
  /** Final HTML document (already wrapped and safe). */
  html: string;
  /** Plain-text alternative. */
  text: string;
  /**
   * Display name for the From header (SMTP mailbox stays `config.user`).
   * Keep reasonably short for mail clients (recommended under 78 characters).
   */
  fromDisplayName?: string;
  attachments?: SendManualComposedEmailAttachment[];
};

const truncateMailDisplayName = (name: string, max = 78): string => {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
};

/**
 * Sends a workspace-composed message using the same nodemailer SMTP transport as schedule mail.
 */
export const sendManualComposedEmail = async (
  input: SendManualComposedEmailInput
): Promise<SendReminderResult> => {
  try {
    const config = getEmailConfig();
    const transporter = createTransporter();

    const displayName =
      input.fromDisplayName?.trim() && input.fromDisplayName.trim().length > 0
        ? truncateMailDisplayName(input.fromDisplayName.trim())
        : SCHEDULE_REMINDER_PRODUCT_NAME;

    const attachmentParts =
      input.attachments?.map((a) => {
        const content = Buffer.isBuffer(a.content)
          ? a.content
          : Buffer.from(a.content as Uint8Array);
        return {
          filename: a.filename,
          content,
          contentType: a.contentType?.trim() || "application/octet-stream",
          contentDisposition: "attachment" as const,
        };
      }) ?? [];

    const mail: SendMailOptions = {
      from: {
        name: displayName,
        address: config.user,
      },
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(attachmentParts.length > 0 ? { attachments: attachmentParts } : {}),
    };

    const info = await transporter.sendMail(mail);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error sending email";
    console.error("Failed to send manual compose email:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};
