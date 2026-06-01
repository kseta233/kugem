# Skill: Create Supabase Feature

Use this skill to scaffold a full Supabase-backed feature from database to UI hook.

## Workflow

Follow these steps in order for each feature requested.

### Step 1 — Migration

Create a SQL migration file under `supabase/migrations/`.

Include:
- Table creation with proper column types
- `created_at TIMESTAMPTZ DEFAULT now()` on all tables
- Foreign key to `auth.users(id)` where applicable
- Indexes on commonly filtered columns (e.g. `user_id`)

### Step 2 — RLS Policies

Add RLS policies in the same migration or a separate file.

Rules:
- Enable RLS on every new table: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- Users can only SELECT/INSERT/UPDATE/DELETE their own rows
- Use `auth.uid() = user_id` as the policy condition
- Public read allowed only for `games` and leaderboard tables

### Step 3 — TypeScript Types

Create or update `apps/web/src/types/<feature>.ts` with:
- Row type matching the table schema
- Insert type (omit auto-generated fields like `id`, `created_at`)
- Update type (partial insert type)

### Step 4 — Service Functions

Create `apps/web/src/features/<feature>/<feature>.service.ts`.

Rules:
- Use the shared client: `import { supabase } from '@/lib/supabase'`
- Each function handles one operation
- Return `{ data, error }` or throw — be consistent
- Never put Supabase calls directly in components

### Step 5 — React Hook

Create `apps/web/src/features/<feature>/use<Feature>.ts`.

Include:
- `data`, `loading`, `error` states
- Fetch on mount using `useEffect`
- Expose mutation functions as needed

### Step 6 — Verification Checklist

After scaffolding, confirm:

- [ ] Migration file created and valid SQL
- [ ] RLS enabled and policies cover all operations
- [ ] TypeScript types match table schema
- [ ] Service functions cover all needed operations
- [ ] Hook handles loading, empty, and error states
- [ ] No raw Supabase calls in components
