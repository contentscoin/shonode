# Security Policy

Shonode is an early prototype. Please treat it as self-hosted experimental software, not as a hardened production SaaS.

## Supported versions

Security fixes are currently handled on the `main` branch only.

## Reporting a vulnerability

Please do not publish secrets, private prompts, exported `.shonode` files, or exploit details in a public issue.

If you find a vulnerability, open a minimal issue that describes the affected area without sensitive data, or contact the maintainer privately if you already have a trusted channel.

## API key safety

- Never commit `.env` files.
- Never put `GEMINI_API_KEY` in browser/client code.
- Configure AI provider keys only as server-side environment variables.
- Rotate any key that was accidentally committed or pasted into public logs.

## Public deployment checklist

Before exposing a hosted Shonode instance publicly, add or verify:

- strict `SHONODE_ALLOWED_ORIGINS`
- rate limiting for `/api/storyboard`
- request body size limits appropriate for your host
- usage alerts for your AI provider account
- secret redaction in logs
- optional authentication or invite gating

The repository includes prototype validation in `storyboard-proxy.js`, but this should not be treated as complete abuse protection for a public service.
