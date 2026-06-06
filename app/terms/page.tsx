import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="container legal-page">
      <section className="card legal-card">
        <div className="eyebrow">Legal placeholder</div>
        <h1>Terms of Use</h1>
        <p>
          SOLARgrant provides an indicative grant and quote-readiness workflow for Irish solar installers and homeowners.
          It does not replace SEAI approval, installer survey work, or professional advice.
        </p>
        <p>
          Eligibility, grant amounts, pricing, savings, and payback estimates are indicative until confirmed by the installer
          and the relevant grant process.
        </p>
        <p>
          This page is placeholder copy for product readiness and needs legal review before launch.
        </p>
        <div className="legal-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/data-protection">Data protection</Link>
          <Link href="/">Back to checker</Link>
        </div>
      </section>
    </main>
  );
}
