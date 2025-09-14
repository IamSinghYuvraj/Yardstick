import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export const sendInvitationEmail = async (email: string, invitationLink: string, tenantName: string) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `You have been invited to join ${tenantName}`,
    html: `<p>Click the link to accept the invitation: <a href="${invitationLink}">${invitationLink}</a></p>`,
  };

  // In a real application, you would send the email here.
  // For this example, we'll just log the mail options.
  console.log('Sending email:', mailOptions);

  // Uncomment the following line to send the email
  await transporter.sendMail(mailOptions);
};
