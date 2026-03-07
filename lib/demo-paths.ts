function buildDemoHref(basePath: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const serialized = search.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

export const DEMO_SEARCH_PATH = '/demo/search';
export const DEMO_CUSTOMERS_PATH = '/demo/customers';

export function getDemoCustomerPath(customerId: string): string {
  return `${DEMO_CUSTOMERS_PATH}/${customerId}`;
}

export function buildDemoCustomersHref(params: { filter?: string } = {}): string {
  return buildDemoHref(DEMO_CUSTOMERS_PATH, {
    filter: params.filter,
  });
}

export function buildDemoNewCustomerPath(): string {
  return `${DEMO_CUSTOMERS_PATH}/new`;
}

export function getDemoQuotePath(quoteId: string): string {
  return `/demo/quotes/${quoteId}`;
}

export function getDemoInvoicePath(invoiceId: string): string {
  return `/demo/invoices/${invoiceId}`;
}

export function buildDemoNewQuotePath(params: { customer?: string } = {}): string {
  return buildDemoHref('/demo/quotes/new', {
    customer: params.customer,
  });
}

export function buildDemoNewInvoicePath(params: { customer?: string; quote?: string } = {}): string {
  return buildDemoHref('/demo/invoices/new', {
    customer: params.customer,
    quote: params.quote,
  });
}

export function buildDemoQuoteDocumentPath(params: { quote?: string } = {}): string {
  return buildDemoHref('/demo/documents/quote', {
    quote: params.quote,
  });
}

export function buildDemoInvoiceDocumentPath(params: { invoice?: string } = {}): string {
  return buildDemoHref('/demo/documents/invoice', {
    invoice: params.invoice,
  });
}

export function buildDemoQuotesHref(params: {
  view?: string;
  status?: string;
  customer?: string;
  q?: string;
}): string {
  return buildDemoHref('/demo/quotes', {
    view: params.view && params.view !== 'all' ? params.view : undefined,
    status: params.status && params.status !== 'any' ? params.status : undefined,
    customer: params.customer,
    q: params.q,
  });
}

export function buildDemoInvoicesHref(params: {
  view?: string;
  status?: string;
  customer?: string;
  q?: string;
}): string {
  return buildDemoHref('/demo/invoices', {
    view: params.view && params.view !== 'all' ? params.view : undefined,
    status: params.status && params.status !== 'any' ? params.status : undefined,
    customer: params.customer,
    q: params.q,
  });
}