import twilio from 'twilio';
import type { SolarQuoteEstimate } from './quote-estimate';
import { requireSupportedSolarGrantJurisdiction } from './solargrant-jurisdiction';

type LeadSmsArgs = {
  lead: {
    fullName: string;
    phone: string | null;
    county: string;
    eircode?: string | null;
  };
  quoteEstimate?: SolarQuoteEstimate;
  leadTemperature?: string;
};

const NOTIFICATION_TIMEOUT_MS = 3000;

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const installerPhoneNumber = process.env.INSTALLER_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !phoneNumber || !installerPhoneNumber) return null;

  return { accountSid, authToken, phoneNumber, installerPhoneNumber };
}

export async function sendLeadNotificationSms(args: LeadSmsArgs) {
  requireSupportedSolarGrantJurisdiction(args.lead);
  const config = getTwilioConfig();
  if (!config || !args.lead.phone) return;

  const client = twilio(config.accountSid, config.authToken, {
    timeout: NOTIFICATION_TIMEOUT_MS
  });
  const fireEmoji = '\u{1F525}';
  const quoteLine = args.quoteEstimate
    ? `\nEstimate: ${args.quoteEstimate.selectedSystemSizeKwp} kWp, ${args.quoteEstimate.estimatedPanelCount} panels, net EUR ${args.quoteEstimate.netCostRangeAfterGrant.min}-${args.quoteEstimate.netCostRangeAfterGrant.max}`
    : '';

  try {
    await client.messages.create({
      from: config.phoneNumber,
      to: config.installerPhoneNumber,
      body: `${fireEmoji} NEW SOLAR LEAD

Name: ${args.lead.fullName}
Phone: ${args.lead.phone}
County: ${args.lead.county}
Priority: ${args.leadTemperature ?? 'WARM'}${quoteLine}

Check dashboard immediately.`
    });
  } catch (error) {
    console.error('SMS notification failed', error);
  }
}
