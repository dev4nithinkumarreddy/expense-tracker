# RLS & Server-Side Security Verification Test Plan

This document outlines exact, step-by-step verification tests to prove that:
1. A regular authenticated user **cannot** escalate themselves to admin or delete admins in `admin_users`.
2. A regular authenticated user **cannot** read or tamper with another user's expenses or private data.
3. A regular authenticated user **cannot** invoke administrative Edge Function actions in `push-notify`.
4. A genuine administrator **can** still perform all authorized admin operations.

---

## Test Scenario A: Prevent Admin Self-Escalation & Tampering in `admin_users`

### Objective
Prove that a non-admin authenticated user cannot insert themselves into `admin_users` or delete existing admin entries.

### Method 1: In Browser DevTools Console (as Regular User)
Log into the application with a non-admin account, open Developer Tools Console, and run:

```javascript
// Attempt to insert own user as an admin
const { data: userResp } = await window.supabase.auth.getUser();
const regularUser = userResp.user;
console.log("Testing as user:", regularUser.email, regularUser.id);

const { data: insertResult, error: insertError } = await window.supabase
  .from('admin_users')
  .insert({
    email: regularUser.email,
    user_id: regularUser.id,
    role: 'super_admin'
  });

console.log("Insert result:", insertResult, "Error:", insertError);
// EXPECTED RESULT:
// insertError is NOT null.
// PostgREST error: "new row violates row-level security policy for table 'admin_users'" (code 42501)
```

```javascript
// Attempt to delete all admins
const { data: deleteResult, error: deleteError } = await window.supabase
  .from('admin_users')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000');

console.log("Delete result:", deleteResult, "Error:", deleteError);
// EXPECTED RESULT:
// deleteError is NOT null, or 0 rows deleted.
```

### Method 2: In Supabase SQL Editor (Simulated Role)
Run this SQL snippet in the Supabase Dashboard SQL Editor:

```sql
-- 1. Setup a test transaction
BEGIN;

-- 2. Impersonate a non-admin user (replace with a real non-admin auth.users ID)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- 3. Attempt to insert a new admin record
INSERT INTO public.admin_users (email, role)
VALUES ('attacker@example.com', 'admin');
-- Expected: ERROR 42501: new row violates row-level security policy for table "admin_users"

-- 4. Attempt to delete existing admin records
DELETE FROM public.admin_users;
-- Expected: 0 rows deleted or ERROR 42501

-- 5. Rollback transaction so test data is not persisted
ROLLBACK;
```

---

## Test Scenario B: Cross-User Expense Isolation

### Objective
Prove that User A cannot read, edit, or delete expenses belonging to User B.

### Method 1: In Browser DevTools Console (as User A)
```javascript
// Find or target an expense ID belonging to another user (User B)
const targetOtherUserExpenseId = "TARGET-EXPENSE-UUID-HERE";

// 1. Attempt to read User B's expense directly
const { data: readData, error: readError } = await window.supabase
  .from('expenses')
  .select('*')
  .eq('id', targetOtherUserExpenseId);

console.log("Read other user expense:", readData);
// EXPECTED RESULT: readData is empty [] (RLS filters it out completely)

// 2. Attempt to update User B's expense
const { data: updateData, error: updateError } = await window.supabase
  .from('expenses')
  .update({ amount: 999999 })
  .eq('id', targetOtherUserExpenseId)
  .select();

console.log("Update other user expense:", updateData, "Error:", updateError);
// EXPECTED RESULT: updateData is empty [] or error returned; no rows modified

// 3. Attempt to delete User B's expense
const { data: delData, error: delError } = await window.supabase
  .from('expenses')
  .delete()
  .eq('id', targetOtherUserExpenseId)
  .select();

console.log("Delete other user expense:", delData);
// EXPECTED RESULT: delData is empty []; no rows deleted
```

### Method 2: In Supabase SQL Editor (Simulated Role)
```sql
BEGIN;

-- Impersonate User A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- Attempt to read all expenses
SELECT count(*) FROM public.expenses;
-- Expected: Only returns rows where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

-- Attempt to insert an expense for User B
INSERT INTO public.expenses (user_id, amount, description, category, date)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 50, 'Malicious insert', 'Food', '2026-09-22');
-- Expected: ERROR 42501: new row violates row-level security policy for table "expenses"

ROLLBACK;
```

---

## Test Scenario C: Reject Unauthorized Invocations of `push-notify` Edge Function

### Objective
Prove that unauthenticated callers and regular non-admin users cannot trigger broadcasts, inspect users, or view platform analytics.

### Method 1: In Terminal / cURL (Unauthenticated Request)
```bash
# Attempt to fetch platform analytics without auth
curl -i -X POST "https://sjodifnzidavsazajlcx.supabase.co/functions/v1/push-notify" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_analytics"}'

# EXPECTED HTTP STATUS: 401 Unauthorized
# Response body: {"error":"Unauthorized: Missing Authorization header"}
```

```bash
# Attempt to broadcast push notification without auth
curl -i -X POST "https://sjodifnzidavsazajlcx.supabase.co/functions/v1/push-notify" \
  -H "Content-Type: application/json" \
  -d '{"title":"Spam Notification","body":"Hacked!","target_audience":"all"}'

# EXPECTED HTTP STATUS: 401 Unauthorized
```

### Method 2: In Browser DevTools Console (Logged in as Regular User)
```javascript
// Call Edge function with regular user's JWT
const { data, error } = await window.supabase.functions.invoke('push-notify', {
  body: { action: 'get_analytics' }
});

console.log("Regular user analytics attempt:", data, "Error:", error);
// EXPECTED RESULT:
// error.status === 403
// error message: "Forbidden: Admin access required"
```

```javascript
// Attempt to fetch arbitrary user details
const { data, error } = await window.supabase.functions.invoke('push-notify', {
  body: { 
    action: 'get_user_details',
    user_id: '00000000-0000-0000-0000-000000000000'
  }
});

console.log("Regular user inspect attempt:", data, "Error:", error);
// EXPECTED RESULT: error.status === 403 ("Forbidden: Admin access required")
```

---

## Test Scenario D: Legitimate Admin Operations Still Function

### Objective
Confirm that a user listed in `public.admin_users` can still perform all administrative tasks.

### Verification Steps
1. Log into the web app using an authorized admin account (e.g. `dev4nithinkumarreddyc@gmail.com`).
2. Navigate to `/admin`:
   - The `AdminRouteGuard` allows access immediately.
   - The Macro Charts, Platform KPI counters, and Active User list load successfully via `get_analytics`.
3. Open **Team Management Modal** (`AdminTeamModal`):
   - Admin can view the list of admins (`SELECT` on `admin_users` succeeds).
   - Admin can add a new admin email (`INSERT` on `admin_users` succeeds).
   - Admin can delete an admin (`DELETE` on `admin_users` succeeds).
4. Open **Automated Rules Panel**:
   - Toggling a rule (`UPDATE` on `automated_rules`) succeeds.
5. Create a **Scheduled Notification**:
   - Submitting a scheduled notification (`INSERT` on `scheduled_notifications`) succeeds.
