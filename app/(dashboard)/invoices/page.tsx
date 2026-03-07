import Link from 'next/link';
import { Receipt, X, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { CustomerDocumentTimeline } from '@/components/customers/customer-document-timeline';
import { InvoicesGroupedListClient } from '@/components/invoice/invoices-grouped-list-client';
import { CustomerSelectorRail } from '@/components/shared/customer-selector-rail';
import {
  DEFAULT_LIST_LIMIT,
  LIST_INCREMENT,
  MAX_LIST_LIMIT,
  normalizeInvoiceSavedView,
  normalizeInvoiceStatusFilter,
  normalizeListLimit,
  normalizeSearchTerm,
  sortByLabel,
  type InvoiceSavedView,
  type InvoiceStatusFilter,
} from '@/lib/documents/listing-utils';
import {
  extractInvoiceRefToken,
  formatInvoiceShortRef,
} from '@/lib/utils/invoice-reference';

type SearchParams = Promise<{
  filter?: string | string[];
  view?: string | string[];
  status?: string | string[];
  customer?: string | string[];
  q?: string | string[];
  limit?: string | string[];
}>;

interface InvoiceListItem {
  id: string;
  customer_id: string;
  amount_cents: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  customers:
    | {
        name: string | null;
        phone_number: string;
      }
    | {
        name: string | null;
        phone_number: string;
      }[]
    | null;
}

interface CustomerInvoiceGroup {
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  label: string;
  subLabel: string | null;
  invoices: InvoiceListItem[];
  outstandingCount: number;
  paidCount: number;
  completedCount: number;
  archivedCount: number;
}

interface RailCustomer {
  id: string;
  name: string | null;
  phone_number: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUSTOMER_SEARCH_MATCH_LIMIT = 200;
const SEARCH_QUERY_LIMIT_MIN = 120;
const SEARCH_QUERY_LIMIT_MAX = 400;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function normalizeUuidParam(value?: string | string[]): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return isUuid(raw) ? raw : undefined;
}

function isMissingInvoiceLifecycleColumnError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code !== '42703') return false;

  const combined = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return combined.includes('completed_at') || combined.includes('archived_at');
}


function buildInvoicesHref(params: {
  view?: InvoiceSavedView;
  status?: InvoiceStatusFilter;
  customerId?: string;
  query?: string;
  limit?: number;
}): string {
  const search = new URLSearchParams();

  if (params.view && params.view !== 'all') {
    search.set('view', params.view);
  }
  if (params.status && params.status !== 'any') {
    search.set('status', params.status);
  }
  if (params.customerId) {
    search.set('customer', params.customerId);
  }
  if (params.query) {
    search.set('q', params.query);
  }
  if (params.limit && params.limit !== DEFAULT_LIST_LIMIT) {
    search.set('limit', String(params.limit));
  }

  const serialized = search.toString();
  return serialized ? `/invoices?${serialized}` : '/invoices';
}

function getJoinedCustomer(
  customer: InvoiceListItem['customers']
): { name: string | null; phone_number: string } | null {
  if (Array.isArray(customer)) {
    return customer[0] ?? null;
  }
  return customer;
}

function groupInvoicesByCustomer(invoices: InvoiceListItem[]): CustomerInvoiceGroup[] {
  const groups = new Map<string, CustomerInvoiceGroup>();

  for (const invoice of invoices) {
    const joinedCustomer = getJoinedCustomer(invoice.customers);
    const customerName = joinedCustomer?.name?.trim() || null;
    const customerPhone = joinedCustomer?.phone_number || null;
    const label = customerName || customerPhone || 'Unknown';
    const key = invoice.customer_id;

    const existing = groups.get(key);
    if (existing) {
      existing.invoices.push(invoice);
      existing.outstandingCount +=
        invoice.status === 'sent' || invoice.status === 'overdue' ? 1 : 0;
      existing.paidCount += invoice.status === 'paid' ? 1 : 0;
      existing.completedCount += invoice.completed_at ? 1 : 0;
      existing.archivedCount += invoice.archived_at ? 1 : 0;
      continue;
    }

    groups.set(key, {
      customerId: key,
      customerName,
      customerPhone,
      label,
      subLabel: customerName && customerPhone ? customerPhone : null,
      invoices: [invoice],
      outstandingCount: invoice.status === 'sent' || invoice.status === 'overdue' ? 1 : 0,
      paidCount: invoice.status === 'paid' ? 1 : 0,
      completedCount: invoice.completed_at ? 1 : 0,
      archivedCount: invoice.archived_at ? 1 : 0,
    });
  }

  return sortByLabel(Array.from(groups.values()));
}

function mergeRailCustomers(
  fromSearch: RailCustomer[],
  fromInvoices: CustomerInvoiceGroup[],
  selectedCustomer?: { id: string; name: string | null; phone_number: string } | null
): RailCustomer[] {
  const map = new Map<string, RailCustomer>();

  for (const customer of fromSearch) {
    map.set(customer.id, customer);
  }

  for (const group of fromInvoices) {
    if (!map.has(group.customerId) && group.customerPhone) {
      map.set(group.customerId, {
        id: group.customerId,
        name: group.customerName,
        phone_number: group.customerPhone,
      });
    }
  }

  if (selectedCustomer && !map.has(selectedCustomer.id)) {
    map.set(selectedCustomer.id, selectedCustomer);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aLabel = (a.name || a.phone_number).toLowerCase();
    const bLabel = (b.name || b.phone_number).toLowerCase();
    return aLabel.localeCompare(bLabel);
  });
}

/**
 * Invoices List Page
 *
 * Displays invoices grouped by customer with filtering support.
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { filter, view, status, customer, q, limit } = await searchParams;
  const customerId = normalizeUuidParam(customer);
  const savedView = normalizeInvoiceSavedView(view, filter);
  const statusFilter = normalizeInvoiceStatusFilter(status, filter);
  const searchTerm = normalizeSearchTerm(q);
  const requestedLimit = normalizeListLimit(limit);
  const invoiceRefToken = extractInvoiceRefToken(searchTerm);
  const queryLimit = searchTerm && !customerId
    ? Math.min(
        Math.max((requestedLimit + 1) * 6, SEARCH_QUERY_LIMIT_MIN),
        SEARCH_QUERY_LIMIT_MAX
      )
    : requestedLimit + 1;
  const searchPattern = `%${searchTerm}%`;
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();

  let selectedCustomer: { id: string; name: string | null; phone_number: string } | null =
    null;
  if (customerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone_number')
      .eq('id', customerId)
      .maybeSingle();

    if (customer) {
      selectedCustomer = customer;
    }
  }

  let searchMatchedCustomers: RailCustomer[] = [];
  let searchMatchedCustomerIds: string[] = [];

  if (searchTerm) {
    const { data: customerMatches } = await supabase
      .from('customers')
      .select('id, name, phone_number')
      .or(`name.ilike.${searchPattern},phone_number.ilike.${searchPattern}`)
      .limit(CUSTOMER_SEARCH_MATCH_LIMIT);

    searchMatchedCustomers = customerMatches ?? [];
    searchMatchedCustomerIds = searchMatchedCustomers.map((customer) => customer.id);
  }

  const runInvoiceQuery = async (supportsLifecycleColumns: boolean) => {
    let query = supabase
      .from('invoices')
      .select(
        supportsLifecycleColumns
          ? 'id, customer_id, amount_cents, status, created_at, paid_at, completed_at, archived_at, customers(name, phone_number)'
          : 'id, customer_id, amount_cents, status, created_at, paid_at, customers(name, phone_number)'
      )
      .order('created_at', { ascending: false })
      .limit(queryLimit);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (savedView === 'needs-follow-up') {
      query = query.eq('status', 'overdue');
      if (supportsLifecycleColumns) {
        query = query.is('archived_at', null);
      }
    } else if (savedView === 'awaiting-payment') {
      query = query.in('status', ['sent', 'overdue']);
      if (supportsLifecycleColumns) {
        query = query.is('archived_at', null);
      }
    } else if (savedView === 'recently-completed') {
      if (supportsLifecycleColumns) {
        query = query
          .is('archived_at', null)
          .or(`completed_at.gte.${thirtyDaysAgoIso},paid_at.gte.${thirtyDaysAgoIso}`);
      } else {
        query = query.gte('paid_at', thirtyDaysAgoIso);
      }
    } else if (savedView === 'archived') {
      query = supportsLifecycleColumns
        ? query.not('archived_at', 'is', null)
        : query.is('id', null);
    } else if (supportsLifecycleColumns) {
      query = query.is('archived_at', null);
    }

    if (statusFilter === 'completed') {
      query = supportsLifecycleColumns
        ? query.not('completed_at', 'is', null)
        : query.is('id', null);
    } else if (statusFilter !== 'any') {
      query = query.eq('status', statusFilter);
    }

    if (searchTerm) {
      const clauses: string[] = [];

      if (searchMatchedCustomerIds.length > 0) {
        clauses.push(`customer_id.in.(${searchMatchedCustomerIds.join(',')})`);
      }

      if (isUuid(searchTerm)) {
        clauses.push(`id.eq.${searchTerm}`);
      }

      if (invoiceRefToken) {
        clauses.push(`id.ilike.%${invoiceRefToken}%`);
      }

      if (clauses.length > 0) {
        query = query.or(clauses.join(','));
      }
    }

    return query;
  };

  let supportsLifecycleColumns = true;
  let { data, error } = await runInvoiceQuery(true);

  if (error && isMissingInvoiceLifecycleColumnError(error)) {
    supportsLifecycleColumns = false;
    ({ data, error } = await runInvoiceQuery(false));
  }

  if (error) {
    console.error('[InvoicesPage] query error', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return (
      <div className="p-4">
        <h1 className="mb-6 text-2xl font-bold">Invoices</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive">Failed to load invoices.</p>
        </div>
      </div>
    );
  }

  let invoices = (data ?? []) as unknown as InvoiceListItem[];
  if (!supportsLifecycleColumns) {
    invoices = invoices.map((invoice) => ({
      ...invoice,
      completed_at: null,
      archived_at: null,
    }));
  }

  if (searchTerm && !isUuid(searchTerm)) {
    const normalized = searchTerm.toLowerCase();
    invoices = invoices.filter((invoice) => {
      if (invoice.id.toLowerCase().includes(normalized)) return true;
      if (formatInvoiceShortRef(invoice.id).toLowerCase().includes(normalized)) return true;
      if (invoiceRefToken && invoice.id.replace(/-/g, '').toLowerCase().includes(invoiceRefToken)) return true;
      const customer = getJoinedCustomer(invoice.customers);
      const name = customer?.name?.toLowerCase() || '';
      const phone = customer?.phone_number?.toLowerCase() || '';
      return name.includes(normalized) || phone.includes(normalized);
    });
  }

  const hasMoreFromQuery = invoices.length > requestedLimit;
  if (hasMoreFromQuery) {
    invoices = invoices.slice(0, requestedLimit);
  }

  const groups = groupInvoicesByCustomer(invoices);

  const savedViewTabs: { key: InvoiceSavedView; label: string }[] = [
    { key: 'all', label: 'All Active' },
    { key: 'needs-follow-up', label: 'Needs Follow-up' },
    { key: 'awaiting-payment', label: 'Awaiting Payment' },
    { key: 'recently-completed', label: 'Recently Completed' },
    { key: 'archived', label: 'Archived' },
  ];

  const statusTabs: { key: InvoiceStatusFilter; label: string }[] = [
    { key: 'any', label: 'Any Status' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'paid', label: 'Paid' },
    { key: 'completed', label: 'Completed' },
  ];

  const groupCountByCustomer = new Map<string, number>();
  for (const group of groups) {
    groupCountByCustomer.set(group.customerId, group.invoices.length);
  }

  const fallbackCustomers =
    searchTerm.length === 0
      ? (
          await supabase
            .from('customers')
            .select('id, name, phone_number')
            .order('updated_at', { ascending: false })
            .limit(30)
        ).data ?? []
      : [];

  const railCustomers = mergeRailCustomers(
    searchTerm ? searchMatchedCustomers : fallbackCustomers,
    groups,
    selectedCustomer
  );

  const railItems = railCustomers.map((customer) => ({
    id: customer.id,
    label: customer.name || customer.phone_number,
    subLabel: customer.name ? customer.phone_number : null,
    count: groupCountByCustomer.get(customer.id) ?? 0,
    href: buildInvoicesHref({
      view: savedView,
      status: statusFilter,
      customerId: customer.id,
      query: searchTerm || undefined,
      limit: requestedLimit,
    }),
    isActive: customer.id === customerId,
  }));

  const railHiddenFields = [
    ...(savedView !== 'all' ? [{ name: 'view', value: savedView }] : []),
    ...(statusFilter !== 'any' ? [{ name: 'status', value: statusFilter }] : []),
    ...(requestedLimit !== DEFAULT_LIST_LIMIT
      ? [{ name: 'limit', value: requestedLimit }]
      : []),
  ];

  const hasAnyFilter =
    savedView !== 'all' ||
    statusFilter !== 'any' ||
    searchTerm.length > 0 ||
    Boolean(customerId);

  const viewSummary: Record<InvoiceSavedView, string> = {
    all: 'Active invoice workflow',
    'needs-follow-up': 'Overdue invoices needing outreach',
    'awaiting-payment': 'Payment still pending',
    'recently-completed': 'Completed or paid in the last 30 days',
    archived: 'Hidden from daily workflow',
  };

  return (
    <div className="p-4 md:grid md:grid-cols-[18rem_1fr] md:gap-4">
      <aside className="mb-4 md:mb-0">
        <CustomerSelectorRail
          basePath="/invoices"
          searchPlaceholder="Name, phone, INV- or UUID"
          searchValue={searchTerm}
          hiddenFields={railHiddenFields}
          allHref={buildInvoicesHref({
            view: savedView,
            status: statusFilter,
            query: searchTerm || undefined,
            limit: requestedLimit,
          })}
          allCount={invoices.length}
          allActive={!customerId}
          items={railItems}
        />
      </aside>

      <div>
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Invoices</h1>
            {selectedCustomer && (
              <p className="text-sm text-muted-foreground">
                for {selectedCustomer.name || selectedCustomer.phone_number}
              </p>
            )}
          </div>
          <Button asChild className="h-12 px-5 text-base shrink-0">
            <Link href={customerId ? `/invoices/new?customer=${customerId}` : '/invoices/new'}>
              <Plus className="mr-2 h-5 w-5" />
              New
            </Link>
          </Button>
        </div>

        {/* View summary + count bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{viewSummary[savedView]}</span>
          <span className="text-xs">
            ({invoices.length} invoice{invoices.length === 1 ? '' : 's'} / {groups.length} customer{groups.length === 1 ? '' : 's'})
          </span>
          {hasMoreFromQuery && <span className="text-xs">- first {requestedLimit}</span>}
          {searchTerm && <span className="text-xs">- &ldquo;{searchTerm}&rdquo;</span>}
          {hasAnyFilter && (
            <Link
              href={buildInvoicesHref({ limit: requestedLimit })}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-accent/20 px-3 py-1.5 text-sm text-accent active:bg-accent/30"
            >
              <X className="h-4 w-4" />
              Reset
            </Link>
          )}
        </div>

        {/* Saved Views — horizontal scroll, big tap targets */}
        <div className="mb-2">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Views
          </p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            {savedViewTabs.map((tab) => {
              const isActiveTab = savedView === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={buildInvoicesHref({
                    view: tab.key,
                    status: statusFilter,
                    customerId,
                    query: searchTerm || undefined,
                    limit: requestedLimit,
                  })}
                  className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors active:scale-95 ${
                    isActiveTab
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground active:bg-muted/80'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Status filter — horizontal scroll, big tap targets */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            {statusTabs.map((tab) => {
              const isActiveTab = statusFilter === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={buildInvoicesHref({
                    view: savedView,
                    status: tab.key,
                    customerId,
                    query: searchTerm || undefined,
                    limit: requestedLimit,
                  })}
                  className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors active:scale-95 ${
                    isActiveTab
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground active:bg-muted/80'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {customerId && <CustomerDocumentTimeline customerId={customerId} className="mb-4" />}

        {invoices.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center">
            <Receipt className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {searchTerm
                ? 'No invoices matched this search.'
                : savedView === 'needs-follow-up'
                  ? 'No overdue invoices currently need follow-up.'
                  : savedView === 'awaiting-payment'
                    ? 'No invoices are awaiting payment.'
                    : savedView === 'recently-completed'
                      ? 'No recently completed invoices.'
                      : savedView === 'archived'
                        ? 'No archived invoices yet.'
                        : 'Invoices will appear here when you create them from quotes.'}
            </p>
            {hasAnyFilter && (
              <Link
                href={buildInvoicesHref({ limit: requestedLimit })}
                className="mt-3 inline-flex min-h-[44px] items-center text-sm text-accent underline"
              >
                Clear filters and search
              </Link>
            )}
          </div>
        ) : (
          <InvoicesGroupedListClient
            groups={groups}
            selectedCustomerId={customerId || undefined}
          />
        )}

        {hasMoreFromQuery && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" asChild className="h-12 px-6 text-base">
              <Link
                href={buildInvoicesHref({
                  view: savedView,
                  status: statusFilter,
                  customerId: customerId || undefined,
                  query: searchTerm || undefined,
                  limit: Math.min(requestedLimit + LIST_INCREMENT, MAX_LIST_LIMIT),
                })}
              >
                Load more
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
