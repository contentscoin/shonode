# Shonode

Shonode is a lightweight, open-source storyboard node canvas for planning AI-assisted commercial videos.

It lets you arrange shots on a freeform canvas, connect them like nodes, attach reference images, generate `I2I / T2I / I2V` planning prompts, and save the whole workspace as a single `.shonode` project file.

> Status: early prototype / community experiment. Shonode is not a finished commercial product. Expect rough edges, missing tests, and fast-moving UI ideas.

## Features

- Freeform storyboard canvas with pan / zoom
- Shot cards connected as visual nodes
- AI Director brief input for shot planning
- Reference image board with drag reordering
- Selected-shot regeneration flow
- Project export / import with `.shonode`
- Local static server plus optional Gemini proxy
- Vercel-compatible serverless API route

## What this repo does not include

- No hosted API key
- No bundled `.env`
- No private project files
- No production abuse protection beyond the prototype request validation

If you deploy Shonode publicly, you are responsible for protecting your own AI API key and usage quota.

## Quick start

### 1. Install prerequisites

- Node.js `>=20`

This prototype currently uses only Node built-ins and browser APIs, so there is no dependency install step.

### 2. Configure environment

Copy `.env.example` to `.env` and set your own Gemini key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=4173
# Optional: comma-separated web origins allowed to call /api/storyboard
# SHONODE_ALLOWED_ORIGINS=https://your-domain.example
```

Do not commit `.env` or real API keys.

### 3. Start locally

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173
```

You can also open `index.html` directly for UI-only work, but AI generation is intended to run through the local proxy server.

## AI proxy behavior

Shonode uses a small server-side proxy for Gemini requests:

- Local server: `server.js` exposes `POST /api/storyboard`
- Vercel route: `api/storyboard.js` delegates to the same proxy handler
- Shared validation / upstream call: `storyboard-proxy.js`

The browser client should never contain your Gemini API key. Set `GEMINI_API_KEY` only in a local `.env` file or server-side deployment environment variables.

For public deployments, add your own production controls before sharing widely:

- rate limiting
- usage monitoring
- stricter origin allowlist via `SHONODE_ALLOWED_ORIGINS`
- request logging with secret redaction
- optional authentication or invite gating

## Project file format

Shonode exports projects as `.shonode` files.

The file is a JSON-based workspace snapshot (current version: `shonode-workspace-v2`) containing:

- project metadata (including optional creative `pattern` and `claimLog` entries)
- card content and positions (including optional six-beat `beat` labels)
- prompts
- reference images
- selection state
- zoom / scroll state
- sidebar state

Import supports:

- `.shonode` (`shonode-workspace-v2` and older `shonode-workspace-v1` snapshots)
- legacy `.json` workspace backups

Older snapshots are migrated on import: missing v2 fields fall back to safe defaults.

## Main files

- `index.html` — app structure
- `style.css` — UI styling
- `script.js` — canvas / card interactions
- `shotboard-ai.js` — AI workflow, sidebars, attached images, import/export
- `ai-client.js` — AI request builder / response mapping
- `server.js` — local static server and API proxy route
- `storyboard-proxy.js` — shared Gemini proxy handler
- `api/storyboard.js` — Vercel serverless entry point
- `brand/` — Shonode logo and mark assets

## Cloud mode (optional, Supabase)

Shonode runs fully local by default. Setting two environment variables enables an optional cloud mode with account login and cloud project storage:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

- The browser fetches these from `/api/config`; when unset, the cloud button never appears and no external requests are made.
- Apply the schema in `supabase/migrations/0001_shonode_studio_init.sql` to your Supabase project (SQL Editor or `supabase db push`). It creates `profiles` and `projects` tables with owner-only row-level security.
- Auth: email/password plus Google OAuth (enable the provider in your Supabase dashboard).
- Cloud projects store the whole `shonode-workspace-v2` snapshot; `.shonode` export/import keeps working regardless.
- `vendor/supabase-js-2.110.0.js` is a vendored UMD build of `@supabase/supabase-js`, loaded only when cloud mode is configured.

## Deployment notes

Shonode can be deployed as a static frontend with a server-side `/api/storyboard` route.

For Vercel:

1. Configure `GEMINI_API_KEY` in Vercel environment variables.
2. Configure `GEMINI_MODEL` if you want a model other than the default.
3. Set `SHONODE_ALLOWED_ORIGINS` to your production origin if needed.
4. Optionally set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to enable cloud mode.
5. Do not expose real secret keys in client-side files (the Supabase anon key is public by design; the Gemini key and Supabase service-role key are not).

## Roadmap and plans

Product and architecture planning documents live in `docs/plan/`. The current SaaS evolution plan is [`docs/plan/ad-video-storyboard-saas-기획서.md`](docs/plan/ad-video-storyboard-saas-%EA%B8%B0%ED%9A%8D%EC%84%9C.md) (Korean, with an English abstract).

## Contributing

Pull requests, issues, experiments, and small collaboration ideas are welcome. See `CONTRIBUTING.md`.

## Security

Please do not open public issues containing API keys, prompts with private data, or exported project files that include sensitive references. See `SECURITY.md`.

## License

Code is released under the MIT License. See `LICENSE`.

Brand assets in `brand/` are included for repository presentation and Shonode-related use. If you want to use the Shonode name or logo for a separate product, please ask first.
