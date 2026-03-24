# Shonode

Shonode is a lightweight storyboard workspace for planning AI-assisted commercial videos.
It lets you arrange cuts on a free canvas, connect them like nodes, attach reference images, generate `T2I / I2V` prompts, and save the whole workspace as a single project file.

## Features

- Freeform storyboard canvas with pan / zoom
- AI Director brief input and reference-image based cut planning
- Cut-to-cut node connections
- Reference image board with drag reordering
- Selected-cut regeneration
- Project export / import with `.shonode`

## Run Locally

### 1. Create an env file

Copy [.env.example](C:/Users/eteho/Downloads/ShotBoard/.env.example) to `.env` and set your Gemini key.

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=4173
```

### 2. Start the local server

```bash
cd C:\Users\eteho\Downloads\ShotBoard
node server.js
```

or:

```bash
npm start
```

### 3. Open the app

```text
http://127.0.0.1:4173
```

### Note

You can still open [index.html](C:/Users/eteho/Downloads/ShotBoard/index.html) directly for UI-only work, but AI generation is now intended to run through the local proxy server.

## Project File Format

Shonode exports projects as `.shonode` files.

- Example: `My Project-2026-03-24.shonode`
- The file is a JSON-based workspace snapshot
- It contains:
  - project metadata
  - card content and positions
  - prompts
  - reference images
  - selection state
  - zoom / scroll state
  - sidebar state

Import supports both:

- `.shonode`
- legacy `.json` workspace backups

## Main Files

- [index.html](C:/Users/eteho/Downloads/ShotBoard/index.html): app structure
- [style.css](C:/Users/eteho/Downloads/ShotBoard/style.css): UI styling
- [script.js](C:/Users/eteho/Downloads/ShotBoard/script.js): canvas / card interactions
- [shotboard-ai.js](C:/Users/eteho/Downloads/ShotBoard/shotboard-ai.js): AI workflow, sidebars, references, import/export
- [ai-client.js](C:/Users/eteho/Downloads/ShotBoard/ai-client.js): AI request builder / response mapping
- [brand](C:/Users/eteho/Downloads/ShotBoard/brand): Shonode brand assets

## Deployment Note

The prototype now includes a local proxy server in [server.js](C:/Users/eteho/Downloads/ShotBoard/server.js).
For public deployment, keep the Gemini key only in server-side environment variables and do not place it back into client files.

## Deployment Workflow

Shonode is now connected to both GitHub and Vercel.

- `main`: production branch
- `preview`: staging / preview branch for Vercel preview deployments

Recommended flow:

1. work locally
2. push to `preview` to check the hosted preview build
3. merge or push to `main` when ready for production

Current setup notes:

- Production environment variables are configured in Vercel
- Preview environment variables are configured for the `preview` branch
- Repository: `https://github.com/etehofk1-ops/shonode`
