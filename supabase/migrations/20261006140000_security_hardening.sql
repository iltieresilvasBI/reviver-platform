-- Reviver Platform security hardening

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, phone, updated_at) on public.profiles to authenticated;

drop policy if exists "media update content" on public.content_items;
create policy "media update content" on public.content_items for update
using (
  public.is_admin()
  or public.has_app_role(auth.uid(),'media_leader')
  or (
    created_by=auth.uid()
    and public.has_app_role(auth.uid(),'media_editor')
    and status in ('draft','changes_requested')
  )
)
with check (
  public.is_admin()
  or public.has_app_role(auth.uid(),'media_leader')
  or (
    created_by=auth.uid()
    and public.has_app_role(auth.uid(),'media_editor')
    and status in ('draft','changes_requested')
  )
);

drop policy if exists "quiz options read" on public.quiz_options;
revoke select on public.quiz_options from anon, authenticated;

create or replace view public.quiz_options_public
with (security_invoker=true)
as
select id, question_id, label, sort_order
from public.quiz_options;

grant select on public.quiz_options_public to anon, authenticated;

drop policy if exists "attempts own insert" on public.quiz_attempts;
drop policy if exists "progress own write" on public.lesson_progress;
drop policy if exists "xp own insert" on public.xp_events;

revoke insert, update, delete on public.quiz_attempts from anon, authenticated;
revoke insert, update, delete on public.lesson_progress from anon, authenticated;
revoke insert, update, delete on public.xp_events from anon, authenticated;
revoke insert, update, delete on public.user_achievements from anon, authenticated;

create index if not exists idx_network_memberships_network_id on public.network_memberships(network_id);
create index if not exists idx_network_memberships_user_id on public.network_memberships(user_id);
create index if not exists idx_content_media_content_item_id on public.content_media(content_item_id);
create index if not exists idx_content_audit_item_id on public.content_audit_log(content_item_id);
create index if not exists idx_quiz_questions_lesson_id on public.quiz_questions(lesson_id);
create index if not exists idx_quiz_options_question_id on public.quiz_options(question_id);
create index if not exists idx_quiz_attempts_user_lesson on public.quiz_attempts(user_id, lesson_id);
create index if not exists idx_lesson_progress_lesson_id on public.lesson_progress(lesson_id);
create index if not exists idx_practice_sessions_user_id on public.practice_sessions(user_id);
create index if not exists idx_xp_events_lesson_id on public.xp_events(lesson_id);
create index if not exists idx_user_achievements_achievement_id on public.user_achievements(achievement_id);
