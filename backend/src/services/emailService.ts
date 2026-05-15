import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS must be configured');
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
};

export const sendSignupConfirmation = async (email: string, name: string): Promise<void> => {
  await getTransporter().sendMail({
    from: '"SayBee AI" <noreply@saybee.ai>',
    to: email,
    subject: 'Welcome to SayBee AI!',
    html: `<h3>Welcome to SayBee AI, ${name}!</h3><p>Your account has been successfully created. You can now log in and start practicing interviews with our AI.</p>`,
  });
};

export const sendInterviewReport = async (email: string, name: string, interviewId: string): Promise<void> => {
  const reportUrl = `${process.env.FRONTEND_URL}/dashboard/reports/${interviewId}`;
  await getTransporter().sendMail({
    from: '"SayBee AI" <noreply@saybee.ai>',
    to: email,
    subject: 'Your AI Interview Report is Ready',
    html: `<h3>Hello ${name},</h3><p>Your interview has been evaluated.</p><p><a href="${reportUrl}">Click here to view your detailed feedback and score.</a></p>`,
  });
};

export const sendPasswordReset = async (email: string, resetToken: string): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await getTransporter().sendMail({
    from: '"SayBee AI" <noreply@saybee.ai>',
    to: email,
    subject: 'Reset Your Password - SayBee AI',
    html: `<h3>Password Reset Request</h3><p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
};

export const sendPaymentSuccessEmail = async (
  email: string,
  name: string,
  planName: string,
  credits: number,
  amount: number
): Promise<void> => {
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
  await getTransporter().sendMail({
    from: '"SayBee AI" <noreply@saybee.ai>',
    to: email,
    subject: `Payment Successful - ${credits} Credit${credits > 1 ? 's' : ''} Added!`,
    html: `
      <html>
        <body style="font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0;">
          <div style="max-width: 520px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700;">Payment Successful!</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Welcome to ${planName}</p>
            </div>
            <div style="padding: 32px;">
              <p style="font-size: 16px; color: #cbd5e1;">Hi <strong style="color: #f1f5f9;">${name}</strong>,</p>
              <p style="color: #94a3b8; line-height: 1.6;">
                Your payment of <strong style="color: #f1f5f9;">Rs.${(amount / 100).toFixed(0)}</strong> has been processed successfully.
                We've added <strong style="color: #60a5fa;">${credits} credit${credits > 1 ? 's' : ''}</strong> to your SayBee AI account.
              </p>
              <a href="${dashboardUrl}" style="display: block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: #fff; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                Start Your Interview
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
  });
};
