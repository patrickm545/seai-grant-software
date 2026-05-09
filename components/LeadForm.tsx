'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  billRanges,
  callbackWindows,
  counties,
  daytimeUsages,
  dwellingTypes,
  installTimelines,
  roofDirections,
  roofTypes,
  shadingLevels,
  type EligibilityAnalysis
} from '@/lib/types';
import {
  buildSolarQuoteEstimate,
  getSystemSizeOptions,
  quoteAssumptions,
  type SolarQuoteEstimate,
  type SolarQuoteInput,
  type SystemSizeVariant
} from '@/lib/quote-estimate';

function createInitialState(installerId: string) {
  return {
    installerId,
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    county: '',
    eircode: '',
    propertyOwner: true,
    privateLandlord: false,
    dwellingType: '',
    yearBuilt: '',
    yearOccupied: '',
    roofType: '',
    roofDirection: 'UNSURE',
    shadingLevel: 'UNSURE',
    mprn: '',
    worksStarted: false,
    priorSolarGrantAtMprn: false,
    monthlyElectricityBillRange: '',
    wantsBattery: false,
    evChargerInterest: false,
    hotWaterDiverterInterest: false,
    numberOfOccupants: '',
    daytimeUsage: 'MEDIUM',
    installTimeline: '',
    preferredCallbackWindow: '',
    consentToProcess: true,
    consentToGrantAssist: true,
    consentToContact: true,
    notes: ''
  };
}

const fallbackInitialState = createInitialState('demo-installer');

type FormState = ReturnType<typeof createInitialState>;
type FormFieldKey = keyof FormState;

type UploadItem = {
  kind: 'electricity_bill' | 'meter_photo' | 'roof_photo';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type IntakeResult = {
  leadId: string;
  analysis?: EligibilityAnalysis;
  quoteEstimate?: SolarQuoteEstimate;
  uploadedDocuments?: number;
};

const euroFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

const validationChecks: Array<{
  key: FormFieldKey;
  isInvalid: (form: FormState) => boolean;
  message: string;
}> = [
  { key: 'fullName', isInvalid: (form) => !form.fullName.trim(), message: 'Please fill in Full name.' },
  { key: 'email', isInvalid: (form) => !form.email.trim(), message: 'Please fill in Email.' },
  { key: 'phone', isInvalid: (form) => !form.phone.trim(), message: 'Please fill in Phone.' },
  { key: 'preferredCallbackWindow', isInvalid: (form) => !form.preferredCallbackWindow, message: 'Please choose Best callback time.' },
  { key: 'addressLine1', isInvalid: (form) => !form.addressLine1.trim(), message: 'Please fill in Address line 1.' },
  { key: 'county', isInvalid: (form) => !form.county, message: 'Please choose County.' },
  { key: 'mprn', isInvalid: (form) => form.mprn.length !== 11, message: 'MPRN must be 11 digits.' },
  { key: 'dwellingType', isInvalid: (form) => !form.dwellingType, message: 'Please choose Dwelling type.' },
  {
    key: 'yearBuilt',
    isInvalid: (form) => {
      if (!form.yearBuilt.trim()) return true;
      const value = Number(form.yearBuilt);
      return !Number.isInteger(value) || value < 1800 || value > new Date().getFullYear();
    },
    message: 'Year built must be between 1800 and this year.'
  },
  {
    key: 'yearOccupied',
    isInvalid: (form) => {
      if (!form.yearOccupied.trim()) return true;
      const value = Number(form.yearOccupied);
      return !Number.isInteger(value) || value < 1800 || value > new Date().getFullYear();
    },
    message: 'Year occupied must be between 1800 and this year.'
  },
  { key: 'roofType', isInvalid: (form) => !form.roofType, message: 'Please choose Roof type.' },
  { key: 'monthlyElectricityBillRange', isInvalid: (form) => !form.monthlyElectricityBillRange, message: 'Please choose Monthly electricity bill.' },
  { key: 'installTimeline', isInvalid: (form) => !form.installTimeline, message: 'Please choose Installation timeframe.' },
  { key: 'consentToProcess', isInvalid: (form) => !form.consentToProcess, message: 'Please agree to your details being used for this application.' },
  { key: 'consentToGrantAssist', isInvalid: (form) => !form.consentToGrantAssist, message: 'Please confirm you want help with grant and installer follow-up.' },
  { key: 'consentToContact', isInvalid: (form) => !form.consentToContact, message: 'Please agree to be contacted by phone or email.' }
];

function labelise(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function billRangeLabel(value: string) {
  return value
    .replace('UNDER_100', 'Under €100')
    .replace('BETWEEN_100_AND_150', '€100–€150')
    .replace('BETWEEN_150_AND_200', '€150–€200')
    .replace('OVER_200', 'Over €200');
}

function fileLabel(files: File[], emptyLabel: string) {
  if (!files.length) return emptyLabel;
  if (files.length === 1) return files[0].name;
  return `${files.length} files selected`;
}

function toOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  return Number(value);
}

function formatEuro(value: number) {
  return euroFormatter.format(value);
}

function formatEuroRange(range: { min: number; max: number }) {
  return `${formatEuro(range.min)}-${formatEuro(range.max)}`;
}

function formatKwhRange(range: { min: number; max: number }) {
  return `${range.min.toLocaleString('en-IE')}-${range.max.toLocaleString('en-IE')} kWh`;
}

function formatYearsRange(range: { min: number; max: number }) {
  return `${range.min}-${range.max} years`;
}

function formatKwp(value: number) {
  return `${value.toFixed(1)} kWp`;
}

function requiredLabel(text: string) {
  return (
    <>
      {text} <span aria-hidden="true">*</span>
    </>
  );
}

function optionalLabel(text: string) {
  return `${text} (optional)`;
}

function eligibilityLabel(analysis?: EligibilityAnalysis) {
  if (!analysis) return 'Application received';
  return analysis.likelyEligible ? 'Likely eligible, subject to SEAI approval' : 'Needs manual grant review';
}

function getInvalidFields(form: FormState) {
  return validationChecks.filter((check) => check.isInvalid(form)).map((check) => check.key);
}

function getValidationError(form: FormState) {
  const firstInvalid = validationChecks.find((check) => check.isInvalid(form));
  return firstInvalid?.message ?? null;
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function LeadForm({ installerId = fallbackInitialState.installerId }: { installerId?: string }) {
  const [form, setForm] = useState<FormState>(() => createInitialState(installerId));
  const [selectedSystemSize, setSelectedSystemSize] = useState<SystemSizeVariant>('recommended');
  const [billFiles, setBillFiles] = useState<File[]>([]);
  const [meterPhotoFiles, setMeterPhotoFiles] = useState<File[]>([]);
  const [roofPhotoFiles, setRoofPhotoFiles] = useState<File[]>([]);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<FormFieldKey[]>([]);

  const billInputRef = useRef<HTMLInputElement | null>(null);
  const meterInputRef = useRef<HTMLInputElement | null>(null);
  const roofInputRef = useRef<HTMLInputElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const submitLockRef = useRef(false);

  const uploadSummary = useMemo(() => {
    return [
      ...billFiles.map((file) => ({ file, kind: 'electricity_bill' as const })),
      ...meterPhotoFiles.map((file) => ({ file, kind: 'meter_photo' as const })),
      ...roofPhotoFiles.map((file) => ({ file, kind: 'roof_photo' as const }))
    ];
  }, [billFiles, meterPhotoFiles, roofPhotoFiles]);

  const systemSizeOptions = useMemo(() => getSystemSizeOptions(form as SolarQuoteInput), [form]);

  const estimate = useMemo(
    () => buildSolarQuoteEstimate(form as SolarQuoteInput, selectedSystemSize),
    [form, selectedSystemSize]
  );

  const update = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => {
      const nextForm = { ...prev, [key]: value };
      setInvalidFields((current) => current.filter((field) => validationChecks.find((check) => check.key === field)?.isInvalid(nextForm)));
      return nextForm;
    });

  function isFieldInvalid(key: FormFieldKey) {
    return invalidFields.includes(key);
  }

  function handleFileSelection(kind: UploadItem['kind'], event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    if (kind === 'electricity_bill') {
      setBillFiles(selectedFiles.slice(0, 2));
    } else if (kind === 'meter_photo') {
      setMeterPhotoFiles(selectedFiles.slice(0, 3));
    } else {
      setRoofPhotoFiles(selectedFiles.slice(0, 4));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || submitLockRef.current) return;

    submitLockRef.current = true;
    const nextInvalidFields = getInvalidFields(form);
    const validationError = getValidationError(form);
    if (validationError) {
      setInvalidFields(nextInvalidFields);
      setSubmitError(validationError);
      setResult(null);
      setLoading(false);
      submitLockRef.current = false;
      requestAnimationFrame(() => {
        const firstInvalidElement = document.querySelector<HTMLElement>(`[data-field="${nextInvalidFields[0]}"] input, [data-field="${nextInvalidFields[0]}"] select`);
        firstInvalidElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidElement?.focus();
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setSubmitError(null);
    setInvalidFields([]);

    const applicantDocuments: UploadItem[] = [
      ...billFiles.map((file) => ({
        kind: 'electricity_bill' as const,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size
      })),
      ...meterPhotoFiles.map((file) => ({
        kind: 'meter_photo' as const,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size
      })),
      ...roofPhotoFiles.map((file) => ({
        kind: 'roof_photo' as const,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size
      }))
    ];

    const payload = {
      ...form,
      yearBuilt: toOptionalNumber(form.yearBuilt),
      yearOccupied: toOptionalNumber(form.yearOccupied),
      numberOfOccupants: toOptionalNumber(form.numberOfOccupants),
      selectedSystemSizeVariant: selectedSystemSize,
      applicantDocuments
    };

    try {
      console.info('[lead-form] Submitting lead form', {
        email: form.email,
        hasMprn: form.mprn.length > 0,
        applicantDocuments: applicantDocuments.length
      });
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await parseJsonSafely(response);
      console.info('[lead-form] Submit response received', {
        ok: response.ok,
        status: response.status,
        leadId: typeof data?.leadId === 'string' ? data.leadId : undefined
      });
      if (!response.ok) {
        setSubmitError(
          typeof data?.error === 'string'
            ? data.error
            : 'We could not submit your application right now. Please try again.'
        );
        return;
      }

      if (!data || typeof data !== 'object') {
        setSubmitError('We could not confirm your submission. Please try again.');
        return;
      }

      setResult(data);
    } catch (error) {
      console.error('[lead-form] Lead form submission failed', error);
      setSubmitError('We could not submit your application right now. Please check your connection and try again.');
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  }

  function resetForm() {
    setForm(createInitialState(installerId));
    setSelectedSystemSize('recommended');
    setBillFiles([]);
    setMeterPhotoFiles([]);
    setRoofPhotoFiles([]);
    setResult(null);
    setSubmitError(null);
    setInvalidFields([]);
  }

  useEffect(() => {
    if (!result) return;

    successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    successRef.current?.focus();
  }, [result]);

  useEffect(() => {
    setForm(createInitialState(installerId));
    setSelectedSystemSize('recommended');
  }, [installerId]);

  if (result) {
    const quote = result.quoteEstimate;

    return (
      <div ref={successRef} tabIndex={-1} className="application-layout success-layout">
        <aside className="card application-sidebar compact-sidebar">
          <div>
            <div className="eyebrow">Application received</div>
            <h2>You're all set</h2>
          </div>
          <div className="mini-points">
            <div className="mini-point">Reference: {result.leadId}</div>
            <div className="mini-point">Uploads received: {result.uploadedDocuments ?? 0}</div>
            <div className="mini-point">Priority: {result.analysis?.leadTemperature || 'WARM'}</div>
          </div>
        </aside>

        <div className="card thank-you-panel">
          <div className="success-badge">✓ Submitted</div>
          <h2>Thank you for applying</h2>
          <p className="thank-you-copy">Thank you for applying. We will email you when we hear back.</p>
          <p className="small">Your details have been sent for review. If anything else is needed, the installer team will contact you using the details you provided.</p>

          {quote ? (
            <div className="homeowner-result-summary">
              <div className="result-hero-metric">
                <span>Estimated net cost after grant</span>
                <strong>{formatEuroRange(quote.netCostRangeAfterGrant)}</strong>
                <small>Indicative only, subject to survey and SEAI approval.</small>
              </div>
              <div className="result-metric-grid">
                <div><span>Eligibility status</span><strong>{eligibilityLabel(result.analysis)}</strong></div>
                <div><span>Recommended size</span><strong>{formatKwp(quote.recommendedSystemSizeKwp)}</strong></div>
                <div><span>Estimated panels</span><strong>{quote.estimatedPanelCount}</strong></div>
                <div><span>Gross cost range</span><strong>{formatEuroRange(quote.grossCostRange)}</strong></div>
                <div><span>Estimated grant</span><strong>{quote.estimatedSeaiGrantDeduction ? formatEuro(quote.estimatedSeaiGrantDeduction) : 'Review needed'}</strong></div>
                <div><span>Annual savings</span><strong>{formatEuroRange(quote.estimatedAnnualSavingsRange)}</strong></div>
                <div><span>Estimated payback</span><strong>{formatYearsRange(quote.estimatedPaybackRangeYears)}</strong></div>
                <div><span>Recommended extras</span><strong>{quote.recommendedExtras.length ? quote.recommendedExtras.join(', ') : 'Survey first'}</strong></div>
              </div>
              <div className="survey-cta">Book a free solar survey</div>
              <p className="small">Grant eligibility and final grant amount must be confirmed with SEAI. Figures are estimates only.</p>
            </div>
          ) : null}

          <div className="result-list-wrap success-grid">
            <div className="result-panel">
              <div className="eyebrow">What happens next</div>
              <ul className="plain-list compact-list">
                <li>Your details are reviewed by the installer team.</li>
                <li>They check your grant and suitability details.</li>
                <li>They can use your indicative quote to prepare for the survey call.</li>
              </ul>
            </div>
            <div className="result-panel">
              <div className="eyebrow">Your summary</div>
              <p>{result.analysis?.summary}</p>
            </div>
          </div>

          <button type="button" className="secondary" onClick={resetForm}>
            Submit another application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="application-layout">
      <aside className="card application-sidebar compact-sidebar">
        <div>
          <div className="eyebrow">Quick check</div>
          <h2>What we need</h2>
        </div>
        <div className="mini-points">
          <div className="mini-point">Your contact details</div>
          <div className="mini-point">Address and 11-digit MPRN</div>
          <div className="mini-point">A few home details</div>
          <div className="mini-point">Optional photos to speed things up</div>
          <div className="mini-point">Fields marked * are required</div>
        </div>
        <p className="small">Most people finish this in about a minute.</p>
      </aside>

      <form onSubmit={submit} noValidate className="card grid polished-form">
        <div className="form-progress" aria-label="Application progress">
          {['Details', 'Home', 'Estimate', 'Uploads', 'Consent'].map((step, index) => (
            <div key={step} className="progress-step">
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>

        <section className="form-section">
          <div className="section-heading compact-heading">
            <div>
              <div className="eyebrow">Step 1</div>
              <h2>Your details</h2>
            </div>
          </div>
          <div className="grid grid-2">
            <div data-field="fullName"><label htmlFor="fullName" className={isFieldInvalid('fullName') ? 'field-label-error' : undefined}>{requiredLabel('Full name')}</label><input id="fullName" className={isFieldInvalid('fullName') ? 'field-input-error' : undefined} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required /></div>
            <div data-field="email"><label htmlFor="email" className={isFieldInvalid('email') ? 'field-label-error' : undefined}>{requiredLabel('Email')}</label><input id="email" className={isFieldInvalid('email') ? 'field-input-error' : undefined} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></div>
            <div data-field="phone"><label htmlFor="phone" className={isFieldInvalid('phone') ? 'field-label-error' : undefined}>{requiredLabel('Phone')}</label><input id="phone" className={isFieldInvalid('phone') ? 'field-input-error' : undefined} value={form.phone} onChange={(e) => update('phone', e.target.value)} required inputMode="tel" placeholder="Best number to call you on" /></div>
            <div data-field="preferredCallbackWindow">
              <label htmlFor="preferredCallbackWindow" className={isFieldInvalid('preferredCallbackWindow') ? 'field-label-error' : undefined}>{requiredLabel('Best callback time')}</label>
              <select id="preferredCallbackWindow" className={isFieldInvalid('preferredCallbackWindow') ? 'field-input-error' : undefined} value={form.preferredCallbackWindow} onChange={(e) => update('preferredCallbackWindow', e.target.value)} required>
                <option value="">Select one</option>
                {callbackWindows.map((item) => <option key={item} value={item}>{labelise(item)}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading compact-heading">
            <div>
              <div className="eyebrow">Step 2</div>
              <h2>Your home</h2>
            </div>
          </div>
          <div className="grid grid-2">
            <div data-field="addressLine1"><label htmlFor="addressLine1" className={isFieldInvalid('addressLine1') ? 'field-label-error' : undefined}>{requiredLabel('Address line 1')}</label><input id="addressLine1" className={isFieldInvalid('addressLine1') ? 'field-input-error' : undefined} value={form.addressLine1} onChange={(e) => update('addressLine1', e.target.value)} required /></div>
            <div><label htmlFor="addressLine2">{optionalLabel('Address line 2')}</label><input id="addressLine2" value={form.addressLine2} onChange={(e) => update('addressLine2', e.target.value)} /></div>
            <div data-field="county">
              <label htmlFor="county" className={isFieldInvalid('county') ? 'field-label-error' : undefined}>{requiredLabel('County')}</label>
              <select id="county" className={isFieldInvalid('county') ? 'field-input-error' : undefined} value={form.county} onChange={(e) => update('county', e.target.value)} required>
                <option value="">Select county</option>
                {counties.map((county) => <option key={county} value={county}>{county}</option>)}
              </select>
            </div>
            <div><label htmlFor="eircode">{optionalLabel('Eircode')}</label><input id="eircode" value={form.eircode} onChange={(e) => update('eircode', e.target.value.toUpperCase())} placeholder="Optional" /></div>
            <div data-field="mprn"><label htmlFor="mprn" className={isFieldInvalid('mprn') ? 'field-label-error' : undefined}>{requiredLabel('MPRN')}</label><input id="mprn" className={isFieldInvalid('mprn') ? 'field-input-error' : undefined} value={form.mprn} onChange={(e) => update('mprn', e.target.value.replace(/\D/g, '').slice(0, 11))} required inputMode="numeric" pattern="[0-9]*" maxLength={11} placeholder="11-digit meter number" /></div>
            <div data-field="dwellingType">
              <label htmlFor="dwellingType" className={isFieldInvalid('dwellingType') ? 'field-label-error' : undefined}>{requiredLabel('Dwelling type')}</label>
              <select id="dwellingType" className={isFieldInvalid('dwellingType') ? 'field-input-error' : undefined} value={form.dwellingType} onChange={(e) => update('dwellingType', e.target.value)} required>
                <option value="">Select one</option>
                {dwellingTypes.map((type) => <option key={type} value={type}>{labelise(type)}</option>)}
              </select>
            </div>
            <div data-field="yearBuilt"><label htmlFor="yearBuilt" className={isFieldInvalid('yearBuilt') ? 'field-label-error' : undefined}>{requiredLabel('Year built')}</label><input id="yearBuilt" className={isFieldInvalid('yearBuilt') ? 'field-input-error' : undefined} type="number" min="1800" max={new Date().getFullYear()} value={form.yearBuilt} onChange={(e) => update('yearBuilt', e.target.value)} required /></div>
            <div data-field="yearOccupied"><label htmlFor="yearOccupied" className={isFieldInvalid('yearOccupied') ? 'field-label-error' : undefined}>{requiredLabel('Year occupied')}</label><input id="yearOccupied" className={isFieldInvalid('yearOccupied') ? 'field-input-error' : undefined} type="number" min="1800" max={new Date().getFullYear()} value={form.yearOccupied} onChange={(e) => update('yearOccupied', e.target.value)} required /></div>
            <div data-field="roofType">
              <label htmlFor="roofType" className={isFieldInvalid('roofType') ? 'field-label-error' : undefined}>{requiredLabel('Roof type')}</label>
              <select id="roofType" className={isFieldInvalid('roofType') ? 'field-input-error' : undefined} value={form.roofType} onChange={(e) => update('roofType', e.target.value)} required>
                <option value="">Select one</option>
                {roofTypes.map((type) => <option key={type} value={type}>{labelise(type)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="roofDirection">{optionalLabel('Roof direction')}</label>
              <select id="roofDirection" value={form.roofDirection} onChange={(e) => update('roofDirection', e.target.value)}>
                {roofDirections.map((direction) => (
                  <option key={direction} value={direction}>
                    {labelise(direction).replace('East West', 'East/West')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="shadingLevel">{optionalLabel('Shading level')}</label>
              <select id="shadingLevel" value={form.shadingLevel} onChange={(e) => update('shadingLevel', e.target.value)}>
                {shadingLevels.map((level) => <option key={level} value={level}>{labelise(level)}</option>)}
              </select>
            </div>
            <div data-field="monthlyElectricityBillRange">
              <label htmlFor="monthlyElectricityBillRange" className={isFieldInvalid('monthlyElectricityBillRange') ? 'field-label-error' : undefined}>{requiredLabel('Monthly electricity bill')}</label>
              <select id="monthlyElectricityBillRange" className={isFieldInvalid('monthlyElectricityBillRange') ? 'field-input-error' : undefined} value={form.monthlyElectricityBillRange} onChange={(e) => update('monthlyElectricityBillRange', e.target.value)} required>
                <option value="">Select one</option>
                {billRanges.map((item) => <option key={item} value={item}>{billRangeLabel(item)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="numberOfOccupants">{optionalLabel('Number of occupants')}</label>
              <input id="numberOfOccupants" type="number" min="1" max="12" value={form.numberOfOccupants} onChange={(e) => update('numberOfOccupants', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label htmlFor="daytimeUsage">{optionalLabel('Daytime usage')}</label>
              <select id="daytimeUsage" value={form.daytimeUsage} onChange={(e) => update('daytimeUsage', e.target.value)}>
                {daytimeUsages.map((usage) => <option key={usage} value={usage}>{labelise(usage)}</option>)}
              </select>
            </div>
            <div data-field="installTimeline">
              <label htmlFor="installTimeline" className={isFieldInvalid('installTimeline') ? 'field-label-error' : undefined}>{requiredLabel('Installation timeframe')}</label>
              <select id="installTimeline" className={isFieldInvalid('installTimeline') ? 'field-input-error' : undefined} value={form.installTimeline} onChange={(e) => update('installTimeline', e.target.value)} required>
                <option value="">Select one</option>
                {installTimelines.map((item) => <option key={item} value={item}>{labelise(item).replace('Asap', 'ASAP')}</option>)}
              </select>
            </div>
            <div><label htmlFor="notes">{optionalLabel('Anything we should know?')}</label><input id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="toggle-grid">
            <label className="toggle-card"><input type="checkbox" checked={form.propertyOwner} onChange={(e) => update('propertyOwner', e.target.checked)} /> I own the property</label>
            <label className="toggle-card"><input type="checkbox" checked={form.privateLandlord} onChange={(e) => update('privateLandlord', e.target.checked)} /> I am a private landlord</label>
            <label className="toggle-card"><input type="checkbox" checked={form.worksStarted} onChange={(e) => update('worksStarted', e.target.checked)} /> Installation has already started</label>
            <label className="toggle-card"><input type="checkbox" checked={form.priorSolarGrantAtMprn} onChange={(e) => update('priorSolarGrantAtMprn', e.target.checked)} /> This MPRN already got a solar grant</label>
            <label className="toggle-card"><input type="checkbox" checked={form.wantsBattery} onChange={(e) => update('wantsBattery', e.target.checked)} /> I want a battery quote too</label>
            <label className="toggle-card"><input type="checkbox" checked={form.evChargerInterest} onChange={(e) => update('evChargerInterest', e.target.checked)} /> I may want an EV charger</label>
            <label className="toggle-card"><input type="checkbox" checked={form.hotWaterDiverterInterest} onChange={(e) => update('hotWaterDiverterInterest', e.target.checked)} /> I may want a hot water diverter</label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading compact-heading">
            <div>
              <div className="eyebrow">Step 3</div>
              <h2>Solar estimate</h2>
            </div>
          </div>
          <div className="estimate-calculator">
            <div className="estimate-options" role="group" aria-label="Select a solar system size">
              {systemSizeOptions.map((option) => (
                <button
                  key={option.variant}
                  type="button"
                  className={`estimate-option ${selectedSystemSize === option.variant ? 'estimate-option-active' : ''}`}
                  onClick={() => setSelectedSystemSize(option.variant)}
                  aria-pressed={selectedSystemSize === option.variant}
                >
                  <span className="estimate-option-title">
                    {option.label}
                    {option.isRecommended ? <span className="estimate-choice-badge">Best fit</span> : null}
                  </span>
                  <span className="estimate-option-meta">{option.description}</span>
                  <span className="estimate-option-price">{formatKwp(option.systemSizeKwp)}</span>
                  <span className="estimate-option-meta">{option.panelCount} panels at {quoteAssumptions.panelSizeWatts}W</span>
                </button>
              ))}
            </div>
            <div className="estimate-summary">
              <div className="estimate-total-label">Indicative net cost after grant</div>
              <div className="estimate-total">{formatEuroRange(estimate.netCostRangeAfterGrant)}</div>
              <p className="estimate-note">
                Subject to survey and SEAI approval. Grant eligibility and final grant amount must be confirmed with SEAI. Figures are estimates only.
              </p>
              <div className="estimate-rows">
                <div>
                  <span>Recommended system size</span>
                  <strong>{formatKwp(estimate.recommendedSystemSizeKwp)}</strong>
                </div>
                <div>
                  <span>Selected estimate</span>
                  <strong>{formatKwp(estimate.selectedSystemSizeKwp)} / {estimate.estimatedPanelCount} panels</strong>
                </div>
                <div>
                  <span>Gross cost range</span>
                  <strong>{formatEuroRange(estimate.grossCostRange)}</strong>
                </div>
                <div>
                  <span>Estimated SEAI grant deduction</span>
                  <strong>{estimate.estimatedSeaiGrantDeduction ? `-${formatEuro(estimate.estimatedSeaiGrantDeduction)}` : 'Review needed'}</strong>
                </div>
                <div>
                  <span>Annual generation</span>
                  <strong>{formatKwhRange(estimate.estimatedAnnualGenerationKwh)}</strong>
                </div>
                <div>
                  <span>Estimated annual savings</span>
                  <strong>{formatEuroRange(estimate.estimatedAnnualSavingsRange)}</strong>
                </div>
                <div>
                  <span>Estimated payback</span>
                  <strong>{formatYearsRange(estimate.estimatedPaybackRangeYears)}</strong>
                </div>
                <div>
                  <span>Self-consumption assumption</span>
                  <strong>{Math.round(estimate.selfConsumptionRate * 100)}%</strong>
                </div>
              </div>
              <div className={`grant-status ${estimate.grantLikely ? 'grant-status-ok' : 'grant-status-review'}`}>
                {estimate.grantStatus}
              </div>
              {estimate.recommendedExtras.length ? (
                <div className="estimate-extra-list">
                  <span>Selected extras</span>
                  <strong>{estimate.recommendedExtras.join(', ')}</strong>
                </div>
              ) : null}
              {estimate.recommendationNotes.length ? (
                <ul className="plain-list compact-list estimate-notes">
                  {estimate.recommendationNotes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              ) : null}
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading compact-heading">
            <div>
              <div className="eyebrow">Step 4</div>
              <h2>Optional uploads</h2>
            </div>
          </div>
          <div className="upload-grid">
            <div className="upload-card">
              <div>
                <strong>Electricity bill</strong>
                <p className="small">Optional. Helps confirm the property and MPRN faster.</p>
              </div>
              <input ref={billInputRef} type="file" accept="image/*,.pdf" multiple onChange={(event) => handleFileSelection('electricity_bill', event)} className="file-input-hidden" />
              <button type="button" className="upload-button" onClick={() => billInputRef.current?.click()}>Choose file</button>
              <div className="file-selected-text">{fileLabel(billFiles, 'No file chosen')}</div>
            </div>

            <div className="upload-card">
              <div>
                <strong>Electricity meter photo</strong>
                <p className="small">Optional. Useful if the installer needs to verify the meter details.</p>
              </div>
              <input ref={meterInputRef} type="file" accept="image/*" multiple onChange={(event) => handleFileSelection('meter_photo', event)} className="file-input-hidden" />
              <button type="button" className="upload-button" onClick={() => meterInputRef.current?.click()}>Choose file</button>
              <div className="file-selected-text">{fileLabel(meterPhotoFiles, 'No file chosen')}</div>
            </div>

            <div className="upload-card upload-card-wide">
              <div>
                <strong>Roof / panel area photo</strong>
                <p className="small">Optional. A quick photo of the roof or install area can help with the first review.</p>
              </div>
              <input ref={roofInputRef} type="file" accept="image/*" multiple onChange={(event) => handleFileSelection('roof_photo', event)} className="file-input-hidden" />
              <button type="button" className="upload-button" onClick={() => roofInputRef.current?.click()}>Choose file</button>
              <div className="file-selected-text">{fileLabel(roofPhotoFiles, 'No file chosen')}</div>
            </div>
          </div>
          {!!uploadSummary.length && <div className="small">{uploadSummary.length} upload{uploadSummary.length > 1 ? 's' : ''} ready to submit.</div>}
        </section>

        <section className="form-section">
          <div className="section-heading compact-heading">
            <div>
              <div className="eyebrow">Step 5</div>
              <h2>Consent</h2>
            </div>
          </div>
          <div className="toggle-grid consent-grid">
            <label className={`toggle-card ${isFieldInvalid('consentToProcess') ? 'toggle-card-error' : ''}`}>
              <input type="checkbox" checked={form.consentToProcess} onChange={(e) => update('consentToProcess', e.target.checked)} required />
              {requiredLabel('I agree to my details being used for this application')}
            </label>
            <label className={`toggle-card ${isFieldInvalid('consentToGrantAssist') ? 'toggle-card-error' : ''}`}>
              <input type="checkbox" checked={form.consentToGrantAssist} onChange={(e) => update('consentToGrantAssist', e.target.checked)} required />
              {requiredLabel('I want help with grant and installer follow-up')}
            </label>
            <label className={`toggle-card ${isFieldInvalid('consentToContact') ? 'toggle-card-error' : ''}`}>
              <input type="checkbox" checked={form.consentToContact} onChange={(e) => update('consentToContact', e.target.checked)} required />
              {requiredLabel('I agree to be contacted by phone or email')}
            </label>
          </div>
        </section>

        {submitError && <div ref={errorRef} className="error-banner">{submitError}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Apply now'}</button>
      </form>
    </div>
  );
}
