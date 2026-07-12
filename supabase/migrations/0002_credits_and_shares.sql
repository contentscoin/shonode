-- Shonode Studio Phase 1 monetization schema
-- Credits (plan-based monthly grants + atomic consume/refund), generation job
-- log, and view-only share links.
-- Apply with: Supabase SQL Editor, `supabase db push`, or psql.
-- Requires 0001_shonode_studio_init.sql (profiles, projects).

-- ---------------------------------------------------------------------------
-- credit_ledger: append-only. Rows are written ONLY via the SECURITY DEFINER
-- functions below — no direct insert/update/delete for clients.
-- ---------------------------------------------------------------------------
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('plan_grant', 'stage', 'refund', 'purchase')),
  stage text not null default '',
  job_id uuid,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger (user_id, created_at desc);

alter table public.credit_ledger enable row level security;

drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own
  on public.credit_ledger for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- generation_jobs: one row per metered server-side generation call.
-- ---------------------------------------------------------------------------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null check (stage in ('storyboard', 'image')),
  provider text not null default 'gemini',
  credit_cost integer not null,
  status text not null default 'running' check (status in ('running', 'done', 'failed', 'refunded')),
  error text not null default '',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists generation_jobs_user_idx
  on public.generation_jobs (user_id, created_at desc);

alter table public.generation_jobs enable row level security;

drop policy if exists generation_jobs_select_own on public.generation_jobs;
create policy generation_jobs_select_own
  on public.generation_jobs for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Plan-based monthly credit grants.
-- ---------------------------------------------------------------------------
create or replace function public.plan_monthly_credits(plan text)
returns integer
language sql
immutable
as $$
  select case plan
    when 'pro' then 600
    when 'team' then 2000
    else 30
  end;
$$;

-- Grants this month's credits once per user per calendar month (Asia/Seoul-
-- agnostic: uses UTC month buckets). Runs under an advisory transaction lock
-- per user so concurrent calls cannot double-grant.
create or replace function public.ensure_monthly_grant()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_plan text;
  grant_amount integer;
  current_balance integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text));

  if exists (
    select 1 from credit_ledger
    where user_id = uid
      and reason = 'plan_grant'
      and date_trunc('month', created_at) = date_trunc('month', now())
  ) then
    return;
  end if;

  select coalesce(plan, 'free') into user_plan from profiles where id = uid;
  grant_amount := plan_monthly_credits(coalesce(user_plan, 'free'));
  select coalesce(sum(delta), 0) into current_balance from credit_ledger where user_id = uid;

  insert into credit_ledger (user_id, delta, reason, stage, balance_after)
  values (uid, grant_amount, 'plan_grant', '', current_balance + grant_amount);
end;
$$;

create or replace function public.get_credit_balance()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_balance integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  perform ensure_monthly_grant();
  select coalesce(sum(delta), 0) into current_balance from credit_ledger where user_id = uid;
  return current_balance;
end;
$$;

-- Atomic escrow-style consumption: checks balance, writes the negative ledger
-- row, and opens a generation job in one transaction. Raises on insufficient
-- balance so the API layer can answer 402.
create or replace function public.consume_credits(cost integer, stage text, provider text default 'gemini')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_balance integer;
  new_job_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if cost is null or cost <= 0 or cost > 100 then
    raise exception 'invalid cost';
  end if;
  if stage not in ('storyboard', 'image') then
    raise exception 'invalid stage';
  end if;

  perform ensure_monthly_grant();
  perform pg_advisory_xact_lock(hashtext(uid::text));

  select coalesce(sum(delta), 0) into current_balance from credit_ledger where user_id = uid;
  if current_balance < cost then
    raise exception 'insufficient credits: % < %', current_balance, cost
      using errcode = 'P0001';
  end if;

  insert into generation_jobs (user_id, stage, provider, credit_cost)
  values (uid, stage, coalesce(provider, 'gemini'), cost)
  returning id into new_job_id;

  insert into credit_ledger (user_id, delta, reason, stage, job_id, balance_after)
  values (uid, -cost, 'stage', stage, new_job_id, current_balance - cost);

  return json_build_object('job_id', new_job_id, 'balance', current_balance - cost);
end;
$$;

-- Refund exactly once, only for the caller's own still-running job.
create or replace function public.refund_credits(target_job_id uuid, refund_reason text default 'upstream_failed')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  job generation_jobs%rowtype;
  current_balance integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text));

  select * into job from generation_jobs
  where id = target_job_id and user_id = uid
  for update;
  if not found then
    raise exception 'job not found';
  end if;
  if job.status <> 'running' then
    raise exception 'job is not refundable (status: %)', job.status;
  end if;

  update generation_jobs
  set status = 'refunded', error = coalesce(refund_reason, ''), finished_at = now()
  where id = job.id;

  select coalesce(sum(delta), 0) into current_balance from credit_ledger where user_id = uid;
  insert into credit_ledger (user_id, delta, reason, stage, job_id, balance_after)
  values (uid, job.credit_cost, 'refund', job.stage, job.id, current_balance + job.credit_cost);

  return json_build_object('balance', current_balance + job.credit_cost);
end;
$$;

create or replace function public.finish_generation_job(target_job_id uuid, ok boolean, err text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  update generation_jobs
  set status = case when ok then 'done' else 'failed' end,
      error = coalesce(err, ''),
      finished_at = now()
  where id = target_job_id and user_id = uid and status = 'running';
end;
$$;

-- ---------------------------------------------------------------------------
-- shares: view-only share links for cloud projects.
-- ---------------------------------------------------------------------------
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  mode text not null default 'view' check (mode in ('view')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists shares_owner_idx on public.shares (owner_id, created_at desc);

alter table public.shares enable row level security;

drop policy if exists shares_select_own on public.shares;
create policy shares_select_own
  on public.shares for select
  using (auth.uid() = owner_id);

drop policy if exists shares_delete_own on public.shares;
create policy shares_delete_own
  on public.shares for delete
  using (auth.uid() = owner_id);

-- Create (or reuse) the view share link for one of the caller's projects.
create or replace function public.create_share(target_project_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  share shares%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from projects where id = target_project_id and owner_id = uid and deleted_at is null
  ) then
    raise exception 'project not found';
  end if;

  select * into share from shares
  where project_id = target_project_id and owner_id = uid and mode = 'view'
  limit 1;
  if not found then
    insert into shares (project_id, owner_id)
    values (target_project_id, uid)
    returning * into share;
  end if;

  return json_build_object('token', share.token);
end;
$$;

-- Anonymous read of a shared project snapshot by token. Exposes only the
-- snapshot + title — never owner identity.
create or replace function public.get_shared_snapshot(share_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  share shares%rowtype;
  proj projects%rowtype;
begin
  select * into share from shares
  where token = share_token
    and (expires_at is null or expires_at > now());
  if not found then
    raise exception 'share not found';
  end if;

  select * into proj from projects
  where id = share.project_id and deleted_at is null;
  if not found then
    raise exception 'share not found';
  end if;

  return json_build_object('title', proj.title, 'snapshot', proj.snapshot);
end;
$$;

grant execute on function public.get_shared_snapshot(text) to anon;
grant execute on function public.get_credit_balance() to authenticated;
grant execute on function public.consume_credits(integer, text, text) to authenticated;
grant execute on function public.refund_credits(uuid, text) to authenticated;
grant execute on function public.finish_generation_job(uuid, boolean, text) to authenticated;
grant execute on function public.create_share(uuid) to authenticated;
grant execute on function public.ensure_monthly_grant() to authenticated;
