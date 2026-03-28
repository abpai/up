# LEARNINGS

## Corrections

| Date | Source | What Went Wrong | What To Do Instead |
| ---- | ------ | --------------- | ------------------ |
| 2026-03-27 | user | Planned the CLI config generically at first | Mirror Orb's pattern: persistent TOML config in `~/.up/config.toml` plus an interactive `up setup` command |
| 2026-03-27 | self | Assumed a newer `@clack/prompts` version existed without checking the registry | Verify package versions with `npm view <pkg> version` before locking new CLI dependencies |
| 2026-03-27 | self | Tried installing the workspace under Node 25 and hit Wrangler/miniflare `sharp` build failures | Use Node 20 for install and verification in this repo; the declared engine is not enough if the shell default is newer |
| 2026-03-27 | self | Started adding CLI token auth through flags | Keep secrets out of flags; prefer `UP_TOKEN` or a TTY-driven `up setup` flow and redact tokens from config output |
| 2026-03-27 | self | Added bearer-token auth in the Worker but forgot CORS preflight headers | When adding auth headers, update `Access-Control-Allow-Headers` and allowed methods at the same time |
| 2026-03-27 | self | It is easy to rename the public domain in docs or CLI defaults but miss the Worker `CORS` var and social metadata | When changing the site domain, update `wrangler.toml`, HTML meta URLs/domains, CLI defaults, and README examples together |
| 2026-03-27 | user | Started building a local wrapper around `youtube-transcript-api` even though the upstream package already ships a CLI | Check the upstream install and entrypoints first; for `uv tool` prefer the direct package unless local customization is actually needed |
| 2026-03-27 | self | Migrated the app to Vite + Wrangler without wiring local `/api` requests back to the worker | After splitting app and worker dev servers, add a Vite proxy or explicit client API base URL before calling the local flow done |
| 2026-03-27 | self | Added a root `build:cli` workflow without giving the CLI workspace a `build` script | When introducing workspace-wide build commands, verify each child workspace implements the referenced lifecycle script |
| 2026-03-27 | self | Cached D1 schema initialization in a single module-level promise | Cache schema bootstrap per `env.DB` binding (for example with a `WeakMap`) so tests and multi-env runtimes do not accidentally skip initialization |

## User Preferences

- Model CLI/global config after `~/Projects/orb`.
- Include an explicit `up setup` command rather than relying only on flags or env vars.

## Patterns That Work

- Keep the product focused on fast anonymous sharing and developer ergonomics before richer preview/rendering features.

## Patterns That Don't Work

- Leaving release plans vague around config/setup behavior creates follow-up churn.

## Domain Notes

- `Up` is a Cloudflare Worker plus React frontend for anonymous secret-link file sharing.
- The next major value wedge is a stable upload API and installable CLI.
- Local verification should use Node 20 until Wrangler's dependency chain is clean on Node 25.
