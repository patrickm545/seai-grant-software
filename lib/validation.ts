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
import {
  getLeadFormFieldMessage,
  getLeadFormStepForField,
  getLeadFormStepIndex,
  isLeadFormFieldKey,
  leadFormFriendlyFieldMessages,
  MAX_APPLICANT_DOCUMENTS,
  type LeadFormFieldErrorMap,
  type LeadFormValidationFailure
} from './lead-form-flow';
import {
  isReviewedSolarGrantLocationCode,
  normalizeSolarGrantCounty,
  normalizeSolarGrantLocationCode
} from './solargrant-jurisdiction';

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

const countyField = z.preprocess(
  (value) => normalizeSolarGrantCounty(value) ?? value,
  z.enum(counties)
);

const eircodeField = z.preprocess(
  (value) => normalizeSolarGrantLocationCode(value) ?? undefined,
  z.string()
    .refine(isReviewedSolarGrantLocationCode, 'Enter a valid Eircode or leave this field blank.')
    .optional()
);

export const leadFormSchema = z.object({
  installerId: z.string().min(1),
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
  addressLine1: z.string().trim().min(5),
  addressLine2: z.string().optional(),
  county: countyField,
  eircode: eircodeField,
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
  consentToContact: z.literal(true),
  notes: z.string().max(2000).optional(),
  applicantDocuments: z.array(applicantDocumentSchema).max(MAX_APPLICANT_DOCUMENTS).optional().default([])
}).strict();

export type LeadFormSchema = z.infer<typeof leadFormSchema>;

function getIssueField(issue: z.ZodIssue) {
  const path = issue.path[0];
  return typeof path === 'string' && isLeadFormFieldKey(path) ? path : undefined;
}

function getFormIssueMessage(issue: z.ZodIssue) {
  if (issue.code === 'unrecognized_keys') {
    return 'Please remove unsupported fields and try again.';
  }

  if (issue.path.length === 0) {
    return issue.message || 'Please check the form details and try again.';
  }

  return undefined;
}

export function formatLeadFormValidationFailure(error: z.ZodError, requestId?: string): LeadFormValidationFailure {
  const fieldErrors: LeadFormFieldErrorMap = {};
  const formErrors: string[] = [];
  let firstErrorField: keyof LeadFormFieldErrorMap | undefined;

  for (const issue of error.issues) {
    const field = getIssueField(issue);

    if (!field) {
      const formMessage = getFormIssueMessage(issue);
      if (formMessage && !formErrors.includes(formMessage)) formErrors.push(formMessage);
      continue;
    }

    if (!firstErrorField) firstErrorField = field;
    if (field === 'county') {
      const received = 'received' in issue ? issue.received : undefined;
      fieldErrors[field] = received === undefined || received === null || received === ''
        ? 'Choose the county where the property is located.'
        : 'Choose a county from the list.';
    } else {
      fieldErrors[field] = getLeadFormFieldMessage(field, leadFormFriendlyFieldMessages[field] ?? issue.message);
    }
  }

  const firstErrorStepId = firstErrorField ? getLeadFormStepForField(firstErrorField) : undefined;

  return {
    error: firstErrorField ? 'Please review the highlighted fields.' : formErrors[0] ?? 'Please check the form details and try again.',
    fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    formErrors: formErrors.length ? formErrors : undefined,
    firstErrorField,
    firstErrorStepId,
    firstErrorStepIndex: firstErrorStepId ? getLeadFormStepIndex(firstErrorStepId) : undefined,
    requestId
  };
}

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
