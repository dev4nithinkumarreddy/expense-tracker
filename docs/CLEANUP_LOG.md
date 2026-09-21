# Expense Tracker — Hardening & Cleanup Log

> Branch: `chore/hardening-cleanup`
> All entries are appended chronologically. Each phase ends with a checkpoint.

---

## Phase 0 — Safety Net and Baseline
**Date:** 2026-09-21

### 0.1 Branch
- Created branch `chore/hardening-cleanup` from `main`.
- Working tree was clean (only untracked `docs/` folder from audit).

### 0.2 Baseline Tool Results

#### `tsc --noEmit`
```
Exit code: 0 — no TypeScript errors.
```

#### `oxlint .`
```
Found 3 warnings and 1 error.

ERROR (blocks fast-refresh):
  react-hooks(rules-of-hooks): useMemo called conditionally in Dashboard.tsx:106
  — cashflow useMemo is placed after an early return at line 100.

WARNINGS:
  react(only-export-components): getCategoryStyle exported from CategoryBadge.tsx:153
  eslint(no-useless-escape): \- escape in usePushNotifications.ts:11
  eslint(no-unused-vars): 'data' unused in test-insert.ts:4
```

**Conclusion:** Lint exits non-zero due to the rules-of-hooks error. This is a pre-existing bug (not introduced by this branch). It will be fixed in Phase 2+ as part of the Dashboard refactor.

#### `npm run build`
```
Exit code: 0 — build succeeds.
3218 modules transformed.
Key chunks:
  Analytics-B-2469D2.js       421.19 kB  (gzip: 117.95 kB)  ← includes Recharts
  formatCurrency-BwlW2Zh3.js  470.75 kB  (gzip: 133.63 kB)  ← likely includes Tesseract.js
  index-CYEATDoT.js           341.74 kB  (gzip: 105.84 kB)
PWA service worker: dist/sw.js  (injectManifest, 22 precache entries)
```

### 0.3 Schema Baseline Command
The 8 core tables (`expenses`, `bills`, `budgets`, `user_settings`, `subscriptions`,
`debts`, `wishlist`, `push_subscriptions`) were created in the Supabase dashboard and
are **not** in any migration file. To capture the live schema, run:

```bash
# Read-only; does not apply any changes
supabase db pull --schema public
```

This writes `supabase/migrations/<timestamp>_remote_schema.sql`.
Rename the file to use a timestamp EARLIER than `20260921` (e.g. `20240101_baseline_schema.sql`)
so migration order is preserved.

> **ACTION REQUIRED (manual):** Run the command above and share the output so the
> baseline migration file can be created in this PR.

### 0.4 Secret / Credential Audit

#### Files in the working tree that reference credentials

| File | What | Server-side secret? |
|---|---|---|
| `.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` | **No** — anon key and VAPID public key are designed to be client-visible |
| `src/sw.ts` L49-50 | Supabase URL and anon JWT **hardcoded as string literals** | **No** (same anon key) — but hardcoded in a tracked source file, bypassing env-var system |
| `supabase/functions/push-notify/index.ts` | `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`, `Deno.env.get('VAPID_PRIVATE_KEY')` | **Yes** — but read from Supabase Secrets at runtime; values are NOT in the file |
| `supabase/.temp/linked-project.json` | Project ref only (`sjodifnzidavsazajlcx`) | No — project ref is not a secret |

#### Git history scan
- No file containing a `service_role` key value was found in any commit.
- No VAPID private key value was found in any commit.
- The `.env` file has never been tracked (confirmed via `git ls-files`).
- The anon key string literal in `src/sw.ts` **has been tracked** since commit `2902a00`
  (first appearance in git history). This is the anon key (public), not a server secret.
  However, it should be injected via the build system instead of hardcoded — scheduled for Phase 1.4.

**Verdict:** No server-side secrets (service_role key, VAPID private key, SMTP credentials,
database password) are present in the working tree or git history. The tracked
anon key and URL in `sw.ts` are low-risk but will be cleaned up in Phase 1.

### 0.5 `.gitignore` and `.env.example`
- `.env` is listed on line 14 of `.gitignore`. ✅
- `.env.*` is also listed on line 15. ✅
- `.env` is **not** tracked by git (`git ls-files` returns empty for it). ✅
- `.env.example` did **not** exist — **created** in this phase with placeholder values.

### Files Changed in Phase 0
| File | Action |
|---|---|
| `.env.example` | Created |
| `docs/CLEANUP_LOG.md` | Created |
| `docs/ARCHITECTURE_AUDIT.md` | Created (from prior audit session) |

### Open Questions for Phase 0 Checkpoint
1. **Schema capture:** Please run `supabase db pull --schema public` and confirm — the
   output will be committed as the baseline migration.
2. **Branch push:** Should `chore/hardening-cleanup` be pushed to `origin` now?

---
<!-- Future phases will be appended below -->
