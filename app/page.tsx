import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';
import { DEFAULT_INSTALLER_ID } from '@/lib/default-installer';

const benefits = [
  'SEAI grant readiness check',
  'Indicative solar quote preview',
  'Installer follow-up if suitable'
];

export default function HomePage() {
  return (
    <main className="container grid public-shell">
      <section className="application-hero">
        <div className="application-copy">
          <h1>Check your solar grant readiness</h1>
          <p className="hero-text">
            A clear homeowner intake for Irish solar grants: answer the essentials, see an indicative quote preview, and
            send the details to an installer for review.
          </p>
          <div className="benefit-list compact-benefits">
            {benefits.map((item) => (
              <div key={item} className="benefit-item">{item}</div>
            ))}
          </div>
          <div className="hero-actions">
            <a href="#lead-form" className="cta-primary">Check my eligibility</a>
            <Link href="/admin" className="cta-secondary">Admin login</Link>
          </div>
          <div className="hero-mini-stats">
            <div>
              <span>Grant route</span>
              <strong>SEAI review</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>About 2 min</strong>
            </div>
            <div>
              <span>Next step</span>
              <strong>Installer review</strong>
            </div>
          </div>
        </div>
        <div className="application-notes compact-notes">
          <div className="note-card trust-card">
            <strong>Built with GDPR-conscious controls</strong>
            <p className="small">
              Your data is used for grant eligibility checks and installer follow-up. You can request deletion of your
              homeowner record.
            </p>
            <div className="privacy-links">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/data-protection">Data protection</Link>
            </div>
          </div>
          <div className="note-card">
            <strong>Usually needed</strong>
            <p className="small">Your 11-digit MPRN, basic home details, and ideally a recent bill or meter photo.</p>
          </div>
          <div className="note-card">
            <strong>Good to know</strong>
            <p className="small">The grant normally needs approval before installation starts.</p>
          </div>
          <p className="small">SOLARgrant supports the workflow. It is not SEAI and does not make final grant decisions.</p>
        </div>
      </section>

      <div id="lead-form">
        <LeadForm installerId={DEFAULT_INSTALLER_ID} />
      </div>
    </main>
  );
}
