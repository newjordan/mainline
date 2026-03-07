# Deployment Guide

## Target Platform

- Hosting: Vercel (or any Node-compatible host)
- Database/Auth: Supabase
- SMS: Twilio
- Payments: Square

## Choose a Deployment Mode

### Demo Deployment

Use this when you want a public test drive for the application.

- Set `DEMO_MODE=true`
- Keep `/demo/login` as the entry point you share publicly
- Use only bundled sample/demo data
- Do **not** configure live Twilio, Square, or production customer credentials

### Production Deployment

Use this when you want the real operator dashboard.

- Set `DEMO_MODE=false`
- Configure live environment variables
- Restrict admin access with `ALLOWED_EMAILS`
- Keep setup wizard access local/CLI-only in production

## Pre-Deploy Checklist

1. Import your business profile:

```bash
npm run template:import -- /path/to/business-profile.json
```

2. Configure production environment variables:

Core:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Twilio:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

Square:
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`
- `SQUARE_ENVIRONMENT` (`sandbox` or `production`)

Operations:
- `ALLOWED_EMAILS`
- `CRON_SECRET`

Optional:
- `BUSINESS_PHONE_NUMBER`
- `ADMIN_PHONE_NUMBER`
- `SQUARE_WEBHOOK_NOTIFICATION_URL`

## Webhook URLs

Replace `<your-domain>` with your production domain.

- Twilio inbound webhook: `https://<your-domain>/api/webhooks/twilio`
- Twilio status callback: `https://<your-domain>/api/webhooks/twilio/status`
- Square webhook: `https://<your-domain>/api/webhooks/square`

## Cron Endpoint

- Endpoint: `/api/cron/payment-reminders`
- Header required: `Authorization: Bearer <CRON_SECRET>`

## Deploy Commands

```bash
npm run build
vercel deploy --prod --yes
```

## Supabase Auth URL Configuration

In Supabase > Authentication > URL Configuration, add:

- `https://<your-domain>/**`
- `http://localhost:3000/**`
- `https://<your-domain>/auth/update-password`
- `https://<your-domain>/customers`

## Post-Deploy Verification

1. Visit landing page and confirm branding/profile values are correct.
2. Test login with an allowlisted admin email.
3. Send a test SMS and verify status transitions.
4. Send a test invoice and complete payment flow.
5. Verify cron endpoint authentication works with `CRON_SECRET`.
