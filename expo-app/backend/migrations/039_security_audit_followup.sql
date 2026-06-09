-- Security audit follow-up (SECURITY_AUDIT.md + Supabase advisor).
-- 1) Revoke anon/PUBLIC execute on SECURITY DEFINER functions (trigger + RPC).
-- 2) Re-grant authenticated RPCs the app calls.
-- 3) Narrow storage bucket listing on media_assets.
-- 4) Server-side premium gates for events + media inserts.
-- 5) security_audit_log for destructive master actions.

-- ---------------------------------------------------------------------------
-- Audit log (service role / Edge Functions only)
-- ---------------------------------------------------------------------------
create table if not exists public.security_audit_log (
  id bigserial primary key,
  action text not null,
  actor_user_id uuid,
  target_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  client_ip text,
  created_at timestamptz not null default now()
);

alter table public.security_audit_log enable row level security;

revoke all on table public.security_audit_log from anon, authenticated;
grant select, insert on table public.security_audit_log to service_role;
grant usage, select on sequence public.security_audit_log_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- Revoke PostgREST reachability for all public SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon', r.sig);
  end loop;
end $$;

-- App-facing RPCs (authenticated only)
grant execute on function public.accept_follow_request(uuid) to authenticated;
grant execute on function public.reject_follow_request(uuid) to authenticated;
grant execute on function public.cancel_follow_request(uuid) to authenticated;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
grant execute on function public.host_check_in_booking(text) to authenticated;
grant execute on function public.can_message_peer(uuid) to authenticated;
grant execute on function public.can_submit_content_proposal() to authenticated;
grant execute on function public.can_submit_sponsor_proposal() to authenticated;
grant execute on function public.content_proposals_this_month_count(uuid) to authenticated;
grant execute on function public.sponsor_proposals_this_month_count() to authenticated;
grant execute on function public.submit_proposal_followup(uuid, text, text[]) to authenticated;
grant execute on function public.ack_proposal_author_modal(uuid) to authenticated;
grant execute on function public.verify_master_pin(text) to authenticated;
grant execute on function public.is_master_account() to authenticated;
grant execute on function public.master_open_content_proposal(uuid) to authenticated;
grant execute on function public.master_review_content_proposal(uuid, text) to authenticated;
grant execute on function public.master_mark_proposal_discussed(uuid) to authenticated;
grant execute on function public.list_master_user_accounts(integer) to authenticated;
grant execute on function public.master_suspend_user(uuid, text, integer, integer, integer, boolean, boolean) to authenticated;

-- Master / admin RPCs also used by Edge Functions
grant execute on function public.verify_master_pin(text) to service_role;
grant execute on function public.list_master_user_accounts(integer) to service_role;
grant execute on function public.master_suspend_user(uuid, text, integer, integer, integer, boolean, boolean) to service_role;
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'list_premium_awaiting_dalton_verification'
  ) then
    grant execute on function public.list_premium_awaiting_dalton_verification() to authenticated;
    grant execute on function public.list_premium_awaiting_dalton_verification() to service_role;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'master_grant_dalton_verified'
  ) then
    grant execute on function public.master_grant_dalton_verified(uuid, text) to authenticated;
    grant execute on function public.master_grant_dalton_verified(uuid, text) to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: prevent bucket listing; allow object read when linked in media_assets
-- ---------------------------------------------------------------------------
drop policy if exists "storage_media_assets_select_public" on storage.objects;
create policy "storage_media_assets_select_linked"
  on storage.objects for select
  using (
    bucket_id = 'media_assets'
    and exists (
      select 1
      from public.media_assets m
      where m.storage_path = name
        and (
          m.visibility = 'public'
          or m.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.master_control = 'yes'
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Premium enforcement: events create + media upload (RLS)
-- ---------------------------------------------------------------------------
drop policy if exists "events_insert_authenticated" on public.events;
create policy "events_insert_premium_or_master"
  on public.events for insert
  with check (
    auth.role() = 'authenticated'
    and created_by is not null
    and created_by = auth.uid()
    and (
      exists (
        select 1 from public.subscription_state s
        where s.user_id = auth.uid() and s.is_pro is true
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.master_control = 'yes'
      )
    )
  );

drop policy if exists "media_owner_all" on public.media_assets;

create policy "media_select_own"
  on public.media_assets for select
  using (auth.uid() = owner_id);

create policy "media_update_own"
  on public.media_assets for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "media_delete_own"
  on public.media_assets for delete
  using (auth.uid() = owner_id);

create policy "media_insert_premium_own"
  on public.media_assets for insert
  with check (
    auth.uid() = owner_id
    and (
      exists (
        select 1 from public.subscription_state s
        where s.user_id = auth.uid() and s.is_pro is true
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.master_control = 'yes'
      )
    )
  );

-- Premium required for media/event proposal kinds (sponsor intake stays open).
create or replace function public.enforce_premium_content_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind in ('media', 'event') then
    if not exists (
      select 1 from public.subscription_state s
      where s.user_id = new.author_id and s.is_pro is true
    )
    and not exists (
      select 1 from public.profiles p
      where p.id = new.author_id and p.master_control = 'yes'
    ) then
      raise exception 'premium_required'
        using errcode = 'P0001',
          message = 'Premium subscription required for this proposal type.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_premium_content_proposal_trg on public.content_proposals;
create trigger enforce_premium_content_proposal_trg
  before insert on public.content_proposals
  for each row
  execute function public.enforce_premium_content_proposal();

revoke all on function public.enforce_premium_content_proposal() from public, anon;
