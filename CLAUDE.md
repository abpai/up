# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs both React app and Cloudflare Worker concurrently)
pnpm dev

# Individual dev servers
pnpm dev:app        # React app on :3000
pnpm dev:worker     # Wrangler worker on :8787

# Build & Deploy
pnpm build          # Build React app
pnpm deploy         # Build + deploy to Cloudflare

# Testing
pnpm test           # Run app tests (Vitest) and CLI tests (node --test)
pnpm test:app       # Run Vitest for the app/worker
pnpm test:cli       # Run node --test for the CLI workspace

# Linting
pnpm lint           # ESLint
pnpm fix            # ESLint with auto-fix
```

## Architecture

This is a file-sharing app deployed on Cloudflare with a React frontend and Cloudflare Worker backend.

### Frontend (`src/pages/`, `src/App.js`)
- React 18 with react-router-dom for routing
- Tailwind CSS for styling
- Routes:
  - `/` - Home: drag-drop/paste file upload
  - `/c/:id` - Collection: view uploaded files
  - `/dashboard` - View upload history (stored in localStorage)

### Backend (`src/worker/`)
- Cloudflare Worker using itty-router
- Entry point: `src/worker/index.js`
- Handlers in `src/worker/handlers/`:
  - `upload.js` - POST /api/upload (multipart form)
  - `collection.js` - GET /api/collection/:id
  - `file.js` - GET/PATCH /api/file/:id
  - `render.js` - Server-side renders /c/:id pages
  - `static.js` - Serves built React assets

### Storage
- **R2 Bucket** (`BUCKET` binding): File storage, keys are `{collectionId}/{fileId}`
- **D1 Database** (`DB` binding): Metadata storage
  - `collections` table: id, title, created_at
  - `files` table: id, collection_id, r2_key, name, type, size, uploaded_at

### Configuration
- `wrangler.toml` - Cloudflare bindings (R2, D1)
- `schema.sql` - D1 database schema

## Code Style

- ESLint with airbnb-base + prettier
- Single quotes, no semicolons, trailing commas
- Prettier formatting enforced via ESLint
