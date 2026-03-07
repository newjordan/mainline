import type {
  ConversationStage,
  InvoiceLineItem,
  Message,
  QuoteLineItem,
} from '@/lib/database.types';

export interface DemoCustomer {
  id: string;
  phone_number: string;
  email: string | null;
  name: string | null;
  address: string | null;
  additional_addresses: string[];
  unit_info: string | null;
  sms_consent: boolean;
  sms_consent_at: string | null;
  conversation_stage: ConversationStage;
  created_at: string;
  updated_at: string;
}

export interface DemoCustomerListItem extends DemoCustomer {
  lastMessage: {
    body: string;
    direction: 'inbound' | 'outbound';
    created_at: string;
  } | null;
  hasUnread: boolean;
  messageCount: number;
  isNew: boolean;
}

export interface DemoQuote {
  id: string;
  customer_id: string;
  short_ref: string;
  description: string;
  total_cents: number;
  line_items: QuoteLineItem[];
  service_address: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  accepted_at: string | null;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DemoInvoice {
  id: string;
  customer_id: string;
  quote_id: string | null;
  amount_cents: number;
  line_items: InvoiceLineItem[];
  job_description: string | null;
  adjustment_note: string | null;
  service_address: string | null;
  payment_link: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  sent_at: string | null;
  paid_at: string | null;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DemoAttentionCounts {
  unreadMessages: number;
  pendingQuotes: number;
  outstandingInvoices: number;
}

export interface DemoSearchResults {
  customers: DemoCustomer[];
  quotes: DemoQuote[];
  invoices: DemoInvoice[];
  messages: Message[];
}

export interface DemoPhoto {
  id: string;
  customer_id: string;
  url: string;
  label: string;
  source: 'upload' | 'inbound';
  created_at: string;
}

const now = Date.now();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000).toISOString();
const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

const demoCustomers: DemoCustomer[] = [
  {
    id: 'demo-customer-1',
    phone_number: '+15125550101',
    email: 'morgan@example.com',
    name: 'Morgan Reed',
    address: '124 Service Loop, Sample City',
    additional_addresses: ['Warehouse bay 3, 90 Industrial Way'],
    unit_info: 'Main line regulator near rear panel',
    sms_consent: true,
    sms_consent_at: daysAgo(14),
    conversation_stage: 'awaiting_problem',
    created_at: daysAgo(40),
    updated_at: minutesAgo(7),
  },
  {
    id: 'demo-customer-2',
    phone_number: '+15125550102',
    email: 'avery@example.com',
    name: 'Avery Cole',
    address: '18 North Park Rd, Sample City',
    additional_addresses: [],
    unit_info: 'Service panel in utility closet',
    sms_consent: true,
    sms_consent_at: daysAgo(22),
    conversation_stage: 'open',
    created_at: daysAgo(70),
    updated_at: hoursAgo(6),
  },
  {
    id: 'demo-customer-3',
    phone_number: '+15125550103',
    email: null,
    name: null,
    address: null,
    additional_addresses: [],
    unit_info: null,
    sms_consent: true,
    sms_consent_at: minutesAgo(30),
    conversation_stage: 'awaiting_name',
    created_at: minutesAgo(45),
    updated_at: minutesAgo(5),
  },
];

function hoursAgo(hours: number): string {
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

const demoMessagesByCustomer: Record<string, Message[]> = {
  'demo-customer-1': [
    {
      id: 'demo-msg-101',
      customer_id: 'demo-customer-1',
      direction: 'inbound',
      body: 'Hi, one of the systems keeps cycling off every few minutes.',
      media_urls: null,
      twilio_sid: 'SMDEMO101',
      status: 'delivered',
      created_at: minutesAgo(55),
      updated_at: minutesAgo(55),
    },
    {
      id: 'demo-msg-102',
      customer_id: 'demo-customer-1',
      direction: 'outbound',
      body: 'Got it. We can help. What changed right before this started?',
      media_urls: null,
      twilio_sid: 'SMDEMO102',
      status: 'delivered',
      created_at: minutesAgo(44),
      updated_at: minutesAgo(44),
    },
    {
      id: 'demo-msg-103',
      customer_id: 'demo-customer-1',
      direction: 'inbound',
      body: 'It started this morning after a loud click from the panel.',
      media_urls: null,
      twilio_sid: 'SMDEMO103',
      status: 'delivered',
      created_at: minutesAgo(32),
      updated_at: minutesAgo(32),
    },
  ],
  'demo-customer-2': [
    {
      id: 'demo-msg-201',
      customer_id: 'demo-customer-2',
      direction: 'inbound',
      body: 'Thanks for yesterday. Everything is running smoothly now.',
      media_urls: null,
      twilio_sid: 'SMDEMO201',
      status: 'delivered',
      created_at: hoursAgo(8),
      updated_at: hoursAgo(8),
    },
    {
      id: 'demo-msg-202',
      customer_id: 'demo-customer-2',
      direction: 'outbound',
      body: 'Great to hear. We can schedule a checkup in 6 months if you want.',
      media_urls: null,
      twilio_sid: 'SMDEMO202',
      status: 'delivered',
      created_at: hoursAgo(6),
      updated_at: hoursAgo(6),
    },
  ],
  'demo-customer-3': [
    {
      id: 'demo-msg-301',
      customer_id: 'demo-customer-3',
      direction: 'inbound',
      body: 'Hello, is this the right number for service?',
      media_urls: null,
      twilio_sid: 'SMDEMO301',
      status: 'delivered',
      created_at: minutesAgo(35),
      updated_at: minutesAgo(35),
    },
  ],
};

const demoQuotes: DemoQuote[] = [
  {
    id: 'demo-quote-1',
    customer_id: 'demo-customer-1',
    short_ref: 'QT-1042',
    description: 'Priority diagnostics and repair plan',
    total_cents: 24500,
    line_items: [
      { description: 'Diagnostic and trip charge', amount_cents: 12500 },
      { description: 'Repair labor and parts allowance', amount_cents: 12000 },
    ],
    service_address: '124 Service Loop, Sample City',
    status: 'sent',
    accepted_at: null,
    archived_at: null,
    completed_at: null,
    created_at: daysAgo(2),
  },
  {
    id: 'demo-quote-2',
    customer_id: 'demo-customer-2',
    short_ref: 'QT-1031',
    description: 'Preventive service package',
    total_cents: 18900,
    line_items: [
      { description: 'Seasonal inspection', amount_cents: 8900 },
      { description: 'Filter replacement and tune-up', amount_cents: 10000 },
    ],
    service_address: '18 North Park Rd, Sample City',
    status: 'accepted',
    accepted_at: daysAgo(5),
    archived_at: null,
    completed_at: daysAgo(1),
    created_at: daysAgo(6),
  },
  {
    id: 'demo-quote-3',
    customer_id: 'demo-customer-2',
    short_ref: 'QT-1022',
    description: 'Follow-up adjustments',
    total_cents: 7600,
    line_items: [
      { description: 'Airflow balancing visit', amount_cents: 7600 },
    ],
    service_address: '18 North Park Rd, Sample City',
    status: 'draft',
    accepted_at: null,
    archived_at: null,
    completed_at: null,
    created_at: daysAgo(1),
  },
  {
    id: 'demo-quote-4',
    customer_id: 'demo-customer-3',
    short_ref: 'QT-1051',
    description: 'New customer intake estimate',
    total_cents: 13200,
    line_items: [
      { description: 'Site visit and estimate', amount_cents: 13200 },
    ],
    service_address: null,
    status: 'sent',
    accepted_at: null,
    archived_at: null,
    completed_at: null,
    created_at: minutesAgo(20),
  },
  {
    id: 'demo-quote-5',
    customer_id: 'demo-customer-1',
    short_ref: 'QT-0988',
    description: 'Archived historical quote',
    total_cents: 11000,
    line_items: [
      { description: 'Archived repair scope', amount_cents: 11000 },
    ],
    service_address: '124 Service Loop, Sample City',
    status: 'rejected',
    accepted_at: null,
    archived_at: daysAgo(14),
    completed_at: null,
    created_at: daysAgo(16),
  },
  {
    id: 'demo-quote-6',
    customer_id: 'demo-customer-1',
    short_ref: 'QT-1048',
    description: 'Final repair scope approval',
    total_cents: 26800,
    line_items: [
      { description: 'Replacement contactor kit', amount_cents: 9800 },
      { description: 'System calibration and restart', amount_cents: 17000 },
    ],
    service_address: '124 Service Loop, Sample City',
    status: 'accepted',
    accepted_at: hoursAgo(14),
    archived_at: null,
    completed_at: null,
    created_at: daysAgo(1),
  },
];

const demoInvoices: DemoInvoice[] = [
  {
    id: 'demo-invoice-1',
    customer_id: 'demo-customer-1',
    quote_id: 'demo-quote-1',
    amount_cents: 24500,
    line_items: [
      { description: 'Priority diagnostics and repair plan', amount_cents: 24500 },
    ],
    job_description: 'Repair completed, awaiting customer payment.',
    adjustment_note: null,
    service_address: '124 Service Loop, Sample City',
    payment_link: 'https://payments.example.com/demo/invoice-1',
    status: 'sent',
    sent_at: hoursAgo(20),
    paid_at: null,
    archived_at: null,
    completed_at: null,
    created_at: daysAgo(1),
  },
  {
    id: 'demo-invoice-2',
    customer_id: 'demo-customer-2',
    quote_id: 'demo-quote-2',
    amount_cents: 18900,
    line_items: [
      { description: 'Preventive service package', amount_cents: 18900 },
    ],
    job_description: 'Maintenance visit completed. Reminder text queued for follow-up.',
    adjustment_note: null,
    service_address: '18 North Park Rd, Sample City',
    payment_link: 'https://payments.example.com/demo/invoice-2',
    status: 'overdue',
    sent_at: daysAgo(7),
    paid_at: null,
    archived_at: null,
    completed_at: null,
    created_at: daysAgo(8),
  },
  {
    id: 'demo-invoice-3',
    customer_id: 'demo-customer-2',
    quote_id: 'demo-quote-2',
    amount_cents: 7600,
    line_items: [
      { description: 'Follow-up balancing visit', amount_cents: 7600 },
    ],
    job_description: 'Follow-up adjustments completed and paid on site.',
    adjustment_note: null,
    service_address: '18 North Park Rd, Sample City',
    payment_link: 'https://payments.example.com/demo/invoice-3',
    status: 'paid',
    sent_at: daysAgo(3),
    paid_at: daysAgo(2),
    archived_at: null,
    completed_at: daysAgo(2),
    created_at: daysAgo(3),
  },
  {
    id: 'demo-invoice-4',
    customer_id: 'demo-customer-1',
    quote_id: 'demo-quote-5',
    amount_cents: 11000,
    line_items: [
      { description: 'Archived historical invoice', amount_cents: 11000 },
    ],
    job_description: 'Historical visit kept for record only.',
    adjustment_note: null,
    service_address: '124 Service Loop, Sample City',
    payment_link: 'https://payments.example.com/demo/invoice-4',
    status: 'paid',
    sent_at: daysAgo(16),
    paid_at: daysAgo(13),
    archived_at: daysAgo(11),
    completed_at: daysAgo(13),
    created_at: daysAgo(17),
  },
  {
    id: 'demo-invoice-5',
    customer_id: 'demo-customer-1',
    quote_id: 'demo-quote-6',
    amount_cents: 27800,
    line_items: [
      { description: 'Replacement contactor kit', amount_cents: 9800 },
      { description: 'System calibration and restart', amount_cents: 17000 },
      { description: 'Extra labor beyond quoted scope', amount_cents: 1000 },
    ],
    job_description: 'Repair completed. Final invoice is ready for operator review before sending.',
    adjustment_note:
      'Added 20 minutes of extra labor after the final inspection exposed a stuck contactor.',
    service_address: '124 Service Loop, Sample City',
    payment_link: null,
    status: 'draft',
    sent_at: null,
    paid_at: null,
    archived_at: null,
    completed_at: null,
    created_at: hoursAgo(2),
  },
];

const demoPhotosByCustomer: Record<string, DemoPhoto[]> = {
  'demo-customer-1': [
    {
      id: 'demo-photo-101',
      customer_id: 'demo-customer-1',
      url: '/images/demo/open-panels.jpg',
      label: 'Open panels',
      source: 'upload',
      created_at: hoursAgo(5),
    },
    {
      id: 'demo-photo-102',
      customer_id: 'demo-customer-1',
      url: '/images/demo/hvac-repair.png',
      label: 'HVAC repair underway',
      source: 'inbound',
      created_at: hoursAgo(4),
    },
    {
      id: 'demo-photo-103',
      customer_id: 'demo-customer-1',
      url: '/images/demo/new-parts.jpg',
      label: 'Replacement parts on site',
      source: 'upload',
      created_at: hoursAgo(2),
    },
  ],
  'demo-customer-2': [
    {
      id: 'demo-photo-201',
      customer_id: 'demo-customer-2',
      url: '/images/demo/new-parts.jpg',
      label: 'Parts follow-up',
      source: 'upload',
      created_at: daysAgo(1),
    },
  ],
};

export function getDemoCustomers(): DemoCustomer[] {
  return [...demoCustomers];
}

export function getDemoCustomerById(id: string): DemoCustomer | null {
  return demoCustomers.find((customer) => customer.id === id) ?? null;
}

export function getDemoMessagesByCustomerId(customerId: string): Message[] {
  return [...(demoMessagesByCustomer[customerId] ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function getDemoQuotes(): DemoQuote[] {
  return [...demoQuotes];
}

export function getDemoQuoteById(id: string): DemoQuote | null {
  return demoQuotes.find((quote) => quote.id === id) ?? null;
}

export function getDemoQuotesByCustomerId(customerId: string): DemoQuote[] {
  return demoQuotes.filter((quote) => quote.customer_id === customerId);
}

export function getDemoInvoices(): DemoInvoice[] {
  return [...demoInvoices];
}

export function getDemoInvoiceById(id: string): DemoInvoice | null {
  return demoInvoices.find((invoice) => invoice.id === id) ?? null;
}

export function getDemoInvoicesByCustomerId(customerId: string): DemoInvoice[] {
  return demoInvoices.filter((invoice) => invoice.customer_id === customerId);
}

export function getDemoPhotosByCustomerId(customerId: string): DemoPhoto[] {
  return [...(demoPhotosByCustomer[customerId] ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getDemoCustomerLabel(customerId: string): string {
  const customer = getDemoCustomerById(customerId);
  return customer?.name?.trim() || customer?.phone_number || 'Unknown';
}

export function getDemoCustomersWithLastMessage(): DemoCustomerListItem[] {
  return demoCustomers
    .map((customer) => {
      const messages = getDemoMessagesByCustomerId(customer.id);
      const lastMessage = messages[messages.length - 1] ?? null;
      const messageCount = messages.length;

      return {
        ...customer,
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              direction: lastMessage.direction,
              created_at: lastMessage.created_at,
            }
          : null,
        hasUnread: lastMessage?.direction === 'inbound',
        messageCount,
        isNew: messageCount <= 1,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.created_at ?? a.updated_at;
      const bTime = b.lastMessage?.created_at ?? b.updated_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}

export function getDemoAttentionCounts(): DemoAttentionCounts {
  const customers = getDemoCustomersWithLastMessage();
  const unreadMessages = customers.filter((customer) => customer.hasUnread).length;
  const pendingQuotes = demoQuotes.filter(
    (quote) => quote.status === 'sent' && !quote.archived_at
  ).length;
  const outstandingInvoices = demoInvoices.filter((invoice) =>
    invoice.status === 'sent' || invoice.status === 'overdue'
  ).length;

  return {
    unreadMessages,
    pendingQuotes,
    outstandingInvoices,
  };
}

export function searchDemoData(query: string): DemoSearchResults {
  const term = query.trim().toLowerCase();
  if (term.length < 2) {
    return {
      customers: [],
      quotes: [],
      invoices: [],
      messages: [],
    };
  }

  const customers = demoCustomers.filter((customer) => {
    const haystack = [
      customer.name ?? '',
      customer.phone_number,
      customer.email ?? '',
      customer.address ?? '',
      customer.unit_info ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });

  const quotes = demoQuotes.filter((quote) => {
    const haystack = [quote.short_ref, quote.description, getDemoCustomerLabel(quote.customer_id)]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });

  const invoices = demoInvoices.filter((invoice) => {
    const haystack = [invoice.id, getDemoCustomerLabel(invoice.customer_id)]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });

  const messages = Object.values(demoMessagesByCustomer)
    .flat()
    .filter((message) => {
      const customerLabel = getDemoCustomerLabel(message.customer_id).toLowerCase();
      return message.body.toLowerCase().includes(term) || customerLabel.includes(term);
    });

  return {
    customers,
    quotes,
    invoices,
    messages,
  };
}

export const demoTemplateMessages = [
  {
    id: 'demo-template-1',
    name: 'Arrival Window',
    body: 'Thanks for your patience. We are arriving between 1:00 PM and 2:00 PM.',
  },
  {
    id: 'demo-template-2',
    name: 'Parts Update',
    body: 'Quick update: parts are ordered and we will text you as soon as they land.',
  },
  {
    id: 'demo-template-3',
    name: 'Payment Reminder',
    body: 'Friendly reminder that your invoice is still open. Reply if you need another payment link.',
  },
];
