# Reviver Platform — Project State

Updated: 2026-10-08

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

## Checkpoint 2026-10-07 — Persisted Academy video curation
- Production baseline before this branch: `6518fba7f2da3082c6c3419be3a52cc149fa86b9`.
- Academy video curation is now persisted in `academy_lessons`:
  - `video_review_status`
  - `video_review_note`
  - `video_reviewed_at`
  - `video_reviewed_by`
- Final live inventory: 15 videos verified, 0 pending.
- Any future `youtube_id` change automatically resets review state to `pending`.
- Reset trigger verified transactionally with rollback.
- New `review_academy_video(uuid,text,text)` RPC:
  - SECURITY INVOKER
  - authenticated callable
  - internal Admin check
  - anon has no execute grant
  - regular user test rejected with `admin required`
- Student lesson renderer shows embedded video only when review status is `verified`.
- Admin can set pending / verified / blocked and save a review note.
- Curated replacements and confirmations are captured in migration `20261007163000_academy_video_review_state.sql`.

## Checkpoint 2026-10-07 — Worship scheduling release
- Consolidated in PR #23.
- Member unavailability uses date ranges with own-row RLS.
- Schedule assignment UI flags availability conflicts.
- Group A/B/C/D autofill skips unavailable members and uses the first configured role as primary.
- Upcoming services expose readiness based on team assignment, confirmations, repertoire and linked rehearsal.
- Private authenticated ICS export includes only the member's own schedules and relevant rehearsals.
- CI for the consolidated release passed before this checkpoint.



## Checkpoint 2026-10-08 — Worship repertoire and ministry operations
- PR #30 merged into `main` at commit `19063221cff12716778e5db2c0aa2333e9ddb4df`.
- Repertoire Intelligence now includes:
  - editable multi-theme service planning;
  - dedicated theme management;
  - composition/version/original and recommended key metadata;
  - Spotify / YouTube / Apple Music / Deezer references;
  - assisted cross-platform streaming-link resolution through Songlink/Odesli, always requiring leader validation before saving;
  - cifra/lyrics kept as external references/search, not copied content;
  - execution confirmation after services;
  - four-month usage metrics based only on confirmed executions in completed services;
  - theme-based suggestions ordered by usage;
  - internal reports with date/theme/song filters and CSV export;
  - explicit draft / approve / publish separation;
  - separate opt-in for public repertoire;
  - public `/repertorio-da-igreja` catalog with only explicitly public songs/services.
- Public worship RLS was verified with anonymous role; unpublished/private repertoire is not exposed.

### Ministry operations on PR #31
- Cross-ministry structure now includes Worship, Media, Sound, Lighting and Reception alongside existing networks.
- Admin can assign an existing account as member/leader in multiple ministries without duplicating the account.
- Ministry directory is separate from authentication accounts: spreadsheet import does not create passwords, accounts or invitations.
- Excel/CSV import supports:
  - column mapping;
  - preview;
  - up to 1,000 rows per import;
  - create/update/upsert modes;
  - duplicate control by normalized email/phone;
  - similar-name warning in the client;
  - empty-cell overwrite toggle;
  - per-row rejection reporting;
  - atomic person + ministry assignment upsert;
  - transactional test verified idempotency and preservation of non-empty existing data; test data rolled back.
- Worship substitutions now require requester -> substitute acceptance -> leader approval before changing the schedule.
- Communication preferences include explicit notification opt-in and preferred channel.
- Manual WhatsApp mode only opens a prefilled conversation for opted-in members; it never records sent/delivered/read status.
- Official WhatsApp Business API remains intentionally unimplemented until valid credentials and approved templates are available.
- New SECURITY DEFINER RPCs have anon EXECUTE explicitly revoked.
- Supabase leaked-password protection remains disabled and requires account-level configuration.
- Vercel preview/production builds are currently blocked by the account daily build limit (`api-deployments-free-per-day` / `build-rate-limit`). GitHub CI remains the available code validation gate until that quota resets.


## Checkpoint 2026-10-08 — V1 security and production hardening
- Production branch: `main`.
- Latest production commit at this checkpoint: `5f70006e5fe207853023d0ab9fe56e64b90ebc3f`.
- Production alias `reviver-platform-gamma.vercel.app` is READY.
- Dependency security hardening completed in PR #32:
  - CI now runs `npm audit --audit-level=high`;
  - vulnerable `xlsx` / SheetJS npm package removed;
  - Excel import migrated to `read-excel-file`;
  - CSV import remains supported with local parsing;
  - PostCSS pinned to patched 8.5.23 through npm overrides;
  - `package-lock.json` is now committed;
  - npm audit, TypeScript and Next.js build all pass.
- Performance hardening completed in PR #33:
  - targeted foreign-key indexes added to Worship and Ministry operational tables;
  - no business data or authorization rules changed.
- Supabase Security Advisor:
  - no anonymous EXECUTE exposure on the reviewed SECURITY DEFINER RPCs;
  - 18/19 authenticated SECURITY DEFINER RPCs contain explicit identity/admin/network-role checks;
  - `get_quiz_options(uuid)` intentionally returns only quiz option identifiers/labels/order and does not expose correctness;
  - leaked-password protection remains disabled and must be enabled in Supabase Auth settings (Pro plan or above).
- Production/runtime validation:
  - GitHub CI green;
  - Vercel preview READY before merge;
  - production deployment READY after merge;
  - Vercel runtime error/log APIs still return connector-scope HTTP 403, so deployment state + CI remain the available automated runtime validation channels.
- Live data note:
  - at this checkpoint there are no active `worship` network memberships in production;
  - member/leader end-to-end UI homologation therefore requires adding real ministry users before those role-specific flows can be exercised without synthetic identities.
- External integrations still intentionally pending:
  - official WhatsApp Business API credentials/templates for automatic sending and real sent/delivered/read states;
  - automated outbound reminder delivery;
  - Supabase leaked-password protection toggle.
