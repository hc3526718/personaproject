-- Notify post author when someone likes their post (respects in_app_notify.postInteraction).

create or replace function public.notify_author_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  liker_name text;
  in_app_enabled boolean := true;
  post_interactions_on boolean := true;
begin
  select p.author_id into post_author
  from public.posts p
  where p.id = new.post_id;

  if post_author is null or post_author = new.user_id then
    return new;
  end if;

  select
    coalesce((us.preferences->'in_app_notify'->>'enabled')::boolean, true),
    coalesce((us.preferences->'in_app_notify'->>'postInteraction')::boolean, true)
  into in_app_enabled, post_interactions_on
  from public.user_settings us
  where us.user_id = post_author;

  if in_app_enabled is false or post_interactions_on is false then
    return new;
  end if;

  select coalesce(nullif(trim(pr.display_name), ''), nullif(trim(pr.username), ''), 'Someone')
  into liker_name
  from public.profiles pr
  where pr.id = new.user_id;

  insert into public.in_app_notifications (user_id, title, body, read_at, created_at, link_type, link_id)
  values (
    post_author,
    liker_name || ' liked your post',
    'Open Community to view it.',
    null,
    now(),
    'post',
    new.post_id::text
  );

  return new;
end;
$$;

revoke all on function public.notify_author_on_post_like() from public;

drop trigger if exists trg_notify_author_on_post_like on public.post_likes;
create trigger trg_notify_author_on_post_like
  after insert on public.post_likes
  for each row
  execute function public.notify_author_on_post_like();
