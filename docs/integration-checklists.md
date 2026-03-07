# Integration Checklists

## Twilio SMS Checklist

### Environment Setup

- [ ] Set `NEXT_PUBLIC_SITE_URL`
- [ ] Set `TWILIO_ACCOUNT_SID`
- [ ] Set `TWILIO_AUTH_TOKEN`
- [ ] Set `TWILIO_PHONE_NUMBER` (E.164)
- [ ] Optional: set `BUSINESS_PHONE_NUMBER`
- [ ] Optional: set `ADMIN_PHONE_NUMBER`
- [ ] Set `CRON_SECRET`

### Twilio Console Configuration

- [ ] Messaging webhook: `https://<your-domain>/api/webhooks/twilio`
- [ ] Method: `POST`
- [ ] Status callback URL: `https://<your-domain>/api/webhooks/twilio/status`
- [ ] Confirm STOP/START/HELP handling configuration matches app behavior

### Functional Tests

- [ ] Send outbound SMS from dashboard
- [ ] Confirm message record is created
- [ ] Confirm delivery status transitions update correctly
- [ ] Send inbound SMS to Twilio number
- [ ] Confirm inbound message appears in customer thread
- [ ] Test START keyword opt-in flow
- [ ] Test STOP keyword opt-out flow
- [ ] Test HELP keyword response
- [ ] Test quote acceptance via `YES 1234`

### Compliance Checks

- [ ] Landing CTA, Terms, Privacy, and Twilio sender all use one canonical SMS number
- [ ] CTA includes message types, frequency notice, rates notice, STOP/HELP, Terms, and Privacy
- [ ] Privacy page includes this exact sentence:
  - `No mobile information will be shared with third parties/affiliates for marketing or promotional purposes.`

## Square Payments Checklist

### Environment Setup

- [ ] Set `SQUARE_ACCESS_TOKEN`
- [ ] Set `SQUARE_LOCATION_ID`
- [ ] Set `SQUARE_WEBHOOK_SIGNATURE_KEY`
- [ ] Set `SQUARE_ENVIRONMENT`
- [ ] Optional: set `SQUARE_WEBHOOK_NOTIFICATION_URL`

### Functional Tests

- [ ] Send invoice and create payment link
- [ ] Complete payment in configured environment
- [ ] Confirm invoice transitions to paid
- [ ] Confirm payment notification flow

## Admin Access Checklist

- [ ] Add admin emails to `ALLOWED_EMAILS`
- [ ] Create user(s) in Supabase Auth
- [ ] Confirm non-allowlisted users are blocked

## Template Import Checklist

- [ ] Create a JSON profile from `templates/business-profile.example.json`
- [ ] Run `npm run template:import -- <path>`
- [ ] Verify `config/business-profile.json` values
- [ ] Verify copied assets in `public/images/mainline`
