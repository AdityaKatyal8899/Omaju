const nodemailer = require('nodemailer');
let transporter;

function createTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('[mailer] SMTP environment variables are not fully configured; emails will be skipped.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_PORT) === '465', // true for 465, false for 587/others
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // Optionally verify connection configuration
  transporter.verify().then(() => {
    console.log('[mailer] SMTP transporter is ready');
  }).catch((err) => {
    console.warn('[mailer] SMTP transporter verification failed:', err?.message || err);
  });

  return transporter;
}

function getFromAddress() {
  return process.env.SMTP_FROM || `Omaju Team <${process.env.SMTP_USER || 'no-reply@example.com'}>`;
}

// Send a plain-text welcome email after successful login/signup
async function sendWelcomeEmail(toEmail, username) {
  const tx = createTransporter();
  if (!tx) {
    console.warn('[mailer] Skipping email send because transporter is not configured');
    return;
  }

  const safeName = (username && String(username).trim()) || (toEmail ? String(toEmail).split('@')[0] : 'there');

  const text = `Hi ${safeName},

Thank you so much for logging in to Omaju! 

Feel free to explore and have a fabulous experience with Omaju!.

Cheers,
The Omaju Team`;

  const mailOptions = {
    from: getFromAddress(),
    to: toEmail,
    subject: 'Welcome to Omaju',
    text,
  };

  await tx.sendMail(mailOptions);
}

module.exports = {
  sendWelcomeEmail,
};
