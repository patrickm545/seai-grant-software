import type { SolarQuoteEstimate } from './quote-estimate';

export const installerQuotePricingKeys = [
  'panelUnitCost',
  'panelKwCost',
  'batteryUnitCost',
  'batteryKwhCost',
  'inverterCost',
  'mountingCost',
  'wiringCost',
  'safetyEquipmentCost',
  'baseLabourCost',
  'labourPerPanel',
  'labourPerKw',
  'electricalWorkCost',
  'surveyAdminCost',
  'miscellaneousCost',
  'optionalExtrasCost',
  'markupPercentage',
  'vatPercentage',
  'discountPercentage',
  'discountFixedAmount',
  'minimumQuotePrice',
  'travelCost'
] as const;

export const percentagePricingKeys = ['markupPercentage', 'vatPercentage', 'discountPercentage'] as const;

export type InstallerQuotePricingKey = (typeof installerQuotePricingKeys)[number];
export type PercentagePricingKey = (typeof percentagePricingKeys)[number];
export type InstallerQuotePricingValues = Record<InstallerQuotePricingKey, number>;

export type GeneratedInstallerQuote = {
  source: 'installer_quote_pricing';
  formulaVersion: 'installer-pricing-v1';
  generatedAt: string;
  pricingUpdatedAt: string | null;
  selectedSystemSizeKwp: number;
  estimatedPanelCount: number;
  batteryUnits: number;
  batteryKwh: number;
  panelsTotal: number;
  panelKwTotal: number;
  batteryTotal: number;
  inverterCost: number;
  mountingCost: number;
  wiringCost: number;
  safetyEquipmentCost: number;
  equipmentTotal: number;
  baseLabourCost: number;
  labourPerPanelTotal: number;
  labourPerKwTotal: number;
  electricalWorkCost: number;
  surveyAdminCost: number;
  labourTotal: number;
  miscellaneousCost: number;
  optionalExtrasCost: number;
  travelCost: number;
  subtotal: number;
  markupPercentage: number;
  markupAmount: number;
  vatPercentage: number;
  vatAmount: number;
  discountPercentage: number;
  discountFixedAmount: number;
  discountAmount: number;
  minimumQuotePrice: number;
  finalQuoteTotal: number;
};

export const defaultInstallerQuotePricing: InstallerQuotePricingValues = {
  panelUnitCost: 320,
  panelKwCost: 0,
  batteryUnitCost: 3500,
  batteryKwhCost: 0,
  inverterCost: 1200,
  mountingCost: 850,
  wiringCost: 450,
  safetyEquipmentCost: 350,
  baseLabourCost: 1200,
  labourPerPanel: 65,
  labourPerKw: 0,
  electricalWorkCost: 650,
  surveyAdminCost: 250,
  miscellaneousCost: 300,
  optionalExtrasCost: 0,
  markupPercentage: 12,
  vatPercentage: 13.5,
  discountPercentage: 0,
  discountFixedAmount: 0,
  minimumQuotePrice: 0,
  travelCost: 0
};

const percentageKeySet = new Set<InstallerQuotePricingKey>(percentagePricingKeys);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function getBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on';
}

function getSalesSignal(value: unknown) {
  const root = asRecord(value);
  return asRecord(root?.salesSignal);
}

export function roundPricingMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function formatPricingCurrency(value: number) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2
  }).format(value);
}

export function sanitizeInstallerQuotePricing(input: Partial<Record<InstallerQuotePricingKey, unknown>>): InstallerQuotePricingValues {
  return installerQuotePricingKeys.reduce((values, key) => {
    const value = Math.max(getNumber(input[key], defaultInstallerQuotePricing[key]), 0);
    values[key] = percentageKeySet.has(key) ? Math.min(value, 100) : value;
    return values;
  }, { ...defaultInstallerQuotePricing });
}

export function parseGeneratedInstallerQuote(value: unknown): GeneratedInstallerQuote | null {
  const record = asRecord(value);
  if (!record || record.source !== 'installer_quote_pricing') return null;

  return {
    source: 'installer_quote_pricing',
    formulaVersion: 'installer-pricing-v1',
    generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : new Date().toISOString(),
    pricingUpdatedAt: typeof record.pricingUpdatedAt === 'string' ? record.pricingUpdatedAt : null,
    selectedSystemSizeKwp: getNumber(record.selectedSystemSizeKwp),
    estimatedPanelCount: getNumber(record.estimatedPanelCount),
    batteryUnits: getNumber(record.batteryUnits),
    batteryKwh: getNumber(record.batteryKwh),
    panelsTotal: getNumber(record.panelsTotal),
    panelKwTotal: getNumber(record.panelKwTotal),
    batteryTotal: getNumber(record.batteryTotal),
    inverterCost: getNumber(record.inverterCost),
    mountingCost: getNumber(record.mountingCost),
    wiringCost: getNumber(record.wiringCost),
    safetyEquipmentCost: getNumber(record.safetyEquipmentCost),
    equipmentTotal: getNumber(record.equipmentTotal),
    baseLabourCost: getNumber(record.baseLabourCost),
    labourPerPanelTotal: getNumber(record.labourPerPanelTotal),
    labourPerKwTotal: getNumber(record.labourPerKwTotal),
    electricalWorkCost: getNumber(record.electricalWorkCost),
    surveyAdminCost: getNumber(record.surveyAdminCost),
    labourTotal: getNumber(record.labourTotal),
    miscellaneousCost: getNumber(record.miscellaneousCost),
    optionalExtrasCost: getNumber(record.optionalExtrasCost),
    travelCost: getNumber(record.travelCost),
    subtotal: getNumber(record.subtotal),
    markupPercentage: getNumber(record.markupPercentage),
    markupAmount: getNumber(record.markupAmount),
    vatPercentage: getNumber(record.vatPercentage),
    vatAmount: getNumber(record.vatAmount),
    discountPercentage: getNumber(record.discountPercentage),
    discountFixedAmount: getNumber(record.discountFixedAmount),
    discountAmount: getNumber(record.discountAmount),
    minimumQuotePrice: getNumber(record.minimumQuotePrice),
    finalQuoteTotal: getNumber(record.finalQuoteTotal)
  };
}

export function getPricingValuesFromRecord(record: Partial<Record<InstallerQuotePricingKey, unknown>> | null | undefined) {
  return sanitizeInstallerQuotePricing(record ?? {});
}

export function getQuoteRequirements({
  quoteEstimate,
  leadInput,
  structuredExportJson
}: {
  quoteEstimate?: Partial<SolarQuoteEstimate> | null;
  leadInput?: { wantsBattery?: boolean } | null;
  structuredExportJson?: unknown;
}) {
  const salesSignal = getSalesSignal(structuredExportJson);
  const selectedSystemSizeKwp = getNumber(quoteEstimate?.selectedSystemSizeKwp ?? quoteEstimate?.recommendedSystemSizeKwp ?? salesSignal?.selectedSystemSizeKwp);
  const estimatedPanelCount = getNumber(quoteEstimate?.estimatedPanelCount ?? quoteEstimate?.recommendedPanelCount ?? salesSignal?.estimatedPanelCount);
  const wantsBattery = Boolean(leadInput?.wantsBattery ?? getBoolean(salesSignal?.batteryInterest ?? salesSignal?.wantsBattery));
  const batteryUnits = wantsBattery ? 1 : 0;
  const batteryKwh = wantsBattery ? 5 : 0;

  return {
    selectedSystemSizeKwp,
    estimatedPanelCount,
    batteryUnits,
    batteryKwh
  };
}

export function calculateInstallerGeneratedQuote({
  pricing,
  quoteEstimate,
  leadInput,
  structuredExportJson,
  generatedAt = new Date().toISOString(),
  pricingUpdatedAt = null
}: {
  pricing: Partial<Record<InstallerQuotePricingKey, unknown>>;
  quoteEstimate?: Partial<SolarQuoteEstimate> | null;
  leadInput?: { wantsBattery?: boolean } | null;
  structuredExportJson?: unknown;
  generatedAt?: string;
  pricingUpdatedAt?: string | null;
}): GeneratedInstallerQuote {
  const values = sanitizeInstallerQuotePricing(pricing);
  const requirements = getQuoteRequirements({ quoteEstimate, leadInput, structuredExportJson });
  const panelsTotal = roundPricingMoney(requirements.estimatedPanelCount * values.panelUnitCost);
  const panelKwTotal = roundPricingMoney(requirements.selectedSystemSizeKwp * values.panelKwCost);
  const batteryTotal = roundPricingMoney(requirements.batteryUnits * values.batteryUnitCost + requirements.batteryKwh * values.batteryKwhCost);
  const equipmentTotal = roundPricingMoney(
    panelsTotal +
      panelKwTotal +
      batteryTotal +
      values.inverterCost +
      values.mountingCost +
      values.wiringCost +
      values.safetyEquipmentCost
  );
  const labourPerPanelTotal = roundPricingMoney(requirements.estimatedPanelCount * values.labourPerPanel);
  const labourPerKwTotal = roundPricingMoney(requirements.selectedSystemSizeKwp * values.labourPerKw);
  const labourTotal = roundPricingMoney(
    values.baseLabourCost + labourPerPanelTotal + labourPerKwTotal + values.electricalWorkCost + values.surveyAdminCost
  );
  const subtotal = roundPricingMoney(
    equipmentTotal + labourTotal + values.miscellaneousCost + values.optionalExtrasCost + values.travelCost
  );
  const markupAmount = roundPricingMoney(subtotal * (values.markupPercentage / 100));
  const taxableTotal = roundPricingMoney(subtotal + markupAmount);
  const vatAmount = roundPricingMoney(taxableTotal * (values.vatPercentage / 100));
  const discountAmount = roundPricingMoney(values.discountFixedAmount + taxableTotal * (values.discountPercentage / 100));
  const calculatedFinal = roundPricingMoney(taxableTotal + vatAmount - discountAmount);

  return {
    source: 'installer_quote_pricing',
    formulaVersion: 'installer-pricing-v1',
    generatedAt,
    pricingUpdatedAt,
    selectedSystemSizeKwp: requirements.selectedSystemSizeKwp,
    estimatedPanelCount: requirements.estimatedPanelCount,
    batteryUnits: requirements.batteryUnits,
    batteryKwh: requirements.batteryKwh,
    panelsTotal,
    panelKwTotal,
    batteryTotal,
    inverterCost: roundPricingMoney(values.inverterCost),
    mountingCost: roundPricingMoney(values.mountingCost),
    wiringCost: roundPricingMoney(values.wiringCost),
    safetyEquipmentCost: roundPricingMoney(values.safetyEquipmentCost),
    equipmentTotal,
    baseLabourCost: roundPricingMoney(values.baseLabourCost),
    labourPerPanelTotal,
    labourPerKwTotal,
    electricalWorkCost: roundPricingMoney(values.electricalWorkCost),
    surveyAdminCost: roundPricingMoney(values.surveyAdminCost),
    labourTotal,
    miscellaneousCost: roundPricingMoney(values.miscellaneousCost),
    optionalExtrasCost: roundPricingMoney(values.optionalExtrasCost),
    travelCost: roundPricingMoney(values.travelCost),
    subtotal,
    markupPercentage: values.markupPercentage,
    markupAmount,
    vatPercentage: values.vatPercentage,
    vatAmount,
    discountPercentage: values.discountPercentage,
    discountFixedAmount: roundPricingMoney(values.discountFixedAmount),
    discountAmount,
    minimumQuotePrice: roundPricingMoney(values.minimumQuotePrice),
    finalQuoteTotal: roundPricingMoney(Math.max(calculatedFinal, values.minimumQuotePrice))
  };
}
