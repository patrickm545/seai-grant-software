import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { leadFormSchema } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { generateEligibilityAnalysis } from '@/lib/ai';
import { DEFAULT_INSTALLER_ID, getDefaultInstallerSeedData } from '@/lib/default-installer';
import { sendLeadNotificationEmails } from '@/lib/email';
import { sendLeadNotificationSms } from '@/lib/sms';
import type { LeadFormInput } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = leadFormSchema.parse(body) as LeadFormInput & {
      applicantDocuments?: Array<{
        kind: 'electricity_bill' | 'meter_photo' | 'roof_photo';
        fileName: string;
        mimeType: string;
        sizeBytes?: number;
      }>;
    };
    const applicantDocuments = parsed.applicantDocuments ?? [];
    const { applicantDocuments: _ignoredApplicantDocuments, ...leadInput } = parsed;

    const installer =
      leadInput.installerId === DEFAULT_INSTALLER_ID
        ? await prisma.installer.upsert({
            where: { id: DEFAULT_INSTALLER_ID },
            update: {},
            create: getDefaultInstallerSeedData()
          })
        : await prisma.installer.findUnique({ where: { id: leadInput.installerId } });

    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
    }

    const analysis = await generateEligibilityAnalysis(leadInput);

    const lead = await prisma.lead.create({
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
          leadInput.notes?.trim() ? `Homeowner notes: ${leadInput.notes.trim()}` : null,
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

    try {
      await sendLeadNotificationEmails({
        lead,
        installerName: installer.name
      });
    } catch (error) {
      console.error('Email notification failed during intake submission', error);
    }

    try {
      await sendLeadNotificationSms({
        lead
      });
    } catch (error) {
      console.error('SMS notification failed during intake submission', error);
    }

    return NextResponse.json({ leadId: lead.id, analysis, uploadedDocuments: applicantDocuments.length });
  } catch (error) {
    console.error(error);
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json({ error: firstIssue?.message || 'Invalid submission' }, { status: 400 });
    }
    return NextResponse.json({ error: 'We could not submit your application right now. Please try again.' }, { status: 500 });
  }
}
