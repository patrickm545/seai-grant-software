import type { Installer, Lead, LeadDocument } from '@prisma/client';

type SalesSignal = {
  callbackWindow?: string;
  preferredCallbackWindow?: string;
  installTimeline?: string;
  monthlyElectricityBillRange?: string;
  roofType?: string;
  batteryInterest?: boolean;
  wantsBattery?: boolean;
  leadTemperature?: string;
};

type LeadForApplicationPack = Lead & {
  installer: Installer;
  documents?: LeadDocument[];
};

export type ReadinessItem = {
  id: string;
  label: string;
  complete: boolean;
  missingMessage: string;
};

export type ApplicationPackField = {
  label: string;
  value: string;
  missing?: boolean;
};

export type ApplicationPackSection = {
  id: string;
  title: string;
  fields: ApplicationPackField[];
  copyText: string;
};

export type ApplicationPackDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  fileType: string;
  categoryKey: string;
  category: string;
  uploadCategory: string;
  previewUrl: string | null;
  storageUrl: string | null;
  uploadedAt: string;
};

export type ApplicationPack = {
  version: string;
  generatedAt: string;
  leadId: string;
  applicantName: string;
  status: string;
  isReady: boolean;
  readinessLabel: 'Ready for SEAI Submission' | 'Needs More Information';
  manualAssistNotice: string;
  checklist: ReadinessItem[];
  missingItems: string[];
  documents: ApplicationPackDocument[];
  sections: ApplicationPackSection[];
};

const REQUIRED_DOCUMENTS = [
  { key: 'electricity_bill', label: 'Electricity bill', missingMessage: 'Missing electricity bill' },
  { key: 'meter_photo', label: 'Meter photo', missingMessage: 'Missing meter photo' },
  { key: 'roof_photo', label: 'Roof / solar panel area photo', missingMessage: 'Missing roof / solar panel area photo' }
];

function parseJsonValue(value: unknown) {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  const parsed = parseJsonValue(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
}

function asStringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function getSalesSignal(lead: Lead): SalesSignal {
  const root = asRecord(lead.structuredExportJson);
  const signal = asRecord(root?.salesSignal);
  return signal ? (signal as SalesSignal) : {};
}

function clean(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function formatValue(value: unknown, emptyLabel = 'Not supplied') {
  if (value === null || value === undefined) return emptyLabel;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : emptyLabel;

  const text = String(value).trim();
  return text ? text : emptyLabel;
}

function formatOptional(value: string | null | undefined, emptyLabel = 'Not supplied') {
  return clean(value) || emptyLabel;
}

function formatEnum(value: unknown, emptyLabel = 'Not supplied') {
  const text = formatValue(value, emptyLabel);
  return text === emptyLabel ? text : text.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date | string | null | undefined, emptyLabel = 'Not set') {
  if (!value) return emptyLabel;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return date.toISOString().slice(0, 10);
}

function isUsableLink(value: string | null | undefined) {
  return !!value && (/^https?:\/\//i.test(value) || value.startsWith('/'));
}

function getDocumentKind(document: LeadDocument) {
  const fields = asRecord(document.aiFieldsJson);
  const storedKind = typeof fields?.documentKind === 'string' ? fields.documentKind : null;

  if (storedKind && REQUIRED_DOCUMENTS.some((item) => item.key === storedKind)) {
    return storedKind;
  }

  const text = `${document.fileName} ${document.extractedText ?? ''}`.toLowerCase();
  if (text.includes('bill') || text.includes('invoice')) return 'electricity_bill';
  if (text.includes('meter') || text.includes('mprn')) return 'meter_photo';
  if (text.includes('roof') || text.includes('solar') || text.includes('panel')) return 'roof_photo';
  return 'other';
}

function getDocumentLabel(kind: string) {
  return REQUIRED_DOCUMENTS.find((item) => item.key === kind)?.label ?? 'Other upload';
}

function mapDocuments(documents: LeadDocument[] = []): ApplicationPackDocument[] {
  return documents.map((document) => {
    const categoryKey = getDocumentKind(document);
    const category = getDocumentLabel(categoryKey);

    return {
      id: document.id,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileType: document.mimeType || 'Unknown',
      categoryKey,
      category,
      uploadCategory: category,
      previewUrl: isUsableLink(document.storageUrl) ? document.storageUrl ?? null : null,
      storageUrl: document.storageUrl,
      uploadedAt: formatDate(document.createdAt, 'Unknown')
    };
  });
}

function hasDocument(documents: ApplicationPackDocument[], kind: string) {
  return documents.some((document) => document.categoryKey === kind);
}

function makeSection(id: string, title: string, fields: ApplicationPackField[]): ApplicationPackSection {
  return {
    id,
    title,
    fields,
    copyText: `${title}:\n${fields.map((field) => `${field.label}: ${field.value}`).join('\n')}`
  };
}

function makeField(label: string, value: unknown, missing = false): ApplicationPackField {
  return {
    label,
    value: formatValue(value),
    missing
  };
}

function uniqueItems(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildApplicationPack(lead: LeadForApplicationPack): ApplicationPack {
  const salesSignal = getSalesSignal(lead);
  const documents = mapDocuments(lead.documents ?? []);
  const documentKinds = new Set(documents.map((document) => document.categoryKey));
  const storedMissingItems = asStringArray(lead.missingItemsJson);
  const risks = asStringArray(lead.risksJson);

  const baseChecklist: ReadinessItem[] = [
    {
      id: 'applicant-name',
      label: 'applicant name present',
      complete: !!clean(lead.fullName),
      missingMessage: 'Applicant name is missing'
    },
    {
      id: 'email',
      label: 'email present',
      complete: !!clean(lead.email),
      missingMessage: 'Email is missing'
    },
    {
      id: 'phone',
      label: 'phone present',
      complete: !!clean(lead.phone),
      missingMessage: 'Phone is missing'
    },
    {
      id: 'address',
      label: 'address present',
      complete: !!clean(lead.addressLine1),
      missingMessage: 'Property address is missing'
    },
    {
      id: 'county',
      label: 'county selected',
      complete: !!clean(lead.county),
      missingMessage: 'County must be selected'
    },
    {
      id: 'mprn',
      label: 'MPRN exactly 11 digits',
      complete: /^\d{11}$/.test(lead.mprn),
      missingMessage: 'MPRN must be exactly 11 digits'
    },
    {
      id: 'dwelling-type',
      label: 'dwelling type selected',
      complete: !!lead.dwellingType,
      missingMessage: 'Dwelling type must be selected'
    },
    {
      id: 'year-built',
      label: 'year built present',
      complete: typeof lead.yearBuilt === 'number' && Number.isFinite(lead.yearBuilt),
      missingMessage: 'Year built is missing'
    },
    {
      id: 'works-started',
      label: 'works started answered',
      complete: typeof lead.worksStarted === 'boolean',
      missingMessage: 'Works started must be answered'
    },
    {
      id: 'prior-solar-grant',
      label: 'prior solar grant answered',
      complete: typeof lead.priorSolarGrantAtMprn === 'boolean',
      missingMessage: 'Prior solar grant must be answered'
    },
    {
      id: 'consents',
      label: 'required consent fields completed',
      complete: lead.consentToProcess && lead.consentToGrantAssist && lead.consentToContact,
      missingMessage: 'Required consent fields are not completed'
    },
    ...REQUIRED_DOCUMENTS.map((document) => ({
      id: document.key,
      label: `${document.label.toLowerCase()} uploaded`,
      complete: documentKinds.has(document.key),
      missingMessage: document.missingMessage
    }))
  ];

  const missingItems = uniqueItems([
    ...baseChecklist.filter((item) => !item.complete).map((item) => item.missingMessage),
    ...storedMissingItems
  ]);

  const checklist: ReadinessItem[] = [
    ...baseChecklist,
    {
      id: 'missing-items-cleared',
      label: 'missing items cleared',
      complete: missingItems.length === 0,
      missingMessage: 'Missing items must be cleared'
    }
  ];

  const isReady = checklist.every((item) => item.complete);
  const readinessLabel = isReady ? 'Ready for SEAI Submission' : 'Needs More Information';
  const missingFields = missingItems.length
    ? missingItems.map((item, index) => ({ label: `Item ${index + 1}`, value: item, missing: true }))
    : [{ label: 'Status', value: 'No missing items recorded' }];
  const documentFields = documents.length
    ? documents.flatMap((document, index) => [
        { label: `Document ${index + 1} file name`, value: document.fileName },
        { label: `Document ${index + 1} file type`, value: document.fileType },
        { label: `Document ${index + 1} category`, value: document.category },
        { label: `Document ${index + 1} upload category`, value: document.uploadCategory },
        { label: `Document ${index + 1} preview/download`, value: document.previewUrl ?? 'Not available' }
      ])
    : [{ label: 'Uploads', value: 'No uploaded documents recorded', missing: true }];

  const sections = [
    makeSection('applicant-details', 'Applicant Details', [
      makeField('Full Name', lead.fullName, !clean(lead.fullName)),
      makeField('Email', lead.email, !clean(lead.email)),
      makeField('Phone', lead.phone, !clean(lead.phone)),
      makeField('Preferred Callback Window', formatEnum(salesSignal.callbackWindow || salesSignal.preferredCallbackWindow))
    ]),
    makeSection('property-address', 'Property Address', [
      makeField('Address Line 1', lead.addressLine1, !clean(lead.addressLine1)),
      makeField('Address Line 2', formatOptional(lead.addressLine2)),
      makeField('County', lead.county, !clean(lead.county)),
      makeField('Eircode', formatOptional(lead.eircode))
    ]),
    makeSection('mprn-electricity-details', 'MPRN / Electricity Details', [
      makeField('MPRN', lead.mprn, !/^\d{11}$/.test(lead.mprn)),
      makeField('Monthly Electricity Bill Range', formatEnum(salesSignal.monthlyElectricityBillRange)),
      makeField('Electricity Bill Uploaded', hasDocument(documents, 'electricity_bill')),
      makeField('Meter Photo Uploaded', hasDocument(documents, 'meter_photo'))
    ]),
    makeSection('property-details', 'Property Details', [
      makeField('Dwelling Type', formatEnum(lead.dwellingType), !lead.dwellingType),
      makeField('Roof Type', formatEnum(salesSignal.roofType)),
      makeField('Year Built', lead.yearBuilt, !(typeof lead.yearBuilt === 'number' && Number.isFinite(lead.yearBuilt))),
      makeField('Year Occupied', formatValue(lead.yearOccupied, 'Not supplied')),
      makeField('Property Owner', lead.propertyOwner),
      makeField('Private Landlord', lead.privateLandlord),
      makeField('Roof / Solar Panel Area Photo Uploaded', hasDocument(documents, 'roof_photo'))
    ]),
    makeSection('works-status', 'Works Status', [
      makeField('Works Started', lead.worksStarted),
      makeField('Prior Solar Grant At MPRN', lead.priorSolarGrantAtMprn),
      makeField('Consent To Process', lead.consentToProcess, !lead.consentToProcess),
      makeField('Consent To Grant Assistance', lead.consentToGrantAssist, !lead.consentToGrantAssist),
      makeField('Consent To Contact', lead.consentToContact, !lead.consentToContact)
    ]),
    makeSection('grant-information', 'Grant Information', [
      makeField('Grant Scheme', 'SEAI Solar Electricity Grant'),
      makeField('Installer', lead.installer.name),
      makeField('Installer SEAI Company ID', lead.installer.seaiCompanyId),
      makeField('Lead Temperature', formatEnum(salesSignal.leadTemperature || 'WARM')),
      makeField('Install Timeline', formatEnum(salesSignal.installTimeline)),
      makeField('Battery Interest', salesSignal.batteryInterest ?? salesSignal.wantsBattery ?? false),
      makeField('Manual Assist Note', 'Prepared for manual administrator review and manual SEAI portal entry only')
    ]),
    makeSection('uploaded-documents', 'Uploaded Documents', documentFields),
    makeSection('missing-items', 'Missing Items', missingFields),
    makeSection('internal-review-notes', 'Internal Review Notes', [
      makeField('Lead Status', formatEnum(lead.status)),
      makeField('Assigned Admin', formatOptional(lead.assignedAdmin)),
      makeField('Assigned Admin / Installer', formatOptional(lead.assignedInstaller)),
      makeField('Follow-up Date', formatDate(lead.followUpDate)),
      makeField('Internal Notes', formatOptional(lead.internalNotes)),
      makeField('Homeowner Notes', formatOptional(lead.notes)),
      makeField('AI Summary', formatOptional(lead.aiSummary)),
      makeField('Risks', risks.length ? risks.join('; ') : 'No flagged risks')
    ]),
    makeSection('submission-readiness', 'Submission Readiness', [
      makeField('Overall Status', readinessLabel),
      ...checklist.map((item) => makeField(item.label, item.complete ? 'Complete' : item.missingMessage, !item.complete))
    ])
  ];

  return {
    version: '3.0',
    generatedAt: new Date().toISOString(),
    leadId: lead.id,
    applicantName: lead.fullName,
    status: lead.status,
    isReady,
    readinessLabel,
    manualAssistNotice: 'Manual-assist pack only. This software does not integrate with SEAI, automate the SEAI website, or submit grant applications automatically.',
    checklist,
    missingItems,
    documents,
    sections
  };
}
