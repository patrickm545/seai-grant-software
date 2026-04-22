import nodemailer from 'nodemailer';

type LeadNotificationArgs = {
  lead: {
    fullName: string;
    email: string;
    county: string;
    mprn: string;
    id: string;
  };
  installerName: string;
};

function getMailerConfig() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) return null;

  return { user, pass };
}

export async function sendLeadNotificationEmails(args: LeadNotificationArgs) {
  const config = getMailerConfig();
  if (!config) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  try {
    await Promise.all([
      transporter.sendMail({
        from: config.user,
        to: args.lead.email,
        subject: 'SEAI solar application received',
        text: `Thank you for applying. We will email you when we hear back.\n\nReference: ${args.lead.id}\nInstaller: ${args.installerName}`
      }),
      transporter.sendMail({
        from: config.user,
        to: config.user,
        subject: `New SEAI lead: ${args.lead.fullName}`,
        text: `A new lead was submitted.\n\nReference: ${args.lead.id}\nName: ${args.lead.fullName}\nEmail: ${args.lead.email}\nCounty: ${args.lead.county}\nMPRN: ${args.lead.mprn}\nInstaller: ${args.installerName}`
      })
    ]);
  } catch (error) {
    console.error('Email notification failed', error);
  }
}
