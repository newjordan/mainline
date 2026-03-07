'use server';

import type { ActionResult } from '@/types';
import type { CustomerPhoto, CustomerPhotoInsert } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdminSession } from '@/lib/require-admin-session';
import {
  getCustomerMediaRef,
  resolveMediaUrlForDisplay,
} from '@/lib/services/customer-media';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'photo';
}

function inferImageContentType(file: File): string | null {
  const mimeType = file.type?.toLowerCase().trim();
  if (mimeType.startsWith('image/')) return mimeType;

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  return EXTENSION_TO_CONTENT_TYPE[extension] || null;
}

function extensionFromFile(file: File, contentType?: string): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  if (contentType === 'image/heic') return 'heic';
  if (contentType === 'image/heif') return 'heif';
  return 'bin';
}

/**
 * Get customer photos, newest first.
 */
export async function getCustomerPhotos(
  customerId: string
): Promise<ActionResult<CustomerPhoto[]>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth;

  if (!isValidUUID(customerId)) {
    return { success: true, data: [] };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('customer_photos')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CustomerPhotos] getCustomerPhotos error:', error);
      return { success: false, error: 'Failed to fetch customer photos' };
    }

    const photos = data || [];
    const photosWithSignedUrls = await Promise.all(
      photos.map(async (photo) => {
        const mediaRef = getCustomerMediaRef(photo.file_path);
        const displayUrlResult = await resolveMediaUrlForDisplay(mediaRef);
        return {
          ...photo,
          url: displayUrlResult.success ? displayUrlResult.data : photo.url,
        };
      })
    );

    return { success: true, data: photosWithSignedUrls };
  } catch (error) {
    console.error('[CustomerPhotos] getCustomerPhotos exception:', error);
    return { success: false, error: 'Failed to fetch customer photos' };
  }
}

/**
 * Upload a dashboard photo to customer profile storage.
 *
 * FormData fields:
 * - customer_id: uuid
 * - photo: File
 */
export async function uploadCustomerPhoto(
  formData: FormData
): Promise<ActionResult<CustomerPhoto>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth;

  const customerId = formData.get('customer_id');
  const fileEntry = formData.get('photo');

  if (typeof customerId !== 'string' || !isValidUUID(customerId)) {
    return { success: false, error: 'Invalid customer ID' };
  }

  if (!(fileEntry instanceof File)) {
    return { success: false, error: 'Photo file is required' };
  }

  const contentType = inferImageContentType(fileEntry);
  if (!contentType) {
    return { success: false, error: 'Only image files are supported (JPG, PNG, WEBP, GIF, HEIC)' };
  }

  if (fileEntry.size <= 0) {
    return { success: false, error: 'Photo file is empty' };
  }

  if (fileEntry.size > MAX_PHOTO_SIZE_BYTES) {
    return { success: false, error: 'Photo must be 10 MB or smaller' };
  }

  try {
    const supabase = createServiceRoleClient();

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return { success: false, error: 'Customer not found' };
    }

    const extension = extensionFromFile(fileEntry, contentType);
    const safeName = sanitizeFilename(fileEntry.name);
    const objectPath =
      `${customerId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('customer-media')
      .upload(objectPath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[CustomerPhotos] storage upload error:', uploadError);
      return { success: false, error: 'Failed to upload photo' };
    }

    const insertData: CustomerPhotoInsert = {
      customer_id: customerId,
      url: getCustomerMediaRef(objectPath),
      file_path: objectPath,
      file_name: safeName,
      content_type: contentType,
      size_bytes: fileEntry.size,
      source: 'upload',
    };

    const { data: row, error: insertError } = await supabase
      .from('customer_photos')
      .insert(insertData)
      .select()
      .single();

    if (insertError || !row) {
      console.error('[CustomerPhotos] insert error:', insertError);
      return { success: false, error: 'Photo uploaded but save failed' };
    }

    return { success: true, data: row };
  } catch (error) {
    console.error('[CustomerPhotos] uploadCustomerPhoto exception:', error);
    return { success: false, error: 'Failed to upload photo' };
  }
}
