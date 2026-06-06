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
          <h2>Lead Management Pipeline</h2>
          <p className="small">Simple installer workflow</p>
        </div>
        <select aria-label="Next workflow" defaultValue="next-workflow" className="installer-small-select">
          <option value="next-workflow">Next workflow</option>
          <option value="admin-review">Admin review</option>
          <option value="grant-submitted">Grant submitted</option>
          <option value="follow-up">Follow-up</option>
        </select>
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
