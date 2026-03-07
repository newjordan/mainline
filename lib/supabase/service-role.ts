import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Creates a Supabase client with service role privileges.
 * ONLY use for server-side operations that need to bypass RLS:
 * - Webhook handlers (webhook_events table has no authenticated policy)
 * - Background jobs
 * - Admin operations
 *
 * WARNING: Service role bypasses all RLS policies - use with caution!
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

