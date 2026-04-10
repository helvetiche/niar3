import nodemailer from "nodemailer";
import { Schedule } from "@/types/schedule";
import {
  buildScheduleReminderEmailHtml,
  buildScheduleReminderEmailSubject,
  buildScheduleReminderEmailText,
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

/**
 * Send a reminder email for a schedule
 */
export const sendReminderEmail = async (
  schedule: Schedule,
  deadlineDate: Date
): Promise<SendReminderResult> => {
  try {
    const config = getEmailConfig();
    const transporter = createTransporter();

    const subject = buildScheduleReminderEmailSubject(schedule.title);

    const publicSite =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined;

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

// Legacy function for backward compatibility
export async function sendScheduleReminder(
  to: string,
  subject: string,
  scheduleTitle: string,
  scheduleDescription: string,
  deadline: string,
  personAssigned: string
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #047857; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #047857; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📅 Schedule Reminder</h1>
          </div>
          <div class="content">
            <h2 style="color: #047857;">Hello ${personAssigned},</h2>
            <p>This is a reminder for your upcoming schedule:</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #047857;">${scheduleTitle}</h3>
              ${scheduleDescription ? `<p>${scheduleDescription}</p>` : ""}
              <p><strong>Deadline:</strong> ${deadline}</p>
              <p><strong>Assigned to:</strong> ${personAssigned}</p>
            </div>
            
            <p>Please make sure to complete this task before the deadline.</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from NIA Tools</p>
            <p>© ${new Date().getFullYear()} NIA Tools. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Schedule Reminder

Hello ${personAssigned},

This is a reminder for your upcoming schedule:

Title: ${scheduleTitle}
${scheduleDescription ? `Description: ${scheduleDescription}\n` : ""}Deadline: ${deadline}
Assigned to: ${personAssigned}

Please make sure to complete this task before the deadline.

---
This is an automated reminder from NIA Tools
© ${new Date().getFullYear()} NIA Tools. All rights reserved.
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"NIA Tools" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: textContent,
    html: htmlContent,
  });
}

export async function sendTestEmail(to: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #047857; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .success { background: #d1fae5; border-left: 4px solid #047857; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Test Email Successful</h1>
          </div>
          <div class="content">
            <div class="success">
              <h2 style="margin-top: 0; color: #047857;">Email System Working!</h2>
              <p>This is a test email from NIA Tools scheduling system.</p>
            </div>
            
            <p>If you're reading this, it means:</p>
            <ul>
              <li>✅ Email configuration is correct</li>
              <li>✅ SMTP connection is working</li>
              <li>✅ Nodemailer is properly configured</li>
              <li>✅ Ready to send schedule reminders</li>
            </ul>
            
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div class="footer">
            <p>This is a test email from NIA Tools</p>
            <p>© ${new Date().getFullYear()} NIA Tools. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"NIA Tools" <${process.env.EMAIL_USER}>`,
    to,
    subject: "✅ Test Email - NIA Tools Scheduling System",
    html: htmlContent,
  });
}
