-- Shonode Studio Phase 1 (MVP) initial schema
-- Tables: profiles, projects (snapshot jsonb). RLS: owner-only access.
-- Apply with: Supabase SQL Editor, `supabase db push`, or psql.

-- ---------------------------------------------------------------------------
-- profiles: 1 row per auth user, created automatically on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  locale text not null default 'ko',
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects: cloud-saved workspaces. MVP stores the whole shonode-workspace-v2
-- snapshot as jsonb; panel normalization into relational tables comes in v1.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '새 프로젝트',
  brand_name text not null default '',
  source_url text not null default '',
  risk_class text not null default 'low' check (risk_class in ('low', 'proof_required', 'high')),
  status text not null default 'draft',
  snapshot jsonb not null default '{}'::jsonb,
  snapshot_version text not null default 'shonode-workspace-v2',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc)
  where deleted_at is null;

alter table public.projects enable row level security;

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own
  on public.projects for select
  using (auth.uid() = owner_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own
  on public.projects for insert
  with check (auth.uid() = owner_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own
  on public.projects for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own
  on public.projects for delete
  using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
