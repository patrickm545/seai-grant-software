import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';
import { DEFAULT_INSTALLER_ID } from '@/lib/default-installer';

export default function EmbedPage() {
  return (
    <main className="container grid public-shell">
      <section className="application-hero">
        <div className="application-copy">
          <div className="badge">Homeowner check</div>
          <h1>See if your home may qualify for the SEAI Solar Grant</h1>
          <p className="hero-text">A short form. No obligation.</p>
        </div>
        <div className="application-notes compact-notes">
          <div className="note-card">
            <strong>Best to have ready</strong>
            <p className="small">MPRN, address, and a bill or meter photo if you have one.</p>
          </div>
          <Link href="/" className="small">Return to overview</Link>
        </div>
      </section>
      <LeadForm installerId={DEFAULT_INSTALLER_ID} />
    </main>
  );
}
