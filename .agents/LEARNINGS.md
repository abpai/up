# LEARNINGS

## Corrections

| Date | Source | What Went Wrong | What To Do Instead |
| ---- | ------ | --------------- | ------------------ |
| 2026-03-27 | user | Planned the CLI config generically at first | Mirror Orb's pattern: persistent TOML config in `~/.up/config.toml` plus an interactive `up setup` command |
| 2026-03-27 | self | Assumed a newer `@clack/prompts` version existed without checking the registry | Verify package versions with `npm view <pkg> version` before locking new CLI dependencies |
| 2026-03-27 | self | Tried installing the workspace under Node 25 and hit Wrangler/miniflare `sharp` build failures | Treat Node 25 as unverified for this repo; the declared engine is not enough if the shell default is newer |
| 2026-03-28 | user | Confirmed the local shell is on Node `v24.14.0` and it works for current repo tasks | Prefer Node `v24.14.0` or other verified Node 24.x builds for day-to-day work here; keep Node 20 as a conservative fallback if Wrangler tooling regresses |
| 2026-03-27 | self | Started adding CLI token auth through flags | Keep secrets out of flags; prefer `UP_TOKEN` or a TTY-driven `up setup` flow and redact tokens from config output |
| 2026-03-27 | self | Added bearer-token auth in the Worker but forgot CORS preflight headers | When adding auth headers, update `Access-Control-Allow-Headers` and allowed methods at the same time |
| 2026-03-27 | self | It is easy to rename the public domain in docs or CLI defaults but miss the Worker `CORS` var and social metadata | When changing the site domain, update `wrangler.toml`, HTML meta URLs/domains, CLI defaults, and README examples together |
| 2026-03-27 | user | Started building a local wrapper around `youtube-transcript-api` even though the upstream package already ships a CLI | Check the upstream install and entrypoints first; for `uv tool` prefer the direct package unless local customization is actually needed |
| 2026-03-27 | self | Migrated the app to Vite + Wrangler without wiring local `/api` requests back to the worker | After splitting app and worker dev servers, add a Vite proxy or explicit client API base URL before calling the local flow done |
| 2026-03-27 | self | Added a root `build:cli` workflow without giving the CLI workspace a `build` script | When introducing workspace-wide build commands, verify each child workspace implements the referenced lifecycle script |
| 2026-03-27 | self | Cached D1 schema initialization in a single module-level promise | Cache schema bootstrap per `env.DB` binding (for example with a `WeakMap`) so tests and multi-env runtimes do not accidentally skip initialization |
| 2026-03-29 | self | Started using pnpm in a repo that still relied on npm workspace metadata and `npm:` script shorthands | When migrating this repo to pnpm, add `pnpm-workspace.yaml`, switch root scripts to explicit `pnpm` commands, and regenerate the lockfile instead of keeping `package-lock.json` |
| 2026-03-29 | self | Running a newer local `pnpm` during validation bumped the root `packageManager` field unexpectedly | If the repo pins a specific `packageManager` version, restore that field unless you are intentionally upgrading tooling |
| 2026-04-07 | self | `import/no-unresolved` falsely flagged local React component imports because ESLint's node resolver only considered `.js` | In this repo's `.eslintrc`, configure `settings.import/resolver.node.extensions` to include both `.js` and `.jsx` |
| 2026-04-07 | self | Trusted-origin checks in dev were too narrow because they hard-coded Vite on port `5173` | For local Worker requests, trust any loopback-origin frontend (`localhost`, `127.0.0.1`, IPv6 loopback) and allow missing `Origin` headers from local proxies |
| 2026-04-08 | self | Added optional auth to `GET /api/collection/:id` without varying cached responses by all auth inputs | When a public response changes based on auth state, vary cache headers by every auth mechanism in play here, especially both `Cookie` and `Authorization` |

## User Preferences

- Model CLI/global config after `~/Projects/orb`.
- Include an explicit `up setup` command rather than relying only on flags or env vars.

## Patterns That Work

- Keep the product focused on fast anonymous sharing and developer ergonomics before richer preview/rendering features.
- Keep inline preview URLs and forced-download URLs separate for shared artifacts; use an explicit `?download=1` attachment path instead of relying on the browser to infer download behavior from an inline asset URL.

## Patterns That Don't Work

- Leaving release plans vague around config/setup behavior creates follow-up churn.

## Domain Notes

- `Up` is a Cloudflare Worker plus React frontend for anonymous secret-link file sharing.
- The next major value wedge is a stable upload API and installable CLI.
- Node `v24.14.0` is currently working in this repo.
- Node 25 is still unverified because Wrangler/miniflare dependencies previously failed there.
- Node 20 remains the conservative fallback if newer Node versions start breaking installs again.
- This repo now uses pnpm workspaces rather than npm workspaces.
