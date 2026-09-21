# Archived Migrations

These migration files were previously created and applied manually via the Supabase Dashboard SQL Editor:
- `20260921_admin_portal.sql`
- `20260921_admin_advanced.sql`
- `20260921_bills_due_date.sql`

Because the remote database did not have a corresponding record in `supabase_migrations.schema_migrations`, and the baseline public schema was created iteratively in the Supabase Dashboard, these files have been archived.

Their schema objects and policies are now captured in the consolidated baseline dump at:
`supabase/migrations/20260101000000_baseline.sql`

Do not apply or re-run these archived migrations directly.
