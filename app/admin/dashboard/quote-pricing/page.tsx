import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { InstallerQuotePricingForm } from '@/components/InstallerQuotePricingForm';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import { writeAuditLog } from '@/lib/audit';
import { requirePilotContext } from '@/lib/pilot-auth';
import {
  defaultInstallerQuotePricing,
  getPricingValuesFromRecord,
  installerQuotePricingKeys,
  percentagePricingKeys,
  type InstallerQuotePricingKey,
  type InstallerQuotePricingValues
} from '@/lib/installer-quote-pricing';
import { getDashboardMetrics } from '@/lib/dashboard-metrics';
import { prisma } from '@/lib/prisma';
import { loadOrganisationQuotePricing } from '@/lib/quote-pricing-page';

export const dynamic = 'force-dynamic';

const percentageKeySet = new Set<InstallerQuotePricingKey>(percentagePricingKeys);

function parsePricingNumber(formData: FormData, key: InstallerQuotePricingKey) {
  const rawValue = String(formData.get(key) ?? '').trim();
  if (!rawValue) return 0;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Pricing fields must be zero or greater.');
  }

  if (percentageKeySet.has(key) && parsed > 100) {
    throw new Error('Percentage fields must be between 0 and 100.');
  }

  return parsed;
}

function parsePricingFormData(formData: FormData): InstallerQuotePricingValues {
  return installerQuotePricingKeys.reduce<InstallerQuotePricingValues>((values, key) => {
    values[key] = parsePricingNumber(formData, key);
    return values;
  }, { ...defaultInstallerQuotePricing });
}

function toPricingUpdateData(values: InstallerQuotePricingValues) {
  return installerQuotePricingKeys.reduce<Record<InstallerQuotePricingKey, number>>((data, key) => {
    data[key] = values[key];
    return data;
  }, {} as Record<InstallerQuotePricingKey, number>);
}

async function saveInstallerPricingSettings(formData: FormData) {
  'use server';

  const organisationContext = await requirePilotContext();
  const requestedInstallerId = String(formData.get('installerId') ?? '').trim();
  const pricingAction = String(formData.get('pricingAction') || 'save');
  const values = pricingAction === 'reset' ? defaultInstallerQuotePricing : parsePricingFormData(formData);
  const data = toPricingUpdateData(values);

  await prisma.$transaction(async (tx) => {
    const installer = await tx.installer.findFirst({
      where: {
        id: requestedInstallerId,
        organisationId: organisationContext.organisationId
      }
    });

    if (!installer) {
      throw new Error('Installer not found for active organisation');
    }

    await tx.installerQuotePricing.upsert({
      where: { installerId: installer.id },
      update: data,
      create: {
        installerId: installer.id,
        ...data
      }
    });

    await writeAuditLog(tx, {
      leadId: null,
      action: pricingAction === 'reset' ? 'installer.quote_pricing_reset' : 'installer.quote_pricing_updated',
      actor: 'admin',
      metadata: {
        installerId: installer.id,
        organisationId: organisationContext.organisationId,
        finalAction: pricingAction,
        markupPercentage: values.markupPercentage,
        vatPercentage: values.vatPercentage,
        panelUnitCost: values.panelUnitCost,
        batteryUnitCost: values.batteryUnitCost
      }
    });
  });

  revalidatePath('/admin/dashboard/quote-pricing');
  revalidatePath('/admin/dashboard');
  revalidatePath('/installer-review-emerald');
  redirect(`/admin/dashboard/quote-pricing?${pricingAction === 'reset' ? 'reset=1' : 'saved=1'}`);
}

export default async function QuotePricingPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const organisationContext = await requirePilotContext();
  const { installer, pricing, leads } = await loadOrganisationQuotePricing(
    prisma,
    organisationContext.organisationId
  );

  const metrics = getDashboardMetrics(leads);
  const statusMessage = params.saved
    ? 'Pricing settings saved. New homeowner quotes will use these values.'
    : params.reset
    ? 'Pricing settings reset to default values.'
    : null;

  return (
    <DashboardShell
      userName={organisationContext.userName}
      organisationName={organisationContext.organisationName}
      role={organisationContext.pilotRole}
      activeNavItem="Quote Pricing"
      sidebar={
        <SidebarMetrics
          openBlockers={metrics.openBlockers}
          eligibilityConcerns={metrics.eligibilityConcerns}
        />
      }
    >
      {statusMessage ? <div className="installer-pricing-status">{statusMessage}</div> : null}
      {installer && pricing ? (
        <InstallerQuotePricingForm
          installerId={installer.id}
          installerName={installer.name}
          pricing={getPricingValuesFromRecord(pricing)}
          pricingUpdatedAt={pricing.updatedAt.toISOString()}
          savePricingSettings={saveInstallerPricingSettings}
        />
      ) : (
        <section className="empty-state" data-empty-state="installer">
          <h1>Quote pricing is not available yet</h1>
          <p>
            No installer profile is configured for this organisation. Contact support before
            creating or updating quote pricing.
          </p>
        </section>
      )}
    </DashboardShell>
  );
}
