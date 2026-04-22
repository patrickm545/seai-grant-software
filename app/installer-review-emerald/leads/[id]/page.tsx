import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const ADMIN_BASE_PATH = '/admin/dashboard';
export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  NEEDS_REVIEW: 'Needs review',
  READY_TO_APPLY: 'Ready to apply',
  HOMEOWNER_REVIEW_PENDING: 'Waiting on homeowner',
  SUBMITTED: 'Submitted',
  INSTALLATION_PENDING: 'Installation pending',
  PAYMENT_DOCS_PENDING: 'Payment docs pending',
  COMPLETED: 'Completed'
};

function getStatusTone(status: string) {
  if (status === 'READY_TO_APPLY' || status === 'SUBMITTED' || status === 'COMPLETED') return 'success';
  if (status === 'NEEDS_REVIEW') return 'danger';
  if (status === 'HOMEOWNER_REVIEW_PENDING' || status === 'PAYMENT_DOCS_PENDING' || status === 'INSTALLATION_PENDING') {
    return 'warning';
  }

  return 'default';
}

function getLeadTempTone(temp: string | null) {
  if (temp === 'HOT') return 'success';
  if (temp === 'COLD') return 'danger';
  return 'warning';
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getSalesSignal(value: unknown) {
  const root = asRecord(value);
  return asRecord(root?.salesSignal);
}

export default async function HiddenLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead: any = await prisma.lead.findUnique({
    where: { id },
    include: { installer: true, documents: true }
  });

  if (!lead) return notFound();

  const missingItems = asStringArray(lead.missingItemsJson);
  const risks = asStringArray(lead.risksJson);
  const exportData = asRecord(lead.structuredExportJson);
  const salesSignal = getSalesSignal(lead.structuredExportJson);
  const leadTemperature = typeof salesSignal?.leadTemperature === 'string' ? salesSignal.leadTemperature : 'WARM';

  return (
    <main className="container grid admin-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="admin-topbar"><Link href={ADMIN_BASE_PATH} className="small">{'<'} Back to dashboard</Link><Link href="/admin/logout" className="small">Log out</Link></div>
          <h1>{lead.fullName}</h1>
          <p className="hero-text">
            Review grant fit, sales intent, document evidence, and the final payload before anything moves toward the SEAI workflow.
          </p>
        </div>
        <div className="hero-metrics">
          <span className={`status-pill status-pill-${getStatusTone(lead.status)}`}>{STATUS_LABELS[lead.status]}</span>
          <span className={`status-pill status-pill-${getLeadTempTone(leadTemperature)}`}>{leadTemperature} lead</span>
          <div className="metric-chip">
            <span className="metric-label">Eligibility</span>
            <strong>{lead.likelyEligible === null ? 'Pending' : lead.likelyEligible ? 'Likely eligible' : 'Needs review'}</strong>
          </div>
          <div className="metric-chip">
            <span className="metric-label">Confidence</span>
            <strong>{lead.eligibilityConfidence === null ? 'Not scored' : `${Math.round(lead.eligibilityConfidence * 100)}%`}</strong>
          </div>
        </div>
      </section>

      <section className="grid grid-3">
        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Applicant</div>
              <h2>Contact and property</h2>
            </div>
          </div>
          <div className="detail-list">
            <div><span>Email</span><strong>{lead.email}</strong></div>
            <div><span>Phone</span><strong>{lead.phone || 'No phone provided'}</strong></div>
            <div><span>Preferred callback</span><strong>{typeof salesSignal?.callbackWindow === 'string' ? salesSignal.callbackWindow.replaceAll('_', ' ') : 'Not supplied'}</strong></div>
            <div><span>Address</span><strong>{`${lead.addressLine1}${lead.addressLine2 ? `, ${lead.addressLine2}` : ''}, ${lead.county}`}</strong></div>
            <div><span>Eircode</span><strong>{lead.eircode || 'Not supplied'}</strong></div>
            <div><span>MPRN</span><strong>{lead.mprn}</strong></div>
            <div><span>Dwelling</span><strong>{lead.dwellingType.replaceAll('_', ' ')}</strong></div>
            <div><span>Roof type</span><strong>{typeof salesSignal?.roofType === 'string' ? salesSignal.roofType.replaceAll('_', ' ') : 'Unknown'}</strong></div>
            <div><span>Built</span><strong>{lead.yearBuilt}</strong></div>
            <div><span>Occupied</span><strong>{lead.yearOccupied || 'Unknown'}</strong></div>
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">AI review</div>
              <h2>Eligibility signal</h2>
            </div>
          </div>
          <p>{lead.aiSummary || 'No AI analysis yet.'}</p>
          <div className="insight-grid">
            <div className="insight-box">
              <span>Property owner</span>
              <strong>{lead.propertyOwner ? 'Yes' : 'No'}</strong>
            </div>
            <div className="insight-box">
              <span>Works started</span>
              <strong>{lead.worksStarted ? 'Yes' : 'No'}</strong>
            </div>
            <div className="insight-box">
              <span>Prior grant at MPRN</span>
              <strong>{lead.priorSolarGrantAtMprn ? 'Yes' : 'No'}</strong>
            </div>
            <div className="insight-box">
              <span>Installer</span>
              <strong>{lead.installer.name}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Sales signal</div>
              <h2>Commercial fit</h2>
            </div>
          </div>
          <div className="detail-list">
            <div><span>Lead temperature</span><strong>{leadTemperature}</strong></div>
            <div><span>Install timeline</span><strong>{typeof salesSignal?.installTimeline === 'string' ? salesSignal.installTimeline.replaceAll('_', ' ') : 'Not supplied'}</strong></div>
            <div><span>Monthly bill range</span><strong>{typeof salesSignal?.monthlyElectricityBillRange === 'string' ? salesSignal.monthlyElectricityBillRange.replaceAll('_', ' ') : 'Not supplied'}</strong></div>
            <div><span>Battery interest</span><strong>{salesSignal?.batteryInterest ? 'Yes' : 'No'}</strong></div>
          </div>
        </div>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Review checklist</div>
              <h2>Action items</h2>
            </div>
          </div>
          <div className="checklist-group">
            <h3>Missing items</h3>
            <ul className="plain-list">
              {missingItems.length ? missingItems.map((item) => <li key={item}>{item}</li>) : <li>No missing items recorded.</li>}
            </ul>
          </div>
          <div className="checklist-group">
            <h3>Risks</h3>
            <ul className="plain-list">
              {risks.length ? risks.map((risk) => <li key={risk}>{risk}</li>) : <li>No flagged risks.</li>}
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Documents</div>
              <h2>Uploaded evidence</h2>
            </div>
          </div>
          <div className="document-grid">
            {lead.documents.map((document: any) => {
              const fields = asRecord(document.aiFieldsJson);

              return (
                <div key={document.id} className="document-card">
                  <div className="document-head">
                    <strong>{document.fileName}</strong>
                    <span className="small">{document.mimeType}</span>
                  </div>
                  <p className="small">{document.extractedText || 'No extracted text stored.'}</p>
                  {fields ? (
                    <div className="field-chips">
                      {Object.entries(fields).map(([key, value]) => (
                        <span key={key} className="field-chip">{key}: {String(value)}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Exports</div>
              <h2>Submission payloads</h2>
            </div>
          </div>
          <div className="action-grid">
            <a className="action-card" href={`/api/submission-package?id=${lead.id}`} target="_blank">
              <h3>Submission package</h3>
              <p className="small">Export structured JSON for admin review or downstream automation.</p>
            </a>
            <a className="action-card" href={`/api/portal-fill-preview?id=${lead.id}`} target="_blank">
              <h3>Portal fill preview</h3>
              <p className="small">Generate a safe payload for manual portal entry.</p>
            </a>
          </div>
          <div className="export-box">
            <h3>Structured export snapshot</h3>
            <pre className="code-block">{JSON.stringify(exportData, null, 2)}</pre>
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Installer notes</div>
              <h2>Homeowner context</h2>
            </div>
          </div>
          <p>{lead.notes || 'No extra notes provided by the homeowner.'}</p>
        </div>
      </section>
    </main>
  );
}
