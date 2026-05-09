import type {
  BillRange,
  DaytimeUsage,
  DwellingType,
  InstallTimeline,
  LeadTemperature,
  RoofDirection,
  RoofType,
  ShadingLevel
} from './types';

export const quoteAssumptions = {
  panelSizeWatts: 450,
  annualIrishGenerationKwhPerKwp: { min: 850, max: 950 },
  electricityUnitRateEuro: 0.3,
  selfConsumptionWithoutBattery: 0.45,
  selfConsumptionWithBattery: 0.7,
  installedSolarCostPerKwp: { min: 1600, max: 2000 },
  batteryAddOnCost: { min: 3000, max: 5000 }
} as const;

export type SystemSizeVariant = 'smaller' | 'recommended' | 'larger';

export type SolarQuoteInput = {
  monthlyElectricityBillRange?: BillRange | '';
  dwellingType?: DwellingType | '';
  roofType?: RoofType | '';
  wantsBattery?: boolean;
  installTimeline?: InstallTimeline | '';
  propertyOwner?: boolean;
  privateLandlord?: boolean;
  worksStarted?: boolean;
  priorSolarGrantAtMprn?: boolean;
  yearBuilt?: number | string | null;
  yearOccupied?: number | string | null;
  roofDirection?: RoofDirection | '';
  shadingLevel?: ShadingLevel | '';
  evChargerInterest?: boolean;
  hotWaterDiverterInterest?: boolean;
  numberOfOccupants?: number | string | null;
  daytimeUsage?: DaytimeUsage | '';
};

export type SolarQuoteEstimate = {
  selectedVariant: SystemSizeVariant;
  recommendedSystemSizeKwp: number;
  recommendedPanelCount: number;
  selectedSystemSizeKwp: number;
  estimatedPanelCount: number;
  grossCostRange: {
    min: number;
    max: number;
  };
  estimatedSeaiGrantDeduction: number;
  potentialSeaiGrant: number;
  netCostRangeAfterGrant: {
    min: number;
    max: number;
  };
  estimatedAnnualGenerationKwh: {
    min: number;
    max: number;
  };
  estimatedAnnualSavingsRange: {
    min: number;
    max: number;
  };
  estimatedPaybackRangeYears: {
    min: number;
    max: number;
  };
  grantLikely: boolean;
  grantStatus: string;
  grantWarnings: string[];
  selfConsumptionRate: number;
  batteryCostRange: {
    min: number;
    max: number;
  } | null;
  recommendedExtras: string[];
  recommendationNotes: string[];
  recommendedNextAction: string;
};

export type SystemSizeOption = {
  variant: SystemSizeVariant;
  label: string;
  description: string;
  systemSizeKwp: number;
  panelCount: number;
  isRecommended: boolean;
};

const billRangeBaseKwp: Record<BillRange, number> = {
  UNDER_100: 3.2,
  BETWEEN_100_AND_150: 4.2,
  BETWEEN_150_AND_200: 5.2,
  OVER_200: 6.2
};

const dwellingMaxPanels: Record<DwellingType, number> = {
  APARTMENT: 8,
  MID_TERRACE: 10,
  TERRACED: 11,
  END_TERRACE: 12,
  SEMI_DETACHED: 14,
  DETACHED: 16,
  BUNGALOW: 16,
  OTHER: 13
};

const variantPanelOffsets: Record<SystemSizeVariant, number> = {
  smaller: -2,
  recommended: 0,
  larger: 2
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToNearest(value: number, increment: number) {
  return Math.round(value / increment) * increment;
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function parseYear(value: SolarQuoteInput['yearBuilt']) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRecommendedPanelCount(input: SolarQuoteInput) {
  const billRange = input.monthlyElectricityBillRange || 'BETWEEN_100_AND_150';
  const dwellingType = input.dwellingType || 'SEMI_DETACHED';
  const roofType = input.roofType || 'TILE';
  const installTimeline = input.installTimeline || 'ONE_TO_THREE_MONTHS';
  const maxPanels = dwellingMaxPanels[dwellingType];
  let targetKwp = billRangeBaseKwp[billRange];

  if (input.wantsBattery) targetKwp += 0.6;
  if (installTimeline === 'ASAP' || installTimeline === 'ONE_TO_THREE_MONTHS') targetKwp += 0.2;
  if (installTimeline === 'JUST_RESEARCHING') targetKwp -= 0.3;
  if (roofType === 'FLAT') targetKwp -= 0.3;
  if (roofType === 'OTHER') targetKwp -= 0.2;
  if (dwellingType === 'APARTMENT') targetKwp -= 0.4;

  const panelKwp = quoteAssumptions.panelSizeWatts / 1000;
  return clamp(Math.round(targetKwp / panelKwp), 6, maxPanels);
}

function panelsToKwp(panelCount: number) {
  return roundOneDecimal(panelCount * (quoteAssumptions.panelSizeWatts / 1000));
}

function calculateSeaiGrant(systemSizeKwp: number) {
  const firstBand = Math.min(systemSizeKwp, 2) * 700;
  const secondBand = Math.min(Math.max(systemSizeKwp - 2, 0), 2) * 200;
  return Math.min(Math.round(firstBand + secondBand), 1800);
}

function getGrantWarnings(input: SolarQuoteInput) {
  const warnings: string[] = [];
  const yearBuilt = parseYear(input.yearBuilt);
  const yearOccupied = parseYear(input.yearOccupied);

  if (!input.propertyOwner && !input.privateLandlord) {
    warnings.push('Applicant must be the property owner or an eligible private landlord.');
  }

  if (input.worksStarted) {
    warnings.push('Works appear to have started before grant approval.');
  }

  if (input.priorSolarGrantAtMprn) {
    warnings.push('A prior solar PV grant is recorded for this MPRN.');
  }

  if (!yearBuilt && !yearOccupied) {
    warnings.push('Property age must confirm the home is not a new build after 2020.');
  }

  if ((yearBuilt && yearBuilt > 2020) || (yearOccupied && yearOccupied > 2020)) {
    warnings.push('Property appears to be a new build after 2020.');
  }

  return warnings;
}

function buildRecommendedExtras(input: SolarQuoteInput) {
  return [
    input.wantsBattery ? 'Battery storage' : null,
    input.evChargerInterest ? 'EV charger' : null,
    input.hotWaterDiverterInterest ? 'Hot water diverter' : null
  ].filter((item): item is string => Boolean(item));
}

function buildRecommendationNotes(input: SolarQuoteInput, grantWarnings: string[]) {
  const notes: string[] = [];

  if (!input.monthlyElectricityBillRange || !input.dwellingType || !input.roofType || !input.installTimeline) {
    notes.push('Complete the bill, dwelling, roof and timeline details to sharpen this estimate.');
  }

  if (input.roofType === 'FLAT' || input.roofType === 'OTHER') {
    notes.push('Roof mounting and access should be confirmed during survey.');
  }

  if (input.roofDirection === 'NORTH') {
    notes.push('North-facing roof areas may reduce usable output and need survey review.');
  }

  if (input.shadingLevel === 'HEAVY') {
    notes.push('Heavy shading should be assessed before final system sizing.');
  }

  if (input.daytimeUsage === 'HIGH') {
    notes.push('High daytime usage can improve self-consumption of generated solar energy.');
  }

  if (grantWarnings.length) {
    notes.push('Grant deduction is not treated as likely until the flagged SEAI items are reviewed.');
  }

  return notes;
}

function buildRecommendedNextAction(input: SolarQuoteInput, grantLikely: boolean) {
  if (!grantLikely) return 'Complete a manual grant eligibility review before issuing a final quote.';
  if (input.roofDirection === 'NORTH' || input.shadingLevel === 'HEAVY') return 'Book a free solar survey to confirm usable roof area and output.';
  if (input.installTimeline === 'ASAP' || input.installTimeline === 'ONE_TO_THREE_MONTHS') return 'Call promptly and book a free solar survey.';
  if (input.installTimeline === 'JUST_RESEARCHING') return 'Send the indicative quote and schedule a helpful follow-up.';
  return 'Book a free solar survey and confirm final system design.';
}

export function inferQuoteLeadTemperature(input: SolarQuoteInput, likelyEligible: boolean): LeadTemperature {
  if (!likelyEligible) return 'COLD';

  const highBill = input.monthlyElectricityBillRange === 'OVER_200' || input.monthlyElectricityBillRange === 'BETWEEN_150_AND_200';
  const fastTimeline = input.installTimeline === 'ASAP' || input.installTimeline === 'ONE_TO_THREE_MONTHS';
  const strongExtras = Boolean(input.wantsBattery || input.evChargerInterest || input.hotWaterDiverterInterest);

  if (fastTimeline && (highBill || strongExtras)) return 'HOT';
  if (input.installTimeline === 'JUST_RESEARCHING' && !highBill) return 'COLD';
  return 'WARM';
}

export function getSystemSizeOptions(input: SolarQuoteInput): SystemSizeOption[] {
  const recommendedPanels = getRecommendedPanelCount(input);
  const dwellingType = input.dwellingType || 'SEMI_DETACHED';
  const maxPanels = dwellingMaxPanels[dwellingType];

  return (['smaller', 'recommended', 'larger'] as SystemSizeVariant[]).map((variant) => {
    const panelCount = clamp(recommendedPanels + variantPanelOffsets[variant], 6, maxPanels);
    const systemSizeKwp = panelsToKwp(panelCount);

    return {
      variant,
      label: variant === 'recommended' ? 'Recommended' : variant === 'smaller' ? 'Lean' : 'Higher output',
      description:
        variant === 'recommended'
          ? 'Best match from your current answers'
          : variant === 'smaller'
          ? 'Lower upfront cost'
          : 'More generation potential',
      systemSizeKwp,
      panelCount,
      isRecommended: variant === 'recommended'
    };
  });
}

export function buildSolarQuoteEstimate(
  input: SolarQuoteInput,
  selectedVariant: SystemSizeVariant = 'recommended'
): SolarQuoteEstimate {
  const options = getSystemSizeOptions(input);
  const selectedOption = options.find((option) => option.variant === selectedVariant) ?? options[1];
  const recommendedOption = options.find((option) => option.variant === 'recommended') ?? selectedOption;
  const systemSizeKwp = selectedOption.systemSizeKwp;
  const solarCostMin = systemSizeKwp * quoteAssumptions.installedSolarCostPerKwp.min;
  const solarCostMax = systemSizeKwp * quoteAssumptions.installedSolarCostPerKwp.max;
  const batteryCostRange = input.wantsBattery ? quoteAssumptions.batteryAddOnCost : null;
  const grossCostRange = {
    min: roundToNearest(solarCostMin + (batteryCostRange?.min ?? 0), 50),
    max: roundToNearest(solarCostMax + (batteryCostRange?.max ?? 0), 50)
  };
  const potentialSeaiGrant = calculateSeaiGrant(systemSizeKwp);
  const grantWarnings = getGrantWarnings(input);
  const grantLikely = grantWarnings.length === 0;
  const estimatedSeaiGrantDeduction = grantLikely ? potentialSeaiGrant : 0;
  const generation = {
    min: Math.round(systemSizeKwp * quoteAssumptions.annualIrishGenerationKwhPerKwp.min),
    max: Math.round(systemSizeKwp * quoteAssumptions.annualIrishGenerationKwhPerKwp.max)
  };
  const selfConsumptionRate = input.wantsBattery
    ? quoteAssumptions.selfConsumptionWithBattery
    : quoteAssumptions.selfConsumptionWithoutBattery;
  const savings = {
    min: roundToNearest(generation.min * selfConsumptionRate * quoteAssumptions.electricityUnitRateEuro, 10),
    max: roundToNearest(generation.max * selfConsumptionRate * quoteAssumptions.electricityUnitRateEuro, 10)
  };
  const netCostRange = {
    min: Math.max(grossCostRange.min - estimatedSeaiGrantDeduction, 0),
    max: Math.max(grossCostRange.max - estimatedSeaiGrantDeduction, 0)
  };
  const paybackRange = {
    min: roundOneDecimal(netCostRange.min / Math.max(savings.max, 1)),
    max: roundOneDecimal(netCostRange.max / Math.max(savings.min, 1))
  };
  const recommendedExtras = buildRecommendedExtras(input);
  const recommendationNotes = buildRecommendationNotes(input, grantWarnings);

  return {
    selectedVariant: selectedOption.variant,
    recommendedSystemSizeKwp: recommendedOption.systemSizeKwp,
    recommendedPanelCount: recommendedOption.panelCount,
    selectedSystemSizeKwp: systemSizeKwp,
    estimatedPanelCount: selectedOption.panelCount,
    grossCostRange,
    estimatedSeaiGrantDeduction,
    potentialSeaiGrant,
    netCostRangeAfterGrant: netCostRange,
    estimatedAnnualGenerationKwh: generation,
    estimatedAnnualSavingsRange: savings,
    estimatedPaybackRangeYears: paybackRange,
    grantLikely,
    grantStatus: grantLikely
      ? 'Likely grant deduction, subject to SEAI approval.'
      : 'Grant deduction not included until eligibility is confirmed.',
    grantWarnings,
    selfConsumptionRate,
    batteryCostRange,
    recommendedExtras,
    recommendationNotes,
    recommendedNextAction: buildRecommendedNextAction(input, grantLikely)
  };
}
