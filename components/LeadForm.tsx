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
import type { GeneratedInstallerQuote } from '@/lib/installer-quote-pricing';

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
    consentToProcess: false,
    consentToGrantAssist: false,
    consentToContact: false,
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
  generatedQuote?: GeneratedInstallerQuote;
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

const formSteps: Array<{
  id: string;
  title: string;
  helper: string;
  fields: FormFieldKey[];
}> = [
  {
    id: 'property',
    title: 'Quick property check',
    helper: 'A few simple property details help us start the grant and suitability check.',
    fields: ['county', 'dwellingType']
  },
  {
    id: 'usage',
    title: 'Electricity usage',
    helper: 'This helps estimate your likely system size.',
    fields: ['monthlyElectricityBillRange']
  },
  {
    id: 'roof',
    title: 'Roof suitability',
    helper: 'Unsure is fine, we can confirm during survey.',
    fields: ['roofType']
  },
  {
    id: 'options',
    title: 'Solar options',
    helper: 'Choose the extras you may want included in the survey discussion.',
    fields: ['installTimeline']
  },
  {
    id: 'grant',
    title: 'SEAI grant checks',
    helper: 'These answers help estimate grant fit, subject to SEAI approval.',
    fields: ['yearBuilt', 'yearOccupied', 'mprn']
  },
  {
    id: 'contact',
    title: 'Contact and consent',
    helper: 'Last step: where should the installer send your survey follow-up?',
    fields: ['fullName', 'email', 'phone', 'preferredCallbackWindow', 'addressLine1', 'consentToProcess', 'consentToGrantAssist', 'consentToContact']
  }
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

function getInvalidFields(form: FormState, fields?: FormFieldKey[]) {
  return validationChecks
    .filter((check) => !fields || fields.includes(check.key))
    .filter((check) => check.isInvalid(form))
    .map((check) => check.key);
}

function getValidationError(form: FormState, fields?: FormFieldKey[]) {
  const firstInvalid = validationChecks
    .filter((check) => !fields || fields.includes(check.key))
    .find((check) => check.isInvalid(form));
  return firstInvalid?.message ?? null;
}

function getFieldValidationMessage(form: FormState, field: FormFieldKey) {
  const check = validationChecks.find((item) => item.key === field);
  return check?.isInvalid(form) ? check.message : null;
}

function getStepIndexForField(field: FormFieldKey) {
  const stepIndex = formSteps.findIndex((step) => step.fields.includes(field));
  return stepIndex === -1 ? 0 : stepIndex;
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
  const [currentStep, setCurrentStep] = useState(0);

  const formRef = useRef<HTMLFormElement | null>(null);
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

  const activeStep = formSteps[currentStep] ?? formSteps[0];
  const isFirstStep = currentStep === 0;
  const isFinalStep = currentStep === formSteps.length - 1;
  const progressPercent = ((currentStep + 1) / formSteps.length) * 100;

  const update = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => {
      const nextForm = { ...prev, [key]: value };
      setInvalidFields((current) => current.filter((field) => validationChecks.find((check) => check.key === field)?.isInvalid(nextForm)));
      return nextForm;
    });

  function isFieldInvalid(key: FormFieldKey) {
    return invalidFields.includes(key);
  }

  function renderFieldError(key: FormFieldKey) {
    if (!isFieldInvalid(key)) return null;
    const message = getFieldValidationMessage(form, key);
    return message ? (
      <p id={`${key}-error`} className="field-error-message">
        {message}
      </p>
    ) : null;
  }

  function focusFirstInvalidField(field?: FormFieldKey) {
    if (!field) return;

    requestAnimationFrame(() => {
      const firstInvalidElement = document.querySelector<HTMLElement>(
        `[data-field="${field}"] input, [data-field="${field}"] select, [data-field="${field}"] textarea`
      );
      firstInvalidElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalidElement?.focus();
    });
  }

  function validateStepFields(fields: FormFieldKey[]) {
    const nextInvalidFields = getInvalidFields(form, fields);
    const validationError = getValidationError(form, fields);

    if (validationError) {
      setInvalidFields(nextInvalidFields);
      setSubmitError(validationError);
      focusFirstInvalidField(nextInvalidFields[0]);
      return false;
    }

    setInvalidFields((current) => current.filter((field) => !fields.includes(field)));
    setSubmitError(null);
    return true;
  }

  function scrollFormToTop() {
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function continueStep() {
    if (!validateStepFields(activeStep.fields)) return;

    setCurrentStep((step) => Math.min(step + 1, formSteps.length - 1));
    scrollFormToTop();
  }

  function backStep() {
    setSubmitError(null);
    setInvalidFields([]);
    setCurrentStep((step) => Math.max(step - 1, 0));
    scrollFormToTop();
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
      setCurrentStep(getStepIndexForField(nextInvalidFields[0]));
      focusFirstInvalidField(nextInvalidFields[0]);
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
    setCurrentStep(0);
  }

  useEffect(() => {
    if (!result) return;

    successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    successRef.current?.focus();
  }, [result]);

  useEffect(() => {
    setForm(createInitialState(installerId));
    setSelectedSystemSize('recommended');
    setCurrentStep(0);
  }, [installerId]);

  function renderEstimatePreview(includeGrant = false) {
    const grantCopy = estimate.grantLikely
      ? `You may be eligible for up to ${formatEuro(estimate.potentialSeaiGrant)} in SEAI support, subject to SEAI approval.`
      : 'SEAI support needs manual review before a grant deduction is treated as likely.';

    return (
      <div className="step-preview-panel" aria-live="polite">
        <div className="step-preview-copy">
          <div className="eyebrow">Indicative preview</div>
          <h3>Based on your answers, you may be suited to around {formatKwp(estimate.recommendedSystemSizeKwp)}.</h3>
          <p className="small">Figures are indicative and subject to final survey.</p>
        </div>
        <div className="step-preview-grid">
          <div>
            <span>Panels</span>
            <strong>{estimate.recommendedPanelCount}</strong>
          </div>
          <div>
            <span>Net estimate</span>
            <strong>{formatEuroRange(estimate.netCostRangeAfterGrant)}</strong>
          </div>
          <div>
            <span>Annual savings</span>
            <strong>{formatEuroRange(estimate.estimatedAnnualSavingsRange)}</strong>
          </div>
        </div>
        {includeGrant ? <p className="small grant-preview-copy">{grantCopy}</p> : null}
      </div>
    );
  }

  function renderStepContent() {
    switch (activeStep.id) {
      case 'property':
        return (
          <section className="form-section">
            <div className="section-heading compact-heading">
              <div>
                <div className="eyebrow">Quick property check</div>
                <h2>Start with the home</h2>
              </div>
            </div>
            <p className="step-helper">This first check is deliberately short. It helps us understand the property and likely grant route.</p>
            <div className="grid grid-2">
              <div data-field="county">
                <label htmlFor="county" className={isFieldInvalid('county') ? 'field-label-error' : undefined}>
                  {requiredLabel('County')}
                </label>
                <select
                  id="county"
                  className={isFieldInvalid('county') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('county')}
                  aria-describedby={isFieldInvalid('county') ? 'county-error' : undefined}
                  value={form.county}
                  onChange={(e) => update('county', e.target.value)}
                  required
                >
                  <option value="">Select county</option>
                  {counties.map((county) => <option key={county} value={county}>{county}</option>)}
                </select>
                {renderFieldError('county')}
              </div>
              <div>
                <label htmlFor="eircode">{optionalLabel('Eircode')}</label>
                <input
                  id="eircode"
                  value={form.eircode}
                  onChange={(e) => update('eircode', e.target.value.toUpperCase())}
                  placeholder="Optional"
                />
              </div>
              <div data-field="dwellingType">
                <label htmlFor="dwellingType" className={isFieldInvalid('dwellingType') ? 'field-label-error' : undefined}>
                  {requiredLabel('Dwelling type')}
                </label>
                <select
                  id="dwellingType"
                  className={isFieldInvalid('dwellingType') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('dwellingType')}
                  aria-describedby={isFieldInvalid('dwellingType') ? 'dwellingType-error' : undefined}
                  value={form.dwellingType}
                  onChange={(e) => update('dwellingType', e.target.value)}
                  required
                >
                  <option value="">Select one</option>
                  {dwellingTypes.map((type) => <option key={type} value={type}>{labelise(type)}</option>)}
                </select>
                {renderFieldError('dwellingType')}
              </div>
            </div>
            <div className="toggle-grid">
              <label className="toggle-card">
                <input type="checkbox" checked={form.propertyOwner} onChange={(e) => update('propertyOwner', e.target.checked)} />
                I own the property
              </label>
              <label className="toggle-card">
                <input type="checkbox" checked={form.privateLandlord} onChange={(e) => update('privateLandlord', e.target.checked)} />
                I am a private landlord
              </label>
            </div>
          </section>
        );

      case 'usage':
        return (
          <section className="form-section">
            <div className="section-heading compact-heading">
              <div>
                <div className="eyebrow">Electricity usage</div>
                <h2>Estimate the demand</h2>
              </div>
            </div>
            <p className="step-helper">This helps estimate your likely system size.</p>
            <div className="grid grid-2">
              <div data-field="monthlyElectricityBillRange">
                <label
                  htmlFor="monthlyElectricityBillRange"
                  className={isFieldInvalid('monthlyElectricityBillRange') ? 'field-label-error' : undefined}
                >
                  {requiredLabel('Monthly electricity bill')}
                </label>
                <select
                  id="monthlyElectricityBillRange"
                  className={isFieldInvalid('monthlyElectricityBillRange') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('monthlyElectricityBillRange')}
                  aria-describedby={isFieldInvalid('monthlyElectricityBillRange') ? 'monthlyElectricityBillRange-error' : undefined}
                  value={form.monthlyElectricityBillRange}
                  onChange={(e) => update('monthlyElectricityBillRange', e.target.value)}
                  required
                >
                  <option value="">Select one</option>
                  {billRanges.map((item) => <option key={item} value={item}>{billRangeLabel(item)}</option>)}
                </select>
                {renderFieldError('monthlyElectricityBillRange')}
              </div>
              <div>
                <label htmlFor="numberOfOccupants">{optionalLabel('Number of occupants')}</label>
                <input
                  id="numberOfOccupants"
                  type="number"
                  min="1"
                  max="12"
                  value={form.numberOfOccupants}
                  onChange={(e) => update('numberOfOccupants', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label htmlFor="daytimeUsage">{optionalLabel('Daytime usage')}</label>
                <select id="daytimeUsage" value={form.daytimeUsage} onChange={(e) => update('daytimeUsage', e.target.value)}>
                  {daytimeUsages.map((usage) => <option key={usage} value={usage}>{labelise(usage)}</option>)}
                </select>
                <p className="field-help">Higher daytime use can improve estimated self-consumption.</p>
              </div>
            </div>
          </section>
        );

      case 'roof':
        return (
          <section className="form-section">
            <div className="section-heading compact-heading">
              <div>
                <div className="eyebrow">Roof suitability</div>
                <h2>Tell us what you know</h2>
              </div>
            </div>
            <p className="step-helper">Unsure is fine, we can confirm during survey.</p>
            <div className="grid grid-2">
              <div data-field="roofType">
                <label htmlFor="roofType" className={isFieldInvalid('roofType') ? 'field-label-error' : undefined}>
                  {requiredLabel('Roof type')}
                </label>
                <select
                  id="roofType"
                  className={isFieldInvalid('roofType') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('roofType')}
                  aria-describedby={isFieldInvalid('roofType') ? 'roofType-error' : undefined}
                  value={form.roofType}
                  onChange={(e) => update('roofType', e.target.value)}
                  required
                >
                  <option value="">Select one</option>
                  {roofTypes.map((type) => <option key={type} value={type}>{labelise(type)}</option>)}
                </select>
                {renderFieldError('roofType')}
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
            </div>
          </section>
        );

      case 'options':
        return (
          <section className="form-section">
            <div className="section-heading compact-heading">
              <div>
                <div className="eyebrow">Solar options</div>
                <h2>Choose the likely package</h2>
              </div>
            </div>
            <p className="step-helper">The selector below is a recommendation guide, not a final design.</p>
            <div className="toggle-grid">
              <label className="toggle-card">
                <input type="checkbox" checked={form.wantsBattery} onChange={(e) => update('wantsBattery', e.target.checked)} />
                I want a battery quote too
              </label>
              <label className="toggle-card">
                <input type="checkbox" checked={form.evChargerInterest} onChange={(e) => update('evChargerInterest', e.target.checked)} />
                I may want an EV charger
              </label>
              <label className="toggle-card">
                <input
                  type="checkbox"
                  checked={form.hotWaterDiverterInterest}
                  onChange={(e) => update('hotWaterDiverterInterest', e.target.checked)}
                />
                I may want a hot water diverter
              </label>
            </div>
            <div className="grid grid-2">
              <div data-field="installTimeline">
                <label htmlFor="installTimeline" className={isFieldInvalid('installTimeline') ? 'field-label-error' : undefined}>
                  {requiredLabel('Installation timeframe')}
                </label>
                <select
                  id="installTimeline"
                  className={isFieldInvalid('installTimeline') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('installTimeline')}
                  aria-describedby={isFieldInvalid('installTimeline') ? 'installTimeline-error' : undefined}
                  value={form.installTimeline}
                  onChange={(e) => update('installTimeline', e.target.value)}
                  required
                >
                  <option value="">Select one</option>
                  {installTimelines.map((item) => <option key={item} value={item}>{labelise(item).replace('Asap', 'ASAP')}</option>)}
                </select>
                {renderFieldError('installTimeline')}
              </div>
            </div>
            <div className="estimate-calculator step-estimate-calculator">
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
              <div className="estimate-summary compact-estimate-summary">
                <div className="estimate-total-label">Indicative net cost after grant</div>
                <div className="estimate-total">{formatEuroRange(estimate.netCostRangeAfterGrant)}</div>
                <p className="estimate-note">Subject to survey and SEAI approval. Figures are estimates only.</p>
                <div className="estimate-rows">
                  <div>
                    <span>Selected estimate</span>
                    <strong>{formatKwp(estimate.selectedSystemSizeKwp)} / {estimate.estimatedPanelCount} panels</strong>
                  </div>
                  <div>
                    <span>Annual generation</span>
                    <strong>{formatKwhRange(estimate.estimatedAnnualGenerationKwh)}</strong>
                  </div>
                  <div>
                    <span>Self-consumption</span>
                    <strong>{Math.round(estimate.selfConsumptionRate * 100)}%</strong>
                  </div>
                </div>
              </div>
            </div>
            {renderEstimatePreview()}
          </section>
        );

      case 'grant':
        return (
          <section className="form-section">
            <div className="section-heading compact-heading">
              <div>
                <div className="eyebrow">SEAI grant checks</div>
                <h2>Check grant fit</h2>
              </div>
            </div>
            <p className="step-helper">Grant eligibility and final grant amount must be confirmed with SEAI.</p>
            <div className="grid grid-2">
              <div data-field="yearBuilt">
                <label htmlFor="yearBuilt" className={isFieldInvalid('yearBuilt') ? 'field-label-error' : undefined}>
                  {requiredLabel('Year built')}
                </label>
                <input
                  id="yearBuilt"
                  className={isFieldInvalid('yearBuilt') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('yearBuilt')}
                  aria-describedby={isFieldInvalid('yearBuilt') ? 'yearBuilt-error' : undefined}
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={form.yearBuilt}
                  onChange={(e) => update('yearBuilt', e.target.value)}
                  required
                />
                {renderFieldError('yearBuilt')}
              </div>
              <div data-field="yearOccupied">
                <label htmlFor="yearOccupied" className={isFieldInvalid('yearOccupied') ? 'field-label-error' : undefined}>
                  {requiredLabel('Year occupied')}
                </label>
                <input
                  id="yearOccupied"
                  className={isFieldInvalid('yearOccupied') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('yearOccupied')}
                  aria-describedby={isFieldInvalid('yearOccupied') ? 'yearOccupied-error' : undefined}
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={form.yearOccupied}
                  onChange={(e) => update('yearOccupied', e.target.value)}
                  required
                />
                {renderFieldError('yearOccupied')}
              </div>
              <div data-field="mprn">
                <label htmlFor="mprn" className={isFieldInvalid('mprn') ? 'field-label-error' : undefined}>
                  {requiredLabel('MPRN')}
                </label>
                <input
                  id="mprn"
                  className={isFieldInvalid('mprn') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('mprn')}
                  aria-describedby={isFieldInvalid('mprn') ? 'mprn-error mprn-help' : 'mprn-help'}
                  value={form.mprn}
                  onChange={(e) => update('mprn', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  placeholder="11-digit meter number"
                />
                <p id="mprn-help" className="field-help">Usually on your bill or meter. We use it for grant checks.</p>
                {renderFieldError('mprn')}
              </div>
            </div>
            <div className="toggle-grid">
              <label className="toggle-card">
                <input type="checkbox" checked={form.worksStarted} onChange={(e) => update('worksStarted', e.target.checked)} />
                Installation has already started
              </label>
              <label className="toggle-card">
                <input
                  type="checkbox"
                  checked={form.priorSolarGrantAtMprn}
                  onChange={(e) => update('priorSolarGrantAtMprn', e.target.checked)}
                />
                This MPRN already got a solar grant
              </label>
            </div>
            {renderEstimatePreview(true)}
          </section>
        );

      case 'contact':
      default:
        return (
          <section className="form-section">
            <div className="section-heading compact-heading">
              <div>
                <div className="eyebrow">Contact and consent</div>
                <h2>Where should we send it?</h2>
              </div>
            </div>
            <p className="step-helper">Last step. Uploads are optional and help the installer prepare faster.</p>
            <div className="grid grid-2">
              <div data-field="fullName">
                <label htmlFor="fullName" className={isFieldInvalid('fullName') ? 'field-label-error' : undefined}>
                  {requiredLabel('Full name')}
                </label>
                <input
                  id="fullName"
                  className={isFieldInvalid('fullName') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('fullName')}
                  aria-describedby={isFieldInvalid('fullName') ? 'fullName-error' : undefined}
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  required
                />
                {renderFieldError('fullName')}
              </div>
              <div data-field="email">
                <label htmlFor="email" className={isFieldInvalid('email') ? 'field-label-error' : undefined}>
                  {requiredLabel('Email')}
                </label>
                <input
                  id="email"
                  className={isFieldInvalid('email') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('email')}
                  aria-describedby={isFieldInvalid('email') ? 'email-error' : undefined}
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                />
                {renderFieldError('email')}
              </div>
              <div data-field="phone">
                <label htmlFor="phone" className={isFieldInvalid('phone') ? 'field-label-error' : undefined}>
                  {requiredLabel('Phone')}
                </label>
                <input
                  id="phone"
                  className={isFieldInvalid('phone') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('phone')}
                  aria-describedby={isFieldInvalid('phone') ? 'phone-error' : undefined}
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  required
                  inputMode="tel"
                  placeholder="Best number to call you on"
                />
                {renderFieldError('phone')}
              </div>
              <div data-field="preferredCallbackWindow">
                <label
                  htmlFor="preferredCallbackWindow"
                  className={isFieldInvalid('preferredCallbackWindow') ? 'field-label-error' : undefined}
                >
                  {requiredLabel('Best callback time')}
                </label>
                <select
                  id="preferredCallbackWindow"
                  className={isFieldInvalid('preferredCallbackWindow') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('preferredCallbackWindow')}
                  aria-describedby={isFieldInvalid('preferredCallbackWindow') ? 'preferredCallbackWindow-error' : undefined}
                  value={form.preferredCallbackWindow}
                  onChange={(e) => update('preferredCallbackWindow', e.target.value)}
                  required
                >
                  <option value="">Select one</option>
                  {callbackWindows.map((item) => <option key={item} value={item}>{labelise(item)}</option>)}
                </select>
                {renderFieldError('preferredCallbackWindow')}
              </div>
              <div data-field="addressLine1">
                <label htmlFor="addressLine1" className={isFieldInvalid('addressLine1') ? 'field-label-error' : undefined}>
                  {requiredLabel('Address line 1')}
                </label>
                <input
                  id="addressLine1"
                  className={isFieldInvalid('addressLine1') ? 'field-input-error' : undefined}
                  aria-invalid={isFieldInvalid('addressLine1')}
                  aria-describedby={isFieldInvalid('addressLine1') ? 'addressLine1-error' : undefined}
                  value={form.addressLine1}
                  onChange={(e) => update('addressLine1', e.target.value)}
                  required
                />
                {renderFieldError('addressLine1')}
              </div>
              <div>
                <label htmlFor="addressLine2">{optionalLabel('Address line 2')}</label>
                <input id="addressLine2" value={form.addressLine2} onChange={(e) => update('addressLine2', e.target.value)} />
              </div>
              <div>
                <label htmlFor="notes">{optionalLabel('Anything we should know?')}</label>
                <input id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="upload-grid">
              <div className="upload-card">
                <div>
                  <strong>Electricity bill</strong>
                  <p className="small">Optional. Helps confirm the property and MPRN faster.</p>
                </div>
                <input
                  ref={billInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(event) => handleFileSelection('electricity_bill', event)}
                  className="file-input-hidden"
                />
                <button type="button" className="upload-button" onClick={() => billInputRef.current?.click()}>Choose file</button>
                <div className="file-selected-text">{fileLabel(billFiles, 'No file chosen')}</div>
              </div>

              <div className="upload-card">
                <div>
                  <strong>Electricity meter photo</strong>
                  <p className="small">Optional. Useful if the installer needs to verify the meter details.</p>
                </div>
                <input
                  ref={meterInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleFileSelection('meter_photo', event)}
                  className="file-input-hidden"
                />
                <button type="button" className="upload-button" onClick={() => meterInputRef.current?.click()}>Choose file</button>
                <div className="file-selected-text">{fileLabel(meterPhotoFiles, 'No file chosen')}</div>
              </div>

              <div className="upload-card upload-card-wide">
                <div>
                  <strong>Roof / panel area photo</strong>
                  <p className="small">Optional. A quick photo of the roof or install area can help with the first review.</p>
                </div>
                <input
                  ref={roofInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleFileSelection('roof_photo', event)}
                  className="file-input-hidden"
                />
                <button type="button" className="upload-button" onClick={() => roofInputRef.current?.click()}>Choose file</button>
                <div className="file-selected-text">{fileLabel(roofPhotoFiles, 'No file chosen')}</div>
              </div>
            </div>
            {!!uploadSummary.length && <div className="small">{uploadSummary.length} upload{uploadSummary.length > 1 ? 's' : ''} ready to submit.</div>}

            <div className="privacy-notice">
              <div className="privacy-badge">GDPR-conscious intake</div>
              <p>
                We use your details to check solar grant eligibility and arrange installer follow-up. This may include your
                MPRN, address, contact details, property details, electricity usage, notes, and optional uploads. You can
                request deletion of your homeowner record.
              </p>
              <div className="privacy-links">
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms</a>
                <a href="/data-protection">Data protection</a>
              </div>
            </div>

            <div className="toggle-grid consent-grid">
              <label data-field="consentToProcess" className={`toggle-card ${isFieldInvalid('consentToProcess') ? 'toggle-card-error' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.consentToProcess}
                  onChange={(e) => update('consentToProcess', e.target.checked)}
                  aria-invalid={isFieldInvalid('consentToProcess')}
                  aria-describedby={isFieldInvalid('consentToProcess') ? 'consentToProcess-error' : undefined}
                  required
                />
                <span>
                  {requiredLabel('I agree that my data can be used for the solar grant eligibility check')}
                  {renderFieldError('consentToProcess')}
                </span>
              </label>
              <label data-field="consentToGrantAssist" className={`toggle-card ${isFieldInvalid('consentToGrantAssist') ? 'toggle-card-error' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.consentToGrantAssist}
                  onChange={(e) => update('consentToGrantAssist', e.target.checked)}
                  aria-invalid={isFieldInvalid('consentToGrantAssist')}
                  aria-describedby={isFieldInvalid('consentToGrantAssist') ? 'consentToGrantAssist-error' : undefined}
                  required
                />
                <span>
                  {requiredLabel('I want SOLARgrant and the installer to help with grant readiness and follow-up')}
                  {renderFieldError('consentToGrantAssist')}
                </span>
              </label>
              <label data-field="consentToContact" className={`toggle-card ${isFieldInvalid('consentToContact') ? 'toggle-card-error' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.consentToContact}
                  onChange={(e) => update('consentToContact', e.target.checked)}
                  aria-invalid={isFieldInvalid('consentToContact')}
                  aria-describedby={isFieldInvalid('consentToContact') ? 'consentToContact-error' : undefined}
                  required
                />
                <span>
                  {requiredLabel('I agree to be contacted by phone or email about this solar grant enquiry')}
                  {renderFieldError('consentToContact')}
                </span>
              </label>
            </div>
          </section>
        );
    }
  }

  if (result) {
    const quote = result.quoteEstimate;
    const generatedQuote = result.generatedQuote;

    return (
      <div ref={successRef} tabIndex={-1} className="application-layout success-layout">
        <aside className="card application-sidebar compact-sidebar">
          <div>
            <div className="eyebrow">Application received</div>
            <h2>You&apos;re all set</h2>
          </div>
          <div className="mini-points">
            <div className="mini-point">Reference: {result.leadId}</div>
            <div className="mini-point">Uploads received: {result.uploadedDocuments ?? 0}</div>
            <div className="mini-point">Priority: {result.analysis?.leadTemperature || 'WARM'}</div>
          </div>
        </aside>

        <div className="card thank-you-panel">
          <div className="success-badge">Submitted</div>
          <h2>Thank you for applying</h2>
          <p className="thank-you-copy">Thank you for applying. We will email you when we hear back.</p>
          <p className="small">Your details have been sent for review. If anything else is needed, the installer team will contact you using the details you provided.</p>

          {quote ? (
            <div className="homeowner-result-summary">
              <div className="result-hero-metric">
                <span>{generatedQuote ? 'Generated quote total' : 'Estimated net cost after grant'}</span>
                <strong>{generatedQuote ? formatEuro(generatedQuote.finalQuoteTotal) : formatEuroRange(quote.netCostRangeAfterGrant)}</strong>
                <small>
                  {generatedQuote
                    ? 'Generated using the installer pricing settings. Final quote remains subject to survey and SEAI approval.'
                    : 'Indicative only, subject to survey and SEAI approval.'}
                </small>
              </div>
              <div className="result-metric-grid">
                <div><span>Eligibility status</span><strong>{eligibilityLabel(result.analysis)}</strong></div>
                <div><span>Recommended size</span><strong>{formatKwp(quote.recommendedSystemSizeKwp)}</strong></div>
                <div><span>Estimated panels</span><strong>{quote.estimatedPanelCount}</strong></div>
                {generatedQuote ? <div><span>AI net estimate</span><strong>{formatEuroRange(quote.netCostRangeAfterGrant)}</strong></div> : null}
                <div><span>Gross cost range</span><strong>{formatEuroRange(quote.grossCostRange)}</strong></div>
                <div><span>Estimated grant</span><strong>{quote.estimatedSeaiGrantDeduction ? formatEuro(quote.estimatedSeaiGrantDeduction) : 'Review needed'}</strong></div>
                <div><span>Annual savings</span><strong>{formatEuroRange(quote.estimatedAnnualSavingsRange)}</strong></div>
                <div><span>Estimated payback</span><strong>{formatYearsRange(quote.estimatedPaybackRangeYears)}</strong></div>
                <div><span>Recommended extras</span><strong>{quote.recommendedExtras.length ? quote.recommendedExtras.join(', ') : 'Survey first'}</strong></div>
                <div><span>Recommended next action</span><strong>{quote.recommendedNextAction}</strong></div>
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
      <aside className="card application-sidebar compact-sidebar step-sidebar">
        <div>
          <div className="eyebrow">Quick check</div>
          <h2>Quote and grant assistant</h2>
        </div>
        <div className="step-sidebar-list" aria-label="Application steps">
          {formSteps.map((step, index) => {
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <div
                key={step.id}
                className={`step-sidebar-item ${isActive ? 'step-sidebar-item-active' : ''} ${isComplete ? 'step-sidebar-item-complete' : ''}`}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{isComplete ? 'Complete' : isActive ? 'In progress' : 'Coming up'}</small>
                </div>
              </div>
            );
          })}
        </div>
        <div className="sidebar-trust-note">
          <strong>GDPR-conscious controls</strong>
          <p className="small">Fields marked * are required. Estimates are indicative and subject to survey.</p>
          <div className="privacy-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </aside>

      <form ref={formRef} onSubmit={submit} noValidate className="card grid polished-form stepped-form">
        <div className="step-progress-panel" aria-label="Application progress">
          <div className="step-progress-meta">
            <span>Step {currentStep + 1} of {formSteps.length}</span>
            <strong>{activeStep.title}</strong>
          </div>
          <div className="step-progress-track" aria-hidden="true">
            <div className="step-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p>{activeStep.helper}</p>
        </div>

        {renderStepContent()}

        {submitError && <div ref={errorRef} className="error-banner" role="alert">{submitError}</div>}

        <div className="step-actions">
          <button type="button" className="secondary" onClick={backStep} disabled={isFirstStep || loading}>
            Back
          </button>
          {isFinalStep ? (
            <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit and view estimate'}</button>
          ) : (
            <button type="button" onClick={continueStep}>Continue</button>
          )}
        </div>
      </form>
    </div>
  );
}
