export const DEFAULT_INSTALLER_ID = process.env.DEFAULT_INSTALLER_ID?.trim() || 'demo-installer';

export function getDefaultInstallerSeedData() {
  return {
    id: DEFAULT_INSTALLER_ID,
    name: process.env.DEFAULT_INSTALLER_NAME?.trim() || 'Demo Solar',
    seaiCompanyId: process.env.DEFAULT_INSTALLER_SEAI_ID?.trim() || 'SEAI-12345',
    websiteDomain: process.env.DEFAULT_INSTALLER_WEBSITE_DOMAIN?.trim() || 'demo-solar.ie',
    county: process.env.DEFAULT_INSTALLER_COUNTY?.trim() || 'Dublin'
  };
}
