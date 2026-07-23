import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { OrganisationContext } from './identity';
import { writeAuditEvent } from './audit';
import { LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY } from './lead-workflow';
import { hasPermission, requirePermission } from './permissions';
import { ensureWorkflowInstanceForResource } from './workflow';
import { manualLeadSources } from './manual-lead-contract';

export { manualLeadSources } from './manual-lead-contract';

const MAX_DUPLICATE_CANDIDATES = 5;
const PLACEHOLDER_NAMES = new Set([
  'test',
  'testing',
  'unknown',
  'n/a',
  'na',
  'none',
  'customer',
  'homeowner',
  'placeholder'
]);

const optionalTrimmed = (maximum: number) =>
  z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().max(maximum).optional()
  );

const optionalEmail = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(254).email('Enter a valid email address.').transform((value) => value.toLowerCase()).optional()
);

const optionalPhone = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(40).transform(normalisePhone).refine(
    (value) => /^\+?\d{7,15}$/.test(value),
    'Enter a valid phone number with 7 to 15 digits.'
  ).optional()
);

const optionalEircode = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(8).transform((value) => value.toUpperCase()).refine(
    (value) => /^[AC-FHKNPRTV-Y]\d{2}\s?[0-9AC-FHKNPRTV-Y]{4}$/.test(value),
    'Enter a valid Eircode, for example D02 X285.'
  ).optional()
);

export const manualLeadSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the customer name.').max(120, 'Customer name must be 120 characters or fewer.').refine(
    (value) => !PLACEHOLDER_NAMES.has(value.toLowerCase()) && /[a-zà-ž]/i.test(value),
    'Enter the customer’s real name, not a placeholder.'
  ),
  email: optionalEmail,
  phone: optionalPhone,
  addressLine1: optionalTrimmed(200),
  eircode: optionalEircode,
  leadSource: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.enum(manualLeadSources).optional()
  ),
  followUpDate: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid follow-up date.').optional()
  ),
  assignedMembershipId: optionalTrimmed(120),
  initialNote: optionalTrimmed(3000),
  requestId: z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/, 'The submission token is invalid.')
}).strict().superRefine((value, context) => {
  if (!value.email && !value.phone) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contact'],
      message: 'Enter at least one valid contact method: phone or email.'
    });
  }

  if (value.followUpDate) {
    const date = parseFollowUpDate(value.followUpDate);
    if (!date) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['followUpDate'], message: 'Enter a valid follow-up date.' });
    }
  }
});

export type ManualLeadInput = z.input<typeof manualLeadSchema>;
export type ValidatedManualLeadInput = z.output<typeof manualLeadSchema>;

export class ManualLeadError extends Error {
  constructor(
    readonly code: 'INSTALLER_NOT_FOUND' | 'ASSIGNEE_NOT_FOUND' | 'IDEMPOTENCY_CONFLICT' | 'HUMAN_ACTOR_REQUIRED',
    message: string
  ) {
    super(message);
    this.name = 'ManualLeadError';
  }
}

export function normalisePhone(value: string) {
  const trimmed = value.trim();
  const prefix = trimmed.startsWith('+') ? '+' : '';
  return `${prefix}${trimmed.replace(/\D/g, '')}`;
}

export function normaliseEircode(value: string | undefined) {
  return value ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : undefined;
}

function parseFollowUpDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function hashManualLeadInput(input: ValidatedManualLeadInput) {
  return createHash('sha256').update(JSON.stringify({
    fullName: input.fullName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    addressLine1: input.addressLine1 ?? null,
    eircode: normaliseEircode(input.eircode) ?? null,
    leadSource: input.leadSource ?? null,
    followUpDate: input.followUpDate ?? null,
    assignedMembershipId: input.assignedMembershipId ?? null,
    initialNote: input.initialNote ?? null
  })).digest('hex');
}

export function formatManualLeadErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

export type DuplicateLeadSummary = {
  id: string;
  customerName: string;
  createdAt: Date;
  matchingSignals: Array<'email' | 'phone' | 'eircode'>;
};

export function buildManualLeadDuplicateSignals(input: ValidatedManualLeadInput): Prisma.LeadWhereInput[] {
  const signals: Prisma.LeadWhereInput[] = [];
  if (input.email) signals.push({ normalisedEmail: input.email });
  if (input.phone) signals.push({ normalisedPhone: input.phone });
  const eircode = normaliseEircode(input.eircode);
  if (eircode) signals.push({ normalisedEircode: eircode });
  return signals;
}

export async function findManualLeadDuplicates(args: {
  db: PrismaClient;
  context: OrganisationContext | null | undefined;
  input: ValidatedManualLeadInput;
}): Promise<DuplicateLeadSummary[]> {
  const { db, context, input } = args;
  requirePermission(context, 'lead.read');

  const normalisedEmail = input.email;
  const normalisedPhone = input.phone;
  const normalisedEircode = normaliseEircode(input.eircode);
  const signals = buildManualLeadDuplicateSignals(input);
  if (!signals.length) return [];

  const leads = await db.lead.findMany({
    where: { organisationId: context.organisationId, OR: signals },
    orderBy: { createdAt: 'desc' },
    take: MAX_DUPLICATE_CANDIDATES,
    select: {
      id: true,
      fullName: true,
      createdAt: true,
      normalisedEmail: true,
      normalisedPhone: true,
      normalisedEircode: true
    }
  });

  return leads.map((lead) => ({
    id: lead.id,
    customerName: lead.fullName,
    createdAt: lead.createdAt,
    matchingSignals: [
      normalisedEmail && lead.normalisedEmail === normalisedEmail ? 'email' as const : null,
      normalisedPhone && lead.normalisedPhone === normalisedPhone ? 'phone' as const : null,
      normalisedEircode && lead.normalisedEircode === normalisedEircode ? 'eircode' as const : null
    ].filter((value): value is 'email' | 'phone' | 'eircode' => value !== null)
  }));
}

async function findReplay(db: PrismaClient, organisationId: string, requestId: string, inputHash: string) {
  const existing = await db.lead.findFirst({
    where: { organisationId, manualCreationRequestId: requestId },
    select: { id: true, manualCreationInputHash: true }
  });
  if (!existing) return null;
  if (existing.manualCreationInputHash !== inputHash) {
    throw new ManualLeadError('IDEMPOTENCY_CONFLICT', 'This submission token was already used for different details. Refresh and try again.');
  }
  return existing;
}

export async function createManualLead(args: {
  db: PrismaClient;
  context: OrganisationContext | null | undefined;
  input: ValidatedManualLeadInput;
}) {
  const { db, context, input } = args;
  requirePermission(context, 'lead.create');
  if (context.actor.actorType !== 'human_user') {
    throw new ManualLeadError('HUMAN_ACTOR_REQUIRED', 'An authenticated installer user is required.');
  }
  if (input.assignedMembershipId) requirePermission(context, 'lead.assign');
  const inputHash = hashManualLeadInput(input);
  const replay = await findReplay(db, context.organisationId, input.requestId, inputHash);
  if (replay) return { leadId: replay.id, replayed: true };

  const [installer, assignee] = await Promise.all([
    db.installer.findFirst({
      where: { organisationId: context.organisationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    }),
    input.assignedMembershipId
      ? db.organisationMembership.findFirst({
          where: {
            id: input.assignedMembershipId,
            organisationId: context.organisationId,
            status: 'ACTIVE',
            user: { status: 'ACTIVE' }
          },
          select: { id: true }
        })
      : Promise.resolve(null)
  ]);

  if (!installer) throw new ManualLeadError('INSTALLER_NOT_FOUND', 'No installer is configured for this organisation.');
  if (input.assignedMembershipId) {
    if (!assignee) throw new ManualLeadError('ASSIGNEE_NOT_FOUND', 'Choose an active assignee from this organisation.');
  }

  const followUpAt = input.followUpDate ? parseFollowUpDate(input.followUpDate) : null;
  try {
    const leadId = await db.$transaction(async (tx) => {
      const existing = await tx.lead.findFirst({
        where: { organisationId: context.organisationId, manualCreationRequestId: input.requestId },
        select: { id: true, manualCreationInputHash: true }
      });
      if (existing) {
        if (existing.manualCreationInputHash !== inputHash) {
          throw new ManualLeadError('IDEMPOTENCY_CONFLICT', 'This submission token was already used for different details. Refresh and try again.');
        }
        return existing.id;
      }

      const lead = await tx.lead.create({
        data: {
          organisationId: context.organisationId,
          installerId: installer.id,
          creationOrigin: 'MANUAL_INSTALLER',
          createdByMembershipId: context.membershipId,
          assignedMembershipId: assignee?.id ?? null,
          manualCreationRequestId: input.requestId,
          manualCreationInputHash: inputHash,
          fullName: input.fullName,
          email: input.email ?? null,
          normalisedEmail: input.email ?? null,
          phone: input.phone ?? null,
          normalisedPhone: input.phone ?? null,
          addressLine1: input.addressLine1 ?? null,
          eircode: input.eircode ?? null,
          normalisedEircode: normaliseEircode(input.eircode) ?? null,
          leadSource: input.leadSource ?? null,
          nextFollowUpAt: followUpAt,
          followUpDate: followUpAt,
          pipelineStage: 'NEW_LEAD',
          status: 'NEW',
          likelyEligible: null,
          eligibilityConfidence: null
        }
      });

      await ensureWorkflowInstanceForResource({
        db: tx,
        workflowDefinitionKey: LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY,
        organisationId: context.organisationId,
        resourceType: 'lead',
        resourceId: lead.id,
        stageKey: 'NEW_LEAD',
        metadata: { source: 'manual_installer', origin: 'MANUAL_INSTALLER' }
      });

      const actorUserId = context.actor.actorType === 'human_user' ? context.actor.userId : null;
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'LEAD_CREATED',
          title: 'Lead created',
          description: 'Installer manually recorded a new customer enquiry.',
          metadata: { source: 'manual_installer', origin: 'MANUAL_INSTALLER' },
          createdBy: context.actor.displayName,
          createdByRole: context.role,
          actorType: 'HUMAN_USER',
          actorUserId,
          actorMembershipId: context.membershipId,
          actorOrganisationId: context.organisationId
        }
      });

      if (input.initialNote) {
        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'NOTE_ADDED',
            title: 'Initial internal note added',
            description: input.initialNote,
            metadata: { characterCount: input.initialNote.length, source: 'manual_creation' },
            createdBy: context.actor.displayName,
            createdByRole: context.role,
            actorType: 'HUMAN_USER',
            actorUserId,
            actorMembershipId: context.membershipId,
            actorOrganisationId: context.organisationId
          }
        });
      }

      await writeAuditEvent(tx, {
        leadId: lead.id,
        organisationId: context.organisationId,
        context,
        action: 'lead.created',
        source: 'manual_installer',
        outcome: 'SUCCEEDED',
        metadata: {
          origin: 'MANUAL_INSTALLER',
          installerId: installer.id,
          creatorMembershipId: context.membershipId,
          assignedMembershipId: assignee?.id ?? null,
          hasFollowUp: Boolean(followUpAt),
          hasInitialNote: Boolean(input.initialNote)
        }
      });

      return lead.id;
    });

    return { leadId, replayed: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const racedReplay = await findReplay(db, context.organisationId, input.requestId, inputHash);
      if (racedReplay) return { leadId: racedReplay.id, replayed: true };
    }
    throw error;
  }
}

export async function listAssignableMemberships(args: {
  db: PrismaClient;
  context: OrganisationContext | null | undefined;
}) {
  const { db, context } = args;
  if (!hasPermission(context, 'lead.assign')) return [];
  return db.organisationMembership.findMany({
    where: {
      organisationId: context!.organisationId,
      status: 'ACTIVE',
      user: { status: 'ACTIVE' }
    },
    orderBy: { user: { displayName: 'asc' } },
    take: 100,
    select: { id: true, user: { select: { displayName: true } } }
  });
}

export const manualLeadPerformanceContract = {
  duplicateQueryCount: 1,
  maximumDuplicateCandidates: MAX_DUPLICATE_CANDIDATES,
  duplicateSelectedColumns: ['id', 'fullName', 'createdAt', 'normalisedEmail', 'normalisedPhone', 'normalisedEircode'] as const
};
