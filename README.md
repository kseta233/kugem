# kugem

MVP casual mini-game platform built with React, Vite, TypeScript, and Supabase.

## Prerequisites

- Node.js 22.x
- npm 10+

## Setup

1. Install dependencies from the repo root:

```bash
npm ci
```

2. Create environment file for the web app:

```bash
cp apps/web/.env.example apps/web/.env
```

If you do not have an `.env.example` yet, create `apps/web/.env` manually and set:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Run Locally

From the repo root:

```bash
npm run dev
```

This starts the `apps/web` Vite dev server.

## Build

From the repo root:

```bash
npm run build
```

## Preview Production Build

From the repo root:

```bash
npm run preview
```

## Optional: E2E Tests

Run Playwright tests from the repo root:

```bash
npm run test:e2e
```

Or open Playwright UI mode:

```bash
npm run test:e2e:ui
```

## Supabase Phase 0 (Local Foundation)

Schema, RLS policies, and seed data are defined in:

- `supabase/migrations/202606020001_phase0_foundation.sql`
- `supabase/seed.sql`

To apply locally:

```bash
supabase start
supabase db reset
```

Notes:

- Local anonymous sign-in is enabled in `supabase/config.toml`.
- Hosted project creation and hosted anonymous auth toggle are still manual in Supabase Dashboard.
