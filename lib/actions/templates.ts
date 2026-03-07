'use server';

import type { ActionResult } from '@/types';
import type { MessageTemplate } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdminSession } from '@/lib/require-admin-session';

/**
 * Get all active message templates
 * Returns templates ordered by name for consistent UI display
 */
export async function getTemplates(): Promise<ActionResult<MessageTemplate[]>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[Templates] getTemplates error:', error);
      return { success: false, error: 'Failed to fetch templates' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Templates] getTemplates exception:', error);
    return { success: false, error: 'Failed to fetch templates' };
  }
}

/**
 * Get a single template by ID
 * Returns null if template not found (not an error)
 */
export async function getTemplate(
  id: string
): Promise<ActionResult<MessageTemplate | null>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // PGRST116 = no rows returned (not found)
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('[Templates] getTemplate error:', error);
      return { success: false, error: 'Failed to fetch template' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Templates] getTemplate exception:', error);
    return { success: false, error: 'Failed to fetch template' };
  }
}
