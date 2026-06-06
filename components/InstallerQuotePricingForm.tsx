'use client';

import { useMemo, useState } from 'react';
import {
  calculateInstallerGeneratedQuote,
  defaultInstallerQuotePricing,
  formatPricingCurrency,
  installerQuotePricingKeys,
  percentagePricingKeys,
  type InstallerQuotePricingKey,
  type InstallerQuotePricingValues
} from '@/lib/installer-quote-pricing';

type PricingAction = (formData: FormData) => void | Promise<void>;

type PricingField = {
  key: InstallerQuotePricingKey;
  label: string;
  kind: 'currency' | 'percent';
  helper?: string;
};

type PricingFieldGroup = {
  title: string;
  fields: PricingField[];
};

const pricingFieldGroups: PricingFieldGroup[] = [
  {
    title: 'Equipment Pricing',
    fields: [
      { key: 'panelUnitCost', label: 'Cost per solar panel', kind: 'currency' },
      { key: 'panelKwCost', label: 'Cost per kW of panels', kind: 'currency' },
      { key: 'batteryUnitCost', label: 'Battery cost per unit', kind: 'currency' },
      { key: 'batteryKwhCost', label: 'Battery cost per kWh', kind: 'currency' },
      { key: 'inverterCost', label: 'Inverter cost', kind: 'currency' },
      { key: 'mountingCost', label: 'Mounting equipment cost', kind: 'currency' },
      { key: 'wiringCost', label: 'Wiring cost', kind: 'currency' },
      { key: 'safetyEquipmentCost', label: 'Electrical safety equipment cost', kind: 'currency' }
    ]
  },
  {
    title: 'Labour Pricing',
    fields: [
      { key: 'baseLabourCost', label: 'Base labour cost', kind: 'currency' },
      { key: 'labourPerPanel', label: 'Labour cost per panel', kind: 'currency' },
      { key: 'labourPerKw', label: 'Labour cost per kW', kind: 'currency' },
      { key: 'electricalWorkCost', label: 'Electrical work cost', kind: 'currency' },
      { key: 'surveyAdminCost', label: 'BER / survey / admin cost', kind: 'currency' }
    ]
  },
  {
    title: 'Adjustments',
    fields: [
      { key: 'miscellaneousCost', label: 'Miscellaneous cost', kind: 'currency' },
      { key: 'optionalExtrasCost', label: 'Optional extras cost', kind: 'currency' },
      { key: 'markupPercentage', label: 'Installer markup percentage', kind: 'percent' },
      { key: 'vatPercentage', label: 'VAT percentage', kind: 'percent' },
      { key: 'discountPercentage', label: 'Discount percentage', kind: 'percent' },
      { key: 'discountFixedAmount', label: 'Fixed discount amount', kind: 'currency' },
      { key: 'minimumQuotePrice', label: 'Minimum quote price', kind: 'currency' },
      { key: 'travelCost', label: 'Travel / callout cost', kind: 'currency' }
    ]
  }
];

const percentageKeySet = new Set<InstallerQuotePricingKey>(percentagePricingKeys);

function toInputState(values: InstallerQuotePricingValues) {
  return installerQuotePricingKeys.reduce<Record<InstallerQuotePricingKey, string>>((state, key) => {
    state[key] = String(values[key] ?? 0);
    return state;
  }, {} as Record<InstallerQuotePricingKey, string>);
}

function toPricingValues(inputState: Record<InstallerQuotePricingKey, string>) {
  return installerQuotePricingKeys.reduce<InstallerQuotePricingValues>((values, key) => {
    const parsed = Number(inputState[key]);
    const value = Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
    values[key] = percentageKeySet.has(key) ? Math.min(value, 100) : value;
    return values;
  }, { ...defaultInstallerQuotePricing });
}

function formatPercentage(value: number) {
  return `${value.toLocaleString('en-IE', { maximumFractionDigits: 2 })}%`;
}

export function InstallerQuotePricingForm({
  installerId,
  installerName,
  pricing,
  pricingUpdatedAt,
  savePricingSettings
}: {
  installerId: string;
  installerName: string;
  pricing: InstallerQuotePricingValues;
  pricingUpdatedAt: string | null;
  savePricingSettings: PricingAction;
}) {
  const [inputState, setInputState] = useState(() => toInputState(pricing));
  const currentPricing = useMemo(() => toPricingValues(inputState), [inputState]);
  const sampleQuote = useMemo(
    () =>
      calculateInstallerGeneratedQuote({
        pricing: currentPricing,
        quoteEstimate: {
          selectedSystemSizeKwp: 4.5,
          recommendedSystemSizeKwp: 4.5,
          estimatedPanelCount: 10,
          recommendedPanelCount: 10
        },
        leadInput: { wantsBattery: true },
        pricingUpdatedAt
      }),
    [currentPricing, pricingUpdatedAt]
  );

  function updateValue(key: InstallerQuotePricingKey, value: string) {
    if (value !== '' && Number(value) < 0) return;
    if (percentageKeySet.has(key) && Number(value) > 100) return;
    setInputState((current) => ({ ...current, [key]: value }));
  }

  function resetClientDefaults() {
    setInputState(toInputState(defaultInstallerQuotePricing));
  }

  return (
    <form action={savePricingSettings} className="installer-pricing-form">
      <input type="hidden" name="installerId" value={installerId} />

      <section className="installer-pricing-intro">
        <div>
          <h1>Installer Quote Pricing</h1>
          <p>
            These prices are used automatically when generating quotes for new homeowner applications.
          </p>
        </div>
        <div className="installer-pricing-meta">
          <span>Installer</span>
          <strong>{installerName}</strong>
          <small>{pricingUpdatedAt ? `Last updated ${new Date(pricingUpdatedAt).toLocaleString('en-IE')}` : 'Defaults ready to save'}</small>
        </div>
      </section>

      <div className="installer-pricing-grid">
        {pricingFieldGroups.map((group) => (
          <section key={group.title} className="installer-pricing-card">
            <div>
              <h2>{group.title}</h2>
            </div>
            <div className="installer-pricing-field-grid">
              {group.fields.map((field) => (
                <label key={field.key} className="installer-pricing-field">
                  <span>{field.label}</span>
                  <span className="installer-pricing-input-wrap">
                    <span aria-hidden="true">{field.kind === 'percent' ? '%' : 'EUR'}</span>
                    <input
                      name={field.key}
                      type="number"
                      min="0"
                      max={field.kind === 'percent' ? '100' : undefined}
                      step={field.kind === 'percent' ? '0.1' : '0.01'}
                      inputMode="decimal"
                      value={inputState[field.key]}
                      onChange={(event) => updateValue(field.key, event.currentTarget.value)}
                    />
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="installer-pricing-card installer-pricing-preview-card">
          <div>
            <h2>Quote Formula Preview</h2>
            <p className="small">Based on a 10 panel, 4.5 kW system with one battery.</p>
          </div>
          <div className="installer-pricing-preview-grid">
            <div>
              <span>Equipment total</span>
              <strong>{formatPricingCurrency(sampleQuote.equipmentTotal)}</strong>
            </div>
            <div>
              <span>Labour total</span>
              <strong>{formatPricingCurrency(sampleQuote.labourTotal)}</strong>
            </div>
            <div>
              <span>Subtotal</span>
              <strong>{formatPricingCurrency(sampleQuote.subtotal)}</strong>
            </div>
            <div>
              <span>Markup</span>
              <strong>{formatPricingCurrency(sampleQuote.markupAmount)}</strong>
              <small>{formatPercentage(sampleQuote.markupPercentage)}</small>
            </div>
            <div>
              <span>VAT</span>
              <strong>{formatPricingCurrency(sampleQuote.vatAmount)}</strong>
              <small>{formatPercentage(sampleQuote.vatPercentage)}</small>
            </div>
            <div>
              <span>Discount</span>
              <strong>{formatPricingCurrency(sampleQuote.discountAmount)}</strong>
            </div>
            <div className="installer-pricing-preview-total">
              <span>Final quote total</span>
              <strong>{formatPricingCurrency(sampleQuote.finalQuoteTotal)}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="installer-pricing-actions">
        <button type="submit" name="pricingAction" value="save">Save Pricing Settings</button>
        <button type="submit" name="pricingAction" value="reset" className="secondary" onClick={resetClientDefaults}>
          Reset to Defaults
        </button>
      </div>
    </form>
  );
}
