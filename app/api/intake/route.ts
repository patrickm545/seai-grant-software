import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { formatLeadFormValidationFailure, leadFormSchema } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { generateEligibilityAnalysis } from '@/lib/ai';
import { DEFAULT_INSTALLER_ID } from '@/lib/default-installer';
import { sendLeadNotificationEmails } from '@/lib/email';
import { sendLeadNotificationSms } from '@/lib/sms';
import type { EligibilityAnalysis, LeadFormInput, LeadTemperature } from '@/lib/types';
import { buildSolarQuoteEstimate, type SolarQuoteEstimate } from '@/lib/quote-estimate';
import { writeAuditLog } from '@/lib/audit';
import { calculateLeadScore, getLeadScorePlainLabel } from '@/lib/crm';
import { getDocumentTypeFromLegacyKind } from '@/lib/documents';
import { ensureDefaultInstallerWithOrganisation } from '@/lib/identity';
import { runLeadNotificationTasks } from '@/lib/intake-notifications';
import { LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY } from '@/lib/lead-workflow';
import { createPortalToken } from '@/lib/portal';
import { ensureWorkflowInstanceForResource } from '@/lib/workflow';
import {
  calculateInstallerGeneratedQuote,
  defaultInstallerQuotePricing,
  getPricingValuesFromRecord,
  parseGeneratedInstallerQuote
} from '@/lib/installer-quote-pricing';

export const runtime = 'nodejs';

const DUPLICATE_SUBMISSION_WINDOW_MS = 2 * 60 * 1000;

function buildRequestContext(requestId: string, stage: string) {
  return { requestId, stage };
}

function getErrorLogDetails(error: unknown) {
  if (error && typeof error === 'object') {
    const maybeCode = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    return {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: maybeCode
    };
  }

  return {
    name: 'UnknownError',
    message: 'Unknown error'
  };
}

function normalizeLeadInput(input: LeadFormInput): LeadFormInput {
  return {
    ...input,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() || undefined,
    eircode: input.eircode?.trim().toUpperCase() || undefined,
    mprn: input.mprn.trim(),
    notes: input.notes?.trim() || undefined
  };
}

function getDuplicateLeadWhere(input: LeadFormInput, organisationId: string) {
  return {
    organisationId,
    installerId: input.installerId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    addressLine1: input.addressLine1,
    mprn: input.mprn,
    createdAt: {
      gte: new Date(Date.now() - DUPLICATE_SUBMISSION_WINDOW_MS)
    }
  };
}

function getLeadTemperature(value: unknown): LeadTemperature {
  const root = asRecord(value);
  const salesSignal = asRecord(root?.salesSignal);
  const leadTemperature = salesSignal?.leadTemperature;
  return leadTemperature === 'HOT' || leadTemperature === 'WARM' || leadTemperature === 'COLD' ? leadTemperature : 'WARM';
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

function getStoredQuoteEstimate(value: unknown): SolarQuoteEstimate | undefined {
  const root = asRecord(value);
  const quoteEstimate = asRecord(root?.quoteEstimate);
  return quoteEstimate ? (quoteEstimate as SolarQuoteEstimate) : undefined;
}

function getStoredGeneratedQuote(value: unknown) {
  return parseGeneratedInstallerQuote(value) ?? undefined;
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function buildStoredAnalysis(lead: {
  likelyEligible: boolean | null;
  eligibilityConfidence: number | null;
  aiSummary: string | null;
  missingItemsJson: unknown;
  risksJson: unknown;
  structuredExportJson: unknown;
}): EligibilityAnalysis {
  return {
    likelyEligible: lead.likelyEligible ?? false,
    confidence: lead.eligibilityConfidence ?? 0,
    missingItems: getStringArray(lead.missingItemsJson),
    risks: getStringArray(lead.risksJson),
    summary: lead.aiSummary ?? 'Application received and queued for review.',
    nextStep: 'Installer review pending.',
    leadTemperature: getLeadTemperature(lead.structuredExportJson)
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let stage = 'received';

  try {
    console.info('[intake] POST /api/intake received', buildRequestContext(requestId, stage));

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      console.warn('[intake] Unsupported content type', {
        ...buildRequestContext(requestId, 'request_content_type'),
        contentType: contentType || 'missing'
      });
      return NextResponse.json(
        {
          error: 'We could not read the form submission. Please refresh and try again.',
          formErrors: ['The submission must be sent as JSON.'],
          requestId
        },
        { status: 415 }
      );
    }

    stage = 'request_json';
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.warn('[intake] Request body could not be parsed', {
        ...buildRequestContext(requestId, stage),
        error: getErrorLogDetails(error)
      });
      return NextResponse.json(
        {
          error: 'We could not read the form submission. Please refresh and try again.',
          formErrors: ['The submission body was empty or malformed.'],
          requestId
        },
        { status: 400 }
      );
    }

    console.info('[intake] Request body parsed', {
      ...buildRequestContext(requestId, stage),
      hasMprn: typeof (body as { mprn?: unknown })?.mprn === 'string' && (body as { mprn: string }).mprn.length > 0
    });

    stage = 'validation';
    const validationResult = leadFormSchema.safeParse(body);

    if (!validationResult.success) {
      const failure = formatLeadFormValidationFailure(validationResult.error, requestId);
      console.warn('[intake] Submission validation failed', {
        ...buildRequestContext(requestId, stage),
        fields: Object.keys(failure.fieldErrors ?? {}),
        formErrors: failure.formErrors?.length ?? 0
      });
      return NextResponse.json(failure, { status: 400 });
    }

    const parsed = validationResult.data as LeadFormInput & {
      applicantDocuments?: Array<{
        kind: 'electricity_bill' | 'meter_photo' | 'roof_photo';
        fileName: string;
        mimeType: string;
        sizeBytes?: number;
      }>;
    };
    const { applicantDocuments = [], ...rawLeadInput } = parsed;
    const leadInput = normalizeLeadInput(rawLeadInput);
    console.info('[intake] Submission validated', {
      ...buildRequestContext(requestId, stage),
      installerId: leadInput.installerId,
      applicantDocuments: applicantDocuments.length
    });

    stage = 'installer_lookup';
    const installer =
      leadInput.installerId === DEFAULT_INSTALLER_ID
        ? await ensureDefaultInstallerWithOrganisation(prisma, { ensureDefaultAdminMembership: false })
        : await prisma.installer.findUnique({
            where: { id: leadInput.installerId },
            include: { organisation: true }
          });

    if (!installer) {
      console.warn('[intake] Installer not found', {
        ...buildRequestContext(requestId, stage),
        installerId: leadInput.installerId
      });
      return NextResponse.json({ error: 'Installer not found', requestId }, { status: 404 });
    }

    stage = 'duplicate_lookup';
    const existingLead = await prisma.lead.findFirst({
      where: getDuplicateLeadWhere(leadInput, installer.organisationId),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        likelyEligible: true,
        eligibilityConfidence: true,
        aiSummary: true,
        missingItemsJson: true,
        risksJson: true,
        structuredExportJson: true,
        generatedQuoteJson: true,
        documents: {
          select: {
            id: true
          }
        }
      }
    });

    if (existingLead) {
      console.info('[intake] Duplicate submission returned existing lead', {
        ...buildRequestContext(requestId, stage),
        leadId: existingLead.id
      });
      return NextResponse.json({
        leadId: existingLead.id,
        analysis: buildStoredAnalysis(existingLead),
        quoteEstimate: getStoredQuoteEstimate(existingLead.structuredExportJson),
        generatedQuote: getStoredGeneratedQuote(existingLead.generatedQuoteJson),
        uploadedDocuments: existingLead.documents.length
      });
    }

    stage = 'quote_and_analysis';
    const quoteEstimate = buildSolarQuoteEstimate(leadInput, leadInput.selectedSystemSizeVariant ?? 'recommended');
    const installerPricing = await prisma.installerQuotePricing.upsert({
      where: { installerId: installer.id },
      update: {},
      create: {
        installerId: installer.id,
        ...defaultInstallerQuotePricing
      }
    });
    const generatedQuote = calculateInstallerGeneratedQuote({
      pricing: getPricingValuesFromRecord(installerPricing),
      quoteEstimate,
      leadInput,
      pricingUpdatedAt: installerPricing.updatedAt.toISOString()
    });
    const analysis = await generateEligibilityAnalysis(leadInput);
    const structuredExportJson = {
      property: {
        addressLine1: leadInput.addressLine1,
        addressLine2: leadInput.addressLine2 ?? null,
        county: leadInput.county,
        eircode: leadInput.eircode ?? null,
        dwellingType: leadInput.dwellingType,
        mprn: leadInput.mprn,
        propertyOwner: leadInput.propertyOwner,
        privateLandlord: leadInput.privateLandlord,
        yearBuilt: leadInput.yearBuilt,
        yearOccupied: leadInput.yearOccupied ?? null
      },
      grantDetails: {
        mprn: leadInput.mprn,
        worksStarted: leadInput.worksStarted,
        priorSolarGrantAtMprn: leadInput.priorSolarGrantAtMprn
      },
      quoteEstimate,
      salesSignal: {
        leadTemperature: analysis.leadTemperature,
        callbackWindow: leadInput.preferredCallbackWindow ?? null,
        installTimeline: leadInput.installTimeline ?? null,
        batteryInterest: leadInput.wantsBattery,
        wantsBattery: leadInput.wantsBattery,
        selectedSystemSizeVariant: quoteEstimate.selectedVariant,
        recommendedSystemSizeKwp: quoteEstimate.recommendedSystemSizeKwp,
        selectedSystemSizeKwp: quoteEstimate.selectedSystemSizeKwp,
        estimatedPanelCount: quoteEstimate.estimatedPanelCount,
        estimatedNetCostRangeAfterGrant: quoteEstimate.netCostRangeAfterGrant,
        estimatedAnnualSavingsRange: quoteEstimate.estimatedAnnualSavingsRange,
        estimatedPaybackRangeYears: quoteEstimate.estimatedPaybackRangeYears,
        estimatedSeaiGrantDeduction: quoteEstimate.estimatedSeaiGrantDeduction,
        grantLikely: quoteEstimate.grantLikely,
        recommendedNextAction: quoteEstimate.recommendedNextAction,
        monthlyElectricityBillRange: leadInput.monthlyElectricityBillRange ?? null,
        roofType: leadInput.roofType ?? null,
        roofDirection: leadInput.roofDirection ?? null,
        shadingLevel: leadInput.shadingLevel ?? null,
        evChargerInterest: leadInput.evChargerInterest,
        hotWaterDiverterInterest: leadInput.hotWaterDiverterInterest,
        numberOfOccupants: leadInput.numberOfOccupants ?? null,
        daytimeUsage: leadInput.daytimeUsage ?? null
      }
    };
    const leadScore = calculateLeadScore({
      ...leadInput,
      likelyEligible: analysis.likelyEligible,
      eligibilityConfidence: analysis.confidence,
      applicantDocuments,
      generatedQuoteJson: generatedQuote,
      structuredExportJson,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const scoreUpdatedAt = new Date();
    const portalToken = createPortalToken();

    const submissionKey = `${installer.organisationId}|${leadInput.installerId}|${leadInput.fullName}|${leadInput.email}|${leadInput.phone}|${leadInput.addressLine1}|${leadInput.mprn}`;

    stage = 'persistence_transaction';
    const submissionResult = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${submissionKey}))`;

      const duplicateLead = await tx.lead.findFirst({
        where: getDuplicateLeadWhere(leadInput, installer.organisationId),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          county: true,
          mprn: true,
          likelyEligible: true,
          eligibilityConfidence: true,
          aiSummary: true,
          missingItemsJson: true,
          risksJson: true,
          structuredExportJson: true,
          generatedQuoteJson: true,
          documents: {
            select: {
              id: true
            }
          }
        }
      });

      if (duplicateLead) {
        console.info('[intake] Duplicate submission found after transaction lock', {
          ...buildRequestContext(requestId, 'transaction_duplicate_lookup'),
          leadId: duplicateLead.id
        });
        return {
          lead: duplicateLead,
          analysis: buildStoredAnalysis(duplicateLead),
          quoteEstimate: getStoredQuoteEstimate(duplicateLead.structuredExportJson),
          generatedQuote: getStoredGeneratedQuote(duplicateLead.generatedQuoteJson),
          uploadedDocuments: duplicateLead.documents.length,
          isDuplicate: true
        };
      }

      const createdLead = await tx.lead.create({
        data: {
          organisationId: installer.organisationId,
          installerId: leadInput.installerId,
          fullName: leadInput.fullName,
          email: leadInput.email,
          phone: leadInput.phone,
          addressLine1: leadInput.addressLine1,
          addressLine2: leadInput.addressLine2,
          county: leadInput.county,
          eircode: leadInput.eircode,
          propertyOwner: leadInput.propertyOwner,
          privateLandlord: leadInput.privateLandlord,
          dwellingType: leadInput.dwellingType,
          yearBuilt: leadInput.yearBuilt,
          yearOccupied: leadInput.yearOccupied,
          mprn: leadInput.mprn,
          worksStarted: leadInput.worksStarted,
          priorSolarGrantAtMprn: leadInput.priorSolarGrantAtMprn,
          consentToProcess: leadInput.consentToProcess,
          consentToGrantAssist: leadInput.consentToGrantAssist,
          consentToContact: leadInput.consentToContact,
          notes: [
            leadInput.notes ? `Homeowner notes: ${leadInput.notes}` : null,
            leadInput.roofType ? `Roof type: ${leadInput.roofType}` : null,
            leadInput.installTimeline ? `Install timeline: ${leadInput.installTimeline}` : null,
            leadInput.monthlyElectricityBillRange ? `Bill range: ${leadInput.monthlyElectricityBillRange}` : null,
            leadInput.preferredCallbackWindow ? `Preferred callback: ${leadInput.preferredCallbackWindow}` : null,
            leadInput.roofDirection ? `Roof direction: ${leadInput.roofDirection}` : null,
            leadInput.shadingLevel ? `Shading: ${leadInput.shadingLevel}` : null,
            leadInput.daytimeUsage ? `Daytime usage: ${leadInput.daytimeUsage}` : null,
            leadInput.numberOfOccupants ? `Occupants: ${leadInput.numberOfOccupants}` : null,
            `Battery interest: ${leadInput.wantsBattery ? 'Yes' : 'No'}`,
            `EV charger interest: ${leadInput.evChargerInterest ? 'Yes' : 'No'}`,
            `Hot water diverter interest: ${leadInput.hotWaterDiverterInterest ? 'Yes' : 'No'}`,
            `Quote estimate: ${quoteEstimate.selectedSystemSizeKwp} kWp / ${quoteEstimate.estimatedPanelCount} panels / net ${quoteEstimate.netCostRangeAfterGrant.min}-${quoteEstimate.netCostRangeAfterGrant.max}`,
            `Generated quote: EUR ${generatedQuote.finalQuoteTotal}`,
            `Recommended next action: ${quoteEstimate.recommendedNextAction}`
          ].filter(Boolean).join(' | '),
          pipelineStage: 'NEW_LEAD',
          leadScore,
          scoreUpdatedAt,
          portalToken,
          portalTokenCreatedAt: scoreUpdatedAt,
          status: analysis.likelyEligible ? 'READY_TO_APPLY' : 'NEEDS_REVIEW',
          likelyEligible: analysis.likelyEligible,
          eligibilityConfidence: analysis.confidence,
          aiSummary: analysis.summary,
          missingItemsJson: analysis.missingItems,
          risksJson: analysis.risks,
          generatedQuoteJson: generatedQuote as unknown as Prisma.InputJsonValue,
          structuredExportJson: structuredExportJson as unknown as Prisma.InputJsonValue,
          documents: applicantDocuments.length
            ? {
                create: applicantDocuments.map((document, index) => {
                  const storagePath = `uploaded://${leadInput.email}/${Date.now()}-${index}-${document.fileName}`;

                  return {
                    type: getDocumentTypeFromLegacyKind(document.kind),
                    fileName: document.fileName,
                    originalFilename: document.fileName,
                    mimeType: document.mimeType,
                    sizeBytes: document.sizeBytes ?? null,
                    storagePath,
                    storageUrl: storagePath,
                    uploadedBy: 'Public intake',
                    uploadedByRole: 'HOMEOWNER',
                    status: 'UPLOADED',
                    extractedText:
                      document.kind === 'electricity_bill'
                        ? 'Applicant uploaded an electricity bill for installer review.'
                        : document.kind === 'meter_photo'
                        ? 'Applicant uploaded a meter photo for MPRN verification.'
                        : 'Applicant uploaded a roof or panel area photo for installer review.',
                    aiFieldsJson: {
                      source: 'applicant_upload',
                      documentKind: document.kind,
                      sizeBytes: document.sizeBytes ?? null
                    }
                  };
                })
              }
            : undefined
        }
      });
      console.info('[intake] Lead created', {
        ...buildRequestContext(requestId, 'lead_create'),
        leadId: createdLead.id
      });

      await ensureWorkflowInstanceForResource({
        db: tx,
        workflowDefinitionKey: LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY,
        organisationId: installer.organisationId,
        resourceType: 'lead',
        resourceId: createdLead.id,
        stageKey: createdLead.pipelineStage,
        metadata: {
          source: 'public_intake'
        }
      });

      await tx.leadActivity.create({
        data: {
          leadId: createdLead.id,
          type: 'LEAD_CREATED',
          title: 'Lead created',
          description: 'Homeowner submitted the solar enquiry and grant-readiness form.',
          metadata: {
            source: 'public_intake',
            installerId: leadInput.installerId,
            organisationId: installer.organisationId,
            uploadedDocuments: applicantDocuments.length
          },
          createdBy: 'Public intake',
          createdByRole: 'HOMEOWNER'
        }
      });

      await tx.leadActivity.create({
        data: {
          leadId: createdLead.id,
          type: 'SCORE_UPDATED',
          title: 'Lead score calculated',
          description: `Lead score set to ${getLeadScorePlainLabel(leadScore)} from intake details.`,
          metadata: {
            leadScore,
            eligibilityConfidence: analysis.confidence,
            leadTemperature: analysis.leadTemperature
          },
          createdBy: 'Clada OS',
          createdByRole: 'SYSTEM'
        }
      });

      await tx.leadActivity.create({
        data: {
          leadId: createdLead.id,
          type: 'PORTAL_TOKEN_CREATED',
          title: 'Customer portal link created',
          description: 'A secure customer portal link was created for this homeowner.',
          metadata: {
            source: 'public_intake'
          },
          createdBy: 'Clada OS',
          createdByRole: 'SYSTEM'
        }
      });

      if (applicantDocuments.length) {
        await tx.leadActivity.create({
          data: {
            leadId: createdLead.id,
            type: 'DOCUMENT_UPLOADED',
            title: 'Documents uploaded',
            description: `${applicantDocuments.length} document${applicantDocuments.length === 1 ? '' : 's'} attached during intake.`,
            metadata: {
              documentCount: applicantDocuments.length,
              documentKinds: applicantDocuments.map((document) => document.kind)
            },
            createdBy: 'Public intake',
            createdByRole: 'HOMEOWNER'
          }
        });
      }

      await writeAuditLog(tx, {
        leadId: createdLead.id,
        action: 'lead.created',
        actor: 'homeowner',
        metadata: {
          source: 'public_intake',
          installerId: leadInput.installerId,
          organisationId: installer.organisationId,
          status: createdLead.status,
          pipelineStage: createdLead.pipelineStage,
          leadScore: createdLead.leadScore,
          likelyEligible: createdLead.likelyEligible,
          uploadedDocuments: applicantDocuments.length
        }
      });

      return {
        lead: createdLead,
        analysis,
        quoteEstimate,
        generatedQuote,
        uploadedDocuments: applicantDocuments.length,
        isDuplicate: false
      };
    });

    if (!submissionResult.isDuplicate) {
      await runLeadNotificationTasks({
        requestId,
        leadId: submissionResult.lead.id,
        tasks: [
          {
            channel: 'email',
            run: () =>
              sendLeadNotificationEmails({
                lead: submissionResult.lead,
                installerName: installer.name,
                quoteEstimate: submissionResult.quoteEstimate,
                recommendedNextAction: submissionResult.quoteEstimate?.recommendedNextAction
              })
          },
          {
            channel: 'sms',
            run: () =>
              sendLeadNotificationSms({
                lead: submissionResult.lead,
                quoteEstimate: submissionResult.quoteEstimate,
                leadTemperature: submissionResult.analysis.leadTemperature
              })
          }
        ]
      });
    }

    console.info('[intake] Submission completed', {
      ...buildRequestContext(requestId, 'completed'),
      leadId: submissionResult.lead.id,
      isDuplicate: submissionResult.isDuplicate
    });
    return NextResponse.json({
      leadId: submissionResult.lead.id,
      analysis: submissionResult.analysis,
      quoteEstimate: submissionResult.quoteEstimate,
      generatedQuote: submissionResult.generatedQuote,
      uploadedDocuments: submissionResult.uploadedDocuments,
      requestId
    });
  } catch (error) {
    console.error('[intake] Submission failed', {
      ...buildRequestContext(requestId, stage),
      error: getErrorLogDetails(error)
    });
    return NextResponse.json(
      {
        error: 'We could not submit your application right now. Please try again.',
        requestId
      },
      { status: 500 }
    );
  }
}
