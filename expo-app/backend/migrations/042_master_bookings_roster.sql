-- Master control accounts can read bookings on any event (host roster / check-in prep).

drop policy if exists "bookings_master_select_all" on public.bookings;
create policy "bookings_master_select_all"
  on public.bookings for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.master_control = 'yes'
    )
  );
