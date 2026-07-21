export const republicOfIrelandCounties = [
  'Carlow',
  'Cavan',
  'Clare',
  'Cork',
  'Donegal',
  'Dublin',
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
  'Waterford',
  'Westmeath',
  'Wexford',
  'Wicklow'
] as const;

export const northernIrelandCounties = [
  'Antrim',
  'Armagh',
  'Derry',
  'Down',
  'Fermanagh',
  'Tyrone'
] as const;

export const solarGrantCounties = [
  ...republicOfIrelandCounties,
  ...northernIrelandCounties
] as const;

export const solarGrantCountyGroups = [
  {
    label: 'Republic of Ireland',
    counties: republicOfIrelandCounties
  },
  {
    label: 'Northern Ireland — not currently supported by this SEAI grant assistant',
    counties: northernIrelandCounties
  }
] as const;

export type RepublicOfIrelandCounty = (typeof republicOfIrelandCounties)[number];
export type NorthernIrelandCounty = (typeof northernIrelandCounties)[number];
export type SolarGrantCounty = (typeof solarGrantCounties)[number];
export type SolarGrantPropertyJurisdiction =
  | 'REPUBLIC_OF_IRELAND'
  | 'NORTHERN_IRELAND'
  | 'UNKNOWN';

export type SolarGrantJurisdictionReason =
  | 'SUPPORTED_COUNTY'
  | 'NORTHERN_IRELAND_COUNTY'
  | 'NORTHERN_IRELAND_POSTCODE'
  | 'MISSING_COUNTY'
  | 'UNKNOWN_COUNTY'
  | 'INVALID_EIRCODE'
  | 'CONFLICTING_LOCATION';

export type SolarGrantJurisdictionResult = {
  jurisdiction: SolarGrantPropertyJurisdiction;
  reason: SolarGrantJurisdictionReason;
  county: SolarGrantCounty | null;
  eircode: string | null;
  isSupported: boolean;
};

export const SOLARGRANT_UNSUPPORTED_MESSAGE =
  'This grant assistant currently supports properties in the Republic of Ireland for the SEAI Solar Electricity Grant. A property in Northern Ireland cannot continue through this SEAI grant check. You can change the county if it was selected by mistake, or contact a local solar installer or energy-advice service about options available for the property.';

export const SOLARGRANT_CONFLICT_MESSAGE =
  'The county and postcode do not appear to describe the same jurisdiction. Check both before continuing.';

export const SOLARGRANT_LOCATION_REVIEW_MESSAGE =
  'The property location must be reviewed before any SEAI grant conclusion can be shown.';

const countyByNormalisedName = new Map<string, SolarGrantCounty>(
  solarGrantCounties.map((county) => [county.toLocaleLowerCase('en-IE'), county])
);

const eircodeCharacter = '0-9AC-FHKNPRTV-Y';
const eircodePattern = new RegExp(`^[AC-FHKNPRTV-Y][${eircodeCharacter}]{2}[${eircodeCharacter}]{4}$`);
const northernIrelandPostcodePattern = /^BT\d{1,2}\d[A-Z]{2}$/;

export function normalizeSolarGrantCounty(value: unknown): SolarGrantCounty | null {
  if (typeof value !== 'string') return null;
  const normalised = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IE');
  return countyByNormalisedName.get(normalised) ?? null;
}

function compactLocationCode(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, '') : '';
}

export function isReviewedEircode(value: unknown) {
  const compact = compactLocationCode(value);
  return compact.length > 0 && eircodePattern.test(compact);
}

export function isNorthernIrelandPostcode(value: unknown) {
  const compact = compactLocationCode(value);
  return compact.length > 0 && northernIrelandPostcodePattern.test(compact);
}

export function isReviewedSolarGrantLocationCode(value: unknown) {
  const compact = compactLocationCode(value);
  return compact.length === 0 || isReviewedEircode(compact) || isNorthernIrelandPostcode(compact);
}

export function normalizeSolarGrantLocationCode(value: unknown): string | null {
  const compact = compactLocationCode(value);
  if (!compact) return null;
  if (eircodePattern.test(compact)) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  if (northernIrelandPostcodePattern.test(compact)) return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  return compact;
}

export function classifySolarGrantJurisdiction(input: {
  county?: unknown;
  eircode?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
}): SolarGrantJurisdictionResult {
  const rawCounty = typeof input.county === 'string' ? input.county.trim() : '';
  const county = normalizeSolarGrantCounty(input.county);
  const eircode = normalizeSolarGrantLocationCode(input.eircode);

  if (!rawCounty) {
    return { jurisdiction: 'UNKNOWN', reason: 'MISSING_COUNTY', county: null, eircode, isSupported: false };
  }

  if (!county) {
    return { jurisdiction: 'UNKNOWN', reason: 'UNKNOWN_COUNTY', county: null, eircode, isSupported: false };
  }

  if (northernIrelandCounties.includes(county as NorthernIrelandCounty)) {
    return {
      jurisdiction: 'NORTHERN_IRELAND',
      reason: isNorthernIrelandPostcode(eircode) ? 'NORTHERN_IRELAND_POSTCODE' : 'NORTHERN_IRELAND_COUNTY',
      county,
      eircode,
      isSupported: false
    };
  }

  if (eircode && !isReviewedSolarGrantLocationCode(eircode)) {
    return { jurisdiction: 'UNKNOWN', reason: 'INVALID_EIRCODE', county, eircode, isSupported: false };
  }

  if (republicOfIrelandCounties.includes(county as RepublicOfIrelandCounty) && isNorthernIrelandPostcode(eircode)) {
    return { jurisdiction: 'UNKNOWN', reason: 'CONFLICTING_LOCATION', county, eircode, isSupported: false };
  }

  return { jurisdiction: 'REPUBLIC_OF_IRELAND', reason: 'SUPPORTED_COUNTY', county, eircode, isSupported: true };
}

export type SolarGrantJurisdictionErrorCode =
  | 'UNSUPPORTED_PROPERTY_JURISDICTION'
  | 'AMBIGUOUS_PROPERTY_JURISDICTION'
  | 'PROPERTY_JURISDICTION_REVIEW_REQUIRED';

export class SolarGrantJurisdictionError extends Error {
  constructor(
    public readonly code: SolarGrantJurisdictionErrorCode,
    public readonly classification: SolarGrantJurisdictionResult
  ) {
    super(
      code === 'UNSUPPORTED_PROPERTY_JURISDICTION'
        ? SOLARGRANT_UNSUPPORTED_MESSAGE
        : code === 'AMBIGUOUS_PROPERTY_JURISDICTION'
          ? SOLARGRANT_CONFLICT_MESSAGE
          : SOLARGRANT_LOCATION_REVIEW_MESSAGE
    );
    this.name = 'SolarGrantJurisdictionError';
  }
}

export function requireSupportedSolarGrantJurisdiction(input: {
  county?: unknown;
  eircode?: unknown;
}) {
  const classification = classifySolarGrantJurisdiction(input);
  if (classification.isSupported) return classification;

  if (classification.jurisdiction === 'NORTHERN_IRELAND') {
    throw new SolarGrantJurisdictionError('UNSUPPORTED_PROPERTY_JURISDICTION', classification);
  }
  if (classification.reason === 'CONFLICTING_LOCATION') {
    throw new SolarGrantJurisdictionError('AMBIGUOUS_PROPERTY_JURISDICTION', classification);
  }
  throw new SolarGrantJurisdictionError('PROPERTY_JURISDICTION_REVIEW_REQUIRED', classification);
}
