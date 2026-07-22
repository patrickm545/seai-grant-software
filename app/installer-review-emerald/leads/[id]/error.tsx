'use client';

export default function LeadWorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="lead-workspace-state" role="alert">
      <div className="eyebrow">Lead workspace</div>
      <h1>We could not load this lead</h1>
      <p>The workspace is temporarily unavailable. Your changes have not been lost.</p>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  );
}
