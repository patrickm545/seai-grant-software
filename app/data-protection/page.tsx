import Link from 'next/link';

export default function DataProtectionPage() {
  return (
    <main className="container legal-page">
      <section className="card legal-card">
        <div className="eyebrow">GDPR-conscious controls</div>
        <h1>Data Protection</h1>
        <p>
          Homeowner data is collected to support solar grant eligibility checks, installer follow-up, and grant submission
          preparation. The workflow includes explicit consent capture, admin-only lead review, and an erase-record action for
          homeowner deletion requests.
        </p>
        <p>
          Records may contain MPRN, address, contact details, property details, electricity usage, notes, and optional uploads.
          Audit logs record operational actions such as lead creation, workflow updates, and erasure events.
        </p>
        <p>
          A formal Privacy Policy, Terms of Use, Data Processing Agreement, retention schedule, and incident process should be
          reviewed with legal counsel before commercial rollout.
        </p>
        <div className="legal-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/">Back to checker</Link>
        </div>
      </section>
    </main>
  );
}
