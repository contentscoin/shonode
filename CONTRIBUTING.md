# Contributing to Shonode

Thanks for wanting to collaborate on Shonode.

This project is currently a rough prototype for AI-assisted storyboard and commercial-video planning. Small, practical improvements are very welcome.

## Good first contribution areas

- README/docs improvements
- UI polish for the node canvas
- import/export reliability
- safer AI proxy behavior
- rate limiting examples
- sample `.shonode` projects without private data
- accessibility fixes
- mobile layout improvements

## Local development

```bash
npm start
```

Open `http://127.0.0.1:4173`.

If you want to test AI generation, copy `.env.example` to `.env` and add your own `GEMINI_API_KEY`.

## Pull request guidelines

- Keep changes focused and easy to review.
- Do not commit `.env`, real API keys, exported private project files, or large generated media.
- Run JavaScript syntax checks before opening a PR:

```bash
node --check server.js
node --check storyboard-proxy.js
node --check api/storyboard.js
node --check script.js
node --check shotboard-ai.js
node --check ai-client.js
```

- If you change the AI proxy, explain the security and cost implications.
- If you change project import/export, include a small non-sensitive sample or reproduction steps.

## Code style

There is no formal formatter yet. Prefer readable vanilla JavaScript, descriptive names, and minimal dependencies.
