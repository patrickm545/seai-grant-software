import nodemailer from 'nodemailer';
import type { SolarQuoteEstimate } from './quote-estimate';

type LeadNotificationArgs = {
  lead: {
    fullName: string;
    email: string;
    phone?: string | null;
    county: string;
    mprn: string;
    id: string;
  };
  installerName: string;
  quoteEstimate?: SolarQuoteEstimate;
  recommendedNextAction?: string;
};

const NOTIFICATION_TIMEOUT_MS = 3000;

const euroFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

function formatEuro(value: number) {
  return euroFormatter.format(value);
}

function formatEuroRange(range: { min: number; max: number }) {
  return `${formatEuro(range.min)}-${formatEuro(range.max)}`;
}

function buildHomeownerQuoteLines(quoteEstimate?: SolarQuoteEstimate) {
  if (!quoteEstimate) return '';

  return `\n\nIndicative quote estimate:
Recommended system size: ${quoteEstimate.recommendedSystemSizeKwp} kWp
Estimated panels: ${quoteEstimate.estimatedPanelCount}
Estimated net cost after grant: ${formatEuroRange(quoteEstimate.netCostRangeAfterGrant)}
Estimated annual savings: ${formatEuroRange(quoteEstimate.estimatedAnnualSavingsRange)}

Grant eligibility and final grant amount must be confirmed with SEAI. Figures are estimates only.`;
}

function buildInstallerQuoteLines(args: LeadNotificationArgs) {
  const quote = args.quoteEstimate;
  if (!quote) return '';

  return `\n\nQuote estimate:
Selected system: ${quote.selectedSystemSizeKwp} kWp / ${quote.estimatedPanelCount} panels
Gross cost range: ${formatEuroRange(quote.grossCostRange)}
Estimated SEAI grant deduction: ${quote.estimatedSeaiGrantDeduction ? formatEuro(quote.estimatedSeaiGrantDeduction) : 'Review needed'}
Net cost after grant: ${formatEuroRange(quote.netCostRangeAfterGrant)}
Estimated annual savings: ${formatEuroRange(quote.estimatedAnnualSavingsRange)}
Estimated payback: ${quote.estimatedPaybackRangeYears.min}-${quote.estimatedPaybackRangeYears.max} years
Recommended next action: ${args.recommendedNextAction ?? quote.recommendedNextAction}`;
}

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
    connectionTimeout: NOTIFICATION_TIMEOUT_MS,
    greetingTimeout: NOTIFICATION_TIMEOUT_MS,
    socketTimeout: NOTIFICATION_TIMEOUT_MS,
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
        text: `Thank you for applying. We will email you when we hear back.\n\nReference: ${args.lead.id}\nInstaller: ${args.installerName}${buildHomeownerQuoteLines(args.quoteEstimate)}`
      }),
      transporter.sendMail({
        from: config.user,
        to: config.user,
        subject: `New SEAI lead: ${args.lead.fullName}`,
        text: `A new lead was submitted.\n\nReference: ${args.lead.id}\nName: ${args.lead.fullName}\nEmail: ${args.lead.email}\nPhone: ${args.lead.phone || 'Not supplied'}\nCounty: ${args.lead.county}\nMPRN: ${args.lead.mprn}\nInstaller: ${args.installerName}${buildInstallerQuoteLines(args)}`
      })
    ]);
  } catch (error) {
    console.error('Email notification failed', error);
  }
}
