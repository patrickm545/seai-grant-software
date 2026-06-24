export type PipelineStage = {
  label: string;
  count: number;
  icon: string;
  state: 'complete' | 'active' | 'inactive';
};

export function PipelineWorkflow({ stages }: { stages: PipelineStage[] }) {
  return (
    <section className="installer-panel installer-pipeline-panel">
      <div className="installer-panel-header">
        <div>
          <h2>CRM Pipeline</h2>
          <p className="small">Sales workflow</p>
        </div>
      </div>

      <div className="installer-pipeline-scroll">
        <div className="installer-pipeline">
          {stages.map((stage, index) => (
            <div key={stage.label} className="installer-pipeline-step-wrap">
              <article className={`installer-pipeline-step installer-pipeline-step-${stage.state}`}>
                <span className="installer-pipeline-icon" aria-hidden="true">{stage.icon}</span>
                <strong>{stage.label}</strong>
                <small>{stage.count} lead{stage.count === 1 ? '' : 's'}</small>
              </article>
              {index < stages.length - 1 ? <span className="installer-pipeline-arrow" aria-hidden="true">-&gt;</span> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
