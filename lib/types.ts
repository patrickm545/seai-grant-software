export const dwellingTypes = [
  'DETACHED',
  'SEMI_DETACHED',
  'TERRACED',
  'MID_TERRACE',
  'END_TERRACE',
  'APARTMENT',
  'BUNGALOW',
  'OTHER'
] as const;

export const roofTypes = ['SLATE', 'TILE', 'METAL', 'FLAT', 'OTHER'] as const;
export const installTimelines = ['ASAP', 'ONE_TO_THREE_MONTHS', 'THREE_TO_SIX_MONTHS', 'JUST_RESEARCHING'] as const;
export const billRanges = ['UNDER_100', 'BETWEEN_100_AND_150', 'BETWEEN_150_AND_200', 'OVER_200'] as const;
export const callbackWindows = ['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME'] as const;
export const counties = [
  'Antrim',
  'Armagh',
  'Carlow',
  'Cavan',
  'Clare',
  'Cork',
  'Derry',
  'Donegal',
  'Down',
  'Dublin',
  'Fermanagh',
  'Galway',
  'Kerry',
  'Kildare',
  'Kilkenny',
  'Laois',
  'Leitrim',
  'Limerick',
  'Longford',
  'Louth',
  'Mayo',
  'Meath',
  'Monaghan',
  'Offaly',
  'Roscommon',
  'Sligo',
  'Tipperary',
  'Tyrone',
  'Waterford',
  'Westmeath',
  'Wexford',
  'Wicklow'
] as const;

export type DwellingType = (typeof dwellingTypes)[number];
export type RoofType = (typeof roofTypes)[number];
export type InstallTimeline = (typeof installTimelines)[number];
export type BillRange = (typeof billRanges)[number];
export type CallbackWindow = (typeof callbackWindows)[number];
export type County = (typeof counties)[number];
export type LeadTemperature = 'HOT' | 'WARM' | 'COLD';

export type LeadFormInput = {
  installerId: string;
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  county: County;
  eircode?: string;
  propertyOwner: boolean;
  privateLandlord: boolean;
  dwellingType: DwellingType;
  yearBuilt: number;
  yearOccupied?: number;
  roofType?: RoofType;
  mprn: string;
  worksStarted: boolean;
  priorSolarGrantAtMprn: boolean;
  monthlyElectricityBillRange?: BillRange;
  wantsBattery: boolean;
  installTimeline?: InstallTimeline;
  preferredCallbackWindow?: CallbackWindow;
  consentToProcess: boolean;
  consentToGrantAssist: boolean;
  consentToContact: boolean;
  notes?: string;
  applicantDocuments?: ApplicantDocumentInput[];
};

export type ApplicantDocumentInput = {
  kind: 'electricity_bill' | 'meter_photo' | 'roof_photo';
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

export type EligibilityAnalysis = {
  likelyEligible: boolean;
  confidence: number;
  missingItems: string[];
  risks: string[];
  summary: string;
  nextStep: string;
  leadTemperature: LeadTemperature;
};
