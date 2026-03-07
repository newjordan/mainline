# Contributing to MainLine

Thanks for helping improve MainLine.

## Before You Start

- Read `README.md` for product/setup context.
- Use **Node.js 20+**.
- Never commit secrets, `.env.local`, or real customer data.
- Prefer demo/sandbox provider accounts while developing.

## Local Setup

1. Install dependencies:
   - `npm install`
2. Create your local environment file:
   - macOS/Linux: `cp .env.example .env.local`
   - PowerShell: `Copy-Item .env.example .env.local`
3. Fill in the values you need in `.env.local`.
4. Start the app:
   - `npm run dev`

Optional helpers:
- `npm run wizard:setup`
- `npm run wizard:setup -- --doctor`
- `npm run demo`

## Validation

Run the smallest relevant checks before opening a PR:

- `npm run lint`
- `npm test`

If you change setup flows, onboarding docs, or screenshot automation, update the matching docs in the same PR.

## Pull Requests

Please keep PRs focused and include:

- a short summary of what changed
- why the change was needed
- notes about testing performed
- screenshots when UI changes are user-visible

## Security and Sensitive Data

- Do not commit API keys, tokens, or service-role credentials.
- Do not use real production customer data in tests, demos, or screenshots.
- Live screenshot capture is opt-in and can mutate fixture data; use it only with safe non-production credentials.

## Code Style

- Follow the existing project structure and naming.
- Make the smallest safe change that solves the problem.
- Add or update tests when behavior changes.

## Reporting Security Issues

Please do **not** open public issues for suspected vulnerabilities.
Instead, follow the instructions in `SECURITY.md`.

