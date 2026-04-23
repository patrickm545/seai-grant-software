import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';
import { DEFAULT_INSTALLER_ID } from '@/lib/default-installer';

const benefits = [
  'Up to €1,800 available',
  'Quick homeowner check',
  'Installer follow-up if suitable'
];

export default function HomePage() {
  return (
    <main className="container grid public-shell">
      <section className="application-hero">
        <div className="application-copy">
          <div className="badge">SEAI solar grant checker</div>
          <h1>Check if you qualify for up to €1,800 off solar</h1>
          <p className="hero-text">A quick check for Irish homeowners.</p>
          <div className="benefit-list compact-benefits">
            {benefits.map((item) => (
              <div key={item} className="benefit-item">✓ {item}</div>
            ))}
          </div>
          <div className="hero-actions">
            <a href="#lead-form" className="cta-primary">Check my eligibility</a>
            <Link href="/admin" className="cta-secondary">Admin login</Link>
          </div>
          <div className="hero-mini-stats">
            <div>
              <span>Grant</span>
              <strong>Up to €1,800</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>About 60 sec</strong>
            </div>
            <div>
              <span>Next step</span>
              <strong>Installer review</strong>
            </div>
          </div>
        </div>
        <div className="application-notes compact-notes">
          <div className="note-card">
            <strong>Usually needed</strong>
            <p className="small">Your 11-digit MPRN, basic home details, and ideally a recent bill or meter photo.</p>
          </div>
          <div className="note-card">
            <strong>Good to know</strong>
            <p className="small">The grant normally needs approval before installation starts.</p>
          </div>
          <Link href="/embed" className="small">Open standalone homeowner page</Link>
        </div>
      </section>

      <div id="lead-form">
        <LeadForm installerId={DEFAULT_INSTALLER_ID} />
      </div>
    </main>
  );
}
