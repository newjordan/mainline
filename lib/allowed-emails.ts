/**
 * Returns true when the provided email is on the allowlist.
 *
 * ALLOWED_EMAILS should be a comma-separated list:
 *   "owner@example.com,staff@example.com"
 *
 * Fail-closed behavior:
 * - Missing/empty allowlist => no access
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseAllowedEmails(rawValue: string | undefined): Set<string> {
  if (!rawValue) {
    return new Set<string>();
  }

  return new Set(
    rawValue
      .split(',')
      .map((email) => normalizeEmail(email))
      .filter((email) => email.length > 0)
  );
}

export function isAllowedEmail(email: string): boolean {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  const allowedEmails = parseAllowedEmails(process.env.ALLOWED_EMAILS);
  return allowedEmails.has(normalizedEmail);
}
