/**
 * Canonical setup-wizard web access policy.
 *
 * Production is CLI-only for setup to reduce remote attack surface.
 */
export const SETUP_WIZARD_PRODUCTION_DISABLED_ERROR =
  'Setup wizard is disabled in production. Use `npm run wizard:setup` on your server/checkout.';

export function isSetupWizardWebEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return nodeEnv !== 'production';
}

export function shouldBlockSetupWizardPath(
  pathname: string,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return pathname === '/setup-wizard' && !isSetupWizardWebEnabled(nodeEnv);
}
