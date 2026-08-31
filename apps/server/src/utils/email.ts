import nodemailer from 'nodemailer';

// Create a transporter. For production, these should be configured in .env
// We'll use a test ethereal account if credentials are not provided.
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
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
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    console.log('Created Ethereal test email account:', testAccount.user);
  }

  return transporter;
}

export async function sendInviteEmail(to: string, workspaceName: string, inviterName: string, token: string) {
  const mailer = await getTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const inviteUrl = `${frontendUrl}/invite/${token}`;

  const info = await mailer.sendMail({
    from: process.env.SMTP_FROM || '"WebZoo" <no-reply@webzoo.app>',
    to,
    subject: `You have been invited to join ${workspaceName}`,
    text: `${inviterName} has invited you to join the ${workspaceName} workspace on WebZoo.\n\nClick here to join: ${inviteUrl}\n\nThis link will expire in 24 hours.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on WebZoo.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="background-color: #00a884; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        </p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <p style="color: #999; font-size: 12px;">If you're having trouble clicking the button, copy and paste this link into your browser: <br>${inviteUrl}</p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log('Preview Invite Email: %s', nodemailer.getTestMessageUrl(info));
  }
}

export async function sendNotificationEmail(to: string, workspaceName: string, inviterName: string) {
  const mailer = await getTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const appUrl = `${frontendUrl}/app`;

  const info = await mailer.sendMail({
    from: process.env.SMTP_FROM || '"WebZoo" <no-reply@webzoo.app>',
    to,
    subject: `You have been invited to join ${workspaceName}`,
    text: `${inviterName} has invited you to join the ${workspaceName} workspace on WebZoo.\n\nLog in to WebZoo to accept the invitation: ${appUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Workspace Invitation</h2>
        <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on WebZoo.</p>
        <p style="margin: 24px 0;">
          <a href="${appUrl}" style="background-color: #00a884; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open WebZoo</a>
        </p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log('Preview Notification Email: %s', nodemailer.getTestMessageUrl(info));
  }
}
