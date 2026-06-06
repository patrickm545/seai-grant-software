import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="container legal-page">
      <section className="card legal-card">
        <div className="eyebrow">Legal placeholder</div>
        <h1>Privacy Policy</h1>
        <p>
          SOLARgrant uses homeowner information to assess solar grant eligibility, prepare installer follow-up, and support
          manual SEAI grant workflow preparation.
        </p>
        <p>
          Data may include contact details, address, Eircode, MPRN, property details, electricity usage, homeowner notes,
          and optional uploaded documents. Homeowners can request deletion of their record by contacting the installer or
          SOLARgrant operator.
        </p>
        <p>
          This placeholder is built with GDPR-conscious controls, but it is not legal advice and should be reviewed before
          commercial launch.
        </p>
        <div className="legal-links">
          <Link href="/terms">Terms</Link>
          <Link href="/data-protection">Data protection</Link>
          <Link href="/">Back to checker</Link>
        </div>
      </section>
    </main>
  );
}
