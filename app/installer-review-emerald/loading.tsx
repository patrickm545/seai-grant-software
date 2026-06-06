export default function InstallerDashboardLoading() {
  return (
    <main className="container grid admin-shell">
      <section className="hero-panel dashboard-hero">
        <div className="hero-copy">
          <h1>Loading grant pipeline</h1>
          <p className="hero-text">Fetching homeowner records, eligibility signals, and workflow blockers.</p>
        </div>
      </section>
      <section className="grid grid-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card loading-card" />
        ))}
      </section>
      <section className="card loading-table" />
    </main>
  );
}
