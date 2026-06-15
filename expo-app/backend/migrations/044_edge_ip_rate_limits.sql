-- IP rate-limit buckets for public Edge Functions (contact form, master PIN, etc.).

create table if not exists public.edge_ip_rate_limits (
  scope text not null,
  client_ip text not null,
  window_start timestamptz not null,
  hit_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (scope, client_ip, window_start)
);

create index if not exists edge_ip_rate_limits_updated_at_idx
  on public.edge_ip_rate_limits (updated_at);

alter table public.edge_ip_rate_limits enable row level security;

revoke all on table public.edge_ip_rate_limits from anon, authenticated;
grant all on table public.edge_ip_rate_limits to service_role;

create or replace function public.edge_ip_rate_limit_hit(
  p_scope text,
  p_client_ip text,
  p_window_sec integer,
  p_limit integer
)
returns table(allowed boolean, retry_after_sec integer, hit_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
  v_allowed boolean;
  v_retry integer;
begin
  if p_window_sec < 1 or p_limit < 1 then
    return query select true, 0, 0;
    return;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_sec) * p_window_sec
  );

  insert into public.edge_ip_rate_limits as r (scope, client_ip, window_start, hit_count)
  values (p_scope, left(p_client_ip, 64), v_window_start, 1)
  on conflict (scope, client_ip, window_start)
  do update set
    hit_count = r.hit_count + 1,
    updated_at = now()
  returning r.hit_count into v_count;

  v_allowed := v_count <= p_limit;
  v_retry := case
    when v_allowed then 0
    else greatest(
      1,
      p_window_sec - (extract(epoch from now())::integer % p_window_sec)
    )
  end;

  if random() < 0.02 then
    delete from public.edge_ip_rate_limits
    where updated_at < now() - interval '2 days';
  end if;

  return query select v_allowed, v_retry, v_count;
end;
$$;

revoke all on function public.edge_ip_rate_limit_hit(text, text, integer, integer) from public;
grant execute on function public.edge_ip_rate_limit_hit(text, text, integer, integer) to service_role;
