import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'stub_user',
    pass: process.env.SMTP_PASS || 'stub_pass',
  },
});

const isStubMode = !process.env.SMTP_USER || process.env.SMTP_USER.includes('stub');

export const sendSignupConfirmation = async (email: string, name: string): Promise<void> => {
  if (isStubMode) {
    console.log(`[Email Stub] Signup confirmation sent to ${email}`);
    return;
  }
  await transporter.sendMail({
    from: '"SayBee AI" <noreply@saybee.ai>',
    to: email,
    subject: 'Welcome to SayBee AI!',
    html: `<h3>Welcome to SayBee AI, ${name}!</h3><p>Your account has been successfully created. You can now log in and start practicing interviews with our AI.</p>`,
  });
};

export const sendInterviewReport = async (email: string, name: string, interviewId: string): Promise<void> => {
  if (isStubMode) {
    console.log(`[Email Stub] Interview report sent to ${email} for interview #${interviewId}`);
    return;
  }
  const reportUrl = `${process.env.FRONTEND_URL}/dashboard/reports/${interviewId}`;
  await transporter.sendMail({
    from: '"SayBee AI" <noreply@saybee.ai>',
    to: email,
    subject: 'Your AI Interview Report is Ready',
    html: `<h3>Hello ${name},</h3><p>Your interview has been evaluated.</p><p><a href="${reportUrl}">Click here to view your detailed feedback and score.</a></p>`,
  });
};

export const sendPasswordReset = async (email: string, resetToken: string): Promise<void> => {
  if (isStubMode) {
    console.log(`[Email Stub] Password reset link sent to ${email} -> /reset-password?token=${resetToken}`);
    return;
  }
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await transporter.sendMail({
    from: '"SayBee AI" <noreply@saybee.ai>',
    to: email,
    subject: 'Reset Your Password - SayBee AI',
    html: `<h3>Password Reset Request</h3><p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
};
