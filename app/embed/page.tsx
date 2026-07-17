import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';
import { DEFAULT_INSTALLER_ID } from '@/lib/default-installer';

const benefits = [
  'Free, no-obligation assessment',
  'Takes less than 2 minutes',
  'Includes SEAI grant eligibility',
  'Get a clear solar quote estimate'
];

export default async function EmbedPage({
  searchParams
}: {
  searchParams: Promise<{ installerId?: string }>;
}) {
  const { installerId } = await searchParams;
  const resolvedInstallerId = installerId?.trim() || DEFAULT_INSTALLER_ID;

  return (
    <main className="container grid public-shell home-public-shell">
      <section className="assessment-intro" aria-labelledby="embed-assessment-title">
        <div className="assessment-copy">
          <div className="eyebrow">SOLARgrant Pro</div>
          <h1 id="embed-assessment-title">Check Your Solar Savings &amp; Grant Eligibility</h1>
          <p>
            Complete this short form to get an estimated solar quote, SEAI grant check, and recommended system size.
          </p>
          <ul className="assessment-benefits" aria-label="Assessment benefits">
            {benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="assessment-action">
          <a href="#lead-form" className="cta-primary">Start Your Solar Assessment</a>
          <span>Free, quick, and no obligation.</span>
        </div>
      </section>
      <div id="lead-form" className="lead-form-anchor">
        <LeadForm installerId={resolvedInstallerId} />
      </div>
      <div className="support-links">
        <Link href="/">Return to overview</Link>
      </div>
    </main>
  );
}
