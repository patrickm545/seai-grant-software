import Link from 'next/link';

export default function LeadWorkspaceNotFound() {
  return (
    <main className="lead-workspace-state">
      <div className="eyebrow">Lead workspace</div>
      <h1>Lead not available</h1>
      <p>This lead could not be found or is not available to your organisation.</p>
      <Link href="/installer-review-emerald/leads">Return to leads</Link>
    </main>
  );
}
