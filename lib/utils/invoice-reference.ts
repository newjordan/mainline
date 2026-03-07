const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INVOICE_REF_TOKEN_REGEX = /^inv[-_\s:]?([a-z0-9]{3,32})$/i;

export function formatInvoiceShortRef(invoiceId: string): string {
  const normalized = (invoiceId || '').trim().replace(/-/g, '').toUpperCase();

  if (!normalized) {
    return 'INV-UNKNOWN';
  }

  return `INV-${normalized.slice(0, 6)}`;
}

export function buildInvoicePaymentNote(invoiceId: string): string {
  return `invoice:${(invoiceId || '').trim()}`;
}

export function extractInvoiceRefToken(searchTerm: string): string | null {
  const trimmed = (searchTerm || '').trim();
  if (!trimmed) return null;

  const uuidCandidate = trimmed.toLowerCase();
  if (UUID_REGEX.test(uuidCandidate)) {
    return uuidCandidate.replace(/-/g, '').slice(0, 6);
  }

  const match = trimmed.match(INVOICE_REF_TOKEN_REGEX);
  if (!match) return null;

  return match[1].toLowerCase();
}

