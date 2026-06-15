-- Restrict edge_ip_rate_limit_hit to service_role (Edge Functions only).

revoke all on function public.edge_ip_rate_limit_hit(text, text, integer, integer) from anon, authenticated;
grant execute on function public.edge_ip_rate_limit_hit(text, text, integer, integer) to service_role;
