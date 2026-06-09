-- Migration 040 revoked EXECUTE on helpers still referenced by RLS policies.
-- Re-grant so SELECT on media_assets / conversations / messages works for authenticated users.

grant execute on function public.user_can_read_message_media(uuid) to authenticated;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;
grant execute on function public.dm_peer_allows_sender(uuid, uuid) to authenticated;

-- Capacity trigger must read events regardless of caller (SECURITY DEFINER) and tolerate bad capacity values.
create or replace function public.enforce_event_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev record;
  cap int;
  cap_raw text;
begin
  select registered_count, event_details
  into ev
  from public.events
  where id = NEW.event_id
  for update;

  if not found then
    raise exception 'event_not_found' using errcode = 'P0001';
  end if;

  cap := null;
  cap_raw := nullif(trim(coalesce(ev.event_details->>'capacity', '')), '');
  if cap_raw is not null then
    begin
      cap := cap_raw::int;
    exception
      when others then
        cap := null;
    end;
  end if;

  if cap is not null and cap > 0 and ev.registered_count >= cap then
    raise exception 'event_full' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

revoke all on function public.enforce_event_booking_capacity() from public, anon;
