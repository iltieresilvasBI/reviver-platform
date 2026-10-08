alter table public.worship_member_profiles
  add column if not exists communication_opt_in boolean not null default false,
  add column if not exists communication_preference text;