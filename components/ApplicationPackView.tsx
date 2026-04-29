'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApplicationPack } from '@/lib/application-pack';

function copyFallback(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function ApplicationPackView({ pack, printHref }: { pack: ApplicationPack; printHref: string }) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  async function copySection(id: string, text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        copyFallback(text);
      }
      setCopiedSection(id);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => setCopiedSection((current) => (current === id ? null : current)), 1800);
    } catch {
      copyFallback(text);
      setCopiedSection(id);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => setCopiedSection((current) => (current === id ? null : current)), 1800);
    }
  }

  return (
    <div className="application-pack-shell">
      <section className={`application-readiness application-readiness-${pack.isReady ? 'ready' : 'needs-info'}`}>
        <div>
          <div className="eyebrow">Submission readiness</div>
          <h1>{pack.readinessLabel}</h1>
          <p className="small">{pack.manualAssistNotice}</p>
        </div>
        <div className="application-pack-actions">
          <a className="pack-action-link" href={printHref} target="_blank" rel="noreferrer">Print summary</a>
        </div>
      </section>

      <section className="card application-checklist-card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Readiness checklist</div>
            <h2>Manual prep checks</h2>
          </div>
        </div>
        <div className="readiness-grid">
          {pack.checklist.map((item) => (
            <div key={item.id} className={`readiness-item ${item.complete ? 'readiness-item-complete' : 'readiness-item-missing'}`}>
              <span className="readiness-icon" aria-hidden="true">{item.complete ? '\u2713' : '!'}</span>
              <div>
                <strong>{item.label}</strong>
                <div className="small">{item.complete ? 'Complete' : item.missingMessage}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card document-summary-card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Documents</div>
            <h2>Uploaded documents</h2>
          </div>
        </div>
        <div className="document-pack-grid">
          {pack.documents.length ? pack.documents.map((document) => (
            <div key={document.id} className="document-pack-item">
              <strong>{document.fileName}</strong>
              <dl>
                <div><dt>File type</dt><dd>{document.fileType}</dd></div>
                <div><dt>Category</dt><dd>{document.category}</dd></div>
                <div><dt>Upload category</dt><dd>{document.uploadCategory}</dd></div>
                <div>
                  <dt>Preview / download</dt>
                  <dd>{document.previewUrl ? <a href={document.previewUrl} target="_blank" rel="noreferrer">Open file</a> : 'Not available'}</dd>
                </div>
              </dl>
            </div>
          )) : <p className="small">No uploaded documents recorded.</p>}
        </div>
      </section>

      <section className="application-pack-grid">
        {pack.sections.map((section) => (
          <article key={section.id} className="card application-pack-section">
            <div className="section-heading application-pack-section-heading">
              <div>
                <div className="eyebrow">Application Pack</div>
                <h2>{section.title}</h2>
              </div>
              <button type="button" className="copy-section-button" onClick={() => copySection(section.id, section.copyText)}>
                {copiedSection === section.id ? 'Copied' : 'Copy Section'}
              </button>
            </div>
            <dl className="copy-fields">
              {section.fields.map((field) => (
                <div key={`${section.id}-${field.label}`} className={field.missing ? 'copy-field copy-field-missing' : 'copy-field'}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>
    </div>
  );
}
