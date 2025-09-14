import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export const sendInvitationEmail = async (
  email: string, 
  invitationLink: string, 
  tenantName: string,
  role: string = 'Member'
) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `You're invited to join ${tenantName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You're Invited!</h2>
        <p>You've been invited to join <strong>${tenantName}</strong> as a <strong>${role}</strong>.</p>
        <p>Click the button below to accept your invitation and create your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
          <br><a href="${invitationLink}">${invitationLink}</a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This invitation will expire in 24 hours for security reasons.
        </p>
      </div>
    `,
  };

  // For development, log the email instead of sending
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Invitation Email (Development Mode):');
    console.log('To:', email);
    console.log('Subject:', mailOptions.subject);
    console.log('Invitation Link:', invitationLink);
    console.log('---');
    return;
  }

  // In production, send the actual email
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent to ${email}`);
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
};

export const sendUpgradeRequestEmail = async (
  adminEmails: string[], 
  tenantName: string,
  requestingUserEmail: string
) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: adminEmails.join(', '), // Send to all admins
    subject: `Upgrade Request for ${tenantName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Upgrade Request Received!</h2>
        <p>User <strong>${requestingUserEmail}</strong> from your tenant <strong>${tenantName}</strong> has requested to upgrade to the Pro plan.</p>
        <p>Please log in to the admin dashboard to review and approve this request.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated notification.
        </p>
      </div>
    `,
  };

  // For development, log the email instead of sending
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Upgrade Request Email (Development Mode):');
    console.log('To:', adminEmails.join(', '));
    console.log('Subject:', mailOptions.subject);
    console.log('---');
    return;
  }

  // In production, send the actual email
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Upgrade request email sent to admins of ${tenantName}`);
  } catch (error) {
    console.error('Error sending upgrade request email:', error);
    throw error;
  }
};
