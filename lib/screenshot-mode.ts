const TRUTHY_FLAGS = new Set(['1', 'true', 'yes', 'on']);

function normalizeFlag(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Screenshot capture mode hides non-product chrome (banners/dev overlays)
 * so generated docs images focus on the app UI.
 */
export function isScreenshotCaptureEnabled(): boolean {
  const flag = normalizeFlag(process.env.SCREENSHOT_HIDE_CHROME);
  return flag ? TRUTHY_FLAGS.has(flag) : false;
}

