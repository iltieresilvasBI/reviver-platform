-- Performance: cover foreign keys reported by the Supabase advisor.
create index if not exists academy_lessons_video_reviewed_by_idx
  on public.academy_lessons(video_reviewed_by);

create index if not exists academy_modules_unlock_after_module_id_idx
  on public.academy_modules(unlock_after_module_id);

create index if not exists academy_resources_created_by_idx
  on public.academy_resources(created_by);

create index if not exists contact_messages_handled_by_idx
  on public.contact_messages(handled_by);

create index if not exists content_audit_log_actor_user_id_idx
  on public.content_audit_log(actor_user_id);

create index if not exists content_item_categories_category_id_idx
  on public.content_item_categories(category_id);

create index if not exists content_items_approved_by_idx
  on public.content_items(approved_by);

create index if not exists content_items_created_by_idx
  on public.content_items(created_by);

create index if not exists content_items_published_by_idx
  on public.content_items(published_by);

create index if not exists content_items_rejected_by_idx
  on public.content_items(rejected_by);

create index if not exists content_items_scheduled_by_idx
  on public.content_items(scheduled_by);

create index if not exists content_items_submitted_by_idx
  on public.content_items(submitted_by);

create index if not exists network_memberships_approved_by_idx
  on public.network_memberships(approved_by);

create index if not exists quiz_attempts_lesson_id_idx
  on public.quiz_attempts(lesson_id);

create index if not exists user_app_roles_granted_by_idx
  on public.user_app_roles(granted_by);

create index if not exists worship_band_templates_created_by_idx
  on public.worship_band_templates(created_by);

create index if not exists worship_member_backup_pool_backup_membership_id_idx
  on public.worship_member_backup_pool(backup_membership_id);

create index if not exists worship_substitution_events_actor_membership_id_idx
  on public.worship_substitution_events(actor_membership_id);

create index if not exists worship_substitution_events_from_membership_id_idx
  on public.worship_substitution_events(from_membership_id);

create index if not exists worship_substitution_events_request_id_idx
  on public.worship_substitution_events(request_id);

create index if not exists worship_substitution_events_to_membership_id_idx
  on public.worship_substitution_events(to_membership_id);

create index if not exists worship_substitution_offers_proposed_membership_id_idx
  on public.worship_substitution_offers(proposed_membership_id);
