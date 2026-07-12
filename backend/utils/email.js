const nodemailer = require('nodemailer');

function buildTransport() {
  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtp) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    authTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

const transporter = buildTransport();

async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM.');
  }

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  console.log(`Email delivery accepted=${result.accepted?.length || 0} rejected=${result.rejected?.length || 0} subject="${subject}"`);
  if (result.rejected?.length) throw new Error('Gmail rejected the recipient address.');
  return result;
}

async function sendVerificationEmail(to, token) {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: 'Verify your email',
    html: `<p>Click to verify your account:</p><a href="${link}">${link}</a>`,
  });
}

async function sendPasswordResetEmail(to, token) {
  const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: 'Reset your password',
    html: `<p>Click to reset your password (expires in 15 minutes):</p><a href="${link}">${link}</a>`,
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
