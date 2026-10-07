# Reviver Platform — Project State

Updated: 2026-10-07

## Stable base
- Repository: `iltieresilvasBI/reviver-platform`
- Production branch: `main`
- Safe continuation branch: `reviver-safe-continuation-2026-10-07`
- Base commit: `1dcaf436683880c7f5d69f0418f440b178d9ad91`
- Current safe head: `81f5f496b189ac28952c7cae6e92491c2e0db149`
- Stack: Next.js 15 / React 19 / Vercel / Supabase Auth + PostgreSQL + Storage
- Supabase project: `Reviver Platform` (`blyvwsbbrnhpswvxezjt`, eu-west-1)
- Production alias: `reviver-platform-gamma.vercel.app`

## Verified state
- Supabase project: ACTIVE_HEALTHY.
- 25 public tables; RLS enabled on all 25.
- CMS, Auth, Academy, quizzes/XP, public site/API, admin, contact inbox and worship workflows are present.
- Production deployment is READY but currently points to commit `381aa42`, not the latest `main`.
- Latest `main` Vercel check failed because of `build-rate-limit`, not a reported application compile error.
- Safe branch preview infrastructure has produced at least one READY deployment.

## Completed on safe branch
1. CI now runs on `main`, pull requests to `main`, and `reviver-safe-continuation-*` branches.
2. Academy public view is split into:
   - Cantor Principal (Lead)
   - Backing Vocals
3. The existing `Worship Team` module is presented as `Harmonia e Backing Vocals`.
4. Verified English-only Academy videos `YCLyAmXtpfY` and `nBQH1c20xbs` are blocked from playback pending replacement in Portuguese/dubbed.
5. No production database data was modified for these changes.

## Safety findings
- Supabase Security Advisor reports SECURITY DEFINER exposure warnings.
- `has_app_role`, `has_network_role`, `is_admin` and `get_quiz_options` are executable by anon today.
- Auth leaked-password protection is disabled.
- Supabase will enforce explicit Data API exposure for existing projects on 2026-10-30; new database changes must include deliberate grants and RLS.
- Do not make production database changes before reviewing grants/policies and verifying them.

## Academy content constraints
- Academy videos must be Portuguese or Portuguese-dubbed; English-only videos must be removed/replaced.
- Voice formation must remain separated into:
  1. Cantor Principal (Lead)
  2. Backing Vocals
- Existing lessons `Segunda e terceira voz no louvor` and `Fundamentos de harmonia para equipa de louvor` are classified under Backing Vocals.

## Continuation protocol
1. Work only on a dedicated branch.
2. One functional block per commit.
3. Run CI typecheck + Next build on every safe-continuation branch push.
4. Do not promote or merge to production while CI is red or Vercel is rate-limited.
5. Database writes require a reviewed migration/change set plus post-change Security Advisor verification.
6. Keep this file updated after each completed block.

## Next blocks
1. Harden RPC/function exposure without breaking RLS policies.
2. Complete audit/replacement of all Academy YouTube videos.
3. Validate Admin/Academy preview and quizzes.
4. Review the draft PR and preview deployment.
5. Merge/promote only after checks pass.
