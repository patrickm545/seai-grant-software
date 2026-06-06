export const pricingConfig = {
  baseSoftwarePriceEur: 500,
  maintenanceMonthlyRangeEur: {
    min: 100,
    max: 150
  },
  earlyClientWebsiteOffer: {
    clientRange: 'first 10-20 installer clients',
    description: 'Template-based AI-generated website included for early installer clients.'
  },
  futureOffers: [
    'Premium admin workflow support',
    'Lead-generation services',
    'Higher-volume installer plans'
  ],
  roiAssumptions: {
    convertedJobGrossMarginEur: 1200,
    subscriptionCostEur: 500,
    convertedJobsToCoverSubscription: 1
  },
  support: {
    earlyClientSupport: 'Direct founding-team support for early clients.',
    liveWorkflowBugs: 'Bugs affecting live workflows are handled quickly.',
    enterpriseSlaPlaceholder: 'Formal SLA and uptime guarantees are planned for enterprise clients.'
  }
} as const;

export function formatEuroAmount(value: number) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}
