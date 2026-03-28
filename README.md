# Up

Anonymous file sharing on Cloudflare Workers with a React frontend, an upload API, and a publishable `up` CLI.

## What It Does

- Upload one or more files and get back a public secret link.
- View a shared collection at `/c/:id`.
- Retrieve raw files through `/api/file/:id`.
- Upload programmatically through HTTP or the `up` CLI.

## Upload API

### Multipart upload

Browser and collection uploads use:

```bash
curl -X POST https://up.andyp.ai/api/upload \
  -H 'Authorization: Bearer up_your_token' \
  -F 'file=@./first.png' \
  -F 'file=@./second.pdf'
```

### Raw upload

CLI and scripts can use:

```bash
curl -X PUT https://up.andyp.ai/api/upload \
  -H 'Authorization: Bearer up_your_token' \
  -H 'Content-Type: application/pdf' \
  -H 'X-Up-Filename: file.pdf' \
  --data-binary @./file.pdf
```

### Response shape

Both upload modes return:

```json
{
  "id": "collection-id",
  "title": "file.pdf",
  "createdAt": 1710000000000,
  "count": 1,
  "shareUrl": "https://up.andyp.ai/c/collection-id",
  "fileUrl": "https://up.andyp.ai/api/file/file-id",
  "files": [
    {
      "id": "file-id",
      "name": "file.pdf",
      "type": "application/pdf",
      "size": 12345,
      "url": "https://up.andyp.ai/api/file/file-id"
    }
  ]
}
```

`fileUrl` is present only when the collection contains exactly one file.

## CLI

The CLI package lives in [`cli/`](./cli).

```bash
up ./file.pdf
up --collection ./a.png ./b.png
up --json ./file.pdf
up setup
```

Persistent defaults live in `~/.up/config.toml`.

Example:

```toml
api_url = "https://up.andyp.ai"
app_url = "https://up.andyp.ai"
open_browser = true
default_mode = "single"
api_token = "up_your_token"
```

Token precedence is:

1. `UP_TOKEN`
2. `~/.up/config.toml`

`up setup` can save a token from the dashboard for local use. For CI or shared environments, prefer `UP_TOKEN` instead of writing secrets to disk.

## Local Development

```bash
nvm use
npm install
npm run dev
```

That starts:

- Vite on `http://localhost:5173`
- Wrangler on `http://localhost:8787`

## Required Cloudflare Bindings

`wrangler.toml` expects:

- an R2 bucket bound as `BUCKET`
- a D1 database bound as `DB`
- static assets served from `./dist` through the `ASSETS` binding

Update these placeholders before deployment:

- `[[r2_buckets]].bucket_name`
- `[[d1_databases]].database_id`

Apply the D1 schema from [`schema.sql`](./schema.sql).

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run deploy
```

## Runtime

- Node 20.x for local install and verification
- Cloudflare Workers for API + static asset delivery

## Auth

- Web app auth uses server-side sessions stored in `HttpOnly` cookies.
- CLI and scripted uploads use bearer tokens created from the dashboard.
- Uploads and dashboard access are protected; public collection/file links remain shareable by secret URL.

## Current Product Boundary

- In-app previews are intentionally lightweight.
- Images render directly in the collection view.
- Other file types rely on the browser opening the raw file URL.
