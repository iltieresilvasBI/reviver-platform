insert into public.networks(slug,name,active)
values
 ('media','Mídia',true),('sound','Som',true),('lighting','Iluminação',true),('reception','Receção',true)
on conflict (slug) do update set name=excluded.name,active=true,updated_at=now();

create table if not exists public.ministry_people (
  id uuid primary key default gen_random_uuid(),
  linked_user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  preferred_name text,
  email text,
  email_normalized text,
  phone text,
  phone_normalized text,
  birth_date date,
  active boolean not null default true,
  joined_on date,
  communication_opt_in boolean not null default false,
  communication_preference text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ministry_people_email_unique on public.ministry_people(email_normalized) where email_normalized is not null;
create unique index if not exists ministry_people_phone_unique on public.ministry_people(phone_normalized) where phone_normalized is not null;
create index if not exists ministry_people_linked_user_idx on public.ministry_people(linked_user_id);

create table if not exists public.ministry_person_assignments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.ministry_people(id) on delete cascade,
  network_id uuid not null references public.networks(id) on delete cascade,
  group_code text check (group_code is null or group_code in ('A','B','C','D')),
  roles text[] not null default '{}',
  instruments text[] not null default '{}',
  vocal_classification text,
  active boolean not null default true,
  joined_on date,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id,network_id)
);
create index if not exists ministry_assignments_person_idx on public.ministry_person_assignments(person_id);
create index if not exists ministry_assignments_network_idx on public.ministry_person_assignments(network_id);

create table if not exists public.ministry_import_batches (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks(id) on delete restrict,
  imported_by uuid not null references public.profiles(id) on delete restrict,
  source_name text,
  mode text not null check (mode in ('create','update','upsert')),
  total_rows integer not null default 0,
  accepted_rows integer not null default 0,
  rejected_rows integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.worship_substitution_requests (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.worship_schedule_members(id) on delete cascade,
  requested_by_membership_id uuid not null references public.network_memberships(id) on delete cascade,
  proposed_membership_id uuid references public.network_memberships(id) on delete set null,
  status text not null default 'requested' check (status in ('requested','accepted','approved','rejected','cancelled')),
  requester_note text,
  substitute_note text,
  leader_note text,
  accepted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists worship_substitution_assignment_idx on public.worship_substitution_requests(assignment_id);
create index if not exists worship_substitution_proposed_idx on public.worship_substitution_requests(proposed_membership_id);

alter table public.ministry_people enable row level security;
alter table public.ministry_person_assignments enable row level security;
alter table public.ministry_import_batches enable row level security;
alter table public.worship_substitution_requests enable row level security;

grant select,insert,update on public.ministry_people to authenticated;
grant select,insert,update,delete on public.ministry_person_assignments to authenticated;
grant select,insert on public.ministry_import_batches to authenticated;
grant select,insert,update,delete on public.worship_substitution_requests to authenticated;

create policy "ministry people responsible read" on public.ministry_people for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.ministry_person_assignments a join public.networks n on n.id=a.network_id
  where a.person_id=ministry_people.id and (select public.has_network_role(auth.uid(),n.slug,'leader'))
));
create policy "ministry people leaders insert" on public.ministry_people for insert to authenticated
with check ((select public.is_admin()) or exists (
  select 1 from public.network_memberships nm where nm.user_id=auth.uid() and nm.role='leader' and nm.status='active'
));
create policy "ministry people responsible update" on public.ministry_people for update to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.ministry_person_assignments a join public.networks n on n.id=a.network_id
  where a.person_id=ministry_people.id and (select public.has_network_role(auth.uid(),n.slug,'leader'))
))
with check ((select public.is_admin()) or exists (
  select 1 from public.ministry_person_assignments a join public.networks n on n.id=a.network_id
  where a.person_id=ministry_people.id and (select public.has_network_role(auth.uid(),n.slug,'leader'))
));

create policy "ministry assignments responsible read" on public.ministry_person_assignments for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.networks n where n.id=network_id and (select public.has_network_role(auth.uid(),n.slug,'leader'))
));
create policy "ministry assignments responsible write" on public.ministry_person_assignments for all to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.networks n where n.id=network_id and (select public.has_network_role(auth.uid(),n.slug,'leader'))
))
with check ((select public.is_admin()) or exists (
  select 1 from public.networks n where n.id=network_id and (select public.has_network_role(auth.uid(),n.slug,'leader'))
));

create policy "ministry imports responsible read" on public.ministry_import_batches for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.networks n where n.id=network_id and (select public.has_network_role(auth.uid(),n.slug,'leader'))
));
create policy "ministry imports responsible insert" on public.ministry_import_batches for insert to authenticated
with check (imported_by=auth.uid() and ((select public.is_admin()) or exists (
  select 1 from public.networks n where n.id=network_id and (select public.has_network_role(auth.uid(),n.slug,'leader'))
)));

create policy "worship substitutions participants read" on public.worship_substitution_requests for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader'))
  or requested_by_membership_id in (select id from public.network_memberships where user_id=auth.uid())
  or proposed_membership_id in (select id from public.network_memberships where user_id=auth.uid()));
create policy "worship substitutions requester insert" on public.worship_substitution_requests for insert to authenticated
with check (requested_by_membership_id in (select id from public.network_memberships where user_id=auth.uid() and status='active')
  or (select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));
create policy "worship substitutions participants update" on public.worship_substitution_requests for update to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader'))
  or proposed_membership_id in (select id from public.network_memberships where user_id=auth.uid() and status='active')
  or requested_by_membership_id in (select id from public.network_memberships where user_id=auth.uid() and status='active'))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader'))
  or proposed_membership_id in (select id from public.network_memberships where user_id=auth.uid() and status='active')
  or requested_by_membership_id in (select id from public.network_memberships where user_id=auth.uid() and status='active'));