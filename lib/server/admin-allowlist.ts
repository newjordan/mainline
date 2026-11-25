import { isAllowedEmail } from '@/lib/allowed-emails';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const syncedEmails = new Set<string>();

/**
 * Copies an approved dashboard email into `admin_allowlist`.
 *
 * Row level security grants table access only to emails in that table.
 * The env allowlist stays the source of truth; this keeps the database
 * check aligned before user-scoped queries run.
 */
export async function ensureAdminAllowlist(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || syncedEmails.has(normalized) || !isAllowedEmail(normalized)) {
    return;
  }

  if (isDemoModeEnabled()) {
    return;
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('admin_allowlist')
      .upsert({ email: normalized }, { onConflict: 'email' });

    if (error) {
      console.error('[Auth] Failed to sync admin allowlist:', error.message);
      return;
    }

    syncedEmails.add(normalized);
  } catch (error) {
    console.error('[Auth] Failed to sync admin allowlist:', error);
  }
}

export const __adminAllowlistTestUtils = {
  reset(): void {
    syncedEmails.clear();
  },
};
