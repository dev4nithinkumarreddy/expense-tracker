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

### Open Questions for Phase 0 Checkpoint (resolved)
1. **Schema capture:** Pending — see §0.3 below.
2. **Branch push:** Done — see below.

---

## Phase 0 (continued) — Approved Items
**Date:** 2026-09-21

### Fix: rules-of-hooks in Dashboard.tsx
- `cashflow = useMemo(...)` was placed after `if (isLoading) return` early return at line 100.
- Moved `cashflow` useMemo and `quickAdds` const **above** the early return. All deps already in scope.
- No behavior change.
- **Commit:** `f3d06fd` — `fix: move useMemo above early return in Dashboard (rules-of-hooks)`
- **Result:** `oxlint` now exits 0 errors (was 1 error). 3 pre-existing warnings remain.

### Fix: .gitignore wildcard pattern
- Reverted expanded per-file rules to `.env.*` wildcard + `!.env.example` negation.
- **Commit:** `e8193dc`
- **Verified** with `git check-ignore -v`:

| Path | Ignored? | Rule |
|---|---|---|
| `.env` | ✅ Yes | `.gitignore:14 .env` |
| `.env.local` | ✅ Yes | `.gitignore:15 .env.*` |
| `.env.production` | ✅ Yes | `.gitignore:15 .env.*` |
| `.env.staging` | ✅ Yes | `.gitignore:15 .env.*` |
| `.env.example` | ✅ Not ignored (tracked) | `!.env.example` exception |

### Branch Push
- Branch `chore/hardening-cleanup` pushed to `origin/chore/hardening-cleanup`.
- PR: https://github.com/dev4nithinkumarreddy/expense-tracker/pull/new/chore/hardening-cleanup

### Phase 0 Final Tool Results

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `oxlint` | ✅ 0 errors, 3 warnings (pre-existing) |
| `npm run build` | ✅ succeeds |

---

## Phase 0.3 — Schema Baseline & Archive of Dashboard Migrations
**Date:** 2026-09-21

### Action Taken: Migrations Archived
- Remote migration history (`supabase_migrations.schema_migrations`) is empty because all schema objects were created via Supabase dashboard / SQL editor.
- The 3 existing migrations (`20260921_admin_portal.sql`, `20260921_admin_advanced.sql`, `20260921_bills_due_date.sql`) have been moved to `supabase/migrations_archive/` with an explanatory `README.md`.
- Per user instruction, local Docker/dump commands were skipped. Full schema dump is deferred to the end.
- Hardening proceeded directly against the verified live production schema and policies.

---

## Phase 1 — Security Hardening
**Date:** 2026-09-21

### 1.1 Live Policy Audit & Privilege Escalation Verification
- **Confirmed Vulnerability**: On live production `admin_users`, the INSERT policy was `WITH CHECK (true)` and DELETE was `USING (true)`. Any authenticated user could add themselves as admin or delete existing admins.
- **Admin Tables**: `automated_rules`, `scheduled_notifications`, `notification_logs` all had overly broad `true` policies allowing any authenticated user to manage rules, schedule push notifications, or modify logs.
- **User Data Tables**: `expenses`, `bills`, `budgets`, `debts`, `subscriptions`, `user_settings`, `wishlist`, `push_subscriptions`, and `profiles` are all properly locked down to `auth.uid() = user_id` (or `auth.uid() = id`).

### 1.2 Migration: 20260922000001_admin_hardening.sql
- Created `supabase/migrations/20260922000001_admin_hardening.sql`.
- Added `user_id UUID REFERENCES auth.users(id)` column with backfill and auto-sync trigger `trg_sync_admin_user_id`.
- Created `public.is_admin()` function with `SECURITY DEFINER` and `SET search_path = ''`, checking `auth.uid()` against `admin_users.user_id`.
- Replaced insecure policies with:
  - `admin_users`: SELECT restricted to `is_admin() OR user_id = auth.uid()`; INSERT, UPDATE, DELETE strictly restricted to `is_admin()`.
  - `automated_rules`: ALL restricted to `is_admin()`.
  - `scheduled_notifications`: ALL restricted to `is_admin()`.
  - `notification_logs`: ALL restricted to `is_admin()`.
- Added a complete commented rollback script at the bottom of the migration.

### 1.3 Edge Function Authentication & Validation (`push-notify`)
- Added `authenticateAdmin(req)` helper to `supabase/functions/push-notify/index.ts`.
- Validates caller JWT via `supabase.auth.getUser()`, allows `service_role` key for cron jobs, and verifies admin status in `admin_users`.
- Protected endpoints:
  - `get_analytics`: Requires admin (returns 401/403 otherwise).
  - `get_user_details`: Requires admin; validates `user_id` parameter.
  - `is_scheduled_check`: Requires admin or service_role.
  - Broadcast push dispatch: Requires admin; validates payload `title` (max 200), `body` (max 1000), `url` (max 500), `target_audience`.
- Open endpoints:
  - `ping`: Health check remains accessible.
  - `track_click`: Publicly accessible with anon key for service worker CTR tracking; validates `campaign_id`.

### 1.4 Service Worker Single Source of Truth (`src/sw.ts`)
- Replaced hardcoded Supabase URL and anon key literals in `src/sw.ts` with `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.
- Verified Vite bundles these at build time into `dist/sw.js` with 0 warnings.

### 1.5 RLS & Security Test Plan
- Created `docs/security/rls-test-plan.md` with runnable DevTools JS and SQL snippets testing:
  - (a) Normal user cannot insert/delete in `admin_users`.
  - (b) Normal user cannot read/tamper with other users' expenses.
  - (c) Normal user cannot invoke protected Edge Function actions.
  - (d) Legitimate admin can perform all admin actions.

### 1.6 Route Guard UX Notice
- Updated `src/components/admin/AdminRouteGuard.tsx` with an architectural comment explaining that the route guard is for client-side UX navigation only, while real security is enforced at RLS and Edge Function levels.

### Verification Results
- `npx tsc --noEmit`: 0 errors
- `npx oxlint .`: 0 errors (3 non-blocking warnings)
- `npm run build`: Success

---

## Phase 2 — Data-Loss and Sync Bugs
**Date:** 2026-09-21

### 2.1 Module-Scoped Sync Mutex & Exponential Backoff Retry
- **Issue**: `syncPendingMutations` relied on `(window as any).isSyncing = true`. If an uncaught exception occurred, the flag remained `true` forever, permanently bricking sync.
- **Fix**:
  - Replaced `(window as any).isSyncing` with module-scoped `isSyncingLock` variable.
  - Enclosed the entire synchronization loop in a `try ... finally { isSyncingLock = false; }` block, guaranteeing lock release regardless of runtime errors.
  - Implemented `scheduleSyncRetry()` with exponential backoff (`2s`, `4s`, `8s`, up to `30s`) so transient failures automatically retry once connection stabilizes.
  - Reset failure counters on successful mutation or `online` window events.

### 2.2 Offline Settings Persistence & Merge Guard (`updateSettings`)
- **Issue**: `updateSettings` made a direct unhandled Supabase `.upsert()` call that silently failed when offline, leaving local changes unsaved to cloud. Furthermore, `fetchCloudData` unconditionally overwrote local settings on reconnect, destroying offline edits to income, currency, categories, and themes.
- **Fix**:
  - Added `'UPDATE_SETTINGS'` to `MutationType`.
  - Routed `updateSettings` through `addPendingMutation({ type: 'UPDATE_SETTINGS', payload })`, persisting offline edits in localStorage.
  - Added a merge guard in `fetchCloudData`: checks if any `'UPDATE_SETTINGS'` mutations are pending. If pending, cloud settings are not applied, ensuring local changes win until successfully synced.

### 2.3 Idempotent Recurring Expenses & Month Rollover
- **Issue**: `checkMonthRollover` used `crypto.randomUUID()` to generate occurrences, wrote directly via bare `.then()` without error handlers, never queued offline mutations, and would create duplicate rows if run concurrently across devices.
- **Fix**:
  - Implemented RFC 4122 v5-compliant `generateDeterministicUUID(namespace, key)` in `src/lib/utils.ts`.
  - Generated deterministic IDs for carry-forward (`carry_forward:userId:YYYY-MM`), bill auto-deduct (`auto_deduct:billId:YYYY-MM`), and recurring occurrences (`recurring:sourceId:YYYY-MM-DD`).
  - Added memory idempotency guards (`some(...)`) before adding occurrences.
  - Queued all generated expenses and master expense `next_occurrence` updates through `addPendingMutation`.
  - Created migration `supabase/migrations/20260922000002_recurring_idempotency.sql` adding `recurring_source_id UUID` to `expenses` and a partial unique index `idx_expenses_recurring_dedup` on `(user_id, recurring_source_id, date)`.

### 2.4 Codebase Write Audit
- **`usePushNotifications.ts`**:
  - Fixed hardcoded VAPID public key to read from `import.meta.env.VITE_VAPID_PUBLIC_KEY`.
  - Removed unnecessary regex escape `\-` resolving linter warning.
- **`eraseAllData`**:
  - Wrapped `Promise.all` in `try / catch` with user-facing toasts for success and failure.
- **Eliminated all bare `.then()` calls**: Replaced all unhandled promise chains in `useExpenseStore.ts` with queued mutations and error-handled async actions.

### 2.5 User Feedback on Sync Failures
- Integrated non-blocking `toast.error` messages when mutations fail or network pauses sync, alerting users that mutations are safely preserved and will retry automatically.

### Verification Results
- `npx tsc --noEmit`: 0 errors
- `npx oxlint .`: 0 errors (2 non-blocking warnings, down from 3)
- `npm run build`: Success (PWA service worker bundled with 0 warnings)

---

## Phase 3 — Database & Type Layer Alignment
**Date:** 2026-09-21

### 3.1 Database Type Definitions Alignment (`src/types/database.types.ts`)
- **Issue**: `database.types.ts` was missing almost half the application's tables (`subscriptions`, `debts`, `wishlist`, `push_subscriptions`, `automated_rules`, `scheduled_notifications`, `notification_logs`), and existing tables were missing columns (`recurring_source_id` on `expenses`, `due_day`/`due_date` on `bills`, and `privacy_mode`/`theme`/`category_emojis`/`notifications_enabled`/`user_name` on `user_settings`).
- **Fix**:
  - Re-wrote `database.types.ts` with complete and precise `Row`, `Insert`, and `Update` interfaces for all 13 production tables (`expenses`, `bills`, `budgets`, `user_settings`, `subscriptions`, `debts`, `wishlist`, `push_subscriptions`, `admin_users`, `automated_rules`, `scheduled_notifications`, `notification_logs`, `profiles`).
  - Added compatibility with `@supabase/supabase-js`'s `GenericSchema` (`Relationships: []` on all tables, plus `Views`, `Functions`, `Enums`, and `CompositeTypes` namespaces), eliminating PostgREST fallback to `never`.

### 3.2 Strongly Typed Supabase Client (`src/lib/supabase.ts`)
- **Fix**: Updated client instantiation to `createClient<Database>(supabaseUrl, supabaseKey)`. All queries across the app now benefit from full TypeScript autocompletion and compile-time schema validation for table names, select projections, and mutation payloads.

### 3.3 Store & Database Type Alignment (`src/store/useExpenseStore.ts`)
- **Fix**:
  - Aligned Zustand interfaces (`Expense`, `Bill`, `Budget`, `Settings`, `Debt`, `Subscription`) with database schema.
  - Aligned data mapping in `fetchCloudData` for `bills` (`due_day` calculation and `due_date || undefined`), `budgets` (removed unsafe `(b: any)` cast), and `subscriptions`.
  - Added pending mutation offline merge support for `subscriptions` in `fetchCloudData` (previously omitted).
  - Strongly typed `s.category_budgets`, `s.category_emojis`, and `s.quick_adds` mappings from JSON.

### Verification Results
- `npx tsc --noEmit`: 0 errors
- `npx oxlint .`: 0 errors (2 pre-existing non-blocking warnings)
- `npx vitest run`: 7 passed test files, 50 passed tests
- `npm run build`: Success (`tsc -b && vite build` passed in 2.60s with full PWA service worker injection)

---
<!-- Future phases appended below -->
