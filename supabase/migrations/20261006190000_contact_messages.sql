do $$ begin
  create type public.contact_message_status as enum ('new','read','replied','archived');
exception when duplicate_object then null; end $$;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 10 and 3000),
  status public.contact_message_status not null default 'new',
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;

drop policy if exists "contact public insert" on public.contact_messages;
create policy "contact public insert" on public.contact_messages
for insert to anon, authenticated
with check (status='new' and handled_by is null and handled_at is null);

drop policy if exists "contact admin read" on public.contact_messages;
create policy "contact admin read" on public.contact_messages
for select to authenticated
using (public.is_admin());

drop policy if exists "contact admin update" on public.contact_messages;
create policy "contact admin update" on public.contact_messages
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists idx_contact_messages_status_created
on public.contact_messages(status, created_at desc);
