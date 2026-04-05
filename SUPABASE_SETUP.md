# Supabase Cloud Save Setup

This project can sync boards to Supabase using a per-user snapshot row.

## 1) Create table

Run this SQL in Supabase SQL editor:

```sql
create table if not exists public.purelike_user_boards (
  user_email text primary key,
  boards jsonb not null default '[]'::jsonb,
  folders jsonb not null default '[]'::jsonb,
  active_board_id text,
  updated_at timestamptz not null default now()
);
```

## 2) Create API keys in app

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then restart dev server.

## 3) How sync works

- On workspace open: app loads cloud snapshot for current user email.
- During editing: app debounces and saves snapshot every ~700ms.
- If Supabase env vars are missing: app still works locally (no cloud sync).

## Notes

Current sync key is `user_email` from the app auth store.
For production security, migrate to real Supabase Auth with RLS policies.
