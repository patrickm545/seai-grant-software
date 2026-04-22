// @ts-nocheck
/**
 * Template only. Do not use without legal review and homeowner approval.
 * This script demonstrates how a human-reviewed payload could be mapped into a browser session.
 */

import { chromium } from 'playwright';

type PortalPayload = {
  fields: Record<string, string | number | undefined | null>;
};

async function fillGrantPortal(payload: PortalPayload) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.seai.ie/grants/home-energy-grants/individual-grants/solar-electricity-grant');

  console.log('Open the live application entry point only after confirming portal terms and homeowner consent.');
  console.log(payload.fields);

  // Example only:
  // await page.fill('[name="mprn"]', String(payload.fields.mprn ?? ''));
  // await page.fill('[name="email"]', String(payload.fields.homeowner_email ?? ''));

  // Pause for human review before submission.
  await page.pause();
}

void fillGrantPortal({ fields: { homeowner_email: 'test@example.com', mprn: '10012345678' } });
