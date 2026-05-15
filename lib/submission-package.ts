import { Lead, Installer, LeadDocument } from '@prisma/client';
import { buildApplicationPack } from './application-pack';
import type { SolarQuoteEstimate } from './quote-estimate';

type SalesSignal = {
  leadTemperature?: string;
  monthlyElectricityBillRange?: string;
  installTimeline?: string;
  batteryInterest?: boolean;
  wantsBattery?: boolean;
  callbackWindow?: string;
  preferredCallbackWindow?: string;
  roofType?: string;
  roofDirection?: string;
  shadingLevel?: string;
  evChargerInterest?: boolean;
  hotWaterDiverterInterest?: boolean;
  numberOfOccupants?: number;
  daytimeUsage?: string;
  recommendedNextAction?: string;
};

function parseJsonValue(value: unknown) {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getSalesSignal(lead: Lead): SalesSignal {
  const payload = parseJsonValue(lead.structuredExportJson);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const root = payload as Record<string, unknown>;
  const signal = root.salesSignal;
  if (!signal || typeof signal !== 'object' || Array.isArray(signal)) return {};
  return signal as SalesSignal;
}

function getQuoteEstimate(lead: Lead): SolarQuoteEstimate | null {
  const payload = parseJsonValue(lead.structuredExportJson);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const root = payload as Record<string, unknown>;
  const quoteEstimate = root.quoteEstimate;
  if (!quoteEstimate || typeof quoteEstimate !== 'object' || Array.isArray(quoteEstimate)) return null;
  return quoteEstimate as SolarQuoteEstimate;
}

export function buildSubmissionPackage(lead: Lead & { documents?: LeadDocument[] }, installer: Installer) {
  const salesSignal = getSalesSignal(lead);
  const quoteEstimate = getQuoteEstimate(lead);

  return {
    version: '2.0',
    generatedAt: new Date().toISOString(),
    grantScheme: 'SEAI Solar Electricity Grant',
    applicant: {
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      preferredCallbackWindow: salesSignal.callbackWindow || salesSignal.preferredCallbackWindow || null,
      propertyOwner: lead.propertyOwner,
      privateLandlord: lead.privateLandlord
    },
    property: {
      addressLine1: lead.addressLine1,
      addressLine2: lead.addressLine2,
      county: lead.county,
      eircode: lead.eircode,
      dwellingType: lead.dwellingType,
      roofType: salesSignal.roofType || null,
      roofDirection: salesSignal.roofDirection || null,
      shadingLevel: salesSignal.shadingLevel || null,
      yearBuilt: lead.yearBuilt,
      yearOccupied: lead.yearOccupied,
      mprn: lead.mprn,
      numberOfOccupants: salesSignal.numberOfOccupants || null,
      daytimeUsage: salesSignal.daytimeUsage || null
    },
    installer: {
      name: installer.name,
      seaiCompanyId: installer.seaiCompanyId,
      websiteDomain: installer.websiteDomain
    },
    salesSignal: {
      leadTemperature: salesSignal.leadTemperature || 'WARM',
      monthlyElectricityBillRange: salesSignal.monthlyElectricityBillRange || null,
      installTimeline: salesSignal.installTimeline || null,
      wantsBattery: salesSignal.batteryInterest ?? salesSignal.wantsBattery ?? false,
      evChargerInterest: salesSignal.evChargerInterest ?? false,
      hotWaterDiverterInterest: salesSignal.hotWaterDiverterInterest ?? false,
      recommendedNextAction: salesSignal.recommendedNextAction || null
    },
    quoteEstimate,
    declarations: {
      worksStarted: lead.worksStarted,
      priorSolarGrantAtMprn: lead.priorSolarGrantAtMprn,
      consentToProcess: lead.consentToProcess,
      consentToGrantAssist: lead.consentToGrantAssist,
      consentToContact: lead.consentToContact
    },
    aiReview: {
      likelyEligible: lead.likelyEligible,
      eligibilityConfidence: lead.eligibilityConfidence,
      summary: lead.aiSummary,
      missingItems: parseJsonValue(lead.missingItemsJson) ?? lead.missingItemsJson ?? [],
      risks: parseJsonValue(lead.risksJson) ?? lead.risksJson ?? []
    },
    manualReviewRequired: true,
    manualAssistNotice: 'Manual-assist pack only. This software does not integrate with SEAI, automate the SEAI website, or submit grant applications automatically.',
    applicationPack: buildApplicationPack({
      ...lead,
      installer,
      documents: lead.documents ?? []
    }),
    notes: lead.notes
  };
}

export function buildPortalFillPreview(lead: Lead, installer: Installer) {
  const salesSignal = getSalesSignal(lead);
  const quoteEstimate = getQuoteEstimate(lead);

  return {
    disclaimer: 'Manual reference only. This software does not connect to SEAI, automate the SEAI website, or submit grant applications. Do not proceed without homeowner review and consent.',
    fields: {
      homeowner_name: lead.fullName,
      homeowner_email: lead.email,
      homeowner_phone: lead.phone,
      preferred_callback_window: salesSignal.callbackWindow || salesSignal.preferredCallbackWindow || null,
      address_line_1: lead.addressLine1,
      address_line_2: lead.addressLine2,
      county: lead.county,
      eircode: lead.eircode,
      dwelling_type: lead.dwellingType,
      roof_type: salesSignal.roofType || null,
      roof_direction: salesSignal.roofDirection || null,
      shading_level: salesSignal.shadingLevel || null,
      year_built: lead.yearBuilt,
      year_occupied: lead.yearOccupied,
      mprn: lead.mprn,
      installer_name: installer.name,
      installer_seai_id: installer.seaiCompanyId,
      wants_battery_quote: salesSignal.batteryInterest ?? salesSignal.wantsBattery ? 'yes' : 'no',
      ev_charger_interest: salesSignal.evChargerInterest ? 'yes' : 'no',
      hot_water_diverter_interest: salesSignal.hotWaterDiverterInterest ? 'yes' : 'no',
      number_of_occupants: salesSignal.numberOfOccupants || null,
      daytime_usage: salesSignal.daytimeUsage || null,
      install_timeline: salesSignal.installTimeline || null,
      works_started: lead.worksStarted ? 'yes' : 'no',
      recommended_system_size_kwp: quoteEstimate?.recommendedSystemSizeKwp ?? null,
      estimated_panel_count: quoteEstimate?.estimatedPanelCount ?? null,
      estimated_net_cost_range_after_grant: quoteEstimate?.netCostRangeAfterGrant ?? null,
      recommended_next_action: salesSignal.recommendedNextAction || quoteEstimate?.recommendedNextAction || null
    }
  };
}
