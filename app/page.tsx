import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';
import { DEFAULT_INSTALLER_ID } from '@/lib/default-installer';

const benefits = [
  'Free, no-obligation assessment',
  'Takes less than 2 minutes',
  'Includes SEAI grant eligibility',
  'Get a clear solar quote estimate'
];

const supportItems = [
  {
    title: 'Why use SolarGrant Pro',
    copy: 'A focused intake that helps your installer review the essentials quickly.'
  },
  {
    title: 'SEAI grant eligibility check',
    copy: 'Flags the key grant-readiness items before installer follow-up.'
  },
  {
    title: 'Estimated system size',
    copy: 'Uses your home and electricity details to suggest a practical solar setup.'
  },
  {
    title: 'Estimated savings',
    copy: 'Shows indicative savings and grant-adjusted quote ranges.'
  },
  {
    title: 'Installer quote options',
    copy: 'Captures battery, EV charger, and hot water diverter interest for review.'
  }
];

export default function HomePage() {
  return (
    <main className="container grid public-shell home-public-shell">
      <section className="assessment-intro" aria-labelledby="assessment-title">
        <div className="assessment-copy">
          <div className="eyebrow">SOLARgrant Pro</div>
          <h1 id="assessment-title">Check Your Solar Savings &amp; Grant Eligibility</h1>
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
        <LeadForm installerId={DEFAULT_INSTALLER_ID} />
      </div>

      <section className="post-form-support" aria-labelledby="support-title">
        <div className="section-heading compact-heading">
          <div>
            <div className="eyebrow">What you get</div>
            <h2 id="support-title">Simple solar guidance after your answers</h2>
          </div>
          <Link href="/admin" className="small">Admin login</Link>
        </div>
        <div className="support-card-grid">
          {supportItems.map((item) => (
            <article key={item.title} className="support-card">
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
        <div className="support-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/data-protection">Data protection</Link>
        </div>
      </section>
    </main>
  );
}
