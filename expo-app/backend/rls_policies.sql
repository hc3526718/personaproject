-- Dalton — Row Level Security policies (run AFTER schema.sql + handle_new_user.sql).
-- In Supabase: SQL Editor → paste → Run. Re-run is safe: uses DROP POLICY IF EXISTS where needed.
--
-- Verify trigger: Dashboard → Database → Triggers → `on_auth_user_created` on `auth.users`.
-- Verify profiles: Authentication → Users → sign up test user → Table Editor → public.profiles row exists.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Signed-in users can read any profile row (feeds / avatars). Tighten later (blocked users, private accounts).
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Optional if client ever inserts (trigger normally creates the row). Safe no-op if unused.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- posts (public read MVP; only author inserts)
-- ---------------------------------------------------------------------------
drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all"
  on public.posts for select
  using (true);

drop policy if exists "posts_insert_author" on public.posts;
create policy "posts_insert_author"
  on public.posts for insert
  with check (auth.uid() = author_id);

drop policy if exists "posts_update_author" on public.posts;
create policy "posts_update_author"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- post_likes / post_reactions / post_comments
-- ---------------------------------------------------------------------------
drop policy if exists "post_likes_select" on public.post_likes;
create policy "post_likes_select" on public.post_likes for select using (true);

drop policy if exists "post_likes_insert" on public.post_likes;
create policy "post_likes_insert" on public.post_likes for insert with check (auth.uid() = user_id);

drop policy if exists "post_likes_delete" on public.post_likes;
create policy "post_likes_delete" on public.post_likes for delete using (auth.uid() = user_id);

drop policy if exists "post_reactions_select" on public.post_reactions;
create policy "post_reactions_select" on public.post_reactions for select using (true);

drop policy if exists "post_reactions_insert" on public.post_reactions;
create policy "post_reactions_insert" on public.post_reactions for insert with check (auth.uid() = user_id);

drop policy if exists "post_reactions_delete" on public.post_reactions;
create policy "post_reactions_delete" on public.post_reactions for delete using (auth.uid() = user_id);

drop policy if exists "post_comments_select" on public.post_comments;
create policy "post_comments_select"
  on public.post_comments for select
  using (true);

drop policy if exists "post_comments_insert" on public.post_comments;
create policy "post_comments_insert"
  on public.post_comments for insert
  with check (auth.uid() = author_id);

drop policy if exists "post_comments_update_own" on public.post_comments;
create policy "post_comments_update_own"
  on public.post_comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- messages (MVP — tighten to conversation_participants once DM RLS is added)
-- ---------------------------------------------------------------------------
drop policy if exists "messages_select_authenticated" on public.messages;
create policy "messages_select_authenticated"
  on public.messages for select
  using (auth.role() = 'authenticated');

drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- ---------------------------------------------------------------------------
-- media_assets, bookings — owner / self patterns
-- ---------------------------------------------------------------------------
drop policy if exists "media_owner_all" on public.media_assets;
create policy "media_owner_all"
  on public.media_assets for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "bookings_self_all" on public.bookings;
create policy "bookings_self_all"
  on public.bookings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
