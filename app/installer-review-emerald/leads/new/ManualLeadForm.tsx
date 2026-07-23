'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { manualLeadSources } from '@/lib/manual-lead-contract';
import { submitManualLead, type ManualLeadFormState } from './actions';

type Assignee = { id: string; user: { displayName: string } };

const sourceLabels: Record<(typeof manualLeadSources)[number], string> = {
  PHONE_ENQUIRY: 'Phone enquiry',
  REFERRAL: 'Referral',
  WALK_IN: 'Walk-in',
  EVENT: 'Event',
  OTHER: 'Other known source'
};

const initialManualLeadFormState: ManualLeadFormState = { revision: 0, status: 'idle' };

export function ManualLeadForm({ requestId, assignees }: { requestId: string; assignees: Assignee[] }) {
  const [state, formAction, pending] = useActionState(submitManualLead, initialManualLeadFormState);
  const value = (field: string, fallback = '') => state.values?.[field] ?? fallback;
  const error = (field: string) => state.fieldErrors?.[field];
  const describedBy = (field: string, help?: string) => [error(field) ? `${field}-error` : '', help ?? ''].filter(Boolean).join(' ') || undefined;

  return (
    <form key={state.revision} action={formAction} className="manual-lead-form" noValidate aria-describedby="manual-lead-form-status">
      <input type="hidden" name="requestId" value={value('requestId', requestId)} />
      <div id="manual-lead-form-status" className={state.status === 'error' ? 'form-alert form-alert-error' : 'form-alert'} role={state.status === 'error' ? 'alert' : 'status'} aria-live="polite">
        {state.message ?? 'Required fields are marked. Optional details can be added now or later.'}
      </div>

      <fieldset>
        <legend>Customer and contact</legend>
        <div>
          <label htmlFor="fullName">Customer name <span aria-hidden="true">*</span></label>
          <input id="fullName" name="fullName" autoComplete="name" maxLength={120} required defaultValue={value('fullName')} aria-invalid={Boolean(error('fullName'))} aria-describedby={describedBy('fullName')} />
          {error('fullName') ? <p id="fullName-error" className="field-error">{error('fullName')}</p> : null}
        </div>
        <p id="contact-help" className="field-help">Enter at least one contact method: phone or email.</p>
        {error('contact') ? <p id="contact-error" className="field-error">{error('contact')}</p> : null}
        <div className="manual-lead-form-grid">
          <div>
            <label htmlFor="phone">Phone <span className="optional-label">optional if email supplied</span></label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} defaultValue={value('phone')} aria-invalid={Boolean(error('phone') || error('contact'))} aria-describedby={describedBy('phone', error('contact') ? 'contact-help contact-error' : 'contact-help')} />
            {error('phone') ? <p id="phone-error" className="field-error">{error('phone')}</p> : null}
          </div>
          <div>
            <label htmlFor="email">Email <span className="optional-label">optional if phone supplied</span></label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={254} defaultValue={value('email')} aria-invalid={Boolean(error('email') || error('contact'))} aria-describedby={describedBy('email', error('contact') ? 'contact-help contact-error' : 'contact-help')} />
            {error('email') ? <p id="email-error" className="field-error">{error('email')}</p> : null}
          </div>
        </div>
      </fieldset>

      <details className="manual-lead-optional" open={state.status === 'error' || state.status === 'duplicates'}>
        <summary>Add optional enquiry details</summary>
        <div className="manual-lead-optional-content">
          <div>
            <label htmlFor="addressLine1">Address <span className="optional-label">optional</span></label>
            <input id="addressLine1" name="addressLine1" autoComplete="street-address" maxLength={200} defaultValue={value('addressLine1')} aria-invalid={Boolean(error('addressLine1'))} aria-describedby={describedBy('addressLine1')} />
            {error('addressLine1') ? <p id="addressLine1-error" className="field-error">{error('addressLine1')}</p> : null}
          </div>
          <div className="manual-lead-form-grid">
            <div>
              <label htmlFor="eircode">Eircode <span className="optional-label">optional</span></label>
              <input id="eircode" name="eircode" autoComplete="postal-code" maxLength={8} defaultValue={value('eircode')} aria-invalid={Boolean(error('eircode'))} aria-describedby={describedBy('eircode')} />
              {error('eircode') ? <p id="eircode-error" className="field-error">{error('eircode')}</p> : null}
            </div>
            <div>
              <label htmlFor="leadSource">Lead source <span className="optional-label">optional</span></label>
              <select id="leadSource" name="leadSource" defaultValue={value('leadSource')} aria-invalid={Boolean(error('leadSource'))} aria-describedby={describedBy('leadSource')}>
                <option value="">Not recorded</option>
                {manualLeadSources.map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}
              </select>
              {error('leadSource') ? <p id="leadSource-error" className="field-error">{error('leadSource')}</p> : null}
            </div>
          </div>
          <div className="manual-lead-form-grid">
            <div>
              <label htmlFor="followUpDate">Follow-up date <span className="optional-label">optional</span></label>
              <input id="followUpDate" name="followUpDate" type="date" defaultValue={value('followUpDate')} aria-invalid={Boolean(error('followUpDate'))} aria-describedby={describedBy('followUpDate')} />
              {error('followUpDate') ? <p id="followUpDate-error" className="field-error">{error('followUpDate')}</p> : null}
            </div>
            {assignees.length ? <div>
              <label htmlFor="assignedMembershipId">Assignee <span className="optional-label">optional</span></label>
              <select id="assignedMembershipId" name="assignedMembershipId" defaultValue={value('assignedMembershipId')}>
                <option value="">Unassigned</option>
                {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.user.displayName}</option>)}
              </select>
            </div> : null}
          </div>
          <div>
            <label htmlFor="initialNote">Initial internal note <span className="optional-label">optional</span></label>
            <textarea id="initialNote" name="initialNote" rows={4} maxLength={3000} defaultValue={value('initialNote')} aria-invalid={Boolean(error('initialNote'))} aria-describedby={describedBy('initialNote', 'initialNote-help')} />
            <p id="initialNote-help" className="field-help">Visible only inside your installer organisation. Do not enter excessive or sensitive personal data.</p>
            {error('initialNote') ? <p id="initialNote-error" className="field-error">{error('initialNote')}</p> : null}
          </div>
        </div>
      </details>

      {state.status === 'duplicates' && state.duplicates?.length ? (
        <section className="manual-lead-duplicates" aria-labelledby="duplicate-heading">
          <h2 id="duplicate-heading">Possible existing leads</h2>
          <p>These exact contact details match records you can already read. This warning does not prevent a legitimate separate enquiry.</p>
          <ul>
            {state.duplicates.map((duplicate) => (
              <li key={duplicate.id}>
                <span><strong>{duplicate.customerName}</strong> · matched {duplicate.matchingSignals.join(', ')}</span>
                <Link href={`/installer-review-emerald/leads/${duplicate.id}`} target="_blank">Review match</Link>
              </li>
            ))}
          </ul>
          <button type="submit" name="duplicateConfirmed" value="true" disabled={pending}>Create anyway</button>
        </section>
      ) : (
        <button type="submit" disabled={pending} aria-describedby="manual-lead-submit-help">
          {pending ? 'Creating lead…' : 'Create lead'}
        </button>
      )}
      <p id="manual-lead-submit-help" className="field-help">The lead will open in its workspace with qualification shown as incomplete.</p>
    </form>
  );
}
