import { formatEuroAmount, pricingConfig } from '@/lib/pricing';

export function RoiCalculator() {
  const { roiAssumptions } = pricingConfig;
  const surplusAfterOneJob = roiAssumptions.convertedJobGrossMarginEur - roiAssumptions.subscriptionCostEur;

  return (
    <div className="installer-panel sales-playbook-panel">
      <div className="installer-panel-header">
        <h2>ROI Prompt</h2>
      </div>
      <div className="sales-playbook-body">
        <h3>One converted job can cover the software subscription.</h3>
      </div>
      <div className="roi-grid">
        <div>
          <span>Subscription</span>
          <strong>{formatEuroAmount(roiAssumptions.subscriptionCostEur)}</strong>
        </div>
        <div>
          <span>Example gross margin</span>
          <strong>{formatEuroAmount(roiAssumptions.convertedJobGrossMarginEur)}</strong>
        </div>
        <div>
          <span>After one job</span>
          <strong>{formatEuroAmount(surplusAfterOneJob)}</strong>
        </div>
      </div>
      <p className="small sales-playbook-note">
        Assumptions are configurable in <code>lib/pricing.ts</code>; figures are sales planning estimates, not financial advice.
      </p>
    </div>
  );
}
