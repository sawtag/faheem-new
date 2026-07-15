@AGENTS.md

## Cloud / web sessions (claude.ai)

- A fresh clone auto-runs `npm ci` via the SessionStart hook in `.claude/settings.json` (~1–2 min). If `node_modules` is somehow still missing, run `npm ci` before anything else.
- There is no `.env` in the sandbox — env vars come from the claude.ai cloud-environment settings. Without `ANTHROPIC_API_KEY`, use the offline demo mode: `npm run dev:cache` / `npm run test` still work (golden recordings in `data/demo-cache/`).
- If `ANTHROPIC_API_KEY` doesn't survive into the session (managed sandboxes may reserve that name), set `FAHEEM_ANTHROPIC_KEY` instead — the app checks it as a fallback alias.
- Playwright browsers are NOT preinstalled: run `npx playwright install chromium` once before `npm run test:e2e`.
