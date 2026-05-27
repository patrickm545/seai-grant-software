import { z } from 'zod';
import {
  billRanges,
  callbackWindows,
  counties,
  daytimeUsages,
  dwellingTypes,
  installTimelines,
  roofDirections,
  roofTypes,
  shadingLevels
} from './types';

const currentYear = new Date().getFullYear();
const leadStatuses = [
  'NEW',
  'NEEDS_REVIEW',
  'READY_TO_APPLY',
  'HOMEOWNER_REVIEW_PENDING',
  'SUBMITTED',
  'INSTALLATION_PENDING',
  'PAYMENT_DOCS_PENDING',
  'COMPLETED'
] as const;

function yearField(requiredMessage: string, optional = false) {
  return z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) {
      return optional ? undefined : value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return optional ? undefined : value;
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? value : parsed;
    }

    return value;
  }, optional
    ? z.number().int().min(1800, requiredMessage).max(currentYear, requiredMessage).optional()
    : z.number().int().min(1800, requiredMessage).max(currentYear, requiredMessage));
}

const applicantDocumentSchema = z.object({
  kind: z.enum(['electricity_bill', 'meter_photo', 'roof_photo']),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional()
});

const optionalOccupantsField = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().int().min(1).max(12).optional());

export const leadFormSchema = z.object({
  installerId: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  county: z.enum(counties),
  eircode: z.string().optional(),
  propertyOwner: z.boolean(),
  privateLandlord: z.boolean().default(false),
  dwellingType: z.enum(dwellingTypes),
  yearBuilt: yearField(`Year built must be between 1800 and ${currentYear}.`),
  yearOccupied: yearField(`Year occupied must be between 1800 and ${currentYear}.`, true),
  roofType: z.enum(roofTypes),
  roofDirection: z.enum(roofDirections).optional().default('UNSURE'),
  shadingLevel: z.enum(shadingLevels).optional().default('UNSURE'),
  mprn: z.string().regex(/^\d{11}$/, 'MPRN must be 11 digits'),
  worksStarted: z.boolean(),
  priorSolarGrantAtMprn: z.boolean().default(false),
  monthlyElectricityBillRange: z.enum(billRanges),
  wantsBattery: z.boolean().default(false),
  selectedSystemSizeVariant: z.enum(['smaller', 'recommended', 'larger']).optional().default('recommended'),
  evChargerInterest: z.boolean().default(false),
  hotWaterDiverterInterest: z.boolean().default(false),
  numberOfOccupants: optionalOccupantsField,
  daytimeUsage: z.enum(daytimeUsages).optional().default('MEDIUM'),
  installTimeline: z.enum(installTimelines),
  preferredCallbackWindow: z.enum(callbackWindows),
  consentToProcess: z.literal(true),
  consentToGrantAssist: z.literal(true),
  consentToContact: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  applicantDocuments: z.array(applicantDocumentSchema).max(6).optional().default([])
});

export type LeadFormSchema = z.infer<typeof leadFormSchema>;

export const adminWorkflowSchema = z.object({
  status: z.enum(leadStatuses),
  internalNotes: z.string().max(5000).optional().nullable(),
  followUpDate: z.date().optional().nullable(),
  assignedAdmin: z.string().max(120).optional().nullable(),
  assignedInstaller: z.string().max(120).optional().nullable(),
  currentCrmProcess: z.string().max(1000).optional().nullable(),
  installerSize: z.string().max(120).optional().nullable(),
  objections: z.string().max(1000).optional().nullable(),
  painPoints: z.string().max(1000).optional().nullable(),
  likelihoodToBuy: z.string().max(120).optional().nullable(),
  leadSource: z.string().max(120).optional().nullable(),
  researchCallCompleted: z.boolean().default(false),
  salesCallRequired: z.boolean().default(false)
});

export type AdminWorkflowSchema = z.infer<typeof adminWorkflowSchema>;
