'use server';

import { redirect } from 'next/navigation';
import { requirePilotContext } from '@/lib/pilot-auth';
import { prisma } from '@/lib/prisma';
import {
  createManualLead,
  findManualLeadDuplicates,
  formatManualLeadErrors,
  ManualLeadError,
  manualLeadSchema
} from '@/lib/manual-lead';
import { AuthorizationError, hasPermission } from '@/lib/permissions';

export type ManualLeadFormState = {
  revision: number;
  status: 'idle' | 'error' | 'duplicates';
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  duplicates?: Array<{
    id: string;
    customerName: string;
    createdAt: string;
    matchingSignals: string[];
  }>;
};

const formFields = [
  'fullName',
  'email',
  'phone',
  'addressLine1',
  'eircode',
  'leadSource',
  'followUpDate',
  'assignedMembershipId',
  'initialNote',
  'requestId'
] as const;

function readSafeValues(formData: FormData) {
  return Object.fromEntries(formFields.map((field) => [field, String(formData.get(field) ?? '').slice(0, 3000)]));
}

export async function submitManualLead(
  previousState: ManualLeadFormState,
  formData: FormData
): Promise<ManualLeadFormState> {
  const revision = previousState.revision + 1;
  const values = readSafeValues(formData);
  const parsed = manualLeadSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: 'error',
      revision,
      message: 'Check the highlighted fields and try again.',
      fieldErrors: formatManualLeadErrors(parsed.error),
      values
    };
  }

  try {
    const context = await requirePilotContext();
    const duplicateConfirmed = formData.get('duplicateConfirmed') === 'true';
    if (!duplicateConfirmed && hasPermission(context, 'lead.read')) {
      const duplicates = await findManualLeadDuplicates({ db: prisma, context, input: parsed.data });
      if (duplicates.length) {
        return {
          status: 'duplicates',
          revision,
          message: 'Possible matches were found in your organisation. Review a match or create this separate lead anyway.',
          values,
          duplicates: duplicates.map((lead) => ({
            ...lead,
            createdAt: lead.createdAt.toISOString()
          }))
        };
      }
    }

    const result = await createManualLead({ db: prisma, context, input: parsed.data });
    redirect(`/installer-review-emerald/leads/${result.leadId}`);
  } catch (error) {
    if (error instanceof ManualLeadError) {
      return { revision, status: 'error', message: error.message, values };
    }
    if (error instanceof AuthorizationError) {
      return { revision, status: 'error', message: 'You are not authorised to create this lead.', values };
    }
    throw error;
  }
}
