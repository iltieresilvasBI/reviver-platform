# Reviver Platform — Project State

Updated: 2026-10-07

## Stable base
- Repository: `iltieresilvasBI/reviver-platform`
- Production branch: `main`
- Safe continuation branch: `reviver-safe-continuation-2026-10-07`
- Base commit: `1dcaf436683880c7f5d69f0418f440b178d9ad91`
- Current safe head: `3b94821e6261b84a358ad5951bb04026bb948660`
- Stack: Next.js 15 / React 19 / Vercel / Supabase Auth + PostgreSQL + Storage
- Supabase project: `Reviver Platform` (`blyvwsbbrnhpswvxezjt`, eu-west-1)
- Production alias: `reviver-platform-gamma.vercel.app`

## Verified state
- Supabase project: ACTIVE_HEALTHY.
- 25 public tables; RLS enabled on all 25.
- CMS, Auth, Academy, quizzes/XP, public site/API, admin, contact inbox and worship workflows are present.
- Production remains unchanged and still points to commit `381aa42`.
- Safe branch has produced multiple READY Vercel previews.

## Completed on safe branch
1. CI covers `main`, pull requests to `main`, and `reviver-safe-continuation-*`.
2. CI npm-cache configuration was fixed so it no longer requires a missing `package-lock.json`.
3. Academy public view is split into:
   - Cantor Principal (Lead)
   - Backing Vocals
4. The existing `Worship Team` module is presented as `Harmonia e Backing Vocals`.
5. Academy Admin explicitly requires YouTube content in Portuguese or officially dubbed in Portuguese.
6. Security migration `20261007141730_security_rpc_identity_hardening.sql` is applied and persisted in Git:
   - role helper RPCs only return positive results for the authenticated caller's own identity;
   - probing another user's admin/app/network roles returns false;
   - anonymous execution of `get_quiz_options(uuid)` is revoked.
7. Two English-only videos were replaced in the live Academy data:
   - `Aquecimento vocal essencial` -> `eoU0rHG_7kc` (Portuguese)
   - `Respiração, afinação e agilidade` -> `J2ZnTPMyp5k` (Portuguese)
8. The old English IDs remain blocked in the frontend as a defensive fallback.

## Security findings still open
- Supabase Advisor still warns that SECURITY DEFINER functions are externally executable. Several are intentional authenticated RPCs with internal authorization checks; helper functions remain callable because RLS policies depend on them, but cross-user role probing is now blocked.
- Auth leaked-password protection remains disabled. No authenticated Supabase management action is currently available in this session to toggle it safely.

## Continuation protocol
1. Work only on the safe branch.
2. One functional block per commit.
3. Require CI typecheck + Next build before merge.
4. Do not merge/promote while checks are red or pending.
5. Database changes require immediate verification and Security Advisor review.
6. Keep this file updated after each completed block.

## Next blocks
1. Complete audit/replacement of remaining Academy YouTube videos.
2. Validate Admin/Academy preview and quizzes.
3. Review latest preview deployment and CI.
4. Harden remaining privileged RPC grants where they are not required by RLS/UI.
5. Merge/promote only after checks pass.
