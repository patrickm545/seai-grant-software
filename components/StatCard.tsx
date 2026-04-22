export function StatCard({
  title,
  value,
  subtext,
  tone = 'default'
}: {
  title: string;
  value: string | number;
  subtext?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className={`card stat-card stat-card-${tone}`}>
      <div className="small">{title}</div>
      <div className="stat-value">{value}</div>
      {subtext ? <div className="small stat-subtext">{subtext}</div> : null}
    </div>
  );
}
