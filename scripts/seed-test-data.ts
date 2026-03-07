/**
 * Seed Test Data Script
 *
 * Populates the database with realistic test data for development/testing.
 * Run with: npx tsx scripts/seed-test-data.ts
 *
 * Creates:
 * - 5 customers with varying data completeness
 * - Conversation history for each customer
 * - Quotes in various statuses
 * - Invoices in various statuses
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure .env.local is loaded.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Found:');
  console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'set' : 'MISSING'}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? `set (starts with ${supabaseServiceKey.slice(0, 10)}...)` : 'MISSING'}`);
  process.exit(1);
}

// Debug: Show what we're connecting to
console.log(`Connecting to: ${supabaseUrl}`);
console.log(`Using key starting with: ${supabaseServiceKey.slice(0, 15)}...`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// Test Data
// =============================================================================

const customers = [
  {
    phone_number: '+15125551001',
    name: 'Customer One',
    address: '101 Example Ave, Sampleville, ST 12345',
    unit_info: 'Primary equipment at service address, installed 2019',
  },
  {
    phone_number: '+15125551002',
    name: 'Customer Two',
    address: '202 Service Rd, Sampleville, ST 12345',
    unit_info: 'Main service line and shutoff access details',
  },
  {
    phone_number: '+15125551003',
    name: 'Customer Three',
    address: '303 Repair St, Sampleville, ST 12345',
    unit_info: null, // No unit info yet
  },
  {
    phone_number: '+15125551004',
    name: null, // Name not collected yet
    address: null,
    unit_info: null,
  },
  {
    phone_number: '+15125551005',
    name: 'Customer Five',
    address: '505 Maintenance Ln, Sampleville, ST 12345',
    unit_info: 'Equipment/model details and location notes',
  },
];

// Conversation templates for each customer
const conversationTemplates = [
  // Customer One - completed job, paid
  [
    { direction: 'inbound', body: 'Hi, one of our systems stopped working this morning. Can you help?', hoursAgo: 72 },
    { direction: 'outbound', body: 'Absolutely. How long has it been down, and what behavior are you seeing?', hoursAgo: 71 },
    { direction: 'inbound', body: 'Started yesterday. It powers on but keeps shutting off after a few minutes.', hoursAgo: 70 },
    { direction: 'outbound', body: 'Thanks, that helps. I can come take a look tomorrow morning around 9am if that works?', hoursAgo: 69 },
    { direction: 'inbound', body: 'Yes! That would be great. Thank you so much', hoursAgo: 68 },
    { direction: 'outbound', body: 'Perfect, see you tomorrow at 9am. I\'ll text when I\'m on my way.', hoursAgo: 67 },
    { direction: 'outbound', body: 'On my way! Should be there in about 15 minutes.', hoursAgo: 48 },
    { direction: 'outbound', body: 'Good news - we found the failed component and replaced it. Everything is running normally again. I\'ll send over the quote for your records.', hoursAgo: 46 },
    { direction: 'inbound', body: 'Thank you so much! Everything looks good now.', hoursAgo: 45 },
  ],
  // Customer Two - quote sent, waiting for response
  [
    { direction: 'inbound', body: 'Hey, I need routine service before our busy season. Can you do a maintenance visit?', hoursAgo: 24 },
    { direction: 'outbound', body: 'Absolutely, preventive maintenance is always a smart move. I can come by this week. What day works best?', hoursAgo: 23 },
    { direction: 'inbound', body: 'Thursday afternoon would be ideal if you have availability', hoursAgo: 22 },
    { direction: 'outbound', body: 'Thursday at 2pm works great. I\'ll do a full check - controls, connections, moving parts, and overall operation.', hoursAgo: 21 },
    { direction: 'inbound', body: 'Sounds good. How much does the maintenance visit usually run?', hoursAgo: 20 },
    { direction: 'outbound', body: 'I\'ll send you a detailed quote right now so you know exactly what to expect.', hoursAgo: 19 },
  ],
  // Customer Three - new customer, just inquired
  [
    { direction: 'inbound', body: 'Hi I found your number on Google. Do you service my area?', hoursAgo: 2 },
    { direction: 'outbound', body: 'Hi! Yes, we service the surrounding area. What can I help you with?', hoursAgo: 1.5 },
    { direction: 'inbound', body: 'Great! A system at our property is not working correctly. Could you take a look?', hoursAgo: 1 },
  ],
  // Phone number only - brand new, unread
  [
    { direction: 'inbound', body: 'Is this your service line? I need someone to look at an issue ASAP.', hoursAgo: 0.5 },
  ],
  // Customer Five - overdue invoice
  [
    { direction: 'inbound', body: 'Hi, equipment in my home office keeps shutting off after about 20 minutes', hoursAgo: 240 },
    { direction: 'outbound', body: 'That could be a few things. When can I take a look?', hoursAgo: 239 },
    { direction: 'inbound', body: 'Can you come tomorrow?', hoursAgo: 238 },
    { direction: 'outbound', body: 'I can be there at 10am. What\'s your address?', hoursAgo: 237 },
    { direction: 'inbound', body: '505 Maintenance Ln in Sampleville', hoursAgo: 236 },
    { direction: 'outbound', body: 'Got it, see you tomorrow at 10am.', hoursAgo: 235 },
    { direction: 'outbound', body: 'Found the issue and completed the repair. Everything is running properly now. I\'ll send the invoice shortly.', hoursAgo: 216 },
    { direction: 'inbound', body: 'Thanks. I will pay it when I get my paycheck next week', hoursAgo: 215 },
  ],
];

// Quote data linked to customers by index
const quoteTemplates = [
  // Customer One - accepted quote
  {
    customerIndex: 0,
    description: 'Service Repair - Component Replacement',
    line_items: [
      { description: 'Replacement component', amount_cents: 4500 },
      { description: 'Labor - diagnosis and repair', amount_cents: 12500 },
    ],
    status: 'accepted' as const,
    daysAgo: 2,
  },
  // John Davis - sent quote, pending
  {
    customerIndex: 1,
    description: 'Annual System Maintenance',
    line_items: [
      { description: 'Complete system inspection', amount_cents: 8900 },
      { description: 'Cleaning and adjustment', amount_cents: 4500 },
      { description: 'Consumables as needed', amount_cents: 0 },
    ],
    status: 'sent' as const,
    daysAgo: 0,
  },
  // Customer Five - accepted (has overdue invoice)
  {
    customerIndex: 4,
    description: 'System Repair - Parts and Labor',
    line_items: [
      { description: 'Replacement materials', amount_cents: 9000 },
      { description: 'Diagnostic follow-up service', amount_cents: 7500 },
      { description: 'Labor', amount_cents: 11000 },
    ],
    status: 'accepted' as const,
    daysAgo: 10,
  },
  // Customer One - draft quote for future work
  {
    customerIndex: 0,
    description: 'Preventive Maintenance Plan - Annual',
    line_items: [
      { description: 'Spring service visit', amount_cents: 8900 },
      { description: 'Fall service visit', amount_cents: 8900 },
      { description: 'Priority scheduling', amount_cents: 0 },
    ],
    status: 'draft' as const,
    daysAgo: 0,
  },
];

// Invoice data linked to quotes by index
const invoiceTemplates = [
  // Customer One - paid invoice
  {
    quoteIndex: 0,
    status: 'paid' as const,
    daysAgo: 2,
    paidDaysAgo: 1,
  },
  // Customer Five - overdue invoice
  {
    quoteIndex: 2,
    status: 'overdue' as const,
    daysAgo: 9,
    paidDaysAgo: null,
  },
];

// =============================================================================
// Seed Functions
// =============================================================================

async function clearExistingData() {
  console.log('Clearing existing test data...');

  // Delete in order of dependencies
  await supabase.from('quote_audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('quote_access_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('quotes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Cleared existing data.');
}

async function seedCustomers(): Promise<string[]> {
  console.log('Seeding customers...');

  const customerIds: string[] = [];

  for (const customer of customers) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      continue;
    }

    customerIds.push(data.id);
    console.log(`  Created customer: ${customer.name || customer.phone_number}`);
  }

  return customerIds;
}

async function seedMessages(customerIds: string[]) {
  console.log('Seeding messages...');

  for (let i = 0; i < customerIds.length; i++) {
    const customerId = customerIds[i];
    const conversations = conversationTemplates[i] || [];

    for (const msg of conversations) {
      const createdAt = new Date(Date.now() - msg.hoursAgo * 60 * 60 * 1000);

      const { error } = await supabase.from('messages').insert({
        customer_id: customerId,
        direction: msg.direction,
        body: msg.body,
        status: 'delivered',
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString(),
      });

      if (error) {
        console.error('Error creating message:', error);
      }
    }

    console.log(`  Created ${conversations.length} messages for customer ${i + 1}`);
  }
}

async function seedQuotes(customerIds: string[]): Promise<string[]> {
  console.log('Seeding quotes...');

  const quoteIds: string[] = [];

  for (const template of quoteTemplates) {
    const customerId = customerIds[template.customerIndex];
    const totalCents = template.line_items.reduce((sum, item) => sum + item.amount_cents, 0);
    const createdAt = new Date(Date.now() - template.daysAgo * 24 * 60 * 60 * 1000);

    const quoteData: Record<string, unknown> = {
      customer_id: customerId,
      description: template.description,
      line_items: template.line_items,
      total_cents: totalCents,
      status: template.status,
      version: 1,
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    };

    if (template.status === 'accepted') {
      quoteData.accepted_at = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }

    const { data, error } = await supabase
      .from('quotes')
      .insert(quoteData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating quote:', error);
      continue;
    }

    quoteIds.push(data.id);
    console.log(`  Created quote: ${template.description} (${template.status})`);
  }

  return quoteIds;
}

async function seedInvoices(quoteIds: string[], customerIds: string[]) {
  console.log('Seeding invoices...');

  for (const template of invoiceTemplates) {
    const quoteId = quoteIds[template.quoteIndex];
    const quoteTemplate = quoteTemplates[template.quoteIndex];
    const customerId = customerIds[quoteTemplate.customerIndex];
    const totalCents = quoteTemplate.line_items.reduce((sum, item) => sum + item.amount_cents, 0);

    const createdAt = new Date(Date.now() - template.daysAgo * 24 * 60 * 60 * 1000);
    const sentAt = new Date(createdAt.getTime() + 1 * 60 * 60 * 1000);

    const invoiceData: Record<string, unknown> = {
      quote_id: quoteId,
      customer_id: customerId,
      amount_cents: totalCents,
      status: template.status,
      sent_at: sentAt.toISOString(),
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
      // Fake provider payment link for testing UI
      stripe_payment_link: 'https://square.link/u/demo-payment-link',
    };

    if (template.paidDaysAgo !== null) {
      invoiceData.paid_at = new Date(Date.now() - template.paidDaysAgo * 24 * 60 * 60 * 1000).toISOString();
      invoiceData.stripe_payment_id = 'payment_demo_' + Math.random().toString(36).substring(7);
    }

    const { error } = await supabase.from('invoices').insert(invoiceData);

    if (error) {
      console.error('Error creating invoice:', error);
      continue;
    }

    console.log(`  Created invoice: $${(totalCents / 100).toFixed(2)} (${template.status})`);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('\n🌱 Seeding test data...\n');

  try {
    await clearExistingData();

    const customerIds = await seedCustomers();
    await seedMessages(customerIds);
    const quoteIds = await seedQuotes(customerIds);
    await seedInvoices(quoteIds, customerIds);

    console.log('\n✅ Test data seeded successfully!\n');
    console.log('Test scenarios created:');
    console.log('  - Sarah Mitchell: Completed job, paid invoice');
    console.log('  - John Davis: Quote sent, waiting for response');
    console.log('  - Maria Garcia: New inquiry about heater');
    console.log('  - Unknown (phone only): Unread message, needs response');
    console.log('  - Robert Thompson: Overdue invoice (10 days)');
    console.log('');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
