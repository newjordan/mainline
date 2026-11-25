import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import { NextRequest } from 'next/server';

process.env.DEMO_MODE = 'true';
process.env.MESSAGING_PROVIDER = 'mock';
process.env.ALLOWED_EMAILS = 'owner@example.com';
process.env.CRON_SECRET = 'cron-test-secret';

type TwilioRoute = typeof import('@/app/api/webhooks/twilio/route');
type ReminderRoute = typeof import('@/app/api/cron/payment-reminders/route');
type LoginRoute = typeof import('@/app/api/auth/login/route');
type SignUpRoute = typeof import('@/app/api/auth/sign-up/route');
type ForgotRoute = typeof import('@/app/api/auth/forgot-password/route');
type UpdatePasswordRoute = typeof import('@/app/api/auth/update-password/route');
type TwilioLib = typeof import('@/lib/integrations/twilio');

let twilioPost: TwilioRoute['POST'];
let __twilioWebhookTestUtils: TwilioRoute['__twilioWebhookTestUtils'];
let reminderGet: ReminderRoute['GET'];
let __paymentReminderTestUtils: ReminderRoute['__paymentReminderTestUtils'];
let loginPost: LoginRoute['POST'];
let __loginTestUtils: LoginRoute['__loginTestUtils'];
let signUpPost: SignUpRoute['POST'];
let __signUpTestUtils: SignUpRoute['__signUpTestUtils'];
let forgotPost: ForgotRoute['POST'];
let __forgotPasswordTestUtils: ForgotRoute['__forgotPasswordTestUtils'];
let updatePasswordPost: UpdatePasswordRoute['POST'];
let __updatePasswordTestUtils: UpdatePasswordRoute['__updatePasswordTestUtils'];
let sendSMS: TwilioLib['sendSMS'];
let __messagingTestUtils: TwilioLib['__messagingTestUtils'];
let SMS_OPT_OUT_CONFIRMED = '';

before(async () => {
  const twilioRoute = await import('@/app/api/webhooks/twilio/route');
  const reminderRoute = await import('@/app/api/cron/payment-reminders/route');
  const loginRoute = await import('@/app/api/auth/login/route');
  const signUpRoute = await import('@/app/api/auth/sign-up/route');
  const forgotRoute = await import('@/app/api/auth/forgot-password/route');
  const updatePasswordRoute = await import('@/app/api/auth/update-password/route');
  const twilioLib = await import('@/lib/integrations/twilio');
  const messages = await import('@/lib/constants/messages');

  twilioPost = twilioRoute.POST;
  __twilioWebhookTestUtils = twilioRoute.__twilioWebhookTestUtils;
  reminderGet = reminderRoute.GET;
  __paymentReminderTestUtils = reminderRoute.__paymentReminderTestUtils;
  loginPost = loginRoute.POST;
  __loginTestUtils = loginRoute.__loginTestUtils;
  signUpPost = signUpRoute.POST;
  __signUpTestUtils = signUpRoute.__signUpTestUtils;
  forgotPost = forgotRoute.POST;
  __forgotPasswordTestUtils = forgotRoute.__forgotPasswordTestUtils;
  updatePasswordPost = updatePasswordRoute.POST;
  __updatePasswordTestUtils = updatePasswordRoute.__updatePasswordTestUtils;
  sendSMS = twilioLib.sendSMS;
  __messagingTestUtils = twilioLib.__messagingTestUtils;
  SMS_OPT_OUT_CONFIRMED = messages.SMS_OPT_OUT_CONFIRMED;
});

let ipCounter = 0;

function nextIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function jsonRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': nextIp(),
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  __twilioWebhookTestUtils.resetDeps();
  __paymentReminderTestUtils.resetDeps();
  __loginTestUtils.reset();
  __signUpTestUtils.reset();
  __forgotPasswordTestUtils.reset();
  __updatePasswordTestUtils.reset();
  __messagingTestUtils.reset();
});

describe('mocked messaging provider', () => {
  it('records an SMS locally and does not require Twilio credentials', async () => {
    const result = await sendSMS('+15551230000', 'Quote is ready');

    assert.equal(result.success, true);
    assert.equal(__messagingTestUtils.outbox().length, 1);
    assert.equal(__messagingTestUtils.outbox()[0]?.body, 'Quote is ready');
    assert.match(__messagingTestUtils.outbox()[0]?.to ?? '', /^\+15551230000$/);
  });
});

describe('Twilio inbound webhook', () => {
  it('rejects a missing signature before any message is sent', async () => {
    const form = new FormData();
    form.set('MessageSid', 'SM123');
    form.set('AccountSid', 'AC123');
    form.set('From', '+15551230000');
    form.set('To', '+15557654321');
    form.set('Body', 'STOP');
    form.set('NumMedia', '0');

    const response = await twilioPost(
      new NextRequest('http://localhost:3000/api/webhooks/twilio', {
        method: 'POST',
        body: form,
      })
    );

    assert.equal(response.status, 403);
    assert.equal(__messagingTestUtils.outbox().length, 0);
  });

  it('sends the opt-out reply through the injected sender, not Twilio', async () => {
    const sent: string[] = [];
    __twilioWebhookTestUtils.setDeps({
      validateTwilioSignature: () => true,
      markWebhookProcessed: async () => true,
      findOrCreateCustomer: async () => ({
        success: true,
        data: {
          customer: {
            id: '11111111-1111-4111-8111-111111111111',
            phone_number: '+15551230000',
            email: null,
            name: 'Pat Customer',
            address: null,
            additional_addresses: [],
            unit_info: null,
            sms_consent: true,
            sms_consent_at: null,
            conversation_stage: 'open',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          isNew: false,
        },
      }),
      createMessage: async () => ({
        success: true,
        data: {
          id: 'message-1',
          customer_id: '11111111-1111-4111-8111-111111111111',
          direction: 'outbound',
          body: 'STOP',
          media_urls: null,
          twilio_sid: 'SMoptout',
          status: 'sent',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      }),
      updateSmsConsent: async () => ({
        success: true,
        data: {
          id: '11111111-1111-4111-8111-111111111111',
          phone_number: '+15551230000',
          email: null,
          name: 'Pat Customer',
          address: null,
          additional_addresses: [],
          unit_info: null,
          sms_consent: false,
          sms_consent_at: '2026-01-01T00:00:00.000Z',
          conversation_stage: 'open',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      }),
      sendSMS: async (_to, body) => {
        sent.push(body);
        return { success: true, data: 'SM_TEST' };
      },
    });

    const form = new FormData();
    form.set('MessageSid', 'SMoptout');
    form.set('AccountSid', 'AC123');
    form.set('From', '+15551230000');
    form.set('To', '+15557654321');
    form.set('Body', 'STOP');
    form.set('NumMedia', '0');

    const response = await twilioPost(
      new NextRequest('http://localhost:3000/api/webhooks/twilio', {
        method: 'POST',
        body: form,
      })
    );

    assert.equal(response.status, 200);
    assert.deepEqual(sent, [SMS_OPT_OUT_CONFIRMED]);
    assert.equal(__messagingTestUtils.outbox().length, 0);
  });
});

describe('payment reminder cron', () => {
  it('rejects requests that do not present the cron secret', async () => {
    const response = await reminderGet(
      new Request('http://localhost:3000/api/cron/payment-reminders')
    );

    assert.equal(response.status, 401);
  });

  it('sends reminders through the injected provider and returns a summary', async () => {
    const sent: string[] = [];
    __paymentReminderTestUtils.setDeps({
      getInvoicesNeedingReminder: async (type) =>
        type === 'day3'
          ? [
              {
                id: 'invoice-1',
                amount_cents: 12500,
                stripe_payment_link: 'https://example.com/pay',
                customer_id: '11111111-1111-4111-8111-111111111111',
                customer_phone: '+15551230000',
                sent_at: '2026-01-01T00:00:00.000Z',
              },
            ]
          : [],
      sendReminder: async (invoice) => {
        sent.push(invoice.id);
        return true;
      },
      markInvoiceOverdue: async () => false,
    });

    const response = await reminderGet(
      new Request('http://localhost:3000/api/cron/payment-reminders', {
        headers: { authorization: 'Bearer cron-test-secret' },
      })
    );
    const body = (await response.json()) as {
      success: boolean;
      results: { day3: { sent: number } };
    };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.results.day3.sent, 1);
    assert.deepEqual(sent, ['invoice-1']);
    assert.equal(__messagingTestUtils.outbox().length, 0);
  });
});

describe('auth API routes', () => {
  it('does not reveal whether a login account exists', async () => {
    __loginTestUtils.setSignIn(async () => ({ error: { message: 'User not found' } }));

    const response = await loginPost(
      jsonRequest('/api/auth/login', {
        email: 'owner@example.com',
        password: 'StrongP@ssw0rd!',
      })
    );
    const body = (await response.json()) as { error: string };

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Invalid email or password.');
  });

  it('rejects sign-up passwords that miss the policy and emails that are not approved', async () => {
    let called = false;
    __signUpTestUtils.setSignUp(async () => {
      called = true;
      return { error: null };
    });

    const weak = await signUpPost(
      jsonRequest('/api/auth/sign-up', {
        email: 'owner@example.com',
        password: 'password',
      })
    );
    assert.equal(weak.status, 400);
    assert.equal(called, false);

    const unapproved = await signUpPost(
      jsonRequest('/api/auth/sign-up', {
        email: 'intruder@example.com',
        password: 'StrongP@ssw0rd!',
      })
    );
    const unapprovedBody = (await unapproved.json()) as { error: string };
    assert.equal(unapproved.status, 403);
    assert.match(unapprovedBody.error, /approved email/);
    assert.equal(called, false);
  });

  it('does not send a reset for an unapproved email and still returns the same success shape', async () => {
    let called = false;
    __forgotPasswordTestUtils.setSendReset(async () => {
      called = true;
      return { error: null };
    });

    const response = await forgotPost(
      jsonRequest('/api/auth/forgot-password', { email: 'intruder@example.com' })
    );
    const body = (await response.json()) as { success: boolean };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(called, false);
  });

  it('rejects a password change that misses the policy before touching the account', async () => {
    let called = false;
    __updatePasswordTestUtils.setDeps({
      readSessionUser: async () => ({ email: 'owner@example.com' }),
      updatePassword: async () => {
        called = true;
        return { error: null };
      },
    });

    const response = await updatePasswordPost(
      jsonRequest('/api/auth/update-password', { password: 'short' })
    );

    assert.equal(response.status, 400);
    assert.equal(called, false);
  });
});
