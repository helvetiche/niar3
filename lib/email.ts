import nodemailer from "nodemailer";
import { Schedule } from "@/types/schedule";

// Email configuration from environment variables
const getEmailConfig = () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("Email configuration missing. Check EMAIL_HOST, EMAIL_USER, and EMAIL_APP_PASSWORD environment variables.");
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

// Format deadline type for human-readable display
const formatDeadlineType = (schedule: Schedule): string => {
  const { deadline } = schedule;
  
  switch (deadline.type) {
    case "daily":
      return `Daily${deadline.time ? ` at ${deadline.time}` : ""}`;
    case "weekly": {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[deadline.dayOfWeek ?? 0];
      return `Every ${dayName}${deadline.time ? ` at ${deadline.time}` : ""}`;
    }
    case "monthly":
      return `Monthly on day ${deadline.dayOfMonth ?? 1}${deadline.time ? ` at ${deadline.time}` : ""}`;
    case "monthly-specific": {
      const months = ["", "January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
      const monthName = months[deadline.month ?? 1];
      return `Annually on ${monthName} ${deadline.day ?? 1}${deadline.time ? ` at ${deadline.time}` : ""}`;
    }
    case "interval":
      return `Every ${deadline.days ?? 1} day(s)${deadline.time ? ` at ${deadline.time}` : ""}`;
    case "hourly":
      const hours = deadline.hours ?? 1;
      return hours === 1 ? `Every hour` : `Every ${hours} hours`;
    case "per-minute":
      const minutes = deadline.minutes ?? 1;
      return minutes === 1 ? `Every minute` : `Every ${minutes} minutes`;
    case "custom":
      return "Custom schedule";
    default:
      return "Scheduled";
  }
};

// Generate HTML email template - Using custom NIA template
const generateEmailHTML = (schedule: Schedule, deadlineDate: Date): string => {
  const formattedDeadline = deadlineDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentYear = new Date().getFullYear();

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email</title>
    <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>* {font-family: Google Sans}</style>
  </head>
  <body style="margin:0; padding:0; background-color:#FFFBEB; font-family: Arial, Helvetica, sans-serif;">
    <!-- Wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FFFBEB; padding:24px 0;">
      <tr>
        <td align="center">
          <!-- Container -->
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FFFFFF; border-collapse:collapse;">
            <!-- Header -->
            <tr>
              <td style="background-color:#059669; padding:20px 24px;">
                <h1 style="margin:0; font-size:20px; line-height:1.3; color:#FFFFFF; font-weight:600;">National Irrigation Administration</h1>
                <p style="margin:4px 0 0; font-size:13px; color:#D1FAE5;">Operation and Maintenance (O&M)</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:24px; color:#1F2937; font-size:14px; line-height:1.6;">
                <h2 style="margin:0 0 12px; font-size:16px; color:#047857; font-weight:600;">Hello ${schedule.personAssigned},</h2>
                <p style="margin:0 0 16px; text-align:justify;">We would like to remind you that ${schedule.title} is due on ${formattedDeadline}. Please be informed that this task requires your timely attention to ensure compliance and avoid any possible delays or issues.</p>
                ${schedule.description ? `<p style="margin:0 0 16px; text-align:justify;">${schedule.description}</p>` : ''}
                <!-- Highlight Box -->
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FEF3C7; border:1px solid #FDE68A; margin:16px 0;">
                  <tr>
                    <td style="padding:16px;">
                      <p style="margin:0; font-size:14px;"><strong style="color:#047857;">Schedule:</strong> ${formatDeadlineType(schedule)}</p>
                      <p style="margin:8px 0 0; font-size:14px;"><strong style="color:#047857;">Deadline:</strong> ${formattedDeadline}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color:#FEF3C7; padding:16px 24px; text-align:center; font-size:12px; color:#4B5563;">
                <p style="margin:0;">© ${currentYear} NIA All rights reserved.</p>
                <p style="margin:6px 0 0;"></p>
              </td>
            </tr>
          </table>
          <!-- End Container -->
        </td>
      </tr>
    </table>
    <!-- End Wrapper -->
  </body>
  </html>
  `.trim();
};

// Generate plain text fallback
const generateEmailText = (schedule: Schedule, deadlineDate: Date): string => {
  const formattedDeadline = deadlineDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
⏰ REMINDER: ${schedule.title}

${schedule.description ? `${schedule.description}\n\n` : ""}Deadline: ${formattedDeadline}
Schedule: ${formatDeadlineType(schedule)}
Assigned to: ${schedule.personAssigned}

---
This is an automated reminder from NIA Reminder System.
  `.trim();
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

    const subject = `⏰ Reminder: ${schedule.title}`;
    
    const mailOptions = {
      from: `"Operation & Maintenance (O&M)" <${config.user}>`,
      to: schedule.personEmail,
      subject,
      text: generateEmailText(schedule, deadlineDate),
      html: generateEmailHTML(schedule, deadlineDate),
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error sending email";
    console.error(`Failed to send reminder email for schedule ${schedule.id}:`, errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Verify email configuration is valid
 */
export const verifyEmailConfig = async (): Promise<{ valid: boolean; error?: string }> => {
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
  personAssigned: string,
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
