import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { chromium, devices, type BrowserContextOptions, type Page } from 'playwright';
import {
  resolveCaptureMode,
  resolveLiveCaptureConfig,
  type CaptureMode,
  type LiveCaptureConfig,
} from '@/lib/screenshot/capture-config';

type ScreenshotDevice = 'mobile' | 'desktop';

type CaptureTarget = {
  fileBase: string;
  caption: string;
  route: string | ((context: CaptureContext) => string);
  requiresAuth?: boolean;
  keepScrollPosition?: boolean;
  fullPage?: boolean;
  prepare?: (page: Page, context: CaptureContext) => Promise<void>;
};

type CaptureContext = {
  adminEmail: string;
  adminPassword: string;
  customerId: string;
};

const LIVE_SCREENSHOT_TARGETS: CaptureTarget[] = [
  { fileBase: '01-public-home', route: '/', caption: 'Public Home' },
  {
    fileBase: '03-dashboard-home',
    route: '/home',
    caption: 'Dashboard Home',
    requiresAuth: true,
  },
  {
    fileBase: '04-customers',
    route: '/customers?filter=unread',
    caption: 'Customers Queue',
    requiresAuth: true,
  },
  {
    fileBase: '05-auto-reply',
    route: (context) => `/customers/${context.customerId}`,
    caption: 'Customer Thread (Auto-Reply)',
    requiresAuth: true,
    keepScrollPosition: true,
    prepare: async (page) => {
      await scrollToHeading(page, 'Conversation');
      await page.waitForTimeout(500);
    },
  },
  {
    fileBase: '06-template-dropdown',
    route: (context) => `/customers/${context.customerId}`,
    caption: 'Customer Thread (Templates Open)',
    requiresAuth: true,
    keepScrollPosition: true,
    prepare: async (page) => {
      await scrollToHeading(page, 'Conversation');
      await page.waitForTimeout(400);

      const templateButton = page.getByRole('button', { name: 'Templates' }).first();
      if (await templateButton.isVisible().catch(() => false)) {
        await templateButton.click();
        await page.waitForTimeout(300);
      }
    },
  },
  {
    fileBase: '07-quotes-tabs',
    route: '/quotes?view=needs-follow-up&status=sent',
    caption: 'Quotes Tabs',
    requiresAuth: true,
  },
  {
    fileBase: '08-invoices-tabs',
    route: '/invoices?view=awaiting-payment&status=overdue',
    caption: 'Invoices Tabs',
    requiresAuth: true,
  },
  {
    fileBase: '20-add-customer',
    route: '/customers/new',
    caption: 'Add Customer Fields',
    requiresAuth: true,
  },
];

const DEMO_SCREENSHOT_TARGETS: CaptureTarget[] = [
  { fileBase: '01-public-home', route: '/', caption: 'Public Home' },
  { fileBase: '03-dashboard-home', route: '/home', caption: 'Dashboard Home' },
  {
    fileBase: '04-customers',
    route: '/customers?filter=unread',
    caption: 'Customers Queue',
  },
  {
    fileBase: '05-auto-reply',
    route: '/customers/demo-customer-1',
    caption: 'Customer Thread (Auto-Reply)',
    keepScrollPosition: true,
    prepare: async (page) => {
      await scrollToHeading(page, 'Conversation');
      await page.waitForTimeout(250);
      await clickButtonIfVisible(page, /Acknowledge \+ ask name/i);
      await waitForToast(page, 'Reply queued and customer acknowledged');
    },
  },
  {
    fileBase: '06-template-dropdown',
    route: '/customers/demo-customer-1',
    caption: 'Customer Thread (Templates Open)',
    keepScrollPosition: true,
    prepare: async (page) => {
      await scrollToHeading(page, 'Conversation');
      await page.waitForTimeout(300);

      const templateButton = page.getByRole('button', { name: 'Templates' }).first();
      if (await templateButton.isVisible().catch(() => false)) {
        await templateButton.click();
        await page.waitForTimeout(300);
      }
    },
  },
  {
    fileBase: '07-quotes-tabs',
    route: '/quotes?view=needs-follow-up&status=sent',
    caption: 'Quotes Tabs',
  },
  {
    fileBase: '08-invoices-tabs',
    route: '/invoices?view=awaiting-payment&status=overdue',
    caption: 'Invoices Tabs',
  },
  {
    fileBase: '09-photo-gallery',
    route: '/customers/demo-customer-1',
    caption: 'Customer Photo Gallery',
    keepScrollPosition: true,
    prepare: async (page) => {
      const gallerySendButton = page.getByRole('button', { name: /^Send$/ }).first();
      if (await gallerySendButton.isVisible().catch(() => false)) {
        await gallerySendButton.scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(() => window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.45)));
      }
      await page.waitForTimeout(450);
    },
  },
  {
    fileBase: '10-quote-detail',
    route: '/quotes/demo-quote-1',
    caption: 'Quote Awaiting Approval',
  },
  {
    fileBase: '11-quote-create',
    route: '/quotes/new?customer=demo-customer-1',
    caption: 'Create Quote',
  },
  {
    fileBase: '12-invoice-detail',
    route: '/invoices/demo-invoice-1',
    caption: 'Invoice Awaiting Payment',
  },
  {
    fileBase: '13-invoice-create',
    route: '/invoices/new?quote=demo-quote-6',
    caption: 'Finalize Invoice',
  },
  {
    fileBase: '14-search-results',
    route: '/search?q=morgan',
    caption: 'Global Search Results',
  },
  {
    fileBase: '15-quote-accepted',
    route: '/quotes/demo-quote-1',
    caption: 'Quote Accepted by Operator',
    prepare: async (page) => {
      await clickButtonIfVisible(page, 'Accept for Customer');
      await waitForToast(page, 'Quote marked as accepted');
    },
  },
  {
    fileBase: '16-invoice-send-confirm',
    route: '/invoices/demo-invoice-5',
    caption: 'Invoice Send Confirmation',
    prepare: async (page) => {
      await clickButtonIfVisible(page, 'Send Invoice');
      await page.waitForTimeout(200);
    },
  },
  {
    fileBase: '17-invoice-complete',
    route: '/invoices/demo-invoice-1',
    caption: 'Invoice Marked Complete',
    prepare: async (page) => {
      await clickButtonIfVisible(page, 'Mark Job Complete');
      await waitForToast(page, 'Invoice marked complete');
    },
  },
  {
    fileBase: '18-quote-document',
    route: '/demo/documents/quote',
    caption: 'Customer Quote Document',
    fullPage: true,
  },
  {
    fileBase: '19-invoice-document',
    route: '/demo/documents/invoice',
    caption: 'Customer Invoice Document',
    fullPage: true,
  },
  {
    fileBase: '20-add-customer',
    route: '/demo/customers/new',
    caption: 'Add Customer Fields',
  },
];

const SERVER_TIMEOUT_MS = 120_000;
const SCREENSHOT_CUSTOMER_PHONE = '+15550001111';
const SCREENSHOT_CUSTOMER_NAME = 'Screenshot Customer';
const DEMO_CUSTOMER_ID = 'demo-customer-1';

const DEVICE_CONTEXT_OPTIONS: Record<ScreenshotDevice, BrowserContextOptions> = {
  mobile: {
    ...devices['iPhone 13'],
    locale: 'en-US',
    colorScheme: 'light',
  },
  desktop: {
    userAgent: devices['Desktop Chrome'].userAgent,
    viewport: { width: 1440, height: 1024 },
    screen: { width: 1440, height: 1024 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: 'en-US',
    colorScheme: 'light',
  },
};

function getOutputDir(device: ScreenshotDevice): string {
  return path.join(process.cwd(), 'docs', 'screenshots', device);
}

function getDistDir(device: ScreenshotDevice): string {
  return (
    process.env.NEXT_DIST_DIR ??
    `.next-screenshots-${device}-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
  );
}

function getOutputFileName(target: CaptureTarget, device: ScreenshotDevice): string {
  return `${target.fileBase}-${device}.png`;
}

function resolveTargetSelection(
  allTargets: CaptureTarget[],
  device: ScreenshotDevice
): CaptureTarget[] {
  const requestedTargets = (process.env.SCREENSHOT_ONLY ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (requestedTargets.length === 0) {
    return allTargets;
  }

  const filteredTargets = allTargets.filter((target) => {
    const outputFileName = getOutputFileName(target, device).replace(/\.png$/i, '');
    return (
      requestedTargets.includes(target.fileBase) ||
      requestedTargets.includes(outputFileName)
    );
  });

  if (filteredTargets.length === 0) {
    throw new Error(
      `SCREENSHOT_ONLY did not match any ${device} capture targets: ${requestedTargets.join(', ')}`
    );
  }

  return filteredTargets;
}

function startDevServer(
  captureMode: CaptureMode,
  port: number,
  distDir: string
): ChildProcessWithoutNullStreams {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return spawn(command, ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: {
      ...process.env,
      DEMO_MODE: captureMode === 'demo' ? 'true' : process.env.DEMO_MODE,
      SCREENSHOT_HIDE_CHROME: 'true',
      NEXT_DIST_DIR: distDir,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  });
}

async function stopDevServer(server: ChildProcessWithoutNullStreams): Promise<void> {
  if (server.exitCode !== null) {
    return;
  }

  server.kill('SIGTERM');

  try {
    await Promise.race([
      once(server, 'close'),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 5_000);
      }),
    ]);
  } catch {
    if (server.exitCode === null) {
      server.kill('SIGKILL');
      await once(server, 'close');
    }
  }
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms`);
}

async function findOpenPort(startPort: number): Promise<number> {
  const tryPort = (port: number): Promise<number> =>
    new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();

      server.on('error', (error: NodeJS.ErrnoException) => {
        server.close();
        if (error.code === 'EADDRINUSE') {
          resolve(tryPort(port + 1));
          return;
        }
        reject(error);
      });

      server.listen({ host: '127.0.0.1', port }, () => {
        const address = server.address();
        const resolvedPort = typeof address === 'object' && address ? address.port : port;
        server.close(() => resolve(resolvedPort));
      });
    });

  return tryPort(startPort);
}

async function ensureScreenshotFixtures(
  liveCaptureConfig: LiveCaptureConfig
): Promise<CaptureContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const { adminEmail, adminPassword } = liveCaptureConfig;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const createUserResult = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (
    createUserResult.error &&
    !/already|registered|exists/i.test(createUserResult.error.message)
  ) {
    throw createUserResult.error;
  }

  const { data: existingCustomer, error: existingCustomerError } = await supabase
    .from('customers')
    .select('id')
    .eq('phone_number', SCREENSHOT_CUSTOMER_PHONE)
    .limit(1)
    .maybeSingle();

  if (existingCustomerError) {
    throw existingCustomerError;
  }

  let customerId = existingCustomer?.id ?? '';

  if (!customerId) {
    const { data: insertedCustomer, error: insertCustomerError } = await supabase
      .from('customers')
      .insert({
        phone_number: SCREENSHOT_CUSTOMER_PHONE,
        name: SCREENSHOT_CUSTOMER_NAME,
        address: '123 Example Ave, Sampleville, ST 12345',
        unit_info: 'Main service unit near entry gate',
        sms_consent: true,
        conversation_stage: 'awaiting_problem',
      })
      .select('id')
      .single();

    if (insertCustomerError || !insertedCustomer) {
      throw insertCustomerError ?? new Error('Failed to create screenshot customer.');
    }

    customerId = insertedCustomer.id;
  } else {
    const { error: updateCustomerError } = await supabase
      .from('customers')
      .update({
        name: SCREENSHOT_CUSTOMER_NAME,
        address: '123 Example Ave, Sampleville, ST 12345',
        unit_info: 'Main service unit near entry gate',
        sms_consent: true,
        conversation_stage: 'awaiting_problem',
      })
      .eq('id', customerId);

    if (updateCustomerError) {
      throw updateCustomerError;
    }
  }

  const { error: deleteInvoiceError } = await supabase
    .from('invoices')
    .delete()
    .eq('customer_id', customerId);
  if (deleteInvoiceError) throw deleteInvoiceError;

  const { error: deleteQuoteError } = await supabase
    .from('quotes')
    .delete()
    .eq('customer_id', customerId);
  if (deleteQuoteError) throw deleteQuoteError;

  const { error: deleteMessageError } = await supabase
    .from('messages')
    .delete()
    .eq('customer_id', customerId);
  if (deleteMessageError) throw deleteMessageError;

  const now = Date.now();
  const messageRows = [
    {
      customer_id: customerId,
      direction: 'inbound' as const,
      body: 'Hi, one of our systems is down and making loud noises.',
      status: 'delivered' as const,
      created_at: new Date(now - 55 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 55 * 60 * 1000).toISOString(),
    },
    {
      customer_id: customerId,
      direction: 'outbound' as const,
      body: 'Thanks for the heads up. Can you share what changed before it stopped working?',
      status: 'delivered' as const,
      created_at: new Date(now - 44 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 44 * 60 * 1000).toISOString(),
    },
    {
      customer_id: customerId,
      direction: 'inbound' as const,
      body: 'It started after lunch, and now it shuts down every 10 minutes.',
      status: 'delivered' as const,
      created_at: new Date(now - 32 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 32 * 60 * 1000).toISOString(),
    },
  ];

  const { error: insertMessagesError } = await supabase.from('messages').insert(messageRows);
  if (insertMessagesError) throw insertMessagesError;

  const { data: insertedQuote, error: insertQuoteError } = await supabase
    .from('quotes')
    .insert({
      customer_id: customerId,
      description: 'Priority repair and safety check',
      line_items: [
        { description: 'Diagnostic and trip charge', amount_cents: 12500 },
        { description: 'Repair labor and parts allowance', amount_cents: 12000 },
      ],
      total_cents: 24500,
      status: 'sent',
    })
    .select('id')
    .single();
  if (insertQuoteError || !insertedQuote) {
    throw insertQuoteError ?? new Error('Failed to create screenshot quote.');
  }

  const { error: insertInvoiceError } = await supabase.from('invoices').insert([
    {
      quote_id: insertedQuote.id,
      customer_id: customerId,
      amount_cents: 24500,
      line_items: [
        { description: 'Priority repair and safety check', amount_cents: 24500 },
      ],
      status: 'overdue',
      job_description: 'Repair follow-up awaiting payment',
      sent_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      service_address: '123 Example Ave, Sampleville, ST 12345',
    },
    {
      customer_id: customerId,
      amount_cents: 9800,
      line_items: [
        { description: 'Scheduled maintenance visit', amount_cents: 9800 },
      ],
      status: 'sent',
      job_description: 'Routine maintenance invoice',
      sent_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      service_address: '123 Example Ave, Sampleville, ST 12345',
    },
  ]);
  if (insertInvoiceError) throw insertInvoiceError;

  const { error: deleteTemplateError } = await supabase
    .from('message_templates')
    .delete()
    .in('name', ['[Screenshot] Arrival Window', '[Screenshot] Parts Update']);
  if (deleteTemplateError) throw deleteTemplateError;

  const { error: insertTemplateError } = await supabase.from('message_templates').insert([
    {
      name: '[Screenshot] Arrival Window',
      body: "Thanks for your patience. We're arriving between 1:00 PM and 2:00 PM today.",
      is_active: true,
    },
    {
      name: '[Screenshot] Parts Update',
      body: 'We ordered the replacement part and will text you as soon as it arrives.',
      is_active: true,
    },
  ]);
  if (insertTemplateError) throw insertTemplateError;

  return {
    adminEmail,
    adminPassword,
    customerId,
  };
}

async function loginAsAdmin(
  page: Page,
  context: CaptureContext,
  baseUrl: string
): Promise<void> {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(context.adminEmail);
  await page.getByLabel('Password').fill(context.adminPassword);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), {
      timeout: 20_000,
    }),
    page.getByRole('button', { name: /^Login$/ }).click(),
  ]);

  const finalUrl = new URL(page.url());
  if (finalUrl.pathname.startsWith('/auth/unauthorized')) {
    throw new Error(
      `Screenshot admin email "${context.adminEmail}" is not in ALLOWED_EMAILS.`
    );
  }
}

async function scrollToHeading(page: Page, heading: string): Promise<void> {
  const locator = page.getByRole('heading', { name: heading }).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.scrollIntoViewIfNeeded();
  }
}

async function clickButtonIfVisible(page: Page, name: string | RegExp): Promise<void> {
  const button = page.getByRole('button', { name }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }
}

async function waitForToast(page: Page, message: string): Promise<void> {
  const toast = page.getByText(message).first();
  if (await toast.isVisible().catch(() => false)) {
    return;
  }

  await toast.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
}

export async function runCapture(device: ScreenshotDevice): Promise<void> {
  loadEnv({ path: '.env.local', quiet: true });
  const outputDir = getOutputDir(device);
  const distDir = getDistDir(device);
  await fs.mkdir(outputDir, { recursive: true });
  const requestedPort = Number(process.env.SCREENSHOT_PORT ?? 3000);
  const screenshotPort = await findOpenPort(Number.isFinite(requestedPort) ? requestedPort : 3000);
  const baseUrl = process.env.SCREENSHOT_BASE_URL ?? `http://127.0.0.1:${screenshotPort}`;
  const captureMode = resolveCaptureMode(process.env);
  const allTargets =
    captureMode === 'demo' ? DEMO_SCREENSHOT_TARGETS : LIVE_SCREENSHOT_TARGETS;
  const targets = resolveTargetSelection(allTargets, device);
  let captureContext: CaptureContext = {
    adminEmail: '',
    adminPassword: '',
    customerId: DEMO_CUSTOMER_ID,
  };

  if (captureMode === 'live') {
    try {
      process.stdout.write(
        'Live screenshot mode is enabled. This will create and update screenshot fixtures in the configured Supabase project.\n'
      );
      captureContext = await ensureScreenshotFixtures(resolveLiveCaptureConfig(process.env));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        [
          'Cannot capture live authenticated screenshots.',
          message,
          'For safety, live mode requires explicit SCREENSHOT_ADMIN_EMAIL, SCREENSHOT_ADMIN_PASSWORD, and SCREENSHOT_ALLOW_LIVE_FIXTURE_MUTATION=true.',
          `Use real Supabase credentials, or run demo captures with \`SCREENSHOT_CAPTURE_MODE=demo npm run screenshots:${device}\`.`,
        ].join(' ')
      );
    }
  }

  const server = startDevServer(captureMode, screenshotPort, distDir);
  const serverLogs: string[] = [];
  const onServerData = (buffer: Buffer) => {
    serverLogs.push(buffer.toString('utf8'));
  };

  server.stdout.on('data', onServerData);
  server.stderr.on('data', onServerData);

  try {
    await waitForServer(baseUrl, SERVER_TIMEOUT_MS);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(DEVICE_CONTEXT_OPTIONS[device]);
    const page = await context.newPage();
    let isAuthenticated = false;

    process.stdout.write(`Capture mode: ${captureMode}\n`);
    process.stdout.write(`Capture device: ${device}\n`);
    process.stdout.write(`Using local capture URL: ${baseUrl}\n`);

    for (const target of targets) {
      if (target.requiresAuth && !isAuthenticated) {
        process.stdout.write('Signing in as screenshot admin user...\n');
        await loginAsAdmin(page, captureContext, baseUrl);
        isAuthenticated = true;
      }

      const route =
        typeof target.route === 'function'
          ? target.route(captureContext)
          : target.route;
      const url = `${baseUrl}${route}`;
      const outputPath = path.join(outputDir, getOutputFileName(target, device));
      process.stdout.write(`Capturing ${target.caption}: ${url}\n`);

      await page.goto(url, { waitUntil: 'networkidle' });
      if (target.prepare) {
        await target.prepare(page, captureContext);
      }
      await page.waitForTimeout(500);
      if (!target.keepScrollPosition) {
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await page.screenshot({ path: outputPath, fullPage: target.fullPage ?? false });
    }

    await context.close();
    await browser.close();
    process.stdout.write(
      `Saved ${targets.length} screenshots to ${outputDir} (${captureMode}, ${device})\n`
    );
  } catch (error) {
    process.stderr.write(`\n[${device}-screenshots] capture failed.\n`);
    process.stderr.write(serverLogs.join(''));
    throw error;
  } finally {
    await stopDevServer(server);
  }
}
