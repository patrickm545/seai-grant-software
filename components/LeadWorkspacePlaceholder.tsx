export function LeadWorkspacePlaceholder({ eyebrow, title, children }: { eyebrow: string; title: string; children: string }) {
  return (
    <section className="lead-workspace-placeholder" aria-labelledby={`${eyebrow.toLowerCase()}-heading`}>
      <div className="eyebrow">{eyebrow}</div>
      <h2 id={`${eyebrow.toLowerCase()}-heading`}>{title}</h2>
      <p>{children}</p>
    </section>
  );
}
