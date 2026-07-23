import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InstallerQuotePricingForm } from '../../components/InstallerQuotePricingForm';
import { defaultInstallerQuotePricing } from '../../lib/installer-quote-pricing';
import {
  loadOrganisationQuotePricing,
  type QuotePricingPageDb
} from '../../lib/quote-pricing-page';

const pageSource = readFileSync(
  resolve(process.cwd(), 'app/admin/dashboard/quote-pricing/page.tsx'),
  'utf8'
);

test('Quote page resolves a provisioned installer from the authenticated organisation', async () => {
  const installerQueries: unknown[] = [];
  const pricingQueries: unknown[] = [];
  const incompleteLead = {
    county: null,
    eircode: null,
    status: 'NEW',
    worksStarted: null,
    priorSolarGrantAtMprn: null,
    likelyEligible: null,
    pipelineStage: 'NEW_LEAD',
    leadScore: 'WARM',
    documents: []
  };
  const db = {
    installer: {
      findFirst: async (query: unknown) => {
        installerQueries.push(query);
        return { id: 'generated-installer-id', name: 'Provisioned Installer' };
      }
    },
    lead: { findMany: async () => [incompleteLead] },
    installerQuotePricing: {
      upsert: async (query: unknown) => {
        pricingQueries.push(query);
        return { id: 'pricing-a', installerId: 'generated-installer-id', updatedAt: new Date() };
      }
    }
  } as unknown as QuotePricingPageDb;

  const result = await loadOrganisationQuotePricing(db, 'org-a');

  assert.equal(result.installer?.id, 'generated-installer-id');
  assert.equal(result.leads[0]?.county, null);
  assert.deepEqual(installerQueries, [{
    where: { organisationId: 'org-a' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true }
  }]);
  assert.deepEqual(pricingQueries, [{
    where: { installerId: 'generated-installer-id' },
    update: {},
    create: { installerId: 'generated-installer-id', ...defaultInstallerQuotePricing }
  }]);
});

test('Quote page returns a safe empty state when the active organisation has no installer', async () => {
  let pricingWrites = 0;
  const db = {
    installer: { findFirst: async () => null },
    lead: { findMany: async () => [] },
    installerQuotePricing: {
      upsert: async () => {
        pricingWrites += 1;
        throw new Error('Pricing must not be created without an organisation installer.');
      }
    }
  } as unknown as QuotePricingPageDb;

  const result = await loadOrganisationQuotePricing(db, 'org-without-installer');

  assert.equal(result.installer, null);
  assert.equal(result.pricing, null);
  assert.equal(pricingWrites, 0);
  assert.match(pageSource, /data-empty-state="installer"/);
  assert.match(pageSource, /No installer profile is configured for this organisation/);
});

test('Quote page and save action retain authentication and tenant scoping', () => {
  assert.ok(pageSource.indexOf('await requirePilotContext()') < pageSource.indexOf('loadOrganisationQuotePricing('));
  assert.match(pageSource, /id: requestedInstallerId,\s*organisationId: organisationContext\.organisationId/s);
  assert.doesNotMatch(pageSource, /DEFAULT_INSTALLER_ID|Default installer is not available/);
});

test('valid organisation quote pricing renders without changing quote calculations', () => {
  Object.assign(globalThis, { React });
  const markupPercentage = 15;
  const html = renderToStaticMarkup(
    React.createElement(InstallerQuotePricingForm, {
      installerId: 'generated-installer-id',
      installerName: 'Provisioned Installer',
      pricing: { ...defaultInstallerQuotePricing, markupPercentage },
      pricingUpdatedAt: '2026-07-23T16:00:00.000Z',
      savePricingSettings: async () => undefined
    })
  );

  assert.match(html, /Provisioned Installer/);
  assert.match(html, /name="installerId" value="generated-installer-id"/);
  assert.match(html, /name="markupPercentage"[^>]*value="15"/);
  assert.match(html, /Final quote total/);
});
