# Up

I wanted a simple way to upload files and get a shareable link that doesn't look terrible. Up does that — drag-drop or paste in the browser, or `up file.pdf` from the terminal. Shared links get proper OpenGraph previews so they unfurl nicely in Slack, Discord, etc.

It runs on Cloudflare Workers with R2 for storage and D1 for metadata. You can self-host the whole thing on a free Cloudflare account.

## Demo

https://up.andyp.ai is a demo instance. Data there gets deleted periodically — don't rely on it for anything you care about.

## What you get

- Upload files by drag-drop, paste, or CLI
- Each upload gets a shareable link at `/c/:id`
- Images render inline; other files get a download link
- OpenGraph tags so links preview well when shared
- Optional auth — public uploads or token-gated, your choice

## Self-hosting

### Prerequisites

- Node 24.x
- A Cloudflare account with Wrangler authenticated

```bash
pnpm install
npx wrangler login
```

### Create Cloudflare resources

```bash
npx wrangler r2 bucket create up-storage
npx wrangler d1 create up-db
```

Copy the `database_id` from the D1 output into `wrangler.toml` under `[[d1_databases]]`. If you use different names, update the bucket and database names in `wrangler.toml` too.

### Configure

In `wrangler.toml`, set:

- `[[r2_buckets]].bucket_name` — your R2 bucket name
- `[[d1_databases]].database_name` and `.database_id` — your D1 database
- `[vars].CORS` — your production origin(s), comma-separated

### Apply the schema

```bash
npx wrangler d1 execute up-db --remote --file=schema.sql
```

### Deploy

```bash
pnpm deploy
```

This builds the React frontend and deploys everything as a single Cloudflare Worker.

### Verify

1. Open the Worker URL — the homepage should load
2. `curl https://your-domain/api/auth/me` should return `{ "user": null }`
3. Create an account, generate an API token from the dashboard, and test an upload:

```bash
curl -X PUT https://your-domain/api/upload \
  -H 'Authorization: Bearer up_your_token' \
  -H 'Content-Type: text/plain' \
  -H 'X-Up-Filename: test.txt' \
  --data-binary 'hello'
```

### Custom domain

Add a route or custom domain in Cloudflare, then update `[vars].CORS` in `wrangler.toml` to match.

## CLI

The `up` CLI lives in [`cli/`](./cli).

```bash
up file.pdf                        # upload and get a link
up --collection a.png b.png        # group files into one link
up --json file.pdf                 # print full response JSON
up setup                           # configure token and defaults
```

Config is saved to `~/.up/config.toml`:

```toml
api_url = "https://your-domain.example"
app_url = "https://your-domain.example"
open_browser = true
default_mode = "single"
api_token = "up_your_token"
```

Token precedence: `UP_TOKEN` env var > `~/.up/config.toml`.

## API

### Multipart upload

```bash
curl -X POST https://your-domain/api/upload \
  -H 'Authorization: Bearer up_your_token' \
  -F 'file=@./photo.png' \
  -F 'file=@./doc.pdf'
```

### Raw upload

```bash
curl -X PUT https://your-domain/api/upload \
  -H 'Authorization: Bearer up_your_token' \
  -H 'Content-Type: application/pdf' \
  -H 'X-Up-Filename: doc.pdf' \
  --data-binary @./doc.pdf
```

### Response

```json
{
  "id": "collection-id",
  "title": "doc.pdf",
  "createdAt": 1710000000000,
  "count": 1,
  "shareUrl": "https://your-domain/c/collection-id",
  "fileUrl": "https://your-domain/api/file/file-id",
  "files": [
    {
      "id": "file-id",
      "name": "doc.pdf",
      "type": "application/pdf",
      "size": 12345,
      "url": "https://your-domain/api/file/file-id"
    }
  ]
}
```

`fileUrl` is present only when the collection contains exactly one file.

## Local development

```bash
pnpm dev
```

Starts Vite on `localhost:5173` and Wrangler on `localhost:8787`.

## Auth

The web app uses server-side sessions in HttpOnly cookies. The CLI and scripts use bearer tokens created from the dashboard. Uploads require auth; shared links are public.
