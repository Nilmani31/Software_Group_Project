const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    return null;
  }

  if (
    SMTP_USER.includes('your-email') ||
    SMTP_PASSWORD.includes('your-gmail-app-password')
  ) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD
    }
  });

  return transporter;
}

async function sendWelcomeMessage({ email, username, password, roleId }) {
  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, reason: 'SMTP credentials are not configured' };
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your Inventory Management account',
    text: [
      `Hello ${username},`,
      '',
      'Your Inventory Management account has been created.',
      `Username: ${username}`,
      `Temporary password: ${password}`,
      `Role: ${roleId}`,
      '',
      'Please sign in and change your password as soon as possible.'
    ].join('\n')
  });

  return { sent: true };
}

module.exports = { sendWelcomeMessage };
