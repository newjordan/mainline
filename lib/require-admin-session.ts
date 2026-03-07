import { isAllowedEmail } from '@/lib/allowed-emails';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types';

type CreateClientFn = typeof createClient;

const dependencies: { createClient: CreateClientFn } = {
  createClient,
};

export async function requireAdminSession(): Promise<ActionResult<null>> {
  try {
    const supabase = await dependencies.createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.email || !isAllowedEmail(user.email)) {
      return { success: false, error: 'Unauthorized' };
    }

    return { success: true, data: null };
  } catch {
    return { success: false, error: 'Unauthorized' };
  }
}

export const __requireAdminSessionTestUtils = {
  setCreateClient(createClientMock: CreateClientFn): void {
    dependencies.createClient = createClientMock;
  },
  resetCreateClient(): void {
    dependencies.createClient = createClient;
  },
};
