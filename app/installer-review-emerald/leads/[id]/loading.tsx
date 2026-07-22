export default function LeadWorkspaceLoading() {
  return (
    <main className="lead-workspace lead-workspace-loading" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading lead workspace</span>
      <div className="lead-workspace-loading-bar" />
      <div className="lead-workspace-loading-summary" />
      <div className="lead-workspace-loading-nav" />
      <div className="lead-workspace-loading-content" />
    </main>
  );
}
