-- Block new bookings when event capacity is reached (race-safe via row lock).

create or replace function public.enforce_event_booking_capacity()
returns trigger
language plpgsql
as $$
declare
  ev record;
  cap int;
begin
  select registered_count, event_details
  into ev
  from public.events
  where id = NEW.event_id
  for update;

  if not found then
    raise exception 'event_not_found';
  end if;

  cap := nullif(trim(coalesce(ev.event_details->>'capacity', '')), '')::int;
  if cap is not null and cap > 0 and ev.registered_count >= cap then
    raise exception 'event_full' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_event_booking_capacity_trg on public.bookings;
create trigger enforce_event_booking_capacity_trg
  before insert on public.bookings
  for each row
  execute function public.enforce_event_booking_capacity();

revoke all on function public.enforce_event_booking_capacity() from public, anon;
