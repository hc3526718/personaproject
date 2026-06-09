-- Trigger-only SECURITY DEFINER functions must not be callable via PostgREST.

revoke all on function public.handle_new_user() from authenticated;
revoke all on function public.auth_user_set_default_dalton_verified() from authenticated;
revoke all on function public.profiles_lock_dalton_verified_for_self() from authenticated;
revoke all on function public.notify_admins_on_post_report() from authenticated;
revoke all on function public.notify_recipient_on_dm() from authenticated;
revoke all on function public.notify_booked_users_on_event_update() from authenticated;
revoke all on function public.notify_masters_new_proposal() from authenticated;
revoke all on function public.enqueue_in_app_push_dispatch() from authenticated;
revoke all on function public.ensure_sender_profile_before_message() from authenticated;
revoke all on function public.refresh_event_registered_count() from authenticated;
revoke all on function public.void_wallet_pass_on_checkin() from authenticated;
revoke all on function public.enforce_sponsor_proposal_monthly_limit() from authenticated;
revoke all on function public.enforce_premium_content_proposal() from authenticated;
revoke all on function public.enforce_event_booking_capacity() from authenticated;

-- Internal helpers used only from RLS / other functions (not client RPCs).
revoke all on function public.dm_peer_allows_sender(uuid, uuid) from authenticated;
revoke all on function public.is_conversation_participant(uuid, uuid) from authenticated;
revoke all on function public.user_can_read_message_media(uuid) from authenticated;
