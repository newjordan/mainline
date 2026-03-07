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

