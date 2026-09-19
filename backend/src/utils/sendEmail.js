import nodemailer from 'nodemailer';

/**
 * Sends an email using nodemailer.
 * Supports SMTP configuration via environment variables,
 * with automatic fallback for local development and testing.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  let transporter;

  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasSmtpConfig) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // In local development or testing without SMTP config, use a mock/stream transporter
    // or log to console
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  const mailOptions = {
    from: process.env.FROM_EMAIL || '"SAHAY Health Network" <noreply@sahay.gov.in>',
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] To: ${to} | Subject: ${subject}`);
    return { success: true, info };
  } catch (error) {
    console.error(`[Email Send Error] Failed to send to ${to}:`, error.message);
    // In development mode, don't crash the request
    if (process.env.NODE_ENV !== 'production') {
      return { success: false, error: error.message };
    }
    throw error;
  }
};

export default sendEmail;
