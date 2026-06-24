import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit';
import {
  MAX_DOCUMENT_UPLOAD_BYTES,
  formatDocumentSize,
  getDocumentTypeLabel,
  isAcceptedDocumentMimeType,
  isLeadDocumentType,
  sanitizeUploadFilename
} from '@/lib/documents';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type PortalDocumentRouteContext = {
  params: Promise<{ token: string }>;
};

function redirectToPortal(request: NextRequest, token: string, params: Record<string, string>) {
  const url = new URL(`/portal/${token}`, request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest, { params }: PortalDocumentRouteContext) {
  const { token } = await params;
  const lead = await prisma.lead.findUnique({
    where: { portalToken: token },
    select: {
      id: true,
      fullName: true
    }
  });

  if (!lead) {
    return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const documentType = String(formData.get('documentType') || '').trim();
  const file = formData.get('document');

  if (!isLeadDocumentType(documentType)) {
    return redirectToPortal(request, token, { documentError: 'Choose a valid document type.' });
  }

  if (!file || typeof file === 'string') {
    return redirectToPortal(request, token, { documentError: 'Choose a file to upload.' });
  }

  if (file.size <= 0) {
    return redirectToPortal(request, token, { documentError: 'The selected file is empty.' });
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return redirectToPortal(request, token, {
      documentError: `Files must be ${formatDocumentSize(MAX_DOCUMENT_UPLOAD_BYTES)} or smaller.`
    });
  }

  const mimeType = (file.type || '').toLowerCase();
  if (!isAcceptedDocumentMimeType(mimeType)) {
    return redirectToPortal(request, token, {
      documentError: 'Upload a PDF, JPG, PNG, WebP, HEIC, or HEIF file.'
    });
  }

  const documentId = randomUUID();
  const originalFilename = sanitizeUploadFilename(file.name || `${documentType.toLowerCase()}.pdf`);
  const storagePath = `lead-documents/${lead.id}/${documentId}-${originalFilename}`;
  const contentBytes = Buffer.from(await file.arrayBuffer());
  const documentLabel = getDocumentTypeLabel(documentType);

  await prisma.$transaction(async (tx) => {
    await tx.leadDocument.create({
      data: {
        id: documentId,
        leadId: lead.id,
        type: documentType,
        fileName: originalFilename,
        originalFilename,
        mimeType,
        sizeBytes: file.size,
        storagePath,
        storageUrl: `/portal/${token}/documents/${documentId}`,
        contentBytes,
        uploadedBy: lead.fullName,
        uploadedByRole: 'HOMEOWNER',
        status: 'UPLOADED',
        extractedText: `Customer uploaded ${documentLabel}.`,
        aiFieldsJson: {
          source: 'customer_portal',
          documentType,
          sizeBytes: file.size
        }
      }
    });

    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'DOCUMENT_UPLOADED',
        title: 'Document uploaded',
        description: `${documentLabel}: ${originalFilename}`,
        metadata: {
          documentId,
          documentType,
          filename: originalFilename,
          sizeBytes: file.size,
          source: 'customer_portal'
        },
        createdBy: 'Customer portal',
        createdByRole: 'HOMEOWNER'
      }
    });

    await writeAuditLog(tx, {
      leadId: lead.id,
      action: 'lead_document.uploaded',
      actor: 'homeowner',
      metadata: {
        documentId,
        documentType,
        filename: originalFilename,
        sizeBytes: file.size,
        source: 'customer_portal'
      }
    });
  });

  return redirectToPortal(request, token, { uploaded: '1' });
}
