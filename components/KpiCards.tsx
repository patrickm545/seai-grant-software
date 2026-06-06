export type KpiCard = {
  label: string;
  value: number;
  icon: string;
  tone: 'green' | 'amber' | 'blue' | 'slate';
};

export function KpiCards({ cards }: { cards: KpiCard[] }) {
  return (
    <section className="installer-kpi-grid" aria-label="Installer KPIs">
      {cards.map((card) => (
        <article key={card.label} className={`installer-kpi-card installer-kpi-${card.tone}`}>
          <div>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
          <em aria-hidden="true">{card.icon}</em>
        </article>
      ))}
    </section>
  );
}
