import twilio from 'twilio';

type LeadSmsArgs = {
  lead: {
    fullName: string;
    phone: string | null;
    county: string;
  };
};

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const installerPhoneNumber = process.env.INSTALLER_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !phoneNumber || !installerPhoneNumber) return null;

  return { accountSid, authToken, phoneNumber, installerPhoneNumber };
}

export async function sendLeadNotificationSms(args: LeadSmsArgs) {
  const config = getTwilioConfig();
  if (!config || !args.lead.phone) return;

  const client = twilio(config.accountSid, config.authToken);
  const fireEmoji = '\u{1F525}';

  try {
    await client.messages.create({
      from: config.phoneNumber,
      to: config.installerPhoneNumber,
      body: `${fireEmoji} NEW SOLAR LEAD

Name: ${args.lead.fullName}
Phone: ${args.lead.phone}
County: ${args.lead.county}

Check dashboard immediately.`
    });
  } catch (error) {
    console.error('SMS notification failed', error);
  }
}
