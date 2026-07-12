export const leadFormStepIds = ['property', 'usage', 'roof', 'options', 'grant', 'contact'] as const;

export type LeadFormStepId = (typeof leadFormStepIds)[number];

export const MAX_APPLICANT_DOCUMENTS = 9;

export const leadFormFieldSteps = {
  county: 'property',
  eircode: 'property',
  mprn: 'property',
  dwellingType: 'property',
  monthlyElectricityBillRange: 'usage',
  numberOfOccupants: 'usage',
  daytimeUsage: 'usage',
  roofType: 'roof',
  roofDirection: 'roof',
  shadingLevel: 'roof',
  installTimeline: 'options',
  wantsBattery: 'options',
  evChargerInterest: 'options',
  hotWaterDiverterInterest: 'options',
  yearBuilt: 'grant',
  yearOccupied: 'grant',
  worksStarted: 'grant',
  priorSolarGrantAtMprn: 'grant',
  fullName: 'contact',
  email: 'contact',
  phone: 'contact',
  preferredCallbackWindow: 'contact',
  addressLine1: 'contact',
  addressLine2: 'contact',
  consentToProcess: 'contact',
  consentToGrantAssist: 'contact',
  consentToContact: 'contact',
  notes: 'contact',
  applicantDocuments: 'contact'
} as const;

export type LeadFormFieldKey = keyof typeof leadFormFieldSteps;

export const leadFormFieldLabels: Record<LeadFormFieldKey, string> = {
  county: 'county',
  eircode: 'Eircode',
  mprn: 'MPRN',
  dwellingType: 'dwelling type',
  monthlyElectricityBillRange: 'monthly electricity bill',
  numberOfOccupants: 'number of occupants',
  daytimeUsage: 'daytime usage',
  roofType: 'roof type',
  roofDirection: 'roof direction',
  shadingLevel: 'shading',
  installTimeline: 'installation timeframe',
  wantsBattery: 'battery interest',
  evChargerInterest: 'EV charger interest',
  hotWaterDiverterInterest: 'hot water diverter interest',
  yearBuilt: 'year built',
  yearOccupied: 'year occupied',
  worksStarted: 'works started',
  priorSolarGrantAtMprn: 'prior solar grant',
  fullName: 'full name',
  email: 'email address',
  phone: 'phone number',
  preferredCallbackWindow: 'best callback time',
  addressLine1: 'address line 1',
  addressLine2: 'address line 2',
  consentToProcess: 'data processing consent',
  consentToGrantAssist: 'grant assistance consent',
  consentToContact: 'contact consent',
  notes: 'notes',
  applicantDocuments: 'uploads'
};

export const leadFormFriendlyFieldMessages: Partial<Record<LeadFormFieldKey, string>> = {
  county: 'Please choose your county.',
  mprn: 'MPRN must be 11 digits.',
  dwellingType: 'Please choose your dwelling type.',
  monthlyElectricityBillRange: 'Please choose your monthly electricity bill range.',
  numberOfOccupants: 'Number of occupants must be between 1 and 12.',
  roofType: 'Please choose your roof type.',
  installTimeline: 'Please choose your installation timeframe.',
  yearBuilt: 'Year built must be between 1800 and this year.',
  yearOccupied: 'Year occupied must be between 1800 and this year.',
  fullName: 'Please enter your full name.',
  email: 'Please enter a valid email address.',
  phone: 'Please enter a valid phone number.',
  preferredCallbackWindow: 'Please choose the best callback time.',
  addressLine1: 'Please enter address line 1.',
  consentToProcess: 'Please agree to your details being used for this application.',
  consentToGrantAssist: 'Please confirm you want help with grant and installer follow-up.',
  consentToContact: 'Please agree to be contacted by phone or email.',
  notes: 'Notes must be 2,000 characters or fewer.',
  applicantDocuments: `Please upload no more than ${MAX_APPLICANT_DOCUMENTS} files.`
};

export type LeadFormFieldErrorMap = Partial<Record<LeadFormFieldKey, string>>;

export type LeadFormValidationFailure = {
  error: string;
  fieldErrors?: LeadFormFieldErrorMap;
  formErrors?: string[];
  firstErrorField?: LeadFormFieldKey;
  firstErrorStepId?: LeadFormStepId;
  firstErrorStepIndex?: number;
  requestId?: string;
};

export function isLeadFormFieldKey(value: string): value is LeadFormFieldKey {
  return value in leadFormFieldSteps;
}

export function getLeadFormStepIndex(stepId: LeadFormStepId) {
  const index = leadFormStepIds.indexOf(stepId);
  return index === -1 ? 0 : index;
}

export function getLeadFormStepForField(field: LeadFormFieldKey) {
  return leadFormFieldSteps[field];
}

export function getLeadFormFieldMessage(field: LeadFormFieldKey, fallback?: string) {
  return leadFormFriendlyFieldMessages[field] ?? fallback ?? `Please check ${leadFormFieldLabels[field]}.`;
}
