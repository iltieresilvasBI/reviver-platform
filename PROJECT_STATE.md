# Reviver Platform — Project State

Updated: 2026-10-07

## Stable base
- Repository: `iltieresilvasBI/reviver-platform`
- Production branch: `main`
- Safe continuation branch: `reviver-safe-continuation-2026-10-07`
- Base commit: `1dcaf436683880c7f5d69f0418f440b178d9ad91`
- Current safe head: `a12068eceb6cb571fc9565f174231e950dcbf1e4`
- Stack: Next.js 15 / React 19 / Vercel / Supabase Auth + PostgreSQL + Storage
- Supabase project: `Reviver Platform` (`blyvwsbbrnhpswvxezjt`, eu-west-1)
- Production alias: `reviver-platform-gamma.vercel.app`

## Verified platform state
- Supabase: ACTIVE_HEALTHY.
- 25 public tables with RLS enabled.
- CMS, Auth, Academy, quizzes/XP, public API/site, admin, contact inbox and worship workflows are present.
- PR #9 is open, draft and mergeable.
- Production has not been promoted from the safe branch.

## Academy now implemented
### Vocal
- Cantor Principal (Lead)
- Backing Vocals
- English-only video IDs are defensively blocked.
- Academy Admin explicitly requires Portuguese or officially dubbed videos.

### Instruments
Each path is a real Academy module with progress, XP and quizzes:
- Violão
- Guitarra
- Baixo
- Bateria
- Teclado / Piano

Each instrument has at least two lessons. The second lessons are guided practical content and do not require a video.

### Technical
- Behringer X32
  - Introdução à Behringer X32
  - Ganho e nível de sinal
  - Monitores e buses
- Iluminação de Igreja
  - Fundamentos de iluminação de igreja
  - Cenas e DMX na iluminação

## Academy UX
- Main Academy page is grouped by Lead, Backing, Instruments and Technical.
- A four-card progress overview shows completion percentage by track.
- Guided lessons without video are treated as complete lessons, with video optional.
- Quiz approval remains 70% unless changed per lesson.

## Resource library
- Student route: `/academy/resources`
- Admin route: `/admin/academy/resources`
- Private bucket: `academy-documents`
- Supported: PDF, DOC/DOCX, PPT/PPTX, TXT
- Limit: 25 MB
- Student access uses signed URLs.
- Admin can upload, deactivate, reactivate and delete resources.

## Security changes
- Applied and persisted `security_rpc_identity_hardening`.
- `is_admin`, `has_app_role`, `has_network_role` only return positive results for the authenticated caller's own identity.
- Cross-user role probing was verified to return false.
- Anonymous execute on `get_quiz_options(uuid)` is revoked.
- Anonymous EXECUTE access to authorization helpers has been removed by revoking PUBLIC and granting authenticated explicitly.
- Security Advisor no longer reports anonymous SECURITY DEFINER helper exposure; remaining warnings are authenticated RPCs that require review by intended use.
- Supabase leaked-password protection remains disabled and must be enabled separately when account tooling permits.

## Functional verification
- GitHub CI has repeatedly passed after CI workflow repair.
- Latest fully validated checkpoint before current portability cleanup: CI #103 SUCCESS and Vercel preview READY.
- Quiz flow was tested transactionally with an authenticated user:
  - score: 100
  - passed: true
  - pass mark: 70
  - XP awarded: 110
- Test transaction was rolled back.
- Confirmed afterwards: no test progress, XP event or quiz attempt remained.

## Portability cleanup
- New Academy migrations now resolve the course by slug `formacao-vocal` instead of relying on a fixed UUID.
- Migrations fail explicitly if the expected course does not exist.

## Known operational limitation
- Vercel runtime logs endpoint returned HTTP 403 for the connected account scope. This is a connector permission limitation, not evidence of an application runtime error.
- CI status and Vercel deployment state remain the available validation channels.

## Release protocol
1. Work only on the safe branch.
2. Require latest GitHub CI success.
3. Require latest Vercel preview READY.
4. Keep PR draft until final review is clean.
5. Do not merge or promote to production while checks are pending/red.
6. After merge, verify production deployment separately.

## Remaining before merge
1. Validate CI and Vercel preview for the current portability cleanup.
2. Review Admin resource delete/upload flow once more.
3. Run final Supabase Security Advisor.
4. Mark PR ready only after all checks pass.
