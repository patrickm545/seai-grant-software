import { notFound } from 'next/navigation';
import type { LeadDocumentType } from '@prisma/client';
import {
  acceptedDocumentMimeTypes,
  formatDocumentSize,
  getDocumentStatusLabel,
  getDocumentStatusTone
} from '@/lib/documents';
import { getCustomerPortalProgress, markPortalAccessed } from '@/lib/portal';
import { prisma } from '@/lib/prisma';
import { getSolarGrantJurisdictionViewState } from '@/lib/solargrant-jurisdiction-safe-view';

export const dynamic = 'force-dynamic';

type PortalPageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchValue(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function documentNeedsUpload(status: string | null | undefined, isUploaded: boolean) {
  return !isUploaded || status === 'REJECTED' || status === 'NEEDS_REPLACEMENT';
}

function DocumentUploadForm({
  token,
  type,
  documentLabel,
  buttonLabel
}: {
  token: string;
  type: LeadDocumentType;
  documentLabel: string;
  buttonLabel: string;
}) {
  return (
    <form className="portal-upload-form" action={`/portal/${token}/documents`} method="post" encType="multipart/form-data">
      <input type="hidden" name="documentType" value={type} />
      <input
        name="document"
        type="file"
        aria-label={`Choose ${documentLabel}`}
        accept={acceptedDocumentMimeTypes.join(',')}
        required
      />
      <button type="submit">{buttonLabel}</button>
    </form>
  );
}

export default async function CustomerPortalPage({ params, searchParams }: PortalPageProps) {
  const [{ token }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({})
  ]);
  const lead = await prisma.lead.findUnique({
    where: { portalToken: token },
    select: {
      id: true,
      fullName: true,
      addressLine1: true,
      addressLine2: true,
      county: true,
      eircode: true,
      status: true,
      pipelineStage: true,
      createdAt: true,
      updatedAt: true,
      installer: {
        select: {
          name: true,
          websiteDomain: true
        }
      },
      documents: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          fileName: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          uploadedByRole: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!lead) return notFound();

  const jurisdictionView = getSolarGrantJurisdictionViewState(lead);
  const address = [lead.addressLine1, lead.addressLine2, lead.county, lead.eircode].filter(Boolean).join(', ');
  if (!jurisdictionView.canPresentSeaiConclusions) {
    return (
      <main className="portal-shell">
        <section className="portal-header">
          <div className="portal-brand-row">
            <div className="portal-brand-mark">CO</div>
            <div>
              <span>{lead.installer.name}</span>
              <strong>Customer project portal</strong>
            </div>
          </div>
          <div className="portal-header-grid">
            <div>
              <div className="eyebrow">Solar project</div>
              <h1>{lead.fullName}</h1>
              <p>{address || 'Project address not recorded yet'}</p>
            </div>
          </div>
        </section>
        <section className="portal-card jurisdiction-route-panel" role="status">
          <div className="eyebrow">Location routing</div>
          <h2>{jurisdictionView.label}</h2>
          <p>{jurisdictionView.message}</p>
          <p className="small">No current SEAI eligibility or grant conclusion is available for this record.</p>
        </section>
      </main>
    );
  }

  await markPortalAccessed(lead.id);

  const uploadSuccess = getSearchValue(resolvedSearchParams, 'uploaded') === '1';
  const documentError = getSearchValue(resolvedSearchParams, 'documentError');
  const progress = getCustomerPortalProgress(lead, lead.documents);

  return (
    <main className="portal-shell">
      <section className="portal-header">
        <div className="portal-brand-row">
          <div className="portal-brand-mark">CO</div>
          <div>
            <span>{lead.installer.name}</span>
            <strong>Customer project portal</strong>
          </div>
        </div>
        <div className="portal-header-grid">
          <div>
            <div className="eyebrow">Solar project</div>
            <h1>{lead.fullName}</h1>
            <p>{address || 'Project address not recorded yet'}</p>
          </div>
          <div className="portal-status-card">
            <span>Current status</span>
            <strong>{progress.currentLabel}</strong>
            <small>Last updated {formatDate(lead.updatedAt)}</small>
          </div>
        </div>
      </section>

      <section className="portal-summary-grid" aria-label="Project summary">
        <article>
          <span>Documents submitted</span>
          <strong>{progress.documentSummary.submittedCount}/{progress.documentSummary.requiredCount}</strong>
        </article>
        <article>
          <span>Missing documents</span>
          <strong>{progress.documentSummary.missingCount}</strong>
        </article>
        <article>
          <span>Project opened</span>
          <strong>{formatDate(lead.createdAt)}</strong>
        </article>
      </section>

      <section className="portal-card">
        <div className="portal-section-heading">
          <div>
            <div className="eyebrow">Project status</div>
            <h2>Progress tracker</h2>
          </div>
        </div>
        <ol className="portal-tracker">
          {progress.stages.map((stage) => (
            <li key={stage.label} className={`portal-tracker-step portal-tracker-${stage.state}`}>
              <span aria-hidden="true" />
              <strong>{stage.label}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="portal-card">
        <div className="portal-section-heading">
          <div>
            <div className="eyebrow">Documents</div>
            <h2>Upload documents</h2>
            <p className="small">
              Upload the documents needed for your solar application. Your installer will review them and contact you if anything else is required.
            </p>
          </div>
        </div>

        {uploadSuccess ? (
          <div className="portal-alert portal-alert-success">Document uploaded. Your installer can now review it.</div>
        ) : null}
        {documentError ? (
          <div className="portal-alert portal-alert-error">{documentError}</div>
        ) : null}

        <div className="portal-document-grid">
          {progress.documentSummary.checklist.map((item) => {
            const latestDocument = item.latestDocument;
            const needsUpload = documentNeedsUpload(item.status, item.isUploaded);

            return (
              <article key={item.type} className="portal-document-card">
                <div className="portal-document-head">
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </div>
                  <span className={`status-pill status-pill-${latestDocument ? getDocumentStatusTone(latestDocument.status) : 'default'}`}>
                    {latestDocument ? getDocumentStatusLabel(latestDocument.status) : item.required ? 'Missing' : 'Optional'}
                  </span>
                </div>

                {latestDocument ? (
                  <div className="portal-document-meta">
                    <span>{latestDocument.originalFilename || latestDocument.fileName}</span>
                    <small>{formatDocumentSize(latestDocument.sizeBytes)} / uploaded {formatDate(latestDocument.createdAt)}</small>
                    <a href={`/portal/${token}/documents/${latestDocument.id}`}>Download uploaded file</a>
                  </div>
                ) : null}

                <DocumentUploadForm
                  token={token}
                  type={item.type}
                  documentLabel={item.label}
                  buttonLabel={needsUpload ? 'Upload document' : 'Upload replacement'}
                />
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
