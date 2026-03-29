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

## Deployment

This app deploys as a single Cloudflare Worker that serves both the API and the built frontend assets from `dist/`.

### 1. Prerequisites

- Node 24.x (verified locally with `v24.14.0`)
- A Cloudflare account
- Wrangler authenticated with that account

```bash
nvm use 24
npm install
npx wrangler login
```

### 2. Create Cloudflare resources

Create an R2 bucket for uploaded files:

```bash
npx wrangler r2 bucket create up-storage
```

Create a D1 database for metadata:

```bash
npx wrangler d1 create up-db
```

Cloudflare will print a `database_id`. Copy that value into [`wrangler.toml`](./wrangler.toml) under `[[d1_databases]].database_id`.

If you want different resource names, that is fine. Just keep `wrangler.toml` in sync with the bucket and database you actually created.

### 3. Configure `wrangler.toml`

Update [`wrangler.toml`](./wrangler.toml) before the first production deploy:

- `[[r2_buckets]].bucket_name`
- `[[d1_databases]].database_name`
- `[[d1_databases]].database_id`
- `[vars].CORS`

`CORS` should be the production app origin that is allowed to make authenticated browser requests. For this project, that usually means your final site URL, for example:

```toml
[vars]
CORS = "https://up.example.com"
```

If you change the public domain, also update any hard-coded README examples and CLI defaults that still point at `https://up.andyp.ai`.

### 4. Apply the database schema

Once the D1 database exists and `wrangler.toml` points at it, apply [`schema.sql`](./schema.sql):

```bash
npx wrangler d1 execute up-db --remote --file=schema.sql
```

If you renamed the database, replace `up-db` with your actual D1 database name.

### 5. Build and validate locally

Before deploying, run the same checks you would want in CI:

```bash
npm run build
npm test
npm run lint
```

### 6. Deploy

Deploy the Worker and static assets:

```bash
npm run deploy
```

That runs `vite build` and then `wrangler deploy`.

### 7. Verify the deployment

After deploy, verify both the frontend and the API:

1. Open the Worker URL returned by Wrangler and confirm the homepage loads.
2. Confirm the API responds:

```bash
curl https://your-domain.example/api/auth/me
```

Expected response:

```json
{"user":null}
```

3. Create an account in the web UI, generate an API token from the dashboard, and test an authenticated upload:

```bash
curl -X PUT https://your-domain.example/api/upload \
  -H 'Authorization: Bearer up_your_token' \
  -H 'Content-Type: text/plain' \
  -H 'X-Up-Filename: smoke-test.txt' \
  --data-binary 'deployment smoke test'
```

4. Open the returned `shareUrl` and confirm the file can be downloaded through the public link.

### 8. Optional: attach a custom domain

If you want a stable production hostname instead of the default `*.workers.dev` URL, add a route or custom domain in Cloudflare and then update:

- `[vars].CORS` in [`wrangler.toml`](./wrangler.toml)
- the README/API examples if you are publishing this repo
- the CLI defaults if you want the packaged CLI to point at your production host

## Required Cloudflare Bindings

`wrangler.toml` expects:

- an R2 bucket bound as `BUCKET`
- a D1 database bound as `DB`
- static assets served from `./dist` through the `ASSETS` binding

Update these placeholders before deployment:

- `[[r2_buckets]].bucket_name`
- `[[d1_databases]].database_name`
- `[[d1_databases]].database_id`
- `[vars].CORS`

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

- Node 24.x for local install and verification
- Node 20.x as a conservative fallback if newer Wrangler dependencies regress
- Cloudflare Workers for API + static asset delivery

## Auth

- Web app auth uses server-side sessions stored in `HttpOnly` cookies.
- CLI and scripted uploads use bearer tokens created from the dashboard.
- Uploads and dashboard access are protected; public collection/file links remain shareable by secret URL.

## Current Product Boundary

- In-app previews are intentionally lightweight.
- Images render directly in the collection view.
- Other file types rely on the browser opening the raw file URL.
