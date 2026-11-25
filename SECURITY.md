# Security Policy

Thanks for helping keep MainLine safe.

## Supported Scope

Security fixes are best reported against the latest code on the default branch.
If you are unsure whether something is in scope, report it anyway.

## How to Report a Vulnerability

Please **do not** report security issues in public GitHub issues or public pull requests.

Preferred reporting path for the public repository:

1. If GitHub private vulnerability reporting is enabled, use the repository **Security** tab and choose **Report a vulnerability**.
2. If that feature is not available, contact the project maintainer privately.

Include:

- a clear description of the issue
- affected area(s) or file(s)
- reproduction steps or proof of concept
- potential impact
- any suggested mitigation, if you have one

If the project later adds a dedicated security contact address, that private channel should be preferred alongside GitHub's security reporting flow.

## What to Include

Helpful reports usually include:

- prerequisite configuration
- whether demo mode or live integrations are required
- whether real third-party credentials are involved
- logs, stack traces, or screenshots with secrets redacted

## Review Notes

These controls were tightened during a quality review of the public codebase:

- Credential routes (`/api/auth/login`, `/api/auth/sign-up`, `/api/auth/forgot-password`) are reachable without an existing session. They rate-limit requests, validate email and password input, and do not echo provider errors that can be used to list accounts.
- Sign-up enforces the password policy on the server and rejects addresses that are not in `ALLOWED_EMAILS`.
- Password reset returns the same success response for unapproved addresses and does not call the provider for them.
- Password changes go through `/api/auth/update-password`, which requires an approved session and checks the password policy before the account is updated.
- Quote and invoice totals are recomputed from line items and `pricing.taxRateBps`. A client-supplied total that does not match is rejected for quotes.
- Database policies no longer grant every authenticated user full access. `supabase/migrations/00002_restrict_authenticated_access.sql` limits row access to emails in `admin_allowlist`, which the app fills from `ALLOWED_EMAILS`. Apply that migration on existing projects.
- Search terms strip PostgREST filter characters before they are interpolated.
- `MESSAGING_PROVIDER=mock` and demo mode record outbound texts in memory. Tests use that path and injected providers so they do not contact Twilio.

## Secret Handling

Never include live secrets in reports, issues, screenshots, or commits.
At minimum, redact:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_AUTH_TOKEN`
- `SQUARE_ACCESS_TOKEN`
- any private webhook secret or session token

## Safe Testing Expectations

- Use sandbox/test accounts when possible.
- Avoid modifying production customer data.
- Do not run destructive tests against systems you do not own or control.
- Live screenshot capture mutates fixture data and should only be used with safe non-production credentials.

## Response Expectations

The project will aim to review reports promptly and resolve confirmed issues as time allows.
Please allow reasonable time for investigation before public disclosure.

