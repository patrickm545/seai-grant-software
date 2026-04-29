import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { leadFormSchema } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { generateEligibilityAnalysis } from '@/lib/ai';
import { DEFAULT_INSTALLER_ID, getDefaultInstallerSeedData } from '@/lib/default-installer';
import { sendLeadNotificationEmails } from '@/lib/email';
import { sendLeadNotificationSms } from '@/lib/sms';
import type { EligibilityAnalysis, LeadFormInput, LeadTemperature } from '@/lib/types';

export const runtime = 'nodejs';

const DUPLICATE_SUBMISSION_WINDOW_MS = 2 * 60 * 1000;

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

function getDuplicateLeadWhere(input: LeadFormInput) {
  return {
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
  const leadTemperature = (value as { salesSignal?: { leadTemperature?: unknown } } | null)?.salesSignal?.leadTemperature;
  return leadTemperature === 'HOT' || leadTemperature === 'WARM' || leadTemperature === 'COLD' ? leadTemperature : 'WARM';
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
  try {
    console.info('[intake] POST /api/intake received');
    const body = await request.json();
    console.info('[intake] Request body parsed', {
      email: typeof body?.email === 'string' ? body.email : undefined,
      hasMprn: typeof body?.mprn === 'string' && body.mprn.length > 0
    });
    const parsed = leadFormSchema.parse(body) as LeadFormInput & {
      applicantDocuments?: Array<{
        kind: 'electricity_bill' | 'meter_photo' | 'roof_photo';
        fileName: string;
        mimeType: string;
        sizeBytes?: number;
      }>;
    };
    const applicantDocuments = parsed.applicantDocuments ?? [];
    const { applicantDocuments: _ignoredApplicantDocuments, ...rawLeadInput } = parsed;
    const leadInput = normalizeLeadInput(rawLeadInput);
    console.info('[intake] Submission validated', {
      email: leadInput.email,
      applicantDocuments: applicantDocuments.length
    });

    const installer =
      leadInput.installerId === DEFAULT_INSTALLER_ID
        ? await prisma.installer.upsert({
            where: { id: DEFAULT_INSTALLER_ID },
            update: {},
            create: getDefaultInstallerSeedData()
          })
        : await prisma.installer.findUnique({ where: { id: leadInput.installerId } });

    if (!installer) {
      console.warn('[intake] Installer not found', { installerId: leadInput.installerId });
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
    }

    const existingLead = await prisma.lead.findFirst({
      where: getDuplicateLeadWhere(leadInput),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        likelyEligible: true,
        eligibilityConfidence: true,
        aiSummary: true,
        missingItemsJson: true,
        risksJson: true,
        structuredExportJson: true,
        documents: {
          select: {
            id: true
          }
        }
      }
    });

    if (existingLead) {
      console.info('[intake] Duplicate submission returned existing lead', { leadId: existingLead.id });
      return NextResponse.json({
        leadId: existingLead.id,
        analysis: buildStoredAnalysis(existingLead),
        uploadedDocuments: existingLead.documents.length
      });
    }

    const analysis = await generateEligibilityAnalysis(leadInput);

    const submissionKey = `${leadInput.installerId}|${leadInput.fullName}|${leadInput.email}|${leadInput.phone}|${leadInput.addressLine1}|${leadInput.mprn}`;

    const submissionResult = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${submissionKey}))`;

      const duplicateLead = await tx.lead.findFirst({
        where: getDuplicateLeadWhere(leadInput),
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
          documents: {
            select: {
              id: true
            }
          }
        }
      });

      if (duplicateLead) {
        console.info('[intake] Duplicate submission found after transaction lock', { leadId: duplicateLead.id });
        return {
          lead: duplicateLead,
          analysis: buildStoredAnalysis(duplicateLead),
          uploadedDocuments: duplicateLead.documents.length,
          isDuplicate: true
        };
      }

      const createdLead = await tx.lead.create({
        data: {
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
            `Battery interest: ${leadInput.wantsBattery ? 'Yes' : 'No'}`
          ].filter(Boolean).join(' | '),
          status: analysis.likelyEligible ? 'READY_TO_APPLY' : 'NEEDS_REVIEW',
          likelyEligible: analysis.likelyEligible,
          eligibilityConfidence: analysis.confidence,
          aiSummary: analysis.summary,
          missingItemsJson: analysis.missingItems,
          risksJson: analysis.risks,
          structuredExportJson: {
            salesSignal: {
              leadTemperature: analysis.leadTemperature,
              callbackWindow: leadInput.preferredCallbackWindow,
              installTimeline: leadInput.installTimeline,
              batteryInterest: leadInput.wantsBattery,
              monthlyElectricityBillRange: leadInput.monthlyElectricityBillRange,
              roofType: leadInput.roofType
            }
          },
          documents: applicantDocuments.length
            ? {
                create: applicantDocuments.map((document, index) => ({
                  fileName: document.fileName,
                  mimeType: document.mimeType,
                  storageUrl: `uploaded://${leadInput.email}/${Date.now()}-${index}-${document.fileName}`,
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
                }))
              }
            : undefined
        }
      });
      console.info('[intake] Lead created', { leadId: createdLead.id, email: createdLead.email });

      return {
        lead: createdLead,
        analysis,
        uploadedDocuments: applicantDocuments.length,
        isDuplicate: false
      };
    });

    if (!submissionResult.isDuplicate) {
      try {
        await sendLeadNotificationEmails({
          lead: submissionResult.lead,
          installerName: installer.name
        });
      } catch (error) {
        console.error('Email notification failed during intake submission', error);
      }

      try {
        await sendLeadNotificationSms({
          lead: submissionResult.lead
        });
      } catch (error) {
        console.error('SMS notification failed during intake submission', error);
      }
    }

    console.info('[intake] Submission completed', {
      leadId: submissionResult.lead.id,
      isDuplicate: submissionResult.isDuplicate
    });
    return NextResponse.json({
      leadId: submissionResult.lead.id,
      analysis: submissionResult.analysis,
      uploadedDocuments: submissionResult.uploadedDocuments
    });
  } catch (error) {
    console.error('[intake] Submission failed', error);
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json({ error: firstIssue?.message || 'Invalid submission' }, { status: 400 });
    }
    return NextResponse.json({ error: 'We could not submit your application right now. Please try again.' }, { status: 500 });
  }
}
