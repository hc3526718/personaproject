-- Run after schema.sql + rls_policies (conversations + participants policies).
-- Creates a 1:1 conversation between auth.uid() and other_user_id if none exists.

create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  n int;
begin
  if other_user_id is null or other_user_id = auth.uid() then
    raise exception 'invalid peer';
  end if;

  select c.id into conv_id
  from public.conversations c
  where exists (
    select 1 from public.conversation_participants p1
    where p1.conversation_id = c.id and p1.user_id = auth.uid()
  )
  and exists (
    select 1 from public.conversation_participants p2
    where p2.conversation_id = c.id and p2.user_id = other_user_id
  );

  if conv_id is not null then
    select count(*)::int into n from public.conversation_participants where conversation_id = conv_id;
    if n = 2 then
      return conv_id;
    end if;
  end if;

  insert into public.conversations default values
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id) values (conv_id, auth.uid());
  insert into public.conversation_participants (conversation_id, user_id) values (conv_id, other_user_id);

  return conv_id;
end;
$$;

revoke all on function public.get_or_create_dm(uuid) from public;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
