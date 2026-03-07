import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isSetupWizardWebEnabled,
  SETUP_WIZARD_PRODUCTION_DISABLED_ERROR,
  shouldBlockSetupWizardPath,
} from '@/lib/setup-wizard/web-access';

describe('setup wizard web access policy', () => {
  it('allows web setup in development', () => {
    assert.equal(isSetupWizardWebEnabled('development'), true);
    assert.equal(shouldBlockSetupWizardPath('/setup-wizard', 'development'), false);
  });

  it('blocks web setup in production', () => {
    assert.equal(isSetupWizardWebEnabled('production'), false);
    assert.equal(shouldBlockSetupWizardPath('/setup-wizard', 'production'), true);
  });

  it('does not block unrelated paths', () => {
    assert.equal(shouldBlockSetupWizardPath('/', 'production'), false);
    assert.equal(shouldBlockSetupWizardPath('/sms-opt-in', 'production'), false);
    assert.equal(shouldBlockSetupWizardPath('/setup-wizard/extra', 'production'), false);
  });

  it('exposes a clear production-disabled message', () => {
    assert.match(SETUP_WIZARD_PRODUCTION_DISABLED_ERROR, /disabled in production/i);
    assert.match(SETUP_WIZARD_PRODUCTION_DISABLED_ERROR, /wizard:setup/i);
  });
});
