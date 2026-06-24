import type { LeadDocument, LeadDocumentStatus, LeadDocumentType } from '@prisma/client';

export const MAX_DOCUMENT_UPLOAD_BYTES = 4 * 1024 * 1024;

export const leadDocumentTypes = [
  'ELECTRICITY_BILL',
  'BER_CERTIFICATE',
  'PROPERTY_PHOTO',
  'ADDRESS_CONFIRMATION',
  'SIGNED_CONTRACT',
  'OTHER'
] as const satisfies readonly LeadDocumentType[];

export const leadDocumentStatuses = [
  'UPLOADED',
  'APPROVED',
  'REJECTED',
  'NEEDS_REPLACEMENT'
] as const satisfies readonly LeadDocumentStatus[];

export const acceptedDocumentMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
] as const;

export const portalDocumentChecklist = [
  {
    type: 'ELECTRICITY_BILL',
    label: 'Electricity bill',
    description: 'A recent electricity bill helps confirm the MPRN and usage details.',
    required: true
  },
  {
    type: 'BER_CERTIFICATE',
    label: 'BER certificate',
    description: 'Upload the BER certificate if you already have one available.',
    required: true
  },
  {
    type: 'PROPERTY_PHOTO',
    label: 'Property photos',
    description: 'Photos of the roof, meter area, and any useful access points.',
    required: true
  },
  {
    type: 'ADDRESS_CONFIRMATION',
    label: 'Eircode or address confirmation',
    description: 'A bill, letter, or image that confirms the installation address.',
    required: true
  },
  {
    type: 'SIGNED_CONTRACT',
    label: 'Signed contract or consent form',
    description: 'Your installer may ask for this before scheduling final works.',
    required: true
  },
  {
    type: 'OTHER',
    label: 'Other supporting document',
    description: 'Any extra file your installer asked you to provide.',
    required: false
  }
] as const satisfies ReadonlyArray<{
  type: LeadDocumentType;
  label: string;
  description: string;
  required: boolean;
}>;

export function isLeadDocumentType(value: string): value is LeadDocumentType {
  return leadDocumentTypes.includes(value as LeadDocumentType);
}

export function isLeadDocumentStatus(value: string): value is LeadDocumentStatus {
  return leadDocumentStatuses.includes(value as LeadDocumentStatus);
}

export function getDocumentTypeLabel(type: string | null | undefined) {
  return portalDocumentChecklist.find((item) => item.type === type)?.label ?? 'Other supporting document';
}

export function getDocumentTypeDescription(type: string | null | undefined) {
  return portalDocumentChecklist.find((item) => item.type === type)?.description ?? 'Additional supporting information for installer review.';
}

export function getDocumentStatusLabel(status: string | null | undefined) {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'NEEDS_REPLACEMENT') return 'Needs replacement';
  return 'Uploaded';
}

export function getDocumentStatusTone(status: string | null | undefined) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'NEEDS_REPLACEMENT') return 'warning';
  return 'info';
}

export function getUploadedByLabel(role: string | null | undefined) {
  if (role === 'HOMEOWNER') return 'Customer uploaded';
  if (role === 'INSTALLER') return 'Installer uploaded';
  if (role === 'ADMIN') return 'Admin uploaded';
  return 'Uploaded';
}

export function getDocumentTypeFromLegacyKind(kind: string) {
  if (kind === 'electricity_bill') return 'ELECTRICITY_BILL' as LeadDocumentType;
  if (kind === 'meter_photo') return 'ADDRESS_CONFIRMATION' as LeadDocumentType;
  if (kind === 'roof_photo') return 'PROPERTY_PHOTO' as LeadDocumentType;
  return 'OTHER' as LeadDocumentType;
}

export function isAcceptedDocumentMimeType(mimeType: string) {
  return acceptedDocumentMimeTypes.includes(mimeType.toLowerCase() as (typeof acceptedDocumentMimeTypes)[number]);
}

export function formatDocumentSize(sizeBytes: number | null | undefined) {
  if (!sizeBytes || sizeBytes < 0) return 'Size not recorded';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeUploadFilename(filename: string) {
  const fallback = 'document-upload';
  const leafName = filename.split(/[\\/]/).pop()?.trim() || fallback;
  const safeName = leafName
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return (safeName || fallback).slice(0, 140);
}

type ChecklistDocument = Pick<
  LeadDocument,
  'id' | 'type' | 'fileName' | 'originalFilename' | 'mimeType' | 'sizeBytes' | 'uploadedByRole' | 'status' | 'createdAt'
>;

export function buildDocumentChecklist<TDocument extends ChecklistDocument>(documents: TDocument[]) {
  return portalDocumentChecklist.map((item) => {
    const matchingDocuments = documents
      .filter((document) => document.type === item.type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latestDocument = matchingDocuments[0] ?? null;

    return {
      ...item,
      documents: matchingDocuments,
      latestDocument,
      isUploaded: matchingDocuments.length > 0,
      status: latestDocument?.status ?? null
    };
  });
}
