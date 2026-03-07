# MainLine Onboarding (Plain English)

If you are not technical, start here.

## What This Software Does

- Keeps your customer texts, quotes, invoices, and payment links in one dashboard.
- Lets you text customers from your business number.
- Lets customers pay invoices online.
- Shows what needs follow-up so jobs do not fall through.

## Fastest Setup Path

1. Install dependencies:

```bash
npm install
```

2. Run the setup wizard:

```bash
npm run wizard:setup
```

Or use the web GUI wizard (big buttons):

- Start app: `npm run dev`
- Open: `http://localhost:3000/setup-wizard`
- Security note: this page is local/dev only. In production, use CLI setup on the server.

3. Answer the questions.
- Press Enter to keep default values.
- Leave service keys blank if you do not have them yet.

4. Open the generated status file:

- `docs/onboarding-status.md`

That file tells you exactly what is done and what is still missing.

If your keys expire or an integration breaks later, run Project Doctor mode:

```bash
npm run wizard:setup -- --doctor
```

Project Doctor asks for all provider/API inputs again and refreshes `docs/onboarding-status.md`.
The web GUI `/setup-wizard` also includes Project Doctor mode.
In production, run Project Doctor from CLI only: `npm run wizard:setup -- --doctor`.

## External Accounts You Need

- Supabase: database + login accounts
- Twilio: sending/receiving text messages
- Square: invoice payment links
- Vercel: hosting/deployment

## What to Copy From Each Service

### Supabase

You need:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Where:

- Supabase Dashboard -> Project Settings -> API

### Twilio

You need:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

You must also set webhook URLs in Twilio:

- `https://<your-domain>/api/webhooks/twilio`
- `https://<your-domain>/api/webhooks/twilio/status`

### Square

You need:

- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`

Webhook URL:

- `https://<your-domain>/api/webhooks/square`

### Vercel

- Add the same `.env.local` variables into your Vercel project.
- Deploy with:

```bash
vercel deploy --prod --yes
```

## Admin Access (Very Important)

Only emails in `ALLOWED_EMAILS` can use the dashboard.

- Add your email to `ALLOWED_EMAILS`
- Create that user in Supabase Auth

Guide:

- `scripts/create-admin.md`

## After Setup, Test 3 Things

1. Login works for your admin email.
2. You can send and receive one SMS.
3. You can send one invoice and complete one payment.
