'use client';

export default function InstallerLeadsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="lead-workspace-state" role="alert">
      <div className="eyebrow">Installer leads</div>
      <h1>We could not load your leads</h1>
      <p>The installer workspace is temporarily unavailable. Please try again.</p>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  );
}
