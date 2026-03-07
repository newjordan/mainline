import type { CustomerPhotoInsert } from '@/lib/database.types';
import { validateTwilioEnv } from '@/lib/env';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { ActionResult } from '@/types';

export const CUSTOMER_MEDIA_BUCKET = 'customer-media';
export const CUSTOMER_MEDIA_REF_PREFIX = 'customer-media://';

const MAX_MIRRORED_MEDIA_BYTES = 10 * 1024 * 1024;
const DEFAULT_ADMIN_SIGNED_URL_TTL_SECONDS = 60 * 30;
const DEFAULT_TWILIO_SIGNED_URL_TTL_SECONDS = 60 * 15;

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface MirrorTwilioMediaParams {
  customerId: string;
  mediaUrl: string;
  source: CustomerPhotoInsert['source'];
  messageSid?: string;
  mediaIndex?: number;
  fallbackContentType?: string;
}

interface MirroredMedia {
  mediaRef: string;
  filePath: string;
  contentType: string | null;
  sizeBytes: number;
}

interface PreparedTwilioMedia {
  twilioUrl: string;
  storedReference: string;
}

function normalizeContentType(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  const normalized = contentType.split(';')[0]?.trim().toLowerCase();
  return normalized || null;
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  return CONTENT_TYPE_TO_EXTENSION[contentType] || null;
}

function extensionFromUrl(mediaUrl: string): string | null {
  try {
    const pathname = new URL(mediaUrl).pathname;
    const segment = pathname.split('/').pop() || '';
    const match = segment.match(/\.([a-z0-9]{1,8})$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function buildFileName(messageSid: string | undefined, mediaIndex: number | undefined, extension: string): string {
  const sidSegment = messageSid || 'media';
  const indexSegment = typeof mediaIndex === 'number' ? `-${mediaIndex + 1}` : '';
  return `twilio-${sidSegment}${indexSegment}.${extension}`;
}

function getTwilioAuthHeader(): string {
  const twilioEnv = validateTwilioEnv();
  const encoded = Buffer.from(
    `${twilioEnv.TWILIO_ACCOUNT_SID}:${twilioEnv.TWILIO_AUTH_TOKEN}`
  ).toString('base64');

  return `Basic ${encoded}`;
}

function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '');
}

export function getCustomerMediaRef(filePath: string): string {
  return `${CUSTOMER_MEDIA_REF_PREFIX}${stripLeadingSlash(filePath)}`;
}

export function isCustomerMediaRef(value: string): boolean {
  return value.startsWith(CUSTOMER_MEDIA_REF_PREFIX);
}

export function customerMediaRefToPath(reference: string): string | null {
  if (!isCustomerMediaRef(reference)) return null;
  const rawPath = reference.slice(CUSTOMER_MEDIA_REF_PREFIX.length);
  if (!rawPath) return null;
  return stripLeadingSlash(rawPath);
}

/**
 * Detect Twilio-hosted media URLs that typically require HTTP Basic auth.
 */
export function isTwilioMediaUrl(mediaUrl: string): boolean {
  try {
    const parsed = new URL(mediaUrl);
    const host = parsed.hostname.toLowerCase();
    const isTwilioHost = host === 'api.twilio.com' || host.endsWith('.twilio.com');
    return isTwilioHost && parsed.pathname.includes('/Media/');
  } catch {
    return false;
  }
}

/**
 * Extract customer-media object path from:
 * - customer-media:// refs
 * - Supabase public URLs
 * - Supabase signed URLs
 */
export function extractCustomerMediaPath(value: string): string | null {
  const fromRef = customerMediaRefToPath(value);
  if (fromRef) return fromRef;

  try {
    const parsed = new URL(value);
    const decodedPath = decodeURIComponent(parsed.pathname);
    const prefixes = [
      `/storage/v1/object/public/${CUSTOMER_MEDIA_BUCKET}/`,
      `/storage/v1/object/sign/${CUSTOMER_MEDIA_BUCKET}/`,
      `/storage/v1/object/authenticated/${CUSTOMER_MEDIA_BUCKET}/`,
    ];

    for (const prefix of prefixes) {
      const index = decodedPath.indexOf(prefix);
      if (index === -1) continue;

      const suffix = decodedPath.slice(index + prefix.length);
      const cleaned = stripLeadingSlash(suffix);
      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeMediaReference(value: string): string {
  const filePath = extractCustomerMediaPath(value);
  if (!filePath) return value;
  return getCustomerMediaRef(filePath);
}

async function createSignedUrlForPath(
  filePath: string,
  expiresInSeconds: number
): Promise<ActionResult<string>> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.storage
      .from(CUSTOMER_MEDIA_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { success: false, error: 'Failed to create signed media URL' };
    }

    return { success: true, data: data.signedUrl };
  } catch (error) {
    console.error('[CustomerMedia] createSignedUrlForPath exception:', error);
    return { success: false, error: 'Failed to create signed media URL' };
  }
}

export async function resolveMediaUrlForDisplay(
  mediaReference: string,
  expiresInSeconds = DEFAULT_ADMIN_SIGNED_URL_TTL_SECONDS
): Promise<ActionResult<string>> {
  const filePath = extractCustomerMediaPath(mediaReference);
  if (!filePath) {
    return { success: true, data: mediaReference };
  }

  return createSignedUrlForPath(filePath, expiresInSeconds);
}

export async function resolveMediaUrlForTwilioSend(
  mediaReference: string,
  expiresInSeconds = DEFAULT_TWILIO_SIGNED_URL_TTL_SECONDS
): Promise<ActionResult<string>> {
  const filePath = extractCustomerMediaPath(mediaReference);
  if (!filePath) {
    return { success: true, data: mediaReference };
  }

  return createSignedUrlForPath(filePath, expiresInSeconds);
}

/**
 * Download a Twilio-protected media URL and mirror it into private customer storage.
 * Returns a stable internal reference suitable for long-term storage.
 */
export async function mirrorTwilioMediaToCustomerStorage(
  params: MirrorTwilioMediaParams
): Promise<ActionResult<MirroredMedia>> {
  const { customerId, mediaUrl, source, messageSid, mediaIndex, fallbackContentType } = params;

  if (!isTwilioMediaUrl(mediaUrl)) {
    return { success: false, error: 'URL is not a Twilio media URL' };
  }

  try {
    const response = await fetch(mediaUrl, {
      headers: { Authorization: getTwilioAuthHeader() },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Twilio media download failed with HTTP ${response.status}`,
      };
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const declaredSize = Number.parseInt(contentLength, 10);
      if (Number.isFinite(declaredSize) && declaredSize > MAX_MIRRORED_MEDIA_BYTES) {
        return {
          success: false,
          error: `Twilio media exceeds ${MAX_MIRRORED_MEDIA_BYTES} byte limit`,
        };
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length <= 0) {
      return { success: false, error: 'Twilio media payload was empty' };
    }
    if (buffer.length > MAX_MIRRORED_MEDIA_BYTES) {
      return {
        success: false,
        error: `Twilio media exceeds ${MAX_MIRRORED_MEDIA_BYTES} byte limit`,
      };
    }

    const normalizedContentType = normalizeContentType(
      response.headers.get('content-type') || fallbackContentType
    );
    if (!normalizedContentType || !normalizedContentType.startsWith('image/')) {
      return {
        success: false,
        error: 'Only image media types are allowed in mirrored storage',
      };
    }

    const extension =
      extensionFromContentType(normalizedContentType) || extensionFromUrl(mediaUrl) || 'bin';

    const filePath = `${customerId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const fileName = buildFileName(messageSid, mediaIndex, extension);
    const mediaRef = getCustomerMediaRef(filePath);
    const supabase = createServiceRoleClient();

    const { error: uploadError } = await supabase.storage
      .from(CUSTOMER_MEDIA_BUCKET)
      .upload(filePath, buffer, {
        contentType: normalizedContentType || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('[CustomerMedia] storage upload error:', uploadError);
      return { success: false, error: 'Failed to upload mirrored media to storage' };
    }

    const photoInsert: CustomerPhotoInsert = {
      customer_id: customerId,
      url: mediaRef,
      file_path: filePath,
      file_name: fileName,
      content_type: normalizedContentType,
      size_bytes: buffer.length,
      source,
    };

    const { error: insertError } = await supabase.from('customer_photos').insert(photoInsert);
    if (insertError) {
      // Non-fatal for message delivery; we still return a stable media reference.
      console.error('[CustomerMedia] failed to insert customer_photos row:', insertError);
    }

    return {
      success: true,
      data: {
        mediaRef,
        filePath,
        contentType: normalizedContentType,
        sizeBytes: buffer.length,
      },
    };
  } catch (error) {
    console.error('[CustomerMedia] mirrorTwilioMediaToCustomerStorage exception:', error);
    return { success: false, error: 'Failed to mirror Twilio media' };
  }
}

/**
 * Returns a stable media reference for storage in DB fields.
 * Twilio URLs are mirrored to private storage; Supabase media URLs are normalized to refs.
 */
export async function ensureStoredMediaReference(
  params: MirrorTwilioMediaParams
): Promise<ActionResult<string>> {
  const normalized = normalizeMediaReference(params.mediaUrl);
  if (normalized !== params.mediaUrl && isCustomerMediaRef(normalized)) {
    return { success: true, data: normalized };
  }

  if (!isTwilioMediaUrl(params.mediaUrl)) {
    return { success: true, data: normalized };
  }

  const mirrored = await mirrorTwilioMediaToCustomerStorage(params);
  if (!mirrored.success) {
    return mirrored;
  }

  return { success: true, data: mirrored.data.mediaRef };
}

/**
 * Prepares an arbitrary media input for outbound Twilio send:
 * - gets a stable stored reference
 * - creates a short-lived signed URL if media is in private customer storage
 */
export async function prepareMediaForTwilioSend(
  params: MirrorTwilioMediaParams
): Promise<ActionResult<PreparedTwilioMedia>> {
  const storedReferenceResult = await ensureStoredMediaReference(params);
  if (!storedReferenceResult.success) {
    return storedReferenceResult;
  }

  const storedReference = storedReferenceResult.data;
  const twilioUrlResult = await resolveMediaUrlForTwilioSend(storedReference);
  if (!twilioUrlResult.success) {
    return twilioUrlResult;
  }

  return {
    success: true,
    data: {
      twilioUrl: twilioUrlResult.data,
      storedReference,
    },
  };
}
