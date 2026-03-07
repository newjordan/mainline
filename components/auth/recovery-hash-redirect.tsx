'use client';

import { useEffect } from 'react';

const UPDATE_PASSWORD_PATH = '/auth/update-password';

function isRecoveryHash(hash: string): boolean {
  if (!hash) {
    return false;
  }

  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  return hashParams.get('type') === 'recovery';
}

/**
 * Recovers password-reset links that arrive on "/" with a recovery hash.
 */
export function RecoveryHashRedirect() {
  useEffect(() => {
    if (window.location.pathname === UPDATE_PASSWORD_PATH) {
      return;
    }

    if (!isRecoveryHash(window.location.hash)) {
      return;
    }

    window.location.replace(`${UPDATE_PASSWORD_PATH}${window.location.hash}`);
  }, []);

  return null;
}
