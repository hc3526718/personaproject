-- Optional tables for roadmap services (`src/roadmap/*`). Apply after `schema.sql` when ready.

-- User-facing settings (sync from `settingsService.ts`)
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

-- Sponsorship *applications* — never replace public sponsor feed posts from the app directly.
create table if not exists public.sponsorship_submissions (
  id uuid primary key default uuid_generate_v4 (),
  submitter_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists sponsorship_submissions_submitter_idx
  on public.sponsorship_submissions (submitter_id, created_at desc);

alter table public.sponsorship_submissions enable row level security;

-- Expo push tokens (one active row per user for simple upsert from `notificationsService.ts`)
create table if not exists public.device_push_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);

alter table public.device_push_tokens enable row level security;

-- Example policies (adjust before production):
-- create policy "settings self" on public.user_settings for all using (auth.uid() = user_id);
-- create policy "sponsorship insert self" on public.sponsorship_submissions for insert with check (auth.uid() = submitter_id);
-- create policy "sponsorship read self" on public.sponsorship_submissions for select using (auth.uid() = submitter_id);
-- create policy "push tokens self" on public.device_push_tokens for all using (auth.uid() = user_id);
