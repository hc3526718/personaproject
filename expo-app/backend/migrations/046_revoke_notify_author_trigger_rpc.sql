-- Trigger-only: block direct RPC calls from anon/authenticated.
revoke execute on function public.notify_author_on_post_like() from anon, authenticated;
